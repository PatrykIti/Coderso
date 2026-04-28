import { Clock, Mail, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

export type EmailLogItem = {
  id: string;
  recipient: string;
  subject: string;
  status: "delivered" | "queued" | "failed";
  timestamp: string;
};

type EmailLogsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: EmailLogItem[];
  isLoading?: boolean;
  error?: string | null;
};

const statusStyles: Record<string, string> = {
  delivered: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  queued: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

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
            <p className="text-xs text-muted-foreground">
              Recent SMTP activity and delivery status.
            </p>
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    {log.subject}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {log.timestamp}
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
          <Button className="gap-2">
            <Mail className="h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
