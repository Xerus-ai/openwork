/**
 * Window creation and management for Electron main process.
 * Handles window lifecycle, state persistence, and security configuration.
 */

import { BrowserWindow, screen } from 'electron';
import path from 'path';

// Window configuration constants
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;

export interface WindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  preloadPath: string;
  isDevelopment: boolean;
}

/**
 * Creates the main application window with security best practices.
 */
export function createMainWindow(config: WindowConfig): BrowserWindow {
  const { width, height } = calculateWindowSize(config);

  const window = new BrowserWindow({
    width,
    height,
    minWidth: config.minWidth ?? MIN_WIDTH,
    minHeight: config.minHeight ?? MIN_HEIGHT,
    title: config.title ?? 'Claude Cowork',
    show: false, // Show after ready-to-show to prevent flash
    backgroundColor: '#1a1a2e', // Dark background to match UI
    webPreferences: {
      preload: config.preloadPath,
      // Security settings
      nodeIntegration: false, // Disable node in renderer for security
      contextIsolation: true, // Enable context isolation for security
      sandbox: true, // Enable sandbox for additional security
      webviewTag: false, // Disable webview tag
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      // Performance settings
      backgroundThrottling: false, // Keep agent running in background
    },
    // Frame settings for custom title bar (optional)
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Show window when ready to prevent white flash
  window.once('ready-to-show', () => {
    window.show();
    if (config.isDevelopment) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Set Content Security Policy
  setSecurityHeaders(window);

  return window;
}

/**
 * Calculate window size based on screen dimensions and config.
 */
function calculateWindowSize(config: WindowConfig): { width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Use config values or defaults, but don't exceed screen size
  const width = Math.min(config.width ?? DEFAULT_WIDTH, screenWidth);
  const height = Math.min(config.height ?? DEFAULT_HEIGHT, screenHeight);

  return { width, height };
}

/**
 * Set security headers and CSP for the window.
 */
function setSecurityHeaders(window: BrowserWindow): void {
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // Allow self for scripts, styles, and images
          "default-src 'self'",
          // Allow inline scripts for development (Vite HMR)
          // In production, this should be more restrictive
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          // Allow connections to local dev server and API
          "connect-src 'self' ws: wss: https://api.anthropic.com",
          // Allow fonts from self
          "font-src 'self' data:",
          // Allow images from self and data URIs
          "img-src 'self' data: blob:",
        ].join('; '),
      },
    });
  });
}

/**
 * Get the preload script path based on environment.
 */
export function getPreloadPath(isDevelopment: boolean): string {
  if (isDevelopment) {
    // In development, use the source file compiled by TypeScript
    return path.join(__dirname, 'preload.js');
  }
  // In production, use the bundled preload
  return path.join(__dirname, 'preload.js');
}

/**
 * Load content into the window (development or production URL).
 */
export async function loadWindowContent(
  window: BrowserWindow,
  isDevelopment: boolean
): Promise<void> {
  if (isDevelopment) {
    // In development, load from Vite dev server
    const devServerUrl = process.env['VITE_DEV_SERVER_URL'] ?? 'http://localhost:5173';
    await window.loadURL(devServerUrl);
  } else {
    // In production, load from built files
    const indexPath = path.join(__dirname, '../app/index.html');
    await window.loadFile(indexPath);
  }
}

/**
 * Center window on screen.
 */
export function centerWindow(window: BrowserWindow): void {
  window.center();
}

/**
 * Manage window state (maximize, minimize, close).
 */
export const WindowStateManager = {
  minimize(window: BrowserWindow): void {
    window.minimize();
  },

  maximize(window: BrowserWindow): void {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  },

  close(window: BrowserWindow): void {
    window.close();
  },

  isMaximized(window: BrowserWindow): boolean {
    return window.isMaximized();
  },

  toggleFullScreen(window: BrowserWindow): void {
    window.setFullScreen(!window.isFullScreen());
  },
};
