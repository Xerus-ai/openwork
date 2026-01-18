import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  BarChart3,
  Layout,
  FolderOpen,
  Calendar,
  MessageSquare,
  Search,
  Presentation,
} from 'lucide-react';

/**
 * Defines a quick action tile that can be clicked to populate the chat input.
 */
export interface QuickAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action tile */
  label: string;
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Prompt text to populate in the chat input when clicked */
  prompt: string;
  /** Optional description for accessibility */
  description?: string;
}

/**
 * Predefined quick actions for common tasks.
 * These match the UI reference design and cover typical user workflows.
 */
export const quickActions: QuickAction[] = [
  {
    id: 'create-file',
    label: 'Create a file',
    icon: FileText,
    prompt: 'Create a new document for me. What type of file would you like? (Word document, spreadsheet, presentation, etc.)',
    description: 'Create a new document, spreadsheet, or presentation',
  },
  {
    id: 'crunch-data',
    label: 'Crunch data',
    icon: BarChart3,
    prompt: 'Help me analyze some data. Please share the data file or describe what you want to analyze.',
    description: 'Analyze data and create visualizations',
  },
  {
    id: 'make-prototype',
    label: 'Make a prototype',
    icon: Layout,
    prompt: 'Help me create a prototype or mockup. What are you building?',
    description: 'Create a prototype or design mockup',
  },
  {
    id: 'organize-files',
    label: 'Organize files',
    icon: FolderOpen,
    prompt: 'Help me organize my files. Which folder would you like me to help organize?',
    description: 'Organize and structure files in a folder',
  },
  {
    id: 'prep-for-day',
    label: 'Prep for the day',
    icon: Calendar,
    prompt: 'Help me prepare for today. What meetings or tasks do you have coming up?',
    description: 'Plan and prepare for your day',
  },
  {
    id: 'send-message',
    label: 'Send a message',
    icon: MessageSquare,
    prompt: 'Help me draft a message. Who is it for and what would you like to communicate?',
    description: 'Draft an email or message',
  },
  {
    id: 'research-topic',
    label: 'Research topic',
    icon: Search,
    prompt: 'Help me research a topic. What would you like to learn about?',
    description: 'Research and summarize information on a topic',
  },
  {
    id: 'make-presentation',
    label: 'Make presentation',
    icon: Presentation,
    prompt: 'Help me create a presentation. What is the topic and who is the audience?',
    description: 'Create a PowerPoint presentation',
  },
];

/**
 * Returns a subset of quick actions for display.
 * The UI shows 6 tiles in a 3x2 grid by default.
 *
 * @param count - Number of actions to return (default: 6)
 * @returns Array of quick actions
 */
export function getDisplayActions(count = 6): QuickAction[] {
  return quickActions.slice(0, count);
}
