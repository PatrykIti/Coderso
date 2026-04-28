import { ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
};

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
}: MediaSettingsDrawerProps) {
  const busy = isLoading || isSaving;

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
                    onValueChange={(value) =>
                      onAccessModeChange(value as "public" | "internal")
                    }
                    disabled={busy}
                  >
                    <SelectTrigger className="bg-muted/40">
                      <SelectValue placeholder="Choose access mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (recommended)</SelectItem>
                      <SelectItem value="internal">
                        Internal (session or API key)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                  Internal mode blocks anonymous access. Runtime requests must come
                  from an authenticated admin session or API key with the
                  <span className="font-medium"> media.read </span>
                  scope.
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Loading media settings...
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t px-5 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
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
