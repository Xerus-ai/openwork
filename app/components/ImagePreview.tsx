import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, RotateCw, Maximize, Download } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Props for the ImagePreview component.
 */
export interface ImagePreviewProps {
  /**
   * Image source URL or data URL.
   */
  src: string;

  /**
   * Alt text for accessibility.
   */
  alt: string;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Zoom levels available for the image preview.
 */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/**
 * Default zoom level index (100%).
 */
const DEFAULT_ZOOM_INDEX = 3;

/**
 * Image preview component with zoom and rotation controls.
 *
 * Features:
 * - Zoom in/out with predefined levels
 * - Rotation in 90-degree increments
 * - Fit to container option
 * - Download image button
 * - Drag to pan when zoomed
 * - Keyboard navigation support
 */
export const ImagePreview = memo(function ImagePreview({
  src,
  alt,
  className,
}: ImagePreviewProps): ReactElement {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);

  // Type assertion is safe because we constrain zoomIndex to valid range
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, alt]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: event.clientX - position.x,
          y: event.clientY - position.y,
        });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      if (event.deltaY < 0) {
        setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
      } else {
        setZoomIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
        case '0':
          handleReset();
          break;
      }
    },
    [handleZoomIn, handleZoomOut, handleRotate, handleReset]
  );

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (imageError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6',
          className
        )}
      >
        <div className="text-6xl mb-4 text-muted-foreground">?</div>
        <p className="text-sm text-muted-foreground">
          Unable to load image
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      data-testid="image-preview"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleZoomOut}
            disabled={zoomIndex === 0}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleZoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRotate}
            aria-label="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleReset}
            aria-label="Reset view"
          >
            <Maximize className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
            aria-label="Download image"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div
        className={cn(
          'flex-1 overflow-hidden flex items-center justify-center bg-[#1a1a1a]',
          zoom > 1 && 'cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          draggable={false}
          onError={handleImageError}
        />
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-1 text-xs text-muted-foreground text-center border-t bg-muted/30">
        <span>Scroll to zoom</span>
        <span className="mx-2">|</span>
        <span>Drag to pan</span>
        <span className="mx-2">|</span>
        <span>
          <kbd className="px-1 bg-muted rounded">+</kbd>/
          <kbd className="px-1 bg-muted rounded">-</kbd> zoom
        </span>
        <span className="mx-2">|</span>
        <span>
          <kbd className="px-1 bg-muted rounded">R</kbd> rotate
        </span>
        <span className="mx-2">|</span>
        <span>
          <kbd className="px-1 bg-muted rounded">0</kbd> reset
        </span>
      </div>
    </div>
  );
});
