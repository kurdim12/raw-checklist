import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the stack to the console so users can copy/paste it.
    // eslint-disable-next-line no-console
    console.error('UI crashed:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
    location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <pre className="text-xs text-left whitespace-pre-wrap bg-secondary/60 p-3 rounded-md max-h-48 overflow-auto">
              {this.state.error.message}
            </pre>
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
