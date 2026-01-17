import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

/**
 * Root React component for Claude Cowork.
 * Demonstrates shadcn/ui components with proper theming.
 */
function App(): ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setInputValue(event.target.value);
  }

  function toggleDarkMode(): void {
    document.documentElement.classList.toggle('dark');
  }

  return (
    <div className="min-h-screen p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Claude Cowork
        </h1>
        <p className="text-muted-foreground">
          Cross-platform agentic workspace
        </p>
      </header>

      <main className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui Components</CardTitle>
            <CardDescription>
              Testing Button, Input, Card, and Select components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Component</label>
              <Input
                placeholder="Type something..."
                value={inputValue}
                onChange={handleInputChange}
              />
              {inputValue && (
                <p className="text-sm text-muted-foreground">
                  You typed: {inputValue}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Component</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonnet">Claude Sonnet 4.5</SelectItem>
                  <SelectItem value="opus">Claude Opus 4.5</SelectItem>
                  <SelectItem value="haiku">Claude Haiku 3.5</SelectItem>
                </SelectContent>
              </Select>
              {selectedModel && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedModel}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 flex-wrap">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme Toggle</CardTitle>
            <CardDescription>Switch between light and dark mode</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={toggleDarkMode} variant="outline">
              Toggle Dark Mode
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>Available button sizes</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2 items-center">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">+</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default App;
