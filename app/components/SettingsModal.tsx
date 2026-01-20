/**
 * SettingsModal component for managing application settings.
 * Allows users to configure their OpenRouter API key and display name.
 */

import type { ReactElement } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@/components/ui';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';

/**
 * Props for the SettingsModal component.
 */
export interface SettingsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when settings are saved */
  onSave?: () => void;
}

/**
 * SettingsModal provides a UI for configuring application settings.
 *
 * Features:
 * - OpenRouter API key input with show/hide toggle
 * - User display name configuration
 * - Persistent storage via electron-store
 */
export function SettingsModal({
  open,
  onClose,
  onSave,
}: SettingsModalProps): ReactElement {
  const [apiKey, setApiKey] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current settings when modal opens
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    const api = window.electronAPI;
    if (!api) {
      setError('Electron API not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const settings = await api.getSettings();
      setApiKey(settings.openRouterApiKey ?? '');
      setUserName(settings.userName ?? 'Test User');
    } catch (err) {
      console.error('[SettingsModal] Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) {
      setError('Electron API not available');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save API key (empty string becomes null)
      await api.setApiKey(apiKey.trim() || null);

      // Save user name (default to Test User if empty)
      await api.setUserName(userName.trim() || 'Test User');

      console.log('[SettingsModal] Settings saved successfully');
      onSave?.();
      onClose();
    } catch (err) {
      console.error('[SettingsModal] Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, userName, onSave, onClose]);

  const toggleShowApiKey = useCallback(() => {
    setShowApiKey((prev) => !prev);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-cowork-text">Settings</DialogTitle>
          <DialogDescription className="text-cowork-text-muted">
            Configure your API key and preferences.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-cowork-text-muted">
            Loading settings...
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* User Name */}
            <div className="grid gap-2">
              <label
                htmlFor="userName"
                className="text-sm font-medium text-cowork-text"
              >
                Display Name
              </label>
              <Input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white border-cowork-border"
              />
            </div>

            {/* API Key */}
            <div className="grid gap-2">
              <label
                htmlFor="apiKey"
                className="text-sm font-medium text-cowork-text"
              >
                OpenRouter API Key
              </label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="pr-10 bg-white border-cowork-border"
                />
                <button
                  type="button"
                  onClick={toggleShowApiKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cowork-text-muted hover:text-cowork-text"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-cowork-text-muted">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cowork-accent hover:underline inline-flex items-center gap-1"
                >
                  OpenRouter
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-cowork-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="bg-cowork-accent hover:bg-cowork-accent-hover text-white"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
