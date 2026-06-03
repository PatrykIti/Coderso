import { Clock, Globe, Lock, X } from "lucide-react";

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

import type { AccessLogItem } from "./types";

type AccessLogDetailsDrawerProps = {
  log: AccessLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSession?: (log: AccessLogItem) => void;
  onRequestRevoke?: (log: AccessLogItem) => void;
  isRevoking?: boolean;
};

export function AccessLogDetailsDrawer({
  log,
  open,
  onOpenChange,
  onViewSession,
  onRequestRevoke,
  isRevoking = false,
}: AccessLogDetailsDrawerProps) {
  const canViewSession = Boolean(log?.session.view.enabled);
  const canRevokeSession = Boolean(log?.session.revoke.enabled);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <SheetTitle>Access Log Details</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {log ? log.user.detail : "Select a log to review details."}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close access log drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        {log ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-6">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">{log.user.name}</p>
                  <p className="text-xs text-muted-foreground">{log.user.detail}</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Status
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {log.status} ({log.statusCode})
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      IP Address
                    </span>
                    <span className="font-mono text-xs text-foreground">{log.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Device
                    </span>
                    <span className="text-xs text-foreground">{log.device.label}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Timestamp
                    </span>
                    <span className="text-xs text-foreground">
                      {log.timestamp.date} · {log.timestamp.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Request
                    </span>
                    <span className="text-xs font-mono text-foreground">
                      {log.method} {log.path}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      Duration
                    </span>
                    <span className="text-xs text-foreground">
                      {log.durationMs ? `${log.durationMs} ms` : "—"}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    Location & risk
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
                    Signal: Low risk · Known device · No geo anomalies detected.
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Session state
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{log.session.label}</p>
                    {!log.session.view.enabled && log.session.view.reason ? (
                      <p className="mt-1">{log.session.view.reason}</p>
                    ) : null}
                    {!log.session.revoke.enabled && log.session.revoke.reason ? (
                      <p className="mt-1">{log.session.revoke.reason}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <Separator />
            <div className="bg-muted/30 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!canViewSession}
                  title={canViewSession ? undefined : log.session.view.reason}
                  onClick={() => {
                    if (log.session.view.enabled) onViewSession?.(log);
                  }}
                >
                  <Clock className="h-4 w-4" />
                  View full session
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={!canRevokeSession || isRevoking}
                  title={canRevokeSession ? undefined : log.session.revoke.reason}
                  onClick={() => {
                    if (log.session.revoke.enabled) onRequestRevoke?.(log);
                  }}
                >
                  <Lock className="h-4 w-4" />
                  {isRevoking ? "Revoking..." : "Revoke access"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
