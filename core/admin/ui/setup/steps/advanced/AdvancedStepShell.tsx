import type { ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// TASK-482-07-L01: shared chrome for the optional Advanced-track adapter steps —
// a loading state, a load-error banner, the form body, and a self-contained
// Save button with success/error feedback. Each advanced step writes on its own
// Save (independent of the wizard's Next navigation); the underlying step is
// optional, so navigation is never blocked by it.
export function AdvancedStepShell({
  loading,
  loadError,
  saving,
  saveError,
  saved,
  savedLabel = "Saved.",
  saveLabel = "Save",
  onSave,
  disabled = false,
  children,
}: {
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  saveError: string | null;
  saved: boolean;
  savedLabel?: string;
  saveLabel?: string;
  onSave: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading current settings…
      </p>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load settings</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {children}
      {saveError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={onSave} disabled={saving || disabled} className="gap-2">
          {saving ? "Saving…" : saveLabel}
        </Button>
        {saved && !saveError ? (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="size-4" />
            {savedLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
