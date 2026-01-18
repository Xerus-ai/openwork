import type { ReactElement } from 'react';
import { Layout } from '@/components/Layout';
import { ChatPane } from '@/components/ChatPane';
import { ExecutionPane } from '@/components/ExecutionPane';
import { StatePane } from '@/components/StatePane';

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
        statePane={<StatePane />}
      />
    </div>
  );
}

export default App;
