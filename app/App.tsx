import type { ReactElement } from 'react';
import { useState } from 'react';

/**
 * Root React component for Claude Cowork.
 * This is the entry point for the renderer process UI.
 */
function App(): ReactElement {
  const [count, setCount] = useState(0);

  function handleIncrement(): void {
    setCount((previousCount) => previousCount + 1);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Cowork</h1>
        <p>Cross-platform agentic workspace</p>
      </header>
      <main className="app-main">
        <section className="test-section">
          <p>React is working!</p>
          <button type="button" onClick={handleIncrement}>
            Count: {count}
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
