import { Component, type ReactNode } from "react";

/** Keeps one bad screen from white-screening the whole prototype. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-semibold">This screen hit a snag</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            A render error occurred in the prototype. Try another screen from the sidebar.
          </p>
          <pre className="mt-4 max-w-lg overflow-auto rounded-xl border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
