/**
 * Artifact Tracker
 *
 * Centralized state management for tracking artifacts (created files) with
 * IPC broadcasting support for real-time UI updates.
 */

import fs from "fs/promises";
import path from "path";

/**
 * Type of artifact based on file extension.
 */
export type ArtifactType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "code"
  | "data"
  | "text"
  | "archive"
  | "other";

/**
 * A single artifact representing a file created during the session.
 */
export interface Artifact {
  /** Unique identifier for the artifact */
  id: string;
  /** File name (not full path) */
  name: string;
  /** Full file path */
  path: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Date when the artifact was created */
  createdAt: Date;
}

/**
 * Callback function type for broadcasting artifact creation events via IPC.
 */
export type ArtifactBroadcaster = (artifact: Artifact) => void;

/**
 * Extension to MIME type mapping.
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Documents
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pdf: "application/pdf",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",

  // Spreadsheets
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  ods: "application/vnd.oasis.opendocument.spreadsheet",

  // Presentations
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  odp: "application/vnd.oasis.opendocument.presentation",

  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",

  // Code
  js: "text/javascript",
  jsx: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  py: "text/x-python",
  rb: "text/x-ruby",
  go: "text/x-go",
  rs: "text/x-rust",
  java: "text/x-java",
  c: "text/x-c",
  cpp: "text/x-c++",
  h: "text/x-c",
  cs: "text/x-csharp",
  php: "text/x-php",
  sh: "text/x-shellscript",
  ps1: "text/x-powershell",
  sql: "text/x-sql",
  html: "text/html",
  css: "text/css",
  scss: "text/x-scss",

  // Data
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  toml: "text/toml",

  // Text
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  log: "text/plain",

  // Archives
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
};

/**
 * Extension to artifact type mapping.
 */
const EXTENSION_TYPE_MAP: Record<string, ArtifactType> = {
  // Documents
  docx: "document",
  doc: "document",
  pdf: "document",
  rtf: "document",
  odt: "document",

  // Spreadsheets
  xlsx: "spreadsheet",
  xls: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",

  // Presentations
  pptx: "presentation",
  ppt: "presentation",
  odp: "presentation",

  // Images
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  ico: "image",
  bmp: "image",

  // Code
  js: "code",
  jsx: "code",
  ts: "code",
  tsx: "code",
  py: "code",
  rb: "code",
  go: "code",
  rs: "code",
  java: "code",
  c: "code",
  cpp: "code",
  h: "code",
  cs: "code",
  php: "code",
  sh: "code",
  ps1: "code",
  sql: "code",
  html: "code",
  css: "code",
  scss: "code",

  // Data
  json: "data",
  xml: "data",
  yaml: "data",
  yml: "data",
  toml: "data",

  // Text
  txt: "text",
  md: "text",
  markdown: "text",
  log: "text",

  // Archives
  zip: "archive",
  tar: "archive",
  gz: "archive",
  rar: "archive",
  "7z": "archive",
};

/**
 * Generates a unique ID for an artifact.
 */
