import type { ReactElement } from 'react';
import { Layout } from '@/components/Layout';
import { ChatPane } from '@/components/ChatPane';
import { ExecutionPane } from '@/components/ExecutionPane';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

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
        chatPane={<ChatPane />}
        executionPane={<ExecutionPane />}
        statePane={<StatePanePlaceholder />}
      />
    </div>
  );
}

export default App;
