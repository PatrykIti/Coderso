export type SetupWizardValues = {
  siteName: string;
  siteLocale: string;
  publicBaseUrl: string;
  authSessionTtlDays: string;
  authResetTtlMinutes: string;
};

export const SETUP_WIZARD_DEFAULT_VALUES: SetupWizardValues = {
  siteName: "Nextless",
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

export const validateSetupWizardStep = (
  values: SetupWizardValues,
  step: 1 | 2 | 3
): string | null => {
  if (step === 1) {
    if (!values.siteName.trim()) return "Site name is required.";
    if (!values.siteLocale.trim()) return "Site locale is required.";
    return null;
  }

  if (step === 2) {
    return validatePublicBaseUrl(values.publicBaseUrl);
  }

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
