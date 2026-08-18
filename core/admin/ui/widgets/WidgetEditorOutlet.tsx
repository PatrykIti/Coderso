import { Component, Suspense, useState, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type {
  EditorMode,
  WidgetBlockPatcher,
  WidgetDefinition,
  WidgetEditorComponent,
  WidgetEditorContext,
} from "../../../widgets/types";
import { reloadWidgetEditorLoader } from "./registry";

export type WidgetEditorOutletProps<T extends Record<string, unknown>> = {
  definition: WidgetDefinition<T>;
  mode: EditorMode;
  value: T;
  onChange: (next: T) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
  onBlockPatch?: WidgetBlockPatcher;
  context?: WidgetEditorContext;
};

export type WidgetEditorLoadingStateProps = {
  widgetTitle: string;
  mode: EditorMode;
};

export function WidgetEditorLoadingState({ widgetTitle, mode }: WidgetEditorLoadingStateProps) {
  return (
    <div
      role="status"
      data-widget-editor-loading={mode}
      className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-background/40 px-4 py-8 text-sm text-muted-foreground"
    >
      <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      <span>
        Loading {widgetTitle} {mode} editor…
      </span>
    </div>
  );
}

export type WidgetEditorErrorBoundaryProps = {
  resetKey: string;
  widgetTitle: string;
  mode: EditorMode;
  onRetry: () => void;
  children: ReactNode;
};

type WidgetEditorErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Bounded error state for a single widget editor render. It is keyed by
 * widget type + mode so selection changes never show a stale crash, and its
 * retry action re-attempts the dynamic import through the parent outlet. The
 * UI never renders the underlying error payload; it only shows a fixed
 * message and the widget title.
 */
export class WidgetEditorErrorBoundary extends Component<
  WidgetEditorErrorBoundaryProps,
  WidgetEditorErrorBoundaryState
> {
  public state: WidgetEditorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetEditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: WidgetEditorErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      // Selection changed while this boundary showed an error; drop the stale
      // crash state so the new editor render starts clean.
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        data-widget-editor-error={this.props.mode}
        className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
      >
        <Alert variant="destructive">
          <AlertTitle>Editor failed to load</AlertTitle>
          <AlertDescription>
            The {this.props.widgetTitle} {this.props.mode} editor could not be loaded. Your block
            data is untouched. Try again or switch widgets.
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-widget-editor-retry={this.props.mode}
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          >
            Try again
          </Button>
          <span className="text-xs text-muted-foreground">
            If this keeps happening, check your connection and reload the admin.
          </span>
        </div>
      </div>
    );
  }
}

/**
 * Resolves the widget editor for one mode and renders it behind a bounded
 * error boundary and a local Suspense fallback. Builder panels keep their
 * surrounding chrome, tabs, slot controls, and preview state; this outlet
 * owns only editor resolution and the final editor render. Lazy editor
 * modules therefore suspend inside the panel instead of blanking the builder
 * shell, and a retry rebuilds the lazy loader so a failed chunk can be
 * fetched again.
 */
export function WidgetEditorOutlet<T extends Record<string, unknown>>({
  definition,
  mode,
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
  context,
}: WidgetEditorOutletProps<T>) {
  const selectionKey = `${definition.type}:${mode}`;
  const [retryState, setRetryState] = useState<{
    key: string;
    editor: WidgetEditorComponent<T> | null;
  }>({ key: selectionKey, editor: null });

  const Editor =
    retryState.key === selectionKey && retryState.editor
      ? retryState.editor
      : definition.editor[mode];

  const handleRetry = () => {
    setRetryState({ key: selectionKey, editor: reloadWidgetEditorLoader(Editor) });
  };

  return (
    <WidgetEditorErrorBoundary
      resetKey={selectionKey}
      widgetTitle={definition.title}
      mode={mode}
      onRetry={handleRetry}
    >
      <Suspense fallback={<WidgetEditorLoadingState widgetTitle={definition.title} mode={mode} />}>
        <Editor
          value={value}
          onChange={onChange}
          variant={variant}
          onVariantChange={onVariantChange}
          onBlockPatch={onBlockPatch}
          context={context}
        />
      </Suspense>
    </WidgetEditorErrorBoundary>
  );
}
