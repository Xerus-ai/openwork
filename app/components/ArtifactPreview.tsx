/**
 * ArtifactPreview component for displaying document/file previews.
 * Supports PDF, PowerPoint, images, and other document types.
 */

import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Artifact } from '@/hooks/useArtifacts';

/**
 * Props for the ArtifactPreview component.
 */
export interface ArtifactPreviewProps {
  /** The artifact to preview */
  artifact: Artifact | null;
  /** Callback when the preview is closed */
  onClose?: () => void;
  /** Callback to download the artifact */
  onDownload?: (artifact: Artifact) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the PageNavigation component.
 */
interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Page navigation controls for multi-page documents.
 */
function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
}: PageNavigationProps): ReactElement {
  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  return (
    <div className="flex items-center gap-2 bg-cowork-card-bg rounded-lg px-3 py-1.5 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm text-cowork-text tabular-nums">
        Page {currentPage} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * Props for the ZoomControls component.
 */
interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Zoom controls for the preview.
 */
function ZoomControls({
  zoom,
  onZoomChange,
  minZoom = 50,
  maxZoom = 200,
}: ZoomControlsProps): ReactElement {
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 25, maxZoom);
    onZoomChange(newZoom);
  }, [zoom, maxZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 25, minZoom);
    onZoomChange(newZoom);
  }, [zoom, minZoom, onZoomChange]);

  return (
    <div className="flex items-center gap-1 bg-cowork-card-bg rounded-lg px-2 py-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
        aria-label="Zoom out"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <span className="text-xs text-cowork-text-muted w-10 text-center tabular-nums">
        {zoom}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom in"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * Props for the ImagePreviewContent component.
 */
interface ImagePreviewContentProps {
  artifact: Artifact;
  zoom: number;
}

/**
 * Image preview content.
 */
function ImagePreviewContent({ artifact, zoom }: ImagePreviewContentProps): ReactElement {
  return (
    <div className="flex items-center justify-center h-full overflow-auto p-4">
      <img
        src={`file://${artifact.path}`}
        alt={artifact.name}
        className="max-w-full max-h-full object-contain"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
      />
    </div>
  );
}

/**
 * Props for the DocumentPreviewContent component.
 */
interface DocumentPreviewContentProps {
  artifact: Artifact;
  zoom: number;
  currentPage: number;
}

/**
 * Document preview content (PDF, PPTX, etc.).
 * This is a placeholder that would be replaced with actual document rendering.
 */
function DocumentPreviewContent({
  artifact,
  zoom,
  currentPage,
}: DocumentPreviewContentProps): ReactElement {
  // In a real implementation, this would use a PDF/PPTX renderer
  // For now, show a placeholder with document info
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
    >
      {/* Document preview placeholder */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Simulated slide/page header */}
        <div className="bg-gradient-to-r from-cowork-accent/10 to-cowork-accent/5 px-6 py-4 border-b border-cowork-border">
          <h2 className="text-xl font-semibold text-cowork-text">{artifact.name}</h2>
          <p className="text-sm text-cowork-text-muted mt-1">Page {currentPage}</p>
        </div>

        {/* Simulated content area */}
        <div className="p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-lg bg-cowork-card-bg flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-cowork-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="text-cowork-text-muted">
            Document preview would render here
          </p>
          <p className="text-xs text-cowork-text-muted mt-2">
            {artifact.type} - {formatFileSize(artifact.size)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get total pages for an artifact (placeholder - would need actual document parsing).
 */
function getTotalPages(artifact: Artifact): number {
  // In a real implementation, this would parse the document to get page count
  // For now, return a placeholder value based on file type
  const ext = artifact.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pptx':
    case 'ppt':
      return 9; // Placeholder
    case 'pdf':
      return 5; // Placeholder
    default:
      return 1;
  }
}

/**
 * Check if artifact is an image.
 */
function isImage(artifact: Artifact): boolean {
  const imageTypes = ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  return imageTypes.some(
    (type) =>
      artifact.type.toLowerCase().includes(type) ||
      artifact.name.toLowerCase().endsWith(`.${type}`)
  );
}

/**
 * Empty state when no artifact is selected.
 */
function EmptyPreview(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-lg bg-cowork-card-bg flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-cowork-text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <p className="text-cowork-text-muted">
        Select an artifact to preview
      </p>
    </div>
  );
}

/**
 * ArtifactPreview displays a preview of documents, images, and other files.
 *
 * Features:
 * - Page navigation for multi-page documents
 * - Zoom controls
 * - Download button
 * - Support for images, PDFs, and presentations
 *
 * @example
 * <ArtifactPreview
 *   artifact={selectedArtifact}
 *   onClose={() => setSelectedArtifact(null)}
 *   onDownload={handleDownload}
 * />
 */
export const ArtifactPreview = memo(function ArtifactPreview({
  artifact,
  onClose,
  onDownload,
  className,
}: ArtifactPreviewProps): ReactElement {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  const handleDownload = useCallback(() => {
    if (artifact && onDownload) {
      onDownload(artifact);
    }
  }, [artifact, onDownload]);

  // Reset state when artifact changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  if (!artifact) {
    return (
      <div className={cn('flex flex-col h-full bg-cowork-bg', className)}>
        <EmptyPreview />
      </div>
    );
  }

  const totalPages = getTotalPages(artifact);
  const isImageFile = isImage(artifact);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-cowork-bg',
        'bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)]',
        'bg-[size:20px_20px]',
        className
      )}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cowork-border bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Page navigation (for multi-page documents) */}
          {!isImageFile && totalPages > 1 && (
            <PageNavigation
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <ZoomControls zoom={zoom} onZoomChange={setZoom} />

          {/* Download button */}
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {/* Close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto">
        {isImageFile ? (
          <ImagePreviewContent artifact={artifact} zoom={zoom} />
        ) : (
          <DocumentPreviewContent
            artifact={artifact}
            zoom={zoom}
            currentPage={currentPage}
          />
        )}
      </div>

      {/* Footer with file info */}
      <div className="flex items-center justify-center px-4 py-2 border-t border-cowork-border bg-white/80 backdrop-blur-sm">
        <span className="text-xs text-cowork-text-muted">
          {artifact.name} - {formatFileSize(artifact.size)}
        </span>
      </div>
    </div>
  );
});
