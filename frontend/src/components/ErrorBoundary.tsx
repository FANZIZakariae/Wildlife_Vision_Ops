import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "./ui";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="space-y-3 text-center">
          <h2 className="text-lg font-semibold">This view failed to render</h2>
          <p className="text-sm text-muted-foreground">
            The console is still running — reload the view to try again.
          </p>
          <p className="font-mono text-xs text-danger">{this.state.error.message}</p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload console
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
