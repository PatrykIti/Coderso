import { useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsField } from "@/ui/shared/SettingsSection";
import {
  getEmailSettings,
  updateEmailSettings,
  type EmailProviderId,
  type EmailSettingsResponse,
  type EmailSettingsUpdate,
} from "@/services/emailClient";

import type { WizardStepBodyProps } from "../stepTypes";
import { AdvancedStepShell } from "./AdvancedStepShell";
import { stripUnchangedSecret, useAdapterForm, useSaveAction } from "./advancedStepUtils";

// TASK-482-07-L01: Advanced-track Email step. Thin adapter over the existing
// `GET/PUT /settings/email` surface (emailClient.ts). Secrets (the SMTP
// password) are NEVER read back in plaintext — the GET returns a `configured`
// flag only — and an untouched password field is OMITTED from the PUT so the
// server never receives `""`/`null` (which would clear the stored secret).

type EmailForm = {
  provider: EmailProviderId;
  host: string;
  port: string;
  secure: boolean;
  user: string;
  password: string; // write-only; blank means "leave unchanged"
  fromName: string;
  fromEmail: string;
};

const toForm = (data: EmailSettingsResponse): EmailForm => ({
  provider: data.provider,
  host: data.smtp.host ?? "",
  port: data.smtp.port === null ? "" : String(data.smtp.port),
  secure: data.smtp.secure,
  user: data.smtp.user ?? "",
  password: "",
  fromName: data.from.name ?? "",
  fromEmail: data.from.email ?? "",
});

const toPayload = (form: EmailForm): EmailSettingsUpdate => {
  const password = stripUnchangedSecret(form.password);
  const trimmedPort = form.port.trim();
  const port = trimmedPort.length > 0 ? Number(trimmedPort) : null;
  return {
    provider: form.provider,
    smtp: {
      host: form.host.trim() || null,
      port: Number.isFinite(port as number) ? port : null,
      secure: form.secure,
      user: form.user.trim() || null,
      // Omit the secret entirely when left blank — never forward "".
      ...(password === undefined ? {} : { password }),
    },
    from: {
      name: form.fromName.trim() || null,
      email: form.fromEmail.trim() || null,
    },
  };
};

export function EmailStep({ disabled }: WizardStepBodyProps) {
  const { data, form, setForm, loading, loadError } = useAdapterForm(
    getEmailSettings,
    toForm,
    "Failed to load email settings."
  );
  const { saving, saveError, saved, run } = useSaveAction();

  const handleSave = useCallback(() => {
    if (!form) return;
    void run(async () => {
      const next = await updateEmailSettings(toPayload(form));
      // Re-mask the password field after a successful write (never keep it).
      setForm((prev) => (prev ? { ...prev, password: "" } : prev));
      void next;
    }, "Failed to save email settings.");
  }, [form, run, setForm]);

  const passwordConfigured = data?.smtp.password.configured ?? false;
  const resendConnected = data?.resend.status === "connected";

  return (
    <AdvancedStepShell
      loading={loading}
      loadError={loadError}
      saving={saving}
      saveError={saveError}
      saved={saved}
      savedLabel="Email settings saved."
      onSave={handleSave}
      disabled={disabled}
    >
      {form ? (
        <>
          <SettingsField
            label="Email provider"
            htmlFor="setup-email-provider"
            hint="How outbound email (password resets, alerts) is delivered."
          >
            <Select
              value={form.provider}
              onValueChange={(value) =>
                setForm((prev) => (prev ? { ...prev, provider: value as EmailProviderId } : prev))
              }
              disabled={disabled}
            >
              <SelectTrigger id="setup-email-provider" className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>

          {form.provider === "resend" ? (
            <p className="text-sm text-muted-foreground">
              Resend is {resendConnected ? "connected" : "not connected"}. Its API key is managed
              under Integrations after setup — it is never entered or shown here.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="SMTP host" htmlFor="setup-email-host">
                <Input
                  id="setup-email-host"
                  value={form.host}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, host: event.target.value } : prev))
                  }
                  placeholder="smtp.example.com"
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField label="SMTP port" htmlFor="setup-email-port">
                <Input
                  id="setup-email-port"
                  value={form.port}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, port: event.target.value } : prev))
                  }
                  placeholder="587"
                  inputMode="numeric"
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField label="SMTP username" htmlFor="setup-email-user">
                <Input
                  id="setup-email-user"
                  value={form.user}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, user: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField
                label="SMTP password"
                htmlFor="setup-email-password"
                hint={
                  passwordConfigured
                    ? "Configured. Leave blank to keep the current password."
                    : "Not configured yet."
                }
              >
                <Input
                  id="setup-email-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, password: event.target.value } : prev))
                  }
                  placeholder={passwordConfigured ? "••••••••" : ""}
                  disabled={disabled}
                  autoComplete="new-password"
                />
              </SettingsField>
              <SettingsField label="Use TLS" htmlFor="setup-email-secure">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    id="setup-email-secure"
                    checked={form.secure}
                    onCheckedChange={(value) =>
                      setForm((prev) => (prev ? { ...prev, secure: value } : prev))
                    }
                    aria-label="Use TLS"
                    disabled={disabled}
                  />
                  Connect over TLS
                </label>
              </SettingsField>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <SettingsField label="From name" htmlFor="setup-email-from-name">
              <Input
                id="setup-email-from-name"
                value={form.fromName}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, fromName: event.target.value } : prev))
                }
                placeholder="Coderso"
                disabled={disabled}
                autoComplete="off"
              />
            </SettingsField>
            <SettingsField label="From email" htmlFor="setup-email-from-email">
              <Input
                id="setup-email-from-email"
                value={form.fromEmail}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, fromEmail: event.target.value } : prev))
                }
                placeholder="hello@example.com"
                inputMode="email"
                disabled={disabled}
                autoComplete="off"
              />
            </SettingsField>
          </div>
        </>
      ) : null}
    </AdvancedStepShell>
  );
}
