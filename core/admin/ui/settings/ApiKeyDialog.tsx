import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { apiKeyScopeOptions, getDefaultScopes } from "./apiKeyScopes";

type ApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name: string; scopes: string[] }) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
};

export function ApiKeyDialog({
  open,
  onOpenChange,
  onCreate,
  isSubmitting = false,
  error,
}: ApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(getDefaultScopes());
  const [localError, setLocalError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setScopes(getDefaultScopes());
    setLocalError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const selectedCount = scopes.length;
  const canSubmit = name.trim().length > 0 && selectedCount > 0 && !isSubmitting;
  const errorMessage = error ?? localError;

  const handleToggleScope = (id: string, checked: boolean) => {
    setScopes((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((scope) => scope !== id);
    });
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Provide a name for the API key.");
      return;
    }
    if (scopes.length === 0) {
      setLocalError("Select at least one scope.");
      return;
    }
    setLocalError(null);
    await onCreate({ name: trimmed, scopes });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate credentials for integrations and automation.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close create API key dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <label
                htmlFor="api-key-name"
                className="text-sm font-semibold text-foreground"
              >
                Key Name
              </label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Analytics Pipeline"
                className="bg-muted/40"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Scopes</p>
                <p className="text-xs text-muted-foreground">
                  Limit access to only the permissions you need.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30">
                <div className="space-y-3 p-4">
                  {apiKeyScopeOptions.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-start gap-3 rounded-xl border bg-background/60 p-3 transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        className="mt-1"
                        checked={scopes.includes(scope.id)}
                        onCheckedChange={(value) =>
                          handleToggleScope(scope.id, value === true)
                        }
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {scope.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCount} scope{selectedCount === 1 ? "" : "s"} selected
              </p>
            </div>
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? "Creating..." : "Create Key"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
