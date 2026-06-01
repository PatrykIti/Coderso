import { Copy, Flag, Share2, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { auditCategoryMeta, auditStatusMeta } from "./auditMeta";
import type { AuditLog } from "./types";

const copyJsonUnavailableReason =
  "Copy JSON is not wired yet. TASK-357-02 owns clipboard feedback.";
const shareLogUnavailableReason =
  "Share Log is not wired yet. TASK-357-02 owns compliance sharing actions.";
const reportLogUnavailableReason =
  "Report is not wired yet. TASK-357-02 owns compliance report actions.";

export type AuditDetailsDrawerProps = {
  log?: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuditDetailsDrawer({ log, open, onOpenChange }: AuditDetailsDrawerProps) {
  const payload = log ? JSON.stringify(log.payload, null, 2) : "";
  const category = log ? auditCategoryMeta[log.category] : null;
  const status = log ? auditStatusMeta[log.status] : null;
  const Icon = category?.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col sm:max-w-md lg:max-w-lg"
      >
        <SheetTitle className="sr-only">Event Details</SheetTitle>
        <SheetDescription className="sr-only">
          {log
            ? "Review the selected audit event metadata and payload."
            : "Select an audit log to review details."}
        </SheetDescription>
        {!log ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">No event selected</p>
            <p className="mt-1">Select an audit log to review details.</p>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Event Details</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">ID: {log.id}</span>
                  <Badge variant="outline" className={cn("rounded-md", status?.className)}>
                    {status?.label}
                  </Badge>
                </div>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-6 py-6">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        category?.className
                      )}
                    >
                      {Icon ? <Icon className="h-6 w-6" /> : null}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">{log.event}</h4>
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Resource:{" "}
                        <span className="font-medium text-primary">{log.resourceLabel}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Metadata
                  </h5>
                  <div className="grid grid-cols-2 gap-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Actor
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {log.actor.name} ({log.actor.role})
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Timestamp
                      </p>
                      <p className="text-sm font-medium text-foreground">{log.timestampLabel}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        IP Address
                      </p>
                      <p className="text-sm font-medium text-foreground">{log.ipAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Request ID
                      </p>
                      <p className="text-sm font-medium text-foreground font-mono">
                        {log.requestId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Severity
                      </p>
                      <p className="text-sm font-medium text-foreground">{log.severity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Event type
                      </p>
                      <p className="text-sm font-medium text-foreground">{category?.label}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      JSON Payload
                    </h5>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      disabled
                      title={copyJsonUnavailableReason}
                      data-no-op-control="audit-copy-json-drawer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy JSON
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    spellCheck={false}
                    value={payload}
                    className="min-h-[220px] resize-none border-slate-800 bg-slate-900 font-mono text-xs leading-relaxed text-slate-100 focus-visible:ring-slate-700"
                  />
                </div>
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <div className="flex gap-2 pb-2">
              <Button
                className="flex-1"
                disabled
                title={shareLogUnavailableReason}
                data-no-op-control="audit-share-log"
              >
                <Share2 className="h-4 w-4" />
                Share Log
              </Button>
              <Button
                variant="outline"
                disabled
                title={reportLogUnavailableReason}
                data-no-op-control="audit-report-log"
              >
                <Flag className="h-4 w-4" />
                Report
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
