// TASK-482-05-L02: the Basic-track values→settings-keys map is owned HERE (one
// place). The parameter type is the superset `WizardValues` (owned by 04-L01 in
// wizardSteps.ts), which adds siteTimezone/adminBaseUrl/logoId to the base
// `SetupWizardValues`. `import type` keeps the wizardSteps ↔ validation cycle
// erased at runtime. 08-L01's finalize imports this map — do not copy it.
import type { WizardValues } from "./wizardSteps";

export type SetupWizardValues = {
  siteName: string;
  siteLocale: string;
  publicBaseUrl: string;
  authSessionTtlDays: string;
  authResetTtlMinutes: string;
};

export const SETUP_WIZARD_DEFAULT_VALUES: SetupWizardValues = {
  siteName: "Coderso",
  siteLocale: "en",
  publicBaseUrl: "",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
};

const parsePositiveInteger = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (normalized <= 0) return null;
  return normalized;
};

export const validatePublicBaseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Public Site URL must use http or https.";
    }
    return null;
  } catch {
    return "Enter a valid URL (for example: https://example.com).";
  }
};

// TASK-482-04-L01: admin base URL is a new Basic-track key (05-L02 wires the
// field). Same http/https shape as the public URL; empty is allowed (optional).
export const validateAdminBaseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Admin URL must use http or https.";
    }
    return null;
  } catch {
    return "Enter a valid URL (for example: https://example.com).";
  }
};

// TASK-482-04-L01: granular per-field validators feeding the step-registry
// `validate` hooks (wizardSteps.ts). Structural (minimal) input types keep them
// reusable by both `SetupWizardValues` and the superset `WizardValues` without a
// circular import. The legacy `validateSetupWizardStep` below is re-expressed in
// terms of these so behaviour is unchanged.
export const validateSiteName = (values: { siteName: string }): string | null =>
  values.siteName.trim() ? null : "Site name is required.";

export const validateSiteLocale = (values: { siteLocale: string }): string | null =>
  values.siteLocale.trim() ? null : "Site locale is required.";

export const validateSiteTimezone = (values: { siteTimezone: string }): string | null =>
  values.siteTimezone.trim() ? null : "Timezone is required.";

export const validateSecurityTtls = (values: {
  authSessionTtlDays: string;
  authResetTtlMinutes: string;
}): string | null => {
  const sessionTtlDays = parsePositiveInteger(values.authSessionTtlDays);
  if (sessionTtlDays === null || sessionTtlDays < 1 || sessionTtlDays > 365) {
    return "Auth session TTL must be between 1 and 365 days.";
  }
  const resetTtlMinutes = parsePositiveInteger(values.authResetTtlMinutes);
  if (resetTtlMinutes === null || resetTtlMinutes < 5 || resetTtlMinutes > 1440) {
    return "Password reset TTL must be between 5 and 1440 minutes.";
  }
  return null;
};

export const validateSetupWizardStep = (
  values: SetupWizardValues,
  step: 1 | 2 | 3
): string | null => {
  if (step === 1) {
    return validateSiteName(values) ?? validateSiteLocale(values);
  }

  if (step === 2) {
    return validatePublicBaseUrl(values.publicBaseUrl);
  }

  return validateSecurityTtls(values);
};

export const validateSetupWizard = (values: SetupWizardValues): string | null =>
  validateSetupWizardStep(values, 1) ??
  validateSetupWizardStep(values, 2) ??
  validateSetupWizardStep(values, 3);

export type SetupWizardSettingsPayload = {
  "site.name": string;
  "site.locale": string;
  "site.publicBaseUrl": string | null;
  "auth.sessionTtlDays": number;
  "auth.resetTtlMinutes": number;
};

export const toSetupWizardSettingsPayload = (
  values: SetupWizardValues
): SetupWizardSettingsPayload => {
  const error = validateSetupWizard(values);
  if (error) {
    throw new Error("setup_wizard_invalid");
  }
  return {
    "site.name": values.siteName.trim(),
    "site.locale": values.siteLocale.trim(),
    "site.publicBaseUrl": values.publicBaseUrl.trim() || null,
    "auth.sessionTtlDays": Number(values.authSessionTtlDays),
    "auth.resetTtlMinutes": Number(values.authResetTtlMinutes),
  };
};

// TASK-482-05-L02: Basic-track wizard values → settings keys, persisted via the
// bulk `PATCH /settings` (updateSettings). SINGLE owner of this mapping; 08-L01
// imports it for finalize. Writes only `site.adminBaseUrl` (NOT `site.adminPath`,
// which has mount-path semantics and is out of scope for the wizard). The
// `site.branding.logoId` key is emitted only when a logo id is present — it is
// gated on the TASK-359-04 logo-persistence coordination (05-L01); until that
// key lands in the settings allowlist the branding step ships identity-only and
// never sets `logoId`, so the guard keeps the payload valid.
export const toBasicSettingsPayload = (values: WizardValues) => ({
  "site.name": values.siteName.trim(),
  "site.locale": values.siteLocale,
  "site.timezone": values.siteTimezone,
  "site.publicBaseUrl": values.publicBaseUrl.trim() || null,
  "site.adminBaseUrl": values.adminBaseUrl.trim() || null,
  ...(values.logoId ? { "site.branding.logoId": values.logoId } : {}),
});