function generateArtifactId(): string {
  return `artifact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts file extension from a path.
 */
function extractExtension(filePath: string): string {
  const name = path.basename(filePath);
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) {
    return "";
  }
  return name.substring(lastDot + 1).toLowerCase();
}

/**
 * Gets MIME type from file extension.
 */
function getMimeType(extension: string): string {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  return EXTENSION_MIME_MAP[normalized] ?? "application/octet-stream";
}

/**
 * Gets artifact type from file extension.
 */
function getArtifactType(extension: string): ArtifactType {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  return EXTENSION_TYPE_MAP[normalized] ?? "other";
}

/**
 * Manages artifact tracking with support for IPC broadcasting.
 */
export class ArtifactTracker {
  private artifacts: Artifact[] = [];
  private broadcaster: ArtifactBroadcaster | null = null;

  /**
   * Sets the broadcaster callback for IPC updates.
   * @param broadcaster - Function to call when an artifact is created
   */
  setBroadcaster(broadcaster: ArtifactBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  /**
   * Clears the broadcaster callback.
   */
  clearBroadcaster(): void {
    this.broadcaster = null;
  }

  /**
   * Returns whether a broadcaster is configured.
   */
  hasBroadcaster(): boolean {
    return this.broadcaster !== null;
  }

  /**
   * Tracks a newly created file as an artifact.
   * Attempts to read file size from disk.
   *
   * @param filePath - Absolute path to the created file
   * @param sizeHint - Optional size hint if known (avoids file system call)
   * @returns The created artifact
   */
  async trackArtifact(filePath: string, sizeHint?: number): Promise<Artifact> {
    const name = path.basename(filePath);
    const extension = extractExtension(filePath);
    const mimeType = getMimeType(extension);

    // Get file size - use hint if provided, otherwise read from disk
    let size = sizeHint ?? 0;
    if (size === 0) {
      try {
        const stats = await fs.stat(filePath);
        size = stats.size;
      } catch {
        // File may not exist yet or may have been deleted
        size = 0;
      }
    }

    const artifact: Artifact = {
      id: generateArtifactId(),
      name,
      path: filePath,
      mimeType,
      size,
      createdAt: new Date(),
    };

    this.artifacts.push(artifact);
    this.broadcast(artifact);

    return artifact;
  }

  /**
   * Tracks a file synchronously when size is already known.
   * Useful when size comes from a file creation result.
   *
   * @param filePath - Absolute path to the created file
   * @param size - File size in bytes
   * @returns The created artifact
   */
  trackArtifactSync(filePath: string, size: number): Artifact {
    const name = path.basename(filePath);
    const extension = extractExtension(filePath);
    const mimeType = getMimeType(extension);

    const artifact: Artifact = {
      id: generateArtifactId(),
      name,
      path: filePath,
      mimeType,
      size,
      createdAt: new Date(),
    };

    this.artifacts.push(artifact);
    this.broadcast(artifact);

    return artifact;
  }

  /**
   * Returns all tracked artifacts.
   */
  getArtifacts(): Artifact[] {
    return [...this.artifacts];
  }

  /**
   * Returns an artifact by ID.
   */
  getArtifactById(id: string): Artifact | undefined {
    return this.artifacts.find((artifact) => artifact.id === id);
  }

  /**
   * Returns artifacts filtered by type.
   */
  getArtifactsByType(type: ArtifactType): Artifact[] {
    return this.artifacts.filter((artifact) => {
      const extension = extractExtension(artifact.path);
      return getArtifactType(extension) === type;
    });
  }

  /**
   * Returns the total count of artifacts.
   */
  getArtifactCount(): number {
    return this.artifacts.length;
  }

  /**
   * Returns the total size of all artifacts.
   */
  getTotalSize(): number {
    return this.artifacts.reduce((sum, artifact) => sum + artifact.size, 0);
  }

  /**
   * Clears all tracked artifacts.
   */
  clearArtifacts(): void {
    this.artifacts = [];
  }

  /**
   * Broadcasts an artifact creation event via the configured broadcaster.
   */
  private broadcast(artifact: Artifact): void {
    if (this.broadcaster) {
      this.broadcaster(artifact);
    }
  }
}

/**
 * Global ArtifactTracker instance.
 */
const globalArtifactTracker = new ArtifactTracker();

/**
 * Returns the global ArtifactTracker instance.
 */
export function getArtifactTracker(): ArtifactTracker {
  return globalArtifactTracker;
}

/**
 * Sets the broadcaster for the global ArtifactTracker.
 */
export function setArtifactBroadcaster(broadcaster: ArtifactBroadcaster): void {
  globalArtifactTracker.setBroadcaster(broadcaster);
}

/**
 * Clears the broadcaster from the global ArtifactTracker.
 */
export function clearArtifactBroadcaster(): void {
  globalArtifactTracker.clearBroadcaster();
}

/**
 * Tracks a file creation as an artifact using the global tracker.
 * Call this after successfully creating a file.
 *
 * @param filePath - Absolute path to the created file
 * @param size - File size in bytes
 * @returns The created artifact
 */
export function trackFileCreation(filePath: string, size: number): Artifact {
  return globalArtifactTracker.trackArtifactSync(filePath, size);
}
