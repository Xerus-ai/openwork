import { useCallback, useEffect, useState } from 'react';

/**
 * File entry from the backend.
 */
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  extension: string;
}

/**
 * Tree node representing a file or directory in the tree.
 */
export interface TreeNode {
  entry: FileEntry;
  children: TreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  depth: number;
}

/**
 * State returned by the useFileTree hook.
 */
export interface FileTreeState {
  /** Root nodes of the tree */
  nodes: TreeNode[];
  /** Whether the root is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Currently selected node path */
  selectedPath: string | null;
}

/**
 * Actions returned by the useFileTree hook.
 */
export interface FileTreeActions {
  /** Refresh the entire tree */
  refresh: () => Promise<void>;
  /** Toggle expansion of a directory node */
  toggleExpand: (nodePath: string) => Promise<void>;
  /** Select a node */
  selectNode: (nodePath: string) => void;
  /** Clear selection */
  clearSelection: () => void;
}

/**
 * Creates a tree node from a file entry.
 */
function createTreeNode(entry: FileEntry, depth: number): TreeNode {
  return {
    entry,
    children: [],
    isExpanded: false,
    isLoading: false,
    isLoaded: false,
    depth,
  };
}

/**
 * Checks if the Electron API is available.
 */
function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Creates mock data for development when Electron is not available.
 */
function createMockEntries(): FileEntry[] {
  return [
    { name: 'Documents', path: '/mock/Documents', isDirectory: true, size: 0, modifiedAt: Date.now(), extension: '' },
    { name: 'Projects', path: '/mock/Projects', isDirectory: true, size: 0, modifiedAt: Date.now(), extension: '' },
    { name: 'report.docx', path: '/mock/report.docx', isDirectory: false, size: 15000, modifiedAt: Date.now(), extension: '.docx' },
    { name: 'presentation.pptx', path: '/mock/presentation.pptx', isDirectory: false, size: 250000, modifiedAt: Date.now(), extension: '.pptx' },
    { name: 'data.xlsx', path: '/mock/data.xlsx', isDirectory: false, size: 45000, modifiedAt: Date.now(), extension: '.xlsx' },
    { name: 'notes.txt', path: '/mock/notes.txt', isDirectory: false, size: 1200, modifiedAt: Date.now(), extension: '.txt' },
    { name: 'image.png', path: '/mock/image.png', isDirectory: false, size: 89000, modifiedAt: Date.now(), extension: '.png' },
  ];
}

/**
 * Creates mock child entries for a directory.
 */
function createMockChildEntries(parentPath: string): FileEntry[] {
  return [
    { name: 'Subfolder', path: `${parentPath}/Subfolder`, isDirectory: true, size: 0, modifiedAt: Date.now(), extension: '' },
    { name: 'file1.txt', path: `${parentPath}/file1.txt`, isDirectory: false, size: 500, modifiedAt: Date.now(), extension: '.txt' },
    { name: 'file2.md', path: `${parentPath}/file2.md`, isDirectory: false, size: 800, modifiedAt: Date.now(), extension: '.md' },
  ];
}

/**
 * Finds and updates a node in the tree by path.
 */
function updateNodeInTree(
  nodes: TreeNode[],
  targetPath: string,
  updateFn: (node: TreeNode) => TreeNode
): TreeNode[] {
  return nodes.map((node) => {
    if (node.entry.path === targetPath) {
      return updateFn(node);
    }
    if (node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetPath, updateFn),
      };
    }
    return node;
  });
}

/**
 * Hook for managing file tree state and interactions.
 *
 * Features:
 * - Lazy loading of directory contents
 * - Expand/collapse directories
 * - Node selection
 * - Refresh functionality
 *
 * @param workspacePath - The root path of the workspace
 * @returns File tree state and actions
 */
export function useFileTree(workspacePath: string | null): FileTreeState & FileTreeActions {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  /**
   * Lists files in a directory.
   */
  const listFiles = useCallback(async (directoryPath: string): Promise<FileEntry[]> => {
    if (!isElectronAvailable()) {
      // Mock data for development
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (directoryPath.includes('/mock/')) {
        return createMockChildEntries(directoryPath);
      }
      return createMockEntries();
    }

    const result = await window.electronAPI.listFiles(directoryPath);
    if (!result.success) {
      throw new Error(result.error || 'Failed to list files');
    }
    return result.entries;
  }, []);

  /**
   * Loads the root directory contents.
   */
  const loadRoot = useCallback(async (): Promise<void> => {
    if (!workspacePath) {
      setNodes([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const entries = await listFiles(workspacePath);
      const rootNodes = entries.map((entry) => createTreeNode(entry, 0));
      setNodes(rootNodes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load directory';
      setError(message);
      setNodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath, listFiles]);

  /**
   * Refreshes the entire tree.
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadRoot();
  }, [loadRoot]);

  /**
   * Toggles expansion of a directory node.
   */
  const toggleExpand = useCallback(async (nodePath: string): Promise<void> => {
    // Find the node to check its current state
    const findNode = (searchNodes: TreeNode[]): TreeNode | null => {
      for (const node of searchNodes) {
        if (node.entry.path === nodePath) {
          return node;
        }
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    const targetNode = findNode(nodes);
    if (!targetNode || !targetNode.entry.isDirectory) {
      return;
    }

    // If already expanded, just collapse
    if (targetNode.isExpanded) {
      setNodes((prev) =>
        updateNodeInTree(prev, nodePath, (node) => ({
          ...node,
          isExpanded: false,
        }))
      );
      return;
    }

    // If not loaded yet, load children first
    if (!targetNode.isLoaded) {
      // Set loading state
      setNodes((prev) =>
        updateNodeInTree(prev, nodePath, (node) => ({
          ...node,
          isLoading: true,
        }))
      );

      try {
        const entries = await listFiles(nodePath);
        const childNodes = entries.map((entry) =>
          createTreeNode(entry, targetNode.depth + 1)
        );

        setNodes((prev) =>
          updateNodeInTree(prev, nodePath, (node) => ({
            ...node,
            children: childNodes,
            isExpanded: true,
            isLoading: false,
            isLoaded: true,
          }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load directory';
        console.error(`[useFileTree] Failed to load ${nodePath}: ${message}`);

        setNodes((prev) =>
          updateNodeInTree(prev, nodePath, (node) => ({
            ...node,
            isLoading: false,
          }))
        );
      }
    } else {
      // Already loaded, just expand
      setNodes((prev) =>
        updateNodeInTree(prev, nodePath, (node) => ({
          ...node,
          isExpanded: true,
        }))
      );
    }
  }, [nodes, listFiles]);

  /**
   * Selects a node.
   */
  const selectNode = useCallback((nodePath: string): void => {
    setSelectedPath(nodePath);
  }, []);

  /**
   * Clears the selection.
   */
  const clearSelection = useCallback((): void => {
    setSelectedPath(null);
  }, []);

  // Load root when workspace path changes
  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  return {
    // State
    nodes,
    isLoading,
    error,
    selectedPath,
    // Actions
    refresh,
    toggleExpand,
    selectNode,
    clearSelection,
  };
}
