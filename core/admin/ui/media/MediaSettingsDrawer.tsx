import { HardDrive, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type MediaSettingsDrawerProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  accessMode: "public" | "internal";
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onAccessModeChange: (next: "public" | "internal") => void;
  onSave: () => void;
  // TASK-512-05: storage-quota config (controlled). OPTIONAL so the current
  // MediaLibraryPage render (512-06 wires them later) and the existing settings
  // test keep compiling — the section renders only when the change handlers are
  // provided. Values flow UP; the page's onSave persists via updateStorageSettings.
  quotaPlanLabel?: string | null;
  quotaTotalBytes?: number | null;
  onQuotaPlanLabelChange?: (next: string | null) => void;
  onQuotaTotalBytesChange?: (next: number | null) => void;
};

const BYTES_PER_GB = 1024 * 1024 * 1024;

export function MediaSettingsDrawer({
  open,
  onOpenChange,
  accessMode,
  isLoading,
  isSaving,
  error,
  success,
  onAccessModeChange,
  onSave,
  quotaPlanLabel,
  quotaTotalBytes,
  onQuotaPlanLabelChange,
  onQuotaTotalBytesChange,
}: MediaSettingsDrawerProps) {
  const busy = isLoading || isSaving;
  const showQuota = Boolean(onQuotaPlanLabelChange || onQuotaTotalBytesChange);
  const quotaGb =
    typeof quotaTotalBytes === "number" && Number.isFinite(quotaTotalBytes) && quotaTotalBytes > 0
      ? String(Math.round((quotaTotalBytes / BYTES_PER_GB) * 100) / 100)
      : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Media settings</SheetTitle>
            <SheetDescription>
              Control who can access media files from runtime `/media/*` URLs.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Media settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Delivery access
                </CardTitle>
                <CardDescription>
                  Switch between open public delivery and restricted internal access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Access mode
                  </label>
                  <Select
                    value={accessMode}
                    onValueChange={(value) => onAccessModeChange(value as "public" | "internal")}
                    disabled={busy}
                  >
                    <SelectTrigger className="bg-muted/40">
                      <SelectValue placeholder="Choose access mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (recommended)</SelectItem>
                      <SelectItem value="internal">Internal (session or API key)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                  Internal mode blocks anonymous access. Runtime requests must come from an
                  authenticated admin session or API key with the
                  <span className="font-medium"> media.read </span>
                  scope.
                </div>
              </CardContent>
            </Card>

            {showQuota ? (
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    Storage quota
                  </CardTitle>
                  <CardDescription>
                    Configure the plan label and total quota shown on the storage card. Leave the
                    total empty for unlimited (no progress bar).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="media-quota-plan"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Plan label
                    </label>
                    <Input
                      id="media-quota-plan"
                      value={quotaPlanLabel ?? ""}
                      placeholder="e.g. Pro plan"
                      disabled={busy}
                      onChange={(event) => {
                        const value = event.target.value;
                        onQuotaPlanLabelChange?.(value ? value : null);
                      }}
                      className="bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="media-quota-total"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Total quota (GB)
                    </label>
                    <Input
                      id="media-quota-total"
                      type="number"
                      min={0}
                      step="0.1"
                      value={quotaGb}
                      placeholder="Unlimited"
                      disabled={busy}
                      onChange={(event) => {
                        const raw = event.target.value.trim();
                        if (raw === "") {
                          onQuotaTotalBytesChange?.(null);
                          return;
                        }
                        const gb = Number(raw);
                        if (!Number.isFinite(gb) || gb <= 0) {
                          onQuotaTotalBytesChange?.(null);
                          return;
                        }
                        onQuotaTotalBytesChange?.(Math.round(gb * BYTES_PER_GB));
                      }}
                      className="bg-muted/40"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Loading media settings...
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t px-5 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={busy}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
