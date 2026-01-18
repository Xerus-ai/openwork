import { useCallback, useMemo, useState } from 'react';

/**
 * Type of artifact file based on extension or content.
 */
export type ArtifactType =
  | 'document'   // docx, pdf
  | 'spreadsheet' // xlsx, csv
  | 'presentation' // pptx
  | 'image'      // png, jpg, svg, etc.
  | 'code'       // js, ts, py, etc.
  | 'data'       // json, xml, yaml
  | 'text'       // txt, md
  | 'archive'    // zip, tar
  | 'other';

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
  /** Type of artifact for icon selection */
  type: ArtifactType;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last modified */
  modifiedAt: string;
}

/**
 * Summary statistics for artifacts.
 */
export interface ArtifactsSummary {
  /** Total number of artifacts */
  total: number;
  /** Total size in bytes */
  totalSize: number;
  /** Count by type */
  byType: Partial<Record<ArtifactType, number>>;
}

/**
 * State returned by the useArtifacts hook.
 */
export interface ArtifactsState {
  artifacts: Artifact[];
  summary: ArtifactsSummary;
  selectedId: string | null;
}

/**
 * Actions returned by the useArtifacts hook.
 */
export interface ArtifactsActions {
  setArtifacts: (artifacts: Artifact[]) => void;
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt' | 'modifiedAt' | 'type'>) => string;
  updateArtifact: (id: string, updates: Partial<Pick<Artifact, 'size' | 'modifiedAt'>>) => void;
  removeArtifact: (id: string) => void;
  clearArtifacts: () => void;
  selectArtifact: (id: string | null) => void;
}

/**
 * Generates a unique ID for artifacts.
 */
function generateArtifactId(): string {
  return `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extension to artifact type mapping.
 */
const EXTENSION_TYPE_MAP: Record<string, ArtifactType> = {
  // Documents
  docx: 'document',
  doc: 'document',
  pdf: 'document',
  rtf: 'document',
  odt: 'document',

  // Spreadsheets
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',

  // Presentations
  pptx: 'presentation',
  ppt: 'presentation',
  odp: 'presentation',

  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  bmp: 'image',

  // Code
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  rb: 'code',
  go: 'code',
  rs: 'code',
  java: 'code',
  c: 'code',
  cpp: 'code',
  h: 'code',
  cs: 'code',
  php: 'code',
  sh: 'code',
  ps1: 'code',
  sql: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',

  // Data
  json: 'data',
  xml: 'data',
  yaml: 'data',
  yml: 'data',
  toml: 'data',

  // Text
  txt: 'text',
  md: 'text',
  markdown: 'text',
  log: 'text',

  // Archives
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  rar: 'archive',
  '7z': 'archive',
};

/**
 * Detects artifact type from file extension.
 */
function detectArtifactType(extension: string): ArtifactType {
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return EXTENSION_TYPE_MAP[normalized] ?? 'other';
}

/**
 * Extracts file extension from path or name.
 */
function extractExtension(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) {
    return '';
  }
  return name.substring(lastDot + 1).toLowerCase();
}

/**
 * Extracts file name from path.
 */
function extractFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

/**
 * Calculates summary statistics from a list of artifacts.
 */
function calculateSummary(artifacts: Artifact[]): ArtifactsSummary {
  const total = artifacts.length;
  const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size, 0);

  const byType: Partial<Record<ArtifactType, number>> = {};
  for (const artifact of artifacts) {
    byType[artifact.type] = (byType[artifact.type] ?? 0) + 1;
  }

  return {
    total,
    totalSize,
    byType,
  };
}

/**
 * Hook for managing artifacts state.
 * Provides artifacts list, summary statistics, and actions for manipulation.
 *
 * @returns Artifacts state and actions for managing items
 *
 * @example
 * const { artifacts, summary, addArtifact, selectArtifact } = useArtifacts();
 *
 * // Add a new artifact
 * addArtifact({
 *   name: 'report.docx',
 *   path: '/workspace/report.docx',
 *   extension: 'docx',
 *   size: 1024,
 * });
 *
 * // Select an artifact for preview
 * selectArtifact('artifact-123');
 */
export function useArtifacts(): ArtifactsState & ArtifactsActions {
  const [artifacts, setArtifactsState] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * Calculates summary statistics.
   */
  const summary = useMemo(() => calculateSummary(artifacts), [artifacts]);

  /**
   * Sets the entire artifacts list (typically from backend sync).
   */
  const setArtifacts = useCallback((newArtifacts: Artifact[]): void => {
    setArtifactsState(newArtifacts);
  }, []);

  /**
   * Adds a new artifact to the list.
   * @returns The ID of the new artifact
   */
  const addArtifact = useCallback(
    (artifact: Omit<Artifact, 'id' | 'createdAt' | 'modifiedAt' | 'type'>): string => {
      const id = generateArtifactId();
      const now = new Date().toISOString();
      const extension = artifact.extension || extractExtension(artifact.path);
      const name = artifact.name || extractFileName(artifact.path);
      const type = detectArtifactType(extension);

      const newArtifact: Artifact = {
        id,
        name,
        path: artifact.path,
        type,
        extension,
        size: artifact.size,
        createdAt: now,
        modifiedAt: now,
      };

      setArtifactsState((prev) => [...prev, newArtifact]);
      return id;
    },
    []
  );

  /**
   * Updates an existing artifact.
   */
  const updateArtifact = useCallback(
    (id: string, updates: Partial<Pick<Artifact, 'size' | 'modifiedAt'>>): void => {
      const now = new Date().toISOString();

      setArtifactsState((prev) =>
        prev.map((artifact) => {
          if (artifact.id !== id) return artifact;
          return {
            ...artifact,
            ...updates,
            modifiedAt: updates.modifiedAt ?? now,
          };
        })
      );
    },
    []
  );

  /**
   * Removes an artifact from the list.
   */
  const removeArtifact = useCallback((id: string): void => {
    setArtifactsState((prev) => prev.filter((artifact) => artifact.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  /**
   * Clears all artifacts from the list.
   */
  const clearArtifacts = useCallback((): void => {
    setArtifactsState([]);
    setSelectedId(null);
  }, []);

  /**
   * Selects an artifact for preview.
   */
  const selectArtifact = useCallback((id: string | null): void => {
    setSelectedId(id);
  }, []);

  return {
    artifacts,
    summary,
    selectedId,
    setArtifacts,
    addArtifact,
    updateArtifact,
    removeArtifact,
    clearArtifacts,
    selectArtifact,
  };
}
