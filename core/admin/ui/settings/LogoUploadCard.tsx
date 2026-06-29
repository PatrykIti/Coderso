import { Image, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const labelClassName = "text-sm font-medium";

const brandingUploadUnavailableReason =
  "Brand asset uploads are not wired yet. TASK-359-04 owns logo and favicon persistence.";

/**
 * TASK-479-28-L02: logo + favicon upload controls re-expressed as the
 * prototype's borderless branding rows. The upload affordances stay disabled
 * no-op controls (TASK-359-04 owns persistence) — only the chrome changed.
 */
export function LogoUploadCard() {
  return (
    <div className="space-y-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-8 md:space-y-0">
      <div className="space-y-3">
        <label className={labelClassName}>Site logo</label>
        <button
          type="button"
          disabled
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Upload site logo"
          title={brandingUploadUnavailableReason}
          data-no-op-control="settings-logo-upload"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-soft">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Click to upload logo</p>
            <p className="text-xs text-muted-foreground">PNG, SVG or WebP (max. 2MB)</p>
            <p className="mt-2 text-xs text-muted-foreground">{brandingUploadUnavailableReason}</p>
          </div>
        </button>
      </div>
      <Separator className="hidden md:block" orientation="vertical" />
      <Separator className="md:hidden" />
      <div className="space-y-3">
        <label className={labelClassName}>Favicon</label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/30">
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled
              title={brandingUploadUnavailableReason}
              data-no-op-control="settings-favicon-upload"
            >
              Upload new
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled
              title={brandingUploadUnavailableReason}
              data-no-op-control="settings-favicon-remove"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
