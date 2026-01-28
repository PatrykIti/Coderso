import { Activity, Globe, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
];

type WebhookDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  webhook?: { url: string; events: string[] } | null;
};

export function WebhookDrawer({
  open,
  onOpenChange,
  mode,
  webhook,
}: WebhookDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        overlayClassName="bg-slate-900/40 backdrop-blur-sm"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <SheetTitle>{mode === "create" ? "Create New Webhook" : "Edit Webhook"}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close webhook drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Endpoint URL</p>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  className="pl-9"
                  defaultValue={webhook?.url ?? ""}
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
                      defaultChecked={webhook?.events?.includes(event.id)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {event.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
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
                />
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              <p className="text-xs italic text-muted-foreground">
                Used to verify that the webhook request came from our system.
              </p>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="space-y-3 bg-muted/30 px-6 py-4">
          <Button variant="outline" className="w-full gap-2">
            <Activity className="h-4 w-4" />
            Test Connection
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              {mode === "create" ? "Create Webhook" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
