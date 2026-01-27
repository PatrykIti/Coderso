import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type PluginIdentity = {
  name: string;
  version: string;
};

export type PluginErrorBoundaryProps = {
  plugin: PluginIdentity;
  onDisable?: (plugin: PluginIdentity) => void;
  children: React.ReactNode;
};

type PluginErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class PluginErrorBoundary extends React.Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  public state: PluginErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleDisable = () => {
    this.props.onDisable?.(this.props.plugin);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { plugin } = this.props;

    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="space-y-2">
          <p className="text-sm font-medium text-destructive">Plugin crash</p>
          <div>
            <p className="text-lg font-semibold">{plugin.name}</p>
            <p className="text-sm text-muted-foreground">v{plugin.version}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Plugin encountered an error</AlertTitle>
            <AlertDescription>
              <p className="text-sm text-destructive/80">
                This plugin threw an exception and was isolated from the admin
                UI.
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={this.handleDisable}>
              Disable plugin
            </Button>
            <span className="text-xs text-muted-foreground">
              Error boundaries prevent a single plugin from crashing the entire
              panel.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
}
