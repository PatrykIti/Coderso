// TASK-482-04-L01: Phase-2 wizard step registry + shared value shape.
//
// This module is pure and UI-agnostic: it owns the ordered step registry, the
// per-step `validate`/`isComplete` hooks (wired to the granular validators in
// setupWizardValidation.ts) and the single shared `WizardValues` type consumed
// by the shell (04-L02), the Basic settings map (05-L02) and finalize (08-L01).
// The reducer/selectors live in wizardMachine.ts.

import {
  SETUP_WIZARD_DEFAULT_VALUES,
  type SetupWizardValues,
  validateAdminBaseUrl,
  validatePublicBaseUrl,
  validateSecurityTtls,
  validateSiteLocale,
  validateSiteName,
  validateSiteTimezone,
} from "./setupWizardValidation";

export type WizardTrack = "basic" | "advanced";

// 04-L01 OWNS the shared wizard-values type. It is a structural superset of
// `SetupWizardValues` (setupWizardValidation.ts) plus every field the concrete
// steps persist. It MUST explicitly list the Basic-track keys 05-L02's
// `toBasicSettingsPayload` reads (siteTimezone, adminBaseUrl, logoId) — omitting
// them would break that map's typecheck. Advanced (email/storage/security/
// assistant) fields are added by 07. Consumers import this type; they must NOT
// define a competing values shape.
export type WizardValues = SetupWizardValues & {
  siteTimezone: string; // 05-L01 timezone key (site.timezone)
  adminBaseUrl: string; // 05-L02 admin-URL step (site.adminBaseUrl)
  logoId?: string | null; // 05-L02 branding step (gated on TASK-359-04)
  // ...advanced (email/storage/security/assistant) fields added by 07
};

// Defaults for the superset keys not covered by SETUP_WIZARD_DEFAULT_VALUES.
// NOTE (no DDL in this stream): the settings-service `site.timezone` default is
// added by 05-L01; this is only the client-side wizard seed.
export const WIZARD_DEFAULT_VALUES: WizardValues = {
  ...SETUP_WIZARD_DEFAULT_VALUES,
  siteTimezone: "UTC",
  adminBaseUrl: "",
  logoId: null,
};

export type WizardStep = {
  id: string;
  title: string;
  description: string;
  track: WizardTrack;
  validate: (values: WizardValues) => string | null;
  isComplete: (values: WizardValues) => boolean;
};

export type WizardState = {
  values: WizardValues;
  currentStepId: string;
  advancedEnabled: boolean;
  dirtyStepIds: Set<string>;
  completedStepIds: Set<string>;
};

// Optional steps (concrete fields land in 05/06/07) never block navigation.
const optionalStep = (): null => null;

const defineStep = (
  id: string,
  title: string,
  description: string,
  track: WizardTrack,
  validate: (values: WizardValues) => string | null
): WizardStep => ({
  id,
  title,
  description,
  track,
  validate,
  // A step is "complete" once its validator passes; optional steps are always
  // complete, so `resolveResumeStep` skips them to the first field that needs
  // attention.
  isComplete: (values) => validate(values) === null,
});

export const WIZARD_STEPS: WizardStep[] = [
  // Basic track.
  defineStep("identity", "Site identity", "Name your site.", "basic", validateSiteName),
  defineStep("branding", "Branding", "Upload a logo (optional).", "basic", optionalStep),
  defineStep("locale", "Locale", "Default content language.", "basic", validateSiteLocale),
  defineStep("timezone", "Timezone", "Default display timezone.", "basic", validateSiteTimezone),
  defineStep(
    "urls",
    "URLs",
    "Public and admin base URLs.",
    "basic",
    (values) =>
      validatePublicBaseUrl(values.publicBaseUrl) ?? validateAdminBaseUrl(values.adminBaseUrl)
  ),
  defineStep(
    "starter-content",
    "Starter content",
    "Optionally seed pages and menus from a kit.",
    "basic",
    optionalStep
  ),
  // Advanced track.
  defineStep("email", "Email", "Outbound email provider.", "advanced", optionalStep),
  defineStep("storage", "Storage", "Media storage backend.", "advanced", optionalStep),
  defineStep(
    "security",
    "Security",
    "Session and reset token policy.",
    "advanced",
    validateSecurityTtls
  ),
  defineStep("assistant", "Assistant", "AI assistant defaults.", "advanced", optionalStep),
];
