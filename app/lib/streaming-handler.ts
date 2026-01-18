/**
 * Streaming Handler for Agent Responses.
 * Processes streaming message chunks and manages accumulation.
 */

import type {
  AgentMessageChunk,
  AgentMessageComplete,
  AgentToolUse,
  AgentToolResult,
  AgentError,
} from './ipc-types';

/**
 * Accumulated message state during streaming.
 */
export interface StreamingState {
  requestId: string;
  content: string;
  chunks: AgentMessageChunk[];
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Stream event types.
 */
export type StreamEventType =
  | 'chunk'
  | 'complete'
  | 'tool_start'
  | 'tool_end'
  | 'error';

/**
 * Unified stream event.
 */
export interface StreamEvent {
  type: StreamEventType;
  requestId: string;
  timestamp: number;
  data: AgentMessageChunk | AgentMessageComplete | AgentToolUse | AgentToolResult | AgentError;
}

/**
 * Stream event handler callback.
 */
export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * Configuration for the streaming handler.
 */
export interface StreamingHandlerConfig {
  /** Maximum chunks to keep in memory */
  maxChunks: number;
  /** Timeout for inactive streams in milliseconds */
  streamTimeout: number;
  /** Whether to auto-cleanup completed streams */
  autoCleanup: boolean;
  /** Cleanup delay in milliseconds */
  cleanupDelay: number;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: StreamingHandlerConfig = {
  maxChunks: 1000,
  streamTimeout: 300000, // 5 minutes
  autoCleanup: true,
  cleanupDelay: 5000, // 5 seconds after completion
};

/**
 * StreamingHandler manages streaming message accumulation and events.
 *
 * Features:
 * - Accumulates chunks into complete messages
 * - Tracks multiple concurrent streams by request ID
 * - Provides event-based interface for UI updates
 * - Auto-cleanup of completed streams
 *
 * @example
 * const handler = new StreamingHandler();
 *
 * handler.onEvent((event) => {
 *   if (event.type === 'chunk') {
 *     updateUI(event.data.content);
 *   }
 * });
 *
 * // Process incoming chunks
 * handler.handleChunk(chunk);
 */
export class StreamingHandler {
  private config: StreamingHandlerConfig;
  private streams: Map<string, StreamingState> = new Map();
  private eventHandlers: Set<StreamEventHandler> = new Set();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<StreamingHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Subscribe to stream events.
   * @returns Cleanup function to unsubscribe
   */
  onEvent(handler: StreamEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Handle an incoming message chunk.
   */
  handleChunk(chunk: AgentMessageChunk): void {
    const { requestId, content, isFinal } = chunk;

    // Get or create stream state
    let state = this.streams.get(requestId);
    if (!state) {
      state = {
        requestId,
        content: '',
        chunks: [],
        isComplete: false,
        startedAt: new Date(),
      };
      this.streams.set(requestId, state);
    }

    // Accumulate content
    state.content += content;
    state.chunks.push(chunk);

    // Trim chunks if exceeding max
    if (state.chunks.length > this.config.maxChunks) {
      state.chunks = state.chunks.slice(-this.config.maxChunks);
    }

    // Emit chunk event
    this.emit({
      type: 'chunk',
      requestId,
      timestamp: chunk.timestamp,
      data: chunk,
    });

    // Handle final chunk
    if (isFinal) {
      state.isComplete = true;
      state.completedAt = new Date();
    }
  }

  /**
   * Handle message completion.
   */
  handleComplete(message: AgentMessageComplete): void {
    const { requestId, content } = message;

    // Get or create stream state
    let state = this.streams.get(requestId);
    if (!state) {
      state = {
        requestId,
        content: '',
        chunks: [],
        isComplete: false,
        startedAt: new Date(),
      };
      this.streams.set(requestId, state);
    }

    // Update state
    state.content = content;
    state.isComplete = true;
    state.completedAt = new Date();

    // Emit complete event
    this.emit({
      type: 'complete',
      requestId,
      timestamp: message.timestamp,
      data: message,
    });

    // Schedule cleanup if enabled
    if (this.config.autoCleanup) {
      this.scheduleCleanup(requestId);
    }
  }

  /**
   * Handle tool use start.
   */
  handleToolUse(toolUse: AgentToolUse): void {
    this.emit({
      type: 'tool_start',
      requestId: toolUse.requestId,
      timestamp: toolUse.timestamp,
      data: toolUse,
    });
  }

  /**
   * Handle tool result.
   */
  handleToolResult(result: AgentToolResult): void {
    this.emit({
      type: 'tool_end',
      requestId: result.requestId,
      timestamp: result.timestamp,
      data: result,
    });
  }

  /**
   * Handle error.
   */
  handleError(error: AgentError): void {
    const requestId = error.requestId || 'unknown';

    this.emit({
      type: 'error',
      requestId,
      timestamp: error.timestamp,
      data: error,
    });

    // Mark stream as complete if exists
    const state = this.streams.get(requestId);
    if (state) {
      state.isComplete = true;
      state.completedAt = new Date();
    }
  }

  /**
   * Get current stream state for a request.
   */
  getStreamState(requestId: string): StreamingState | undefined {
    return this.streams.get(requestId);
  }

  /**
   * Get accumulated content for a request.
   */
  getContent(requestId: string): string {
    return this.streams.get(requestId)?.content ?? '';
  }

  /**
   * Check if a stream is active (not complete).
   */
  isActive(requestId: string): boolean {
    const state = this.streams.get(requestId);
    return state !== undefined && !state.isComplete;
  }

  /**
   * Get all active request IDs.
   */
  getActiveRequestIds(): string[] {
    return Array.from(this.streams.entries())
      .filter(([, state]) => !state.isComplete)
      .map(([id]) => id);
  }

  /**
   * Clear a specific stream.
   */
  clearStream(requestId: string): void {
    this.cancelCleanup(requestId);
    this.streams.delete(requestId);
  }

  /**
   * Clear all streams.
   */
  clearAll(): void {
    // Cancel all pending cleanups
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));
    this.cleanupTimers.clear();

