/**
 * Artifact IPC Handlers.
 * Connects the ArtifactTracker to the IPC bridge for real-time UI updates.
 */

import { AgentBridge, getAgentBridge } from './agent-bridge.js';
import type { Artifact } from './message-types.js';

/**
 * Artifact from the agent backend.
 * This matches the structure in agent/state/artifact-tracker.ts.
 */
interface AgentArtifact {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

/**
 * Current request ID for correlating artifact events with the active request.
 */
let currentArtifactRequestId: string | null = null;

/**
 * Sets the current request ID for artifact broadcasts.
 * Call this when starting to process a new message.
 */
export function setArtifactRequestId(requestId: string | null): void {
  currentArtifactRequestId = requestId;
}

/**
 * Gets the current request ID for artifacts.
 */
export function getArtifactRequestId(): string | null {
  return currentArtifactRequestId;
}

/**
 * Transforms an agent Artifact to an IPC Artifact.
 */
function transformArtifact(artifact: AgentArtifact): Artifact {
  return {
    id: artifact.id,
    name: artifact.name,
    path: artifact.path,
    mimeType: artifact.mimeType,
    size: artifact.size,
    createdAt: artifact.createdAt,
  };
}

/**
 * Creates a broadcaster function for the ArtifactTracker.
 * The broadcaster sends artifact creation events to the renderer via IPC.
 *
 * @param bridge - The AgentBridge to use for sending updates
 * @returns A broadcaster function compatible with ArtifactTracker.setBroadcaster()
 */
export function createArtifactBroadcaster(
  bridge: AgentBridge
): (artifact: AgentArtifact) => void {
  return (artifact: AgentArtifact): void => {
    const requestId = currentArtifactRequestId;

    if (!requestId) {
      console.warn('[ArtifactHandlers] No current request ID for artifact broadcast');
      return;
    }

    console.log('[ArtifactHandlers] Broadcasting artifact creation:', {
      requestId,
      artifactId: artifact.id,
      name: artifact.name,
      path: artifact.path,
      size: artifact.size,
    });

    // Transform and send the artifact
    const ipcArtifact = transformArtifact(artifact);
    bridge.sendArtifactCreated(requestId, ipcArtifact);
  };
}

/**
 * Initializes artifact IPC handlers.
 * Sets up the broadcaster for the global ArtifactTracker.
 */
export function initializeArtifactHandlers(): void {
  const bridge = getAgentBridge();
  const broadcaster = createArtifactBroadcaster(bridge);

  console.log('[ArtifactHandlers] Artifact broadcaster ready');
  console.log('[ArtifactHandlers] Note: Broadcaster must be set on ArtifactTracker');

  // Export the broadcaster for use by other modules
  (global as Record<string, unknown>).__artifactBroadcaster = broadcaster;
}

/**
 * Gets the artifact broadcaster for use by other modules.
 */
export function getArtifactBroadcaster(): ((artifact: AgentArtifact) => void) | undefined {
  return (global as Record<string, unknown>).__artifactBroadcaster as
    | ((artifact: AgentArtifact) => void)
    | undefined;
}

/**
 * Cleans up artifact handlers.
 */
export function cleanupArtifactHandlers(): void {
  currentArtifactRequestId = null;
  delete (global as Record<string, unknown>).__artifactBroadcaster;
  console.log('[ArtifactHandlers] Cleaned up');
}
