import { Link2, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

import type { IntegrationStatus } from "./IntegrationCard";

type IntegrationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: {
    name: string;
    status: IntegrationStatus;
    description: string;
  } | null;
};

export function IntegrationDrawer({
  open,
  onOpenChange,
  integration,
}: IntegrationDrawerProps) {
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
            <p className="text-xs text-muted-foreground">
              {integration?.description ?? "Configure connection settings."}
            </p>
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
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                API Key
              </label>
              <Input placeholder="Paste API key" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Webhook URL
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="https://hooks.example.com" className="pl-9" />
              </div>
            </div>
            <Separator />
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Security scopes
              </div>
              <p className="mt-2">
                This integration can read published content and send notifications.
              </p>
            </div>
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
