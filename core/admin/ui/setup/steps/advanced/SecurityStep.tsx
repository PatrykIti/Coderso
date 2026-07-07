import { useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsField } from "@/ui/shared/SettingsSection";
import {
  getSecuritySettings,
  updateSecuritySettings,
  updateSettings,
  type SecuritySettingsResponse,
} from "@/services/settingsClient";
import { resolveSessionTtlDaysFromSources } from "../../../../../services/auth/sessionTtl";

import { validateSecurityTtls } from "../../setupWizardValidation";
import type { WizardStepBodyProps } from "../stepTypes";
import { AdvancedStepShell } from "./AdvancedStepShell";
import { useAdapterForm, useSaveAction } from "./advancedStepUtils";

// TASK-482-07-L01 / 07-L02: Advanced-track Security step. It is the wizard's SOLE
// home for the auth TTLs — it writes the single canonical session-TTL key
// `auth.sessionTtlDays` (NEVER `security.session.ttlDays`) and the re-homed
// `auth.resetTtlMinutes` via the bulk `PATCH /settings`, and the session policy
// (max sessions / single-session) via `PATCH /settings/security`.
//
// `security.session.ttlDays` is shown READ-ONLY as an advisory override; the
// effective session TTL is derived with the SAME resolver `createSession` uses
// (`resolveSessionTtlDaysFromSources`) so operators see which value wins.

type SecurityForm = {
  // Advisory only — read from security settings, NEVER written by the wizard.
  legacySessionTtlDays: number;
  maxPerUser: string;
  singleSession: boolean;
};

const toForm = (data: SecuritySettingsResponse): SecurityForm => ({
  legacySessionTtlDays: data.session.ttlDays,
  maxPerUser: String(data.session.maxPerUser),
  singleSession: data.session.singleSession,
});

export function SecurityStep({ values, onPatch, disabled }: WizardStepBodyProps) {
  const { form, setForm, loading, loadError } = useAdapterForm(
    getSecuritySettings,
    toForm,
    "Failed to load security settings."
  );
  const { saving, saveError, saved, run } = useSaveAction();

  const ttlError = validateSecurityTtls(values);

  // Effective session TTL, resolved exactly as createSession() does at runtime:
  // per-create override (n/a in the wizard) > auth.sessionTtlDays >
  // security.session.ttlDays > default. Non-numeric/empty auth values fall
  // through to the legacy source, then the default.
  const effectiveTtlDays = resolveSessionTtlDaysFromSources({
    authSettingTtlDays: Number(values.authSessionTtlDays),
    securitySettingTtlDays: form?.legacySessionTtlDays,
  });

  const handleSave = useCallback(() => {
    if (!form) return;
    if (validateSecurityTtls(values) !== null) return;
    void run(async () => {
      // Canonical auth TTLs via the bulk settings PATCH (single session-TTL key).
      await updateSettings({
        "auth.sessionTtlDays": Number(values.authSessionTtlDays),
        "auth.resetTtlMinutes": Number(values.authResetTtlMinutes),
      });
      // Session policy via the dedicated security PATCH. `security.session.ttlDays`
      // is intentionally NOT sent — the wizard never writes the legacy source.
      const maxPerUser = Number(form.maxPerUser);
      await updateSecuritySettings({
        session: {
          maxPerUser: Number.isFinite(maxPerUser) ? maxPerUser : undefined,
          singleSession: form.singleSession,
        },
      });
    }, "Failed to save security settings.");
  }, [form, run, values]);

  return (
    <AdvancedStepShell
      loading={loading}
      loadError={loadError}
      saving={saving}
      saveError={saveError}
      saved={saved}
      savedLabel="Security settings saved."
      onSave={handleSave}
      disabled={disabled || ttlError !== null}
    >
      {form ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField
              label="Session TTL (days)"
              htmlFor="setup-security-session-ttl"
              hint={
                ttlError && /session/i.test(ttlError)
                  ? ttlError
                  : "How long a login stays valid (1–365 days). Canonical value: auth.sessionTtlDays."
              }
            >
              <Input
                id="setup-security-session-ttl"
                value={values.authSessionTtlDays}
                onChange={(event) => onPatch({ authSessionTtlDays: event.target.value })}
                inputMode="numeric"
                disabled={disabled}
                autoComplete="off"
                aria-invalid={ttlError && /session/i.test(ttlError) ? true : undefined}
              />
            </SettingsField>
            <SettingsField
              label="Password reset TTL (minutes)"
              htmlFor="setup-security-reset-ttl"
              hint={
                ttlError && /reset/i.test(ttlError)
                  ? ttlError
                  : "How long a password-reset link stays valid (5–1440 minutes)."
              }
            >
              <Input
                id="setup-security-reset-ttl"
                value={values.authResetTtlMinutes}
                onChange={(event) => onPatch({ authResetTtlMinutes: event.target.value })}
                inputMode="numeric"
                disabled={disabled}
                autoComplete="off"
                aria-invalid={ttlError && /reset/i.test(ttlError) ? true : undefined}
              />
            </SettingsField>
          </div>

          <div
            className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3"
            data-testid="setup-security-effective-ttl"
          >
            <p className="text-sm font-medium text-foreground">
              Effective session TTL: {effectiveTtlDays} {effectiveTtlDays === 1 ? "day" : "days"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The security policy override (security.session.ttlDays) is {form.legacySessionTtlDays}{" "}
              days and only applies when the canonical auth.sessionTtlDays is unset. This wizard
              writes only auth.sessionTtlDays.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField
              label="Max sessions per user"
              htmlFor="setup-security-max-sessions"
              hint="0 for unlimited concurrent sessions."
            >
              <Input
                id="setup-security-max-sessions"
                value={form.maxPerUser}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, maxPerUser: event.target.value } : prev))
                }
                inputMode="numeric"
                disabled={disabled}
                autoComplete="off"
              />
            </SettingsField>
            <SettingsField label="Single session" htmlFor="setup-security-single-session">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  id="setup-security-single-session"
                  checked={form.singleSession}
                  onCheckedChange={(value) =>
                    setForm((prev) => (prev ? { ...prev, singleSession: value } : prev))
                  }
                  aria-label="Single session"
                  disabled={disabled}
                />
                Only one active session per user
              </label>
            </SettingsField>
          </div>
        </>
      ) : null}
    </AdvancedStepShell>
  );
}
