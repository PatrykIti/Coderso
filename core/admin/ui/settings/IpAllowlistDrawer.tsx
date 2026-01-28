import { AlertTriangle, Globe2, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type IpAllowlistDrawerPanelProps = {
  closeAction?: React.ReactNode;
  cancelAction?: React.ReactNode;
};

const sectionLabelClassName =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";
const fieldLabelClassName = "text-xs font-medium text-muted-foreground";

export function IpAllowlistDrawerPanel({
  closeAction,
  cancelAction,
}: IpAllowlistDrawerPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Add New IP Range</p>
            <p className="text-xs text-muted-foreground">
              Restrict admin access by CIDR.
            </p>
          </div>
        </div>
        {closeAction ?? (
          <Button variant="ghost" size="icon" aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-6 px-6 py-6">
          <div className="space-y-4">
            <p className={sectionLabelClassName}>Entry Details</p>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className={fieldLabelClassName}>Identifier Label</label>
                <Input placeholder="e.g. London Office" />
              </div>
              <div className="space-y-2">
                <label className={fieldLabelClassName}>IP Address or Range (CIDR)</label>
                <div className="relative">
                  <Globe2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="0.0.0.0/0"
                    className="pl-9 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Example: 192.168.1.1 or 192.168.1.0/24
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <p className={sectionLabelClassName}>Additional Info</p>
            <div className="space-y-2">
              <label className={fieldLabelClassName}>Notes</label>
              <Textarea
                rows={4}
                placeholder="Add a description for why this IP is allowed..."
              />
            </div>
          </div>
          <div className="rounded-xl border bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              >
                Security Note
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Allowing wide ranges (like /0 or /8) is not recommended as it may expose
              your admin interface to unwanted traffic.
            </p>
          </div>
        </div>
      </ScrollArea>
      <div className="border-t bg-muted/30 px-6 py-4">
        <div className="space-y-2">
          <Button className="w-full">Add to Allowlist</Button>
          {cancelAction ?? (
            <Button variant="ghost" className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export type IpAllowlistDrawerProps = {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
};

export function IpAllowlistDrawer({
  trigger,
  defaultOpen = false,
}: IpAllowlistDrawerProps) {
  return (
    <Sheet defaultOpen={defaultOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side="right"
        className="flex w-[360px] flex-col p-0 sm:w-[420px]"
        showCloseButton={false}
      >
        <IpAllowlistDrawerPanel
          closeAction={
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close drawer">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          }
          cancelAction={
            <SheetClose asChild>
              <Button variant="ghost" className="w-full">
                Cancel
              </Button>
            </SheetClose>
          }
        />
      </SheetContent>
    </Sheet>
  );
}