    // Clear all streams
    this.streams.clear();
  }

  /**
   * Emit an event to all handlers.
   */
  private emit(event: StreamEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('[StreamingHandler] Event handler error:', error);
      }
    });
  }

  /**
   * Schedule cleanup for a completed stream.
   */
  private scheduleCleanup(requestId: string): void {
    this.cancelCleanup(requestId);

    const timer = setTimeout(() => {
      this.streams.delete(requestId);
      this.cleanupTimers.delete(requestId);
    }, this.config.cleanupDelay);

    this.cleanupTimers.set(requestId, timer);
  }

  /**
   * Cancel scheduled cleanup for a stream.
   */
  private cancelCleanup(requestId: string): void {
    const timer = this.cleanupTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(requestId);
    }
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.clearAll();
    this.eventHandlers.clear();
  }
}

/**
 * Create a streaming handler with default configuration.
 */
export function createStreamingHandler(
  config?: Partial<StreamingHandlerConfig>
): StreamingHandler {
  return new StreamingHandler(config);
}

/**
 * Utility to format streaming duration.
 */
export function formatStreamDuration(state: StreamingState): string {
  const endTime = state.completedAt ?? new Date();
  const durationMs = endTime.getTime() - state.startedAt.getTime();

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Utility to estimate streaming progress.
 * Returns a value between 0 and 1 based on common response patterns.
 */
export function estimateProgress(contentLength: number, isComplete: boolean): number {
  if (isComplete) {
    return 1;
  }

  // Estimate based on typical response lengths
  // Most responses are under 4000 characters
  const estimatedMax = 4000;
  const progress = Math.min(contentLength / estimatedMax, 0.95);

  return progress;
}
