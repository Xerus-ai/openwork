/**
 * Skill IPC Handlers.
 * Connects skill loading events to the IPC bridge for real-time UI updates.
 */

import { AgentBridge, getAgentBridge } from './agent-bridge.js';

/**
 * Skill information from the agent backend.
 */
export interface SkillLoadEvent {
  /** Skill name (directory name) */
  name: string;
  /** Truncated preview of skill content */
  preview?: string;
}

/**
 * Current request ID for correlating skill events with the active request.
 */
let currentSkillRequestId: string | null = null;

/**
 * Sets the current request ID for skill broadcasts.
 * Call this when starting to process a new message.
 */
export function setSkillRequestId(requestId: string | null): void {
  currentSkillRequestId = requestId;
}

/**
 * Gets the current request ID for skills.
 */
export function getSkillRequestId(): string | null {
  return currentSkillRequestId;
}

/**
 * Broadcaster function type for skill loading events.
 */
export type SkillBroadcaster = (event: SkillLoadEvent) => void;

/**
 * Creates a broadcaster function for skill loading events.
 * The broadcaster sends skill loaded events to the renderer via IPC.
 *
 * @param bridge - The AgentBridge to use for sending updates
 * @returns A broadcaster function for skill loading events
 */
export function createSkillBroadcaster(bridge: AgentBridge): SkillBroadcaster {
  return (event: SkillLoadEvent): void => {
    const requestId = currentSkillRequestId;

    if (!requestId) {
      console.warn('[SkillHandlers] No current request ID for skill broadcast');
      return;
    }

    console.log('[SkillHandlers] Broadcasting skill loaded:', {
      requestId,
      skillName: event.name,
      hasPreview: Boolean(event.preview),
    });

    bridge.sendSkillLoaded(requestId, event.name, event.preview);
  };
}

/**
 * Broadcasts a skill loading event.
 * Convenience function that uses the global broadcaster.
 */
export function broadcastSkillLoaded(skillName: string, preview?: string): void {
  const broadcaster = getSkillBroadcaster();
  if (broadcaster) {
    broadcaster({ name: skillName, preview });
  } else {
    console.warn('[SkillHandlers] Skill broadcaster not initialized');
  }
}

/**
 * Initializes skill IPC handlers.
 * Sets up the broadcaster for skill loading events.
 */
export function initializeSkillHandlers(): void {
  const bridge = getAgentBridge();
  const broadcaster = createSkillBroadcaster(bridge);

  console.log('[SkillHandlers] Skill broadcaster ready');

  // Export the broadcaster for use by other modules
  (global as Record<string, unknown>).__skillBroadcaster = broadcaster;
}

/**
 * Gets the skill broadcaster for use by other modules.
 */
export function getSkillBroadcaster(): SkillBroadcaster | undefined {
  return (global as Record<string, unknown>).__skillBroadcaster as
    | SkillBroadcaster
    | undefined;
}

/**
 * Cleans up skill handlers.
 */
export function cleanupSkillHandlers(): void {
  currentSkillRequestId = null;
  delete (global as Record<string, unknown>).__skillBroadcaster;
  console.log('[SkillHandlers] Cleaned up');
}
