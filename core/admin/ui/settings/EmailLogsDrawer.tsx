import { Clock, Mail, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

export type EmailLogItem = {
  id: string;
  recipient: string;
  subject: string;
  status: "delivered" | "queued" | "failed";
  provider: "smtp" | "resend" | string;
  timestamp: string;
};

type EmailLogsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: EmailLogItem[];
  isLoading?: boolean;
  error?: string | null;
};

// TASK-479-28-L06: token-driven delivery-status tints (no raw palette colors).
const statusStyles: Record<string, string> = {
  delivered: "border-transparent bg-success-soft text-success",
  queued: "border-transparent bg-warning-soft text-warning",
  failed: "border-transparent bg-destructive/12 text-destructive",
};

const emailLogsExportUnavailableReason =
  "Delivery log export is not wired yet. TASK-359-06 owns the export action.";

export function EmailLogsDrawer({
  open,
  onOpenChange,
  logs = [],
  isLoading = false,
  error,
}: EmailLogsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Delivery Logs</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Recent email provider activity and delivery status.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close email logs drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-6 py-6">
            {isLoading ? (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Loading delivery logs...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                No delivery logs recorded yet.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{log.recipient}</p>
                    <Badge variant="outline" className={statusStyles[log.status]}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{log.subject}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {log.timestamp}
                    <span className="rounded-md border px-1.5 py-0.5 text-[10px] uppercase">
                      {log.provider}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-2"
            disabled
            title={emailLogsExportUnavailableReason}
            data-no-op-control="settings-email-export-logs"
          >
            <Mail className="h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
