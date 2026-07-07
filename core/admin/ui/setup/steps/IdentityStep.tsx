import { Input } from "@/components/ui/input";
import { SettingsField } from "@/ui/shared/SettingsSection";

import type { WizardStepBodyProps } from "./stepTypes";

// TASK-482-05-L02: Site identity — the site name persisted as `site.name`.
export function IdentityStep({ values, onPatch, disabled }: WizardStepBodyProps) {
  return (
    <SettingsField
      label="Site name"
      htmlFor="setup-site-name"
      hint="Shown across the admin and used as the default title for public pages."
    >
      <Input
        id="setup-site-name"
        value={values.siteName}
        onChange={(event) => onPatch({ siteName: event.target.value })}
        placeholder="e.g. My Awesome Site"
        disabled={disabled}
        autoComplete="off"
      />
    </SettingsField>
  );
}
