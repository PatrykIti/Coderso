import { Component, type ReactNode } from "react";

type AdminRouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type AdminRouteErrorBoundaryState = {
  hasError: boolean;
};

export class AdminRouteErrorBoundary extends Component<
  AdminRouteErrorBoundaryProps,
  AdminRouteErrorBoundaryState
> {
  state: AdminRouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AdminRouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: AdminRouteErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div role="alert">
          <h1 className="text-base font-semibold text-foreground">Admin route failed to load</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Reload the page to fetch the latest admin assets.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md border px-3 py-2 text-sm font-medium"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
