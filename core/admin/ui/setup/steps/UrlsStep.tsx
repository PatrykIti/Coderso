import { Input } from "@/components/ui/input";
import { SettingsField } from "@/ui/shared/SettingsSection";

import { validateAdminBaseUrl, validatePublicBaseUrl } from "../setupWizardValidation";
import type { WizardStepBodyProps } from "./stepTypes";

// TASK-482-05-L02: Public + admin base URLs. Persisted as `site.publicBaseUrl`
// and `site.adminBaseUrl` (NOT `site.adminPath`, which is a distinct mount-path
// key out of scope for the wizard). Both are optional; the client validators
// mirror the server normalizer (http/https), and the step-level validator in
// wizardSteps.ts blocks Next while either value is malformed.
export function UrlsStep({ values, onPatch, disabled }: WizardStepBodyProps) {
  const publicError = validatePublicBaseUrl(values.publicBaseUrl);
  const adminError = validateAdminBaseUrl(values.adminBaseUrl);

  return (
    <div className="flex flex-col gap-5">
      <SettingsField
        label="Public site URL"
        htmlFor="setup-public-url"
        hint={
          publicError ?? "Where visitors reach your site (optional). Example: https://example.com"
        }
      >
        <Input
          id="setup-public-url"
          value={values.publicBaseUrl}
          onChange={(event) => onPatch({ publicBaseUrl: event.target.value })}
          placeholder="https://example.com"
          disabled={disabled}
          inputMode="url"
          autoComplete="off"
          aria-invalid={publicError ? true : undefined}
        />
      </SettingsField>
      <SettingsField
        label="Admin URL"
        htmlFor="setup-admin-url"
        hint={
          adminError ??
          "The origin used to reach the admin panel (optional). Example: https://admin.example.com"
        }
      >
        <Input
          id="setup-admin-url"
          value={values.adminBaseUrl}
          onChange={(event) => onPatch({ adminBaseUrl: event.target.value })}
          placeholder="https://admin.example.com"
          disabled={disabled}
          inputMode="url"
          autoComplete="off"
          aria-invalid={adminError ? true : undefined}
        />
      </SettingsField>
    </div>
  );
}
