import { Activity, Globe, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";

const webhookEvents = [
  {
    id: "entry.created",
    label: "entry.created",
    description: "Fired when a new content entry is created",
  },
  {
    id: "entry.updated",
    label: "entry.updated",
    description: "Fired when an existing entry is modified",
  },
  {
    id: "media.uploaded",
    label: "media.uploaded",
    description: "Fired when a new media file is added",
  },
  {
    id: "media.deleted",
    label: "media.deleted",
    description: "Fired when media is removed",
  },
  {
    id: "page.published",
    label: "page.published",
    description: "Fired when a page is published",
  },
  {
    id: "page.unpublished",
    label: "page.unpublished",
    description: "Fired when a page is unpublished",
  },
];

const getWebhookDirtySignature = (input: {
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
}) =>
  JSON.stringify({
    name: input.name,
    url: input.url,
    events: input.events,
    enabled: input.enabled,
    secret: input.secret.trim() ? "draft-secret" : "",
  });

type WebhookDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  webhook?: {
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
  } | null;
  isSaving?: boolean;
  error?: string | null;
  onSave: (payload: {
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string | null;
  }) => void;
  onTest?: () => void;
};

export function WebhookDrawer({
  open,
  onOpenChange,
  mode,
  webhook,
  isSaving = false,
  error,
  onSave,
  onTest,
}: WebhookDrawerProps) {
  const initialEvents = useMemo(
    () => webhook?.events ?? webhookEvents.map((event) => event.id),
    [webhook]
  );
  const [name, setName] = useState(webhook?.name ?? "");
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [events, setEvents] = useState<string[]>(initialEvents);
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(webhook?.enabled ?? true);
  const [localError, setLocalError] = useState<string | null>(null);
  const initialSignature = useMemo(
    () =>
      getWebhookDirtySignature({
        name: webhook?.name ?? "",
        url: webhook?.url ?? "",
        events: initialEvents,
        enabled: webhook?.enabled ?? true,
        secret: "",
      }),
    [initialEvents, webhook]
  );
  const currentSignature = getWebhookDirtySignature({
    name,
    url,
    events,
    enabled,
    secret,
  });
  useRegisterSettingsDirty(open && currentSignature !== initialSignature);

  const handleToggleEvent = (id: string, checked: boolean) => {
    setEvents((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((event) => event !== id);
    });
  };

  const handleGenerateSecret = () => {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      const fallback = Math.random().toString(36).slice(2, 14);
      setSecret(`whsec_${fallback}`);
      return;
    }
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const base64 = btoa(String.fromCharCode(...bytes)).replace(/=+$/g, "");
    setSecret(`whsec_${base64}`);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName) {
      setLocalError("Provide a name for this webhook.");
      return;
    }
    if (!trimmedUrl) {
      setLocalError("Provide a destination URL.");
      return;
    }
    if (events.length === 0) {
      setLocalError("Select at least one event trigger.");
      return;
    }
    setLocalError(null);
    onSave({
      name: trimmedName,
      url: trimmedUrl,
      events,
      enabled,
      secret: secret.trim() ? secret.trim() : undefined,
    });
  };

  const errorMessage = error ?? localError;
  const canTest = mode === "edit" && Boolean(onTest);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        overlayClassName="bg-slate-900/40 backdrop-blur-sm"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>{mode === "create" ? "Create New Webhook" : "Edit Webhook"}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {mode === "create"
                ? "Configure the endpoint, signing secret, and event triggers for this webhook."
                : "Update the endpoint, signing secret, and event triggers for this webhook."}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close webhook drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-6">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Webhook enabled</p>
                <p className="text-xs text-muted-foreground">
                  Toggle delivery without deleting the webhook.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Webhook Name</p>
              <Input
                placeholder="e.g. Marketing Sync"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Endpoint URL</p>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  className="pl-9"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Event Triggers</p>
              <div className="grid gap-3">
                {webhookEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl border bg-background/40 p-3 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      className="mt-1"
                      checked={events.includes(event.id)}
                      onCheckedChange={(value) => handleToggleEvent(event.id, value === true)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Signing Secret</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="whsec_..."
                  className="font-mono"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                />
                <Button
                  variant="outline"
                  className="gap-2"
                  type="button"
                  onClick={handleGenerateSecret}
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">
                Used to verify that the webhook request came from our system.
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
        <div className="space-y-3 bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            className="w-full gap-2"
            type="button"
            onClick={onTest}
            disabled={!canTest || isSaving}
          >
            <Activity className="h-4 w-4" />
            Test Connection
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : mode === "create" ? "Create Webhook" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
