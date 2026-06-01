import { Link2, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { IntegrationStatus } from "./IntegrationCard";

type IntegrationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: {
    id: string;
    name: string;
    status: IntegrationStatus;
    description: string;
    scopes: string[];
    fields: Array<{
      key: string;
      label: string;
      type: "text" | "url" | "secret";
      required: boolean;
      configured: boolean;
      value: string | null;
    }>;
  } | null;
  isSaving?: boolean;
  error?: string | null;
  onSave?: (id: string, config: Record<string, string | null>) => void;
};

export function IntegrationDrawer({
  open,
  onOpenChange,
  integration,
  isSaving = false,
  error,
  onSave,
}: IntegrationDrawerProps) {
  const fields = integration?.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const nextValues: Record<string, string> = {};
    for (const field of fields) {
      nextValues[field.key] = field.value ?? "";
    }
    return nextValues;
  });
  const [secretEdits, setSecretEdits] = useState<Record<string, boolean>>(() => {
    const nextSecretEdits: Record<string, boolean> = {};
    for (const field of fields) {
      nextSecretEdits[field.key] = false;
    }
    return nextSecretEdits;
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const scopesLabel = integration?.scopes?.length
    ? integration.scopes.join(", ")
    : "No scopes available.";

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleSecret = (key: string) => {
    setSecretEdits((prev) => ({ ...prev, [key]: !prev[key] }));
    setLocalError(null);
  };

  const handleSave = () => {
    if (!integration || !onSave) return;
    const payload: Record<string, string | null> = {};
    for (const field of fields) {
      const value = values[field.key] ?? "";
      if (field.type === "secret" && !secretEdits[field.key]) {
        continue;
      }
      if (field.required && !value.trim() && field.type !== "secret") {
        setLocalError(`Fill in ${field.label.toLowerCase()}.`);
        return;
      }
      payload[field.key] = value.trim() ? value.trim() : null;
    }
    setLocalError(null);
    onSave(integration.id, payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>{integration?.name ?? "Integration"}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {integration?.description ?? "Configure connection settings."}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close integration drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-6">
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Connection status</p>
                <p className="text-xs text-muted-foreground">
                  Manage credentials and access scopes.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {integration?.status ?? "disconnected"}
              </Badge>
            </div>
            {error || localError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error ?? localError}
              </div>
            ) : null}
            <div className="space-y-4">
              {fields.map((field) => {
                const isSecret = field.type === "secret";
                const isEnabled = !isSecret || secretEdits[field.key];
                const showConfigured = isSecret && field.configured && !secretEdits[field.key];
                return (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        {field.label}
                      </label>
                      {isSecret ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleToggleSecret(field.key)}
                        >
                          {secretEdits[field.key] ? "Keep existing" : "Update secret"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="relative">
                      {field.type === "url" ? (
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      ) : null}
                      <Input
                        type={isSecret ? "password" : "text"}
                        value={values[field.key] ?? ""}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        disabled={!isEnabled}
                        placeholder={
                          showConfigured
                            ? "Secret already configured"
                            : field.type === "url"
                              ? "https://..."
                              : undefined
                        }
                        className={cn(field.type === "url" ? "pl-9" : undefined)}
                      />
                    </div>
                    {field.required ? (
                      <p className="text-[11px] text-muted-foreground">Required</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Security scopes
              </div>
              <p className="mt-2">{scopesLabel}</p>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
