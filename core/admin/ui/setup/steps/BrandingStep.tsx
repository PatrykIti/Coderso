import { ImageIcon } from "lucide-react";

import type { WizardStepBodyProps } from "./stepTypes";

// TASK-482-05-L02: Branding. Logo/favicon PERSISTENCE is owned by TASK-359-04
// (see LogoUploadCard.tsx + the 05-L01 coordination note): until that key lands
// in the settings allowlist this step ships identity-only and never sets
// `logoId`, so it stays a skippable, no-op control (no second, competing
// logo-persistence mechanism). Do NOT wire an upload here.
export function BrandingStep(_props: WizardStepBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center"
        data-no-op-control="setup-branding-logo"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ImageIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Logo upload coming soon</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            You can add a logo and favicon later from Settings once uploads are available. This step
            is optional — continue when you are ready.
          </p>
        </div>
      </div>
    </div>
  );
}
