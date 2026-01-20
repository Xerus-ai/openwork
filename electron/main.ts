/**
 * Electron main process entry point.
 * Handles app lifecycle, window management, and IPC initialization.
 */

// Load environment variables from .env file FIRST
// This must happen before any other imports that might use env vars
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Determine the path to .env file (project root)
// When compiled, this runs from dist/electron/main.js, so we go up 2 levels
const __filename_init = fileURLToPath(import.meta.url);
const __dirname_init = path.dirname(__filename_init);
const projectRoot = path.resolve(__dirname_init, '..', '..');
const envPath = path.join(projectRoot, '.env');

// Load .env file
const envResult = dotenvConfig({ path: envPath });
if (envResult.error) {
  console.warn('[Main] Failed to load .env file:', envResult.error.message);
} else {
  console.log('[Main] Loaded environment from:', envPath);
}

import { app, BrowserWindow, dialog } from 'electron';
import {
  isClaudeCodeInstalled,
  getInstallInstructions,
} from './utils/claude-code-check.js';
import { initializeSkills } from './utils/skills-installer.js';
import {
  createMainWindow,
  loadWindowContent,
  centerWindow,
} from './window-manager.js';
import {
  registerIpcHandlers,
  removeIpcHandlers,
  setupWindowStateListeners,
} from './ipc-handlers.js';
import { registerAgentBridge, removeAgentBridge } from './ipc/agent-bridge.js';
import { initializeChatHandlerService, cleanupChatHandlerService } from './ipc/chat-handlers.js';
import { initializeErrorHandler, cleanupErrorHandler } from './error-handler.js';
import { getConfig } from './config/app-config.js';

// Use already-defined __dirname from dotenv setup
const __dirname = __dirname_init;

// Environment detection
const isDevelopment = process.env['NODE_ENV'] === 'development';

// Main window reference - kept alive to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

/**
 * Get the main window instance.
 * Used by IPC handlers to reference the window.
 */
function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Create the main application window.
 */
async function createWindow(): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = createMainWindow({
    preloadPath,
    isDevelopment,
    title: 'Claude Cowork',
  });

  // Center the window on screen
  centerWindow(mainWindow);

  // Set up window state change listeners
  setupWindowStateListeners(mainWindow);

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load content (dev server or production files)
  await loadWindowContent(mainWindow, isDevelopment);

  console.log('[Main] Window created successfully');
}

/**
 * Initialize the application.
 */
async function initializeApp(): Promise<void> {
  console.log('[Main] Initializing application...');
  console.log(`[Main] Development mode: ${isDevelopment}`);
  console.log(`[Main] Platform: ${process.platform}`);
  console.log(`[Main] Electron version: ${process.versions['electron']}`);
  console.log(`[Main] Node version: ${process.versions['node']}`);

  // Load stored OpenRouter API key and set environment variables
  const storedApiKey = getConfig('openRouterApiKey');
  if (storedApiKey) {
    process.env['ANTHROPIC_AUTH_TOKEN'] = storedApiKey;
    process.env['ANTHROPIC_BASE_URL'] = 'https://openrouter.ai/api';
    // Clear ANTHROPIC_API_KEY to avoid conflicts
    delete process.env['ANTHROPIC_API_KEY'];
    console.log('[Main] Loaded stored OpenRouter API key');
  }

  // Initialize error handler first
  initializeErrorHandler(getMainWindow, {
    showDialogs: !isDevelopment, // Only show dialogs in production
    dialogSeverityThreshold: 'critical',
    logToConsole: true,
  });

  // Check if Claude Code CLI is installed (required for Agent SDK)
  const claudeCodeInstalled = await isClaudeCodeInstalled();
  if (!claudeCodeInstalled) {
    const instructions = getInstallInstructions();
    console.warn('[Main] Claude Code CLI not found. Agent features will not work.');

    // Show warning dialog with install instructions
    dialog.showMessageBox({
      type: 'warning',
      title: 'Claude Code Required',
      message: 'Claude Code CLI is required for this application to work.',
      detail: `Please install Claude Code CLI using:\n\n${instructions.current}\n\nAfter installation, restart the application.`,
      buttons: ['OK'],
    });
  } else {
    console.log('[Main] Claude Code CLI detected');
  }

  // Install bundled skills to user's ~/.claude/skills/ directory
  const skillsResult = initializeSkills();
  if (skillsResult.installedSkills.length > 0) {
    console.log(`[Main] Installed ${skillsResult.installedSkills.length} skills`);
  }
  if (skillsResult.errors.length > 0) {
    console.warn('[Main] Skills installation errors:', skillsResult.errors);
  }

  // Register IPC handlers before creating window
  registerIpcHandlers(getMainWindow);

  // Register agent bridge for agent communication
  registerAgentBridge(getMainWindow);

  // Initialize chat handler service to process messages
  initializeChatHandlerService();

  // Create the main window
  await createWindow();

  console.log('[Main] Application initialized');
}

/**
 * Handle graceful shutdown.
 */
function handleShutdown(): void {
  console.log('[Main] Shutting down...');

  // Cleanup chat handler service
  cleanupChatHandlerService();

  // Remove agent bridge handlers
  removeAgentBridge();

  // Remove IPC handlers
  removeIpcHandlers();

  // Cleanup error handler
  cleanupErrorHandler();

  // Close all windows
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  console.log('[Main] Shutdown complete');
}

// App lifecycle events

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await initializeApp();

  // On macOS, re-create window when dock icon is clicked and no windows exist
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  handleShutdown();
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window when second instance is attempted
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// Security: Disable navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Only allow navigation within the app
    if (parsedUrl.protocol !== 'file:' && !navigationUrl.startsWith('http://localhost')) {
      console.warn(`[Security] Blocked navigation to: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  // Block new window creation
  contents.setWindowOpenHandler(({ url }) => {
    console.warn(`[Security] Blocked window open for: ${url}`);
    return { action: 'deny' };
  });
});

// Note: Uncaught exception and unhandled rejection handlers are
// registered by initializeErrorHandler() for centralized error handling.
