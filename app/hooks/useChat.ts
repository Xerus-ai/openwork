import { useCallback, useRef, useState } from 'react';

/**
 * Role of a message in the chat.
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Status of a message.
 */
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

/**
 * A single message in the chat history.
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
}

/**
 * State returned by the useChat hook.
 */
export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

/**
 * Actions returned by the useChat hook.
 */
export interface ChatActions {
  addUserMessage: (content: string) => string;
  startAssistantMessage: () => string;
  appendToMessage: (messageId: string, content: string) => void;
  completeMessage: (messageId: string) => void;
  setMessageError: (messageId: string) => void;
  clearMessages: () => void;
  updateMessageContent: (messageId: string, content: string) => void;
  /** Set all messages (used for loading session messages) */
  setMessages: (messages: ChatMessage[]) => void;
}

/**
 * Generates a unique ID for messages.
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing chat state and message history.
 * Handles user messages, assistant responses, and streaming.
 *
 * @returns Chat state and actions for managing messages
 *
 * @example
 * const { messages, isStreaming, addUserMessage, startAssistantMessage } = useChat();
 *
 * // Add a user message
 * const userMsgId = addUserMessage("Hello, Claude!");
 *
 * // Start streaming assistant response
 * const assistantMsgId = startAssistantMessage();
 * appendToMessage(assistantMsgId, "Hello! ");
 * appendToMessage(assistantMsgId, "How can I help?");
 * completeMessage(assistantMsgId);
 */
export function useChat(): ChatState & ChatActions {
  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Use ref to avoid stale closures in streaming callbacks
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  /**
   * Adds a user message to the chat history.
   * @returns The ID of the new message
   */
  const addUserMessage = useCallback((content: string): string => {
    const id = generateMessageId();
    const message: ChatMessage = {
      id,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'complete',
    };

    setMessagesState((prev) => [...prev, message]);
    return id;
  }, []);

  /**
   * Starts a new assistant message for streaming.
   * @returns The ID of the new message
   */
  const startAssistantMessage = useCallback((): string => {
    const id = generateMessageId();
    const message: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    };

    setMessagesState((prev) => [...prev, message]);
    setStreamingMessageId(id);
    return id;
  }, []);

  /**
   * Appends content to an existing message (for streaming).
   */
  const appendToMessage = useCallback((messageId: string, content: string): void => {
    setMessagesState((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: msg.content + content }
          : msg
      )
    );
  }, []);

  /**
   * Updates the entire content of a message.
   */
  const updateMessageContent = useCallback((messageId: string, content: string): void => {
    setMessagesState((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content }
          : msg
      )
    );
  }, []);

  /**
   * Marks a message as complete.
   */
  const completeMessage = useCallback((messageId: string): void => {
    setMessagesState((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'complete' as const }
          : msg
      )
    );
    setStreamingMessageId((current) =>
      current === messageId ? null : current
    );
  }, []);

  /**
   * Marks a message as having an error.
   */
  const setMessageError = useCallback((messageId: string): void => {
    setMessagesState((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'error' as const }
          : msg
      )
    );
    setStreamingMessageId((current) =>
      current === messageId ? null : current
    );
  }, []);

  /**
   * Clears all messages from the chat history.
   */
  const clearMessages = useCallback((): void => {
    setMessagesState([]);
    setStreamingMessageId(null);
  }, []);

  /**
   * Sets all messages (used for loading session messages).
   */
  const setMessages = useCallback((newMessages: ChatMessage[]): void => {
    setMessagesState(newMessages);
    setStreamingMessageId(null);
  }, []);

  return {
    messages,
    isStreaming: streamingMessageId !== null,
    streamingMessageId,
    addUserMessage,
    startAssistantMessage,
    appendToMessage,
    completeMessage,
    setMessageError,
    clearMessages,
    updateMessageContent,
    setMessages,
  };
}
