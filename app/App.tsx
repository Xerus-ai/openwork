import type { ReactElement } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

/**
 * Placeholder component for the Chat pane.
 * Will be replaced with ChatPane component in task 020.
 */
function ChatPanePlaceholder(): ReactElement {
  return (
    <div className="h-full p-4 flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Chat</h2>
        <p className="text-sm text-muted-foreground">
          Message history and input will appear here
        </p>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
            <CardDescription className="text-xs">
              Common tasks (placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {['Create a file', 'Crunch data', 'Organize files', 'Research topic'].map(
              (action) => (
                <div
                  key={action}
                  className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors text-sm"
                >
                  {action}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Input area placeholder */}
      <div className="mt-4 p-3 rounded-lg border bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Type a task here or use / for more tools
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder component for the Execution pane.
 * Will be replaced with ExecutionPane component in task 025.
 */
function ExecutionPanePlaceholder(): ReactElement {
  return (
    <div className="h-full p-4 flex flex-col items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">~</div>
        <h2 className="text-xl font-semibold mb-2">
          Let's knock something off your list
        </h2>
        <p className="text-muted-foreground">
          Select a quick action or type a task to get started.
          Execution output and file previews will appear here.
        </p>
      </div>
    </div>
  );
}

/**
 * Placeholder component for the State pane.
 * Will be replaced with StatePane component in tasks 028-030.
 */
function StatePanePlaceholder(): ReactElement {
  return (
    <div className="h-full p-4 space-y-4">
      {/* Progress section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Steps will show as the task unfolds.
          </p>
        </CardContent>
      </Card>

      {/* Artifacts section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <span className="text-muted-foreground text-lg">+</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Outputs created during the task land here.
          </p>
        </CardContent>
      </Card>

      {/* Context section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Context</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Track the tools and files in use as Claude works.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Root React component for Claude Cowork.
 * Renders the three-pane layout with Chat, Execution, and State sections.
 */
function App(): ReactElement {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Layout
        chatPane={<ChatPanePlaceholder />}
        executionPane={<ExecutionPanePlaceholder />}
        statePane={<StatePanePlaceholder />}
      />
    </div>
  );
}

export default App;
