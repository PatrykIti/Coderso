import {
  CheckCircle2,
  History,
  Info,
  KeyRound,
  Mail,
  Plug,
  Send,
  Server,
  User,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  getEmailSettings,
  listEmailLogs,
  sendTestEmail,
  updateEmailSettings,
  type EmailDeliveryLog,
  type EmailProviderId,
  type EmailSettingsUpdate,
  type EmailSettingsResponse,
} from "@/services/emailClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { AdminLink } from "@/ui/shared/AdminLink";
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import { EmailLogsDrawer, type EmailLogItem } from "./EmailLogsDrawer";
import { SettingsSidebar } from "./SettingsSidebar";
import { SmtpCard } from "./SmtpCard";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const toLogItem = (log: EmailDeliveryLog): EmailLogItem => ({
  id: log.id,
  recipient: log.recipient,
  subject: log.subject,
  status: log.status === "failed" ? "failed" : log.status === "delivered" ? "delivered" : "queued",
  provider: log.provider || "smtp",
  timestamp: formatTimestamp(log.createdAt),
});

type EmailSettingsDraft = {
  provider: EmailProviderId;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  updatePassword: boolean;
  fromName: string;
  fromEmail: string;
};

const emptyEmailDraft: EmailSettingsDraft = {
  provider: "smtp",
  smtpHost: "",
  smtpPort: "",
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  updatePassword: false,
  fromName: "",
  fromEmail: "",
};

const toEmailDraft = (settings: EmailSettingsResponse): EmailSettingsDraft => ({
  provider: settings.provider,
  smtpHost: settings.smtp.host ?? "",
  smtpPort: settings.smtp.port ? String(settings.smtp.port) : "",
  smtpSecure: settings.smtp.secure,
  smtpUser: settings.smtp.user ?? "",
  smtpPassword: "",
  updatePassword: false,
  fromName: settings.from.name ?? "",
  fromEmail: settings.from.email ?? "",
});

const getEmailDirtySignature = (draft: EmailSettingsDraft) =>
  JSON.stringify({
    ...draft,
    smtpPassword: draft.updatePassword && draft.smtpPassword.trim() ? "draft-secret" : "",
  });

const ProviderOption = ({
  active,
  description,
  icon: Icon,
  label,
  onSelect,
}: {
  active: boolean;
  description: string;
  icon: typeof Server;
  label: string;
  onSelect: () => void;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onSelect}
    className={`flex min-h-24 w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors ${
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
    }`}
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background">
      <Icon className="h-4 w-4" />
    </span>
    <span className="space-y-1">
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-xs leading-5">{description}</span>
    </span>
  </button>
);

export function EmailSettingsPage() {
  const [logsOpen, setLogsOpen] = useState(false);
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null);
  const [provider, setProvider] = useState<EmailProviderId>("smtp");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [updatePassword, setUpdatePassword] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState(() =>
    getEmailDirtySignature(emptyEmailDraft)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendTestReviewOpen, setSendTestReviewOpen] = useState(false);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } = useSettingsAutoSave();

  useEffect(() => {
    let active = true;
    getEmailSettings()
      .then((data) => {
        if (!active) return;
        const draft = toEmailDraft(data);
        setSettings(data);
        setProvider(draft.provider);
        setSmtpHost(draft.smtpHost);
        setSmtpPort(draft.smtpPort);
        setSmtpSecure(draft.smtpSecure);
        setSmtpUser(draft.smtpUser);
        setFromName(draft.fromName);
        setFromEmail(draft.fromEmail);
        setUpdatePassword(draft.updatePassword);
        setSmtpPassword(draft.smtpPassword);
        setSavedSignature(getEmailDirtySignature(draft));
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load email settings.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const smtpPasswordConfigured = updatePassword
    ? Boolean(smtpPassword.trim())
    : (settings?.smtp.password.configured ?? false);
  const smtpConfigured = Boolean(
    smtpHost.trim() && smtpUser.trim() && smtpPasswordConfigured && fromEmail.trim()
  );
  const resendConfigured = Boolean(
    settings?.resend.status === "connected" && settings.resend.apiKey.configured && fromEmail.trim()
  );
  const statusConfigured = provider === "resend" ? resendConfigured : smtpConfigured;
  const statusItems = useMemo(
    () =>
      provider === "resend"
        ? [
            {
              title: "Resend API Key",
              description:
                settings?.resend.apiKey.configured && settings?.resend.status === "connected"
                  ? "Secret stored"
                  : "Missing API key",
              icon: KeyRound,
            },
            {
              title: "Sender Address",
              description: fromEmail.trim() ? "Sender set" : "Missing sender",
              icon: Mail,
            },
          ]
        : [
            {
              title: "Host Configured",
              description: smtpHost ? "Host set" : "Missing host",
              icon: Wifi,
            },
            {
              title: "Authentication",
              description:
                settings?.smtp.user && smtpPasswordConfigured
                  ? "Credentials stored"
                  : "Missing credentials",
              icon: KeyRound,
            },
          ],
    [fromEmail, provider, settings, smtpHost, smtpPasswordConfigured]
  );

  const autoSaveValue = useMemo(
    () => ({
      provider,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword: updatePassword && smtpPassword.trim() ? "draft-secret" : "",
      updatePassword,
      fromName,
      fromEmail,
    }),
    [
      provider,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      updatePassword,
      fromName,
      fromEmail,
    ]
  );

  const portValue = smtpPort.trim();
  const portNumber = portValue ? Number(portValue) : null;
  const portInvalid = provider === "smtp" && Boolean(portValue) && !Number.isFinite(portNumber);
  const passwordInvalid = provider === "smtp" && updatePassword && !smtpPassword.trim();
  const hasValidationErrors = portInvalid || passwordInvalid;
  const currentDraft = useMemo(
    () => ({
      provider,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      updatePassword,
      fromName,
      fromEmail,
    }),
    [
      provider,
      fromEmail,
      fromName,
      smtpHost,
      smtpPassword,
      smtpPort,
      smtpSecure,
      smtpUser,
      updatePassword,
    ]
  );
  useRegisterSettingsDirty(!isLoading && getEmailDirtySignature(currentDraft) !== savedSignature);

  const handleSave = useCallback(async () => {
    if (isSaving || isLoading) return false;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      let port: number | null = null;
      if (provider === "smtp") {
        const normalizedPortValue = smtpPort.trim();
        port = normalizedPortValue ? Number(normalizedPortValue) : null;
        if (normalizedPortValue && !Number.isFinite(port)) {
          throw new Error("invalid_port");
        }

        if (updatePassword && !smtpPassword.trim()) {
          throw new Error("password_required");
        }
      }

      const from = {
        name: fromName.trim() || null,
        email: fromEmail.trim() || null,
      };
      const payload: EmailSettingsUpdate =
        provider === "smtp"
          ? {
              provider: "smtp",
              smtp: {
                host: smtpHost.trim() || null,
                port,
                secure: smtpSecure,
                user: smtpUser.trim() || null,
                ...(updatePassword ? { password: smtpPassword.trim() || null } : {}),
              },
              from,
            }
          : {
              provider: "resend",
              from,
            };

      const updated = await updateEmailSettings(payload);
      const draft = toEmailDraft(updated);
      setSettings(updated);
      setProvider(draft.provider);
      setSmtpHost(draft.smtpHost);
      setSmtpPort(draft.smtpPort);
      setSmtpSecure(draft.smtpSecure);
      setSmtpUser(draft.smtpUser);
      setFromName(draft.fromName);
      setFromEmail(draft.fromEmail);
      setUpdatePassword(draft.updatePassword);
      setSmtpPassword(draft.smtpPassword);
      setSavedSignature(getEmailDirtySignature(draft));
      setSuccess("Email settings saved.");
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === "invalid_port") {
        setError("Provide a valid SMTP port.");
      } else if (err instanceof Error && err.message === "password_required") {
        setError("Provide a password or disable password update.");
      } else if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save email settings.");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    fromEmail,
    fromName,
    isLoading,
    isSaving,
    provider,
    smtpHost,
    smtpPassword,
    smtpPort,
    smtpSecure,
    smtpUser,
    updatePassword,
  ]);

  const handleSendTest = async () => {
    setIsTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const recipient = testRecipient.trim();
      if (!recipient) {
        throw new Error("recipient_required");
      }
      await sendTestEmail({ to: recipient });
      setSuccess("Test email sent.");
    } catch (err) {
      if (err instanceof Error && err.message === "recipient_required") {
        setError("Provide a recipient address.");
      } else if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to send test email.");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleRequestSendTest = () => {
    setError(null);
    setSuccess(null);
    if (!testRecipient.trim()) {
      setError("Provide a recipient address.");
      return;
    }
    setSendTestReviewOpen(true);
  };

  const busy = isLoading || isSaving;

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: !busy,
    hasErrors: hasValidationErrors,
    value: autoSaveValue,
    onSave: handleSave,
  });

  const handleLogsOpen = (open: boolean) => {
    setLogsOpen(open);
    if (!open) return;
    setLogsLoading(true);
    setLogsError(null);
    listEmailLogs()
      .then((items) => setLogs(items.map(toLogItem)))
      .catch((err) => {
        if (isApiClientError(err)) {
          setLogsError(err.message);
        } else {
          setLogsError("Failed to load delivery logs.");
        }
      })
      .finally(() => setLogsLoading(false));
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="email" />}
      breadcrumbs={["Settings", "Email"]}
      topbarActions={
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={
              statusConfigured
                ? "gap-2 border-transparent bg-success-soft text-success"
                : "gap-2 border-transparent bg-warning-soft text-warning"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${statusConfigured ? "bg-success" : "bg-warning"}`}
            />
            {statusConfigured ? "Connected" : "Needs setup"}
          </Badge>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="border-b border-border bg-card/70 px-6 py-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Email Settings</h1>
              <p className="text-sm text-muted-foreground">
                System configuration - outbound email providers
              </p>
            </div>
          </div>
          <div className="flex-1 p-6">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                  <Card className="border-muted/60">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Provider
                      </CardTitle>
                      <CardDescription>Choose how Coderso sends outbound email.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <ProviderOption
                        active={provider === "smtp"}
                        icon={Server}
                        label="Manual SMTP"
                        description="Use a configured SMTP host and stored SMTP credentials."
                        onSelect={() => setProvider("smtp")}
                      />
                      <ProviderOption
                        active={provider === "resend"}
                        icon={Send}
                        label="Resend"
                        description="Use the encrypted Resend API key from Integrations."
                        onSelect={() => setProvider("resend")}
                      />
                    </CardContent>
                  </Card>
                  {provider === "smtp" ? (
                    <SmtpCard
                      host={smtpHost}
                      port={smtpPort}
                      secure={smtpSecure}
                      user={smtpUser}
                      password={smtpPassword}
                      passwordConfigured={settings?.smtp.password.configured ?? false}
                      updatePassword={updatePassword}
                      onHostChange={setSmtpHost}
                      onPortChange={setSmtpPort}
                      onSecureChange={setSmtpSecure}
                      onUserChange={setSmtpUser}
                      onPasswordChange={setSmtpPassword}
                      onTogglePassword={setUpdatePassword}
                    />
                  ) : (
                    <Card className="border-muted/60">
                      <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Send className="h-4 w-4 text-primary" />
                          Resend Provider
                        </CardTitle>
                        <CardDescription>
                          Uses the encrypted Resend API key stored in Integrations.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              API Key
                            </p>
                            <p className="text-sm font-semibold">
                              {settings?.resend.apiKey.configured ? "Stored" : "Not configured"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              settings?.resend.status === "connected"
                                ? "border-transparent bg-success-soft text-success"
                                : "border-transparent bg-warning-soft text-warning"
                            }
                          >
                            {settings?.resend.status === "connected" ? "Connected" : "Needs key"}
                          </Badge>
                        </div>
                        <Button asChild variant="outline" className="gap-2">
                          <AdminLink href="/admin/settings/integrations" prefetch>
                            <Plug className="h-4 w-4" />
                            Configure Resend
                          </AdminLink>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="border-muted/60">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4 text-primary" />
                        Default Sender Info
                      </CardTitle>
                      <CardDescription>
                        Set the name and address used for outgoing emails.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor="from-name"
                            className="text-xs font-semibold uppercase text-muted-foreground"
                          >
                            From Name
                          </label>
                          <Input
                            id="from-name"
                            placeholder="Company name"
                            value={fromName}
                            onChange={(event) => setFromName(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="from-email"
                            className="text-xs font-semibold uppercase text-muted-foreground"
                          >
                            From Email
                          </label>
                          <Input
                            id="from-email"
                            type="email"
                            placeholder="hello@coderso.io"
                            value={fromEmail}
                            onChange={(event) => setFromEmail(event.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card className="border-muted/60">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Send className="h-4 w-4 text-primary" />
                        Test Email
                      </CardTitle>
                      <CardDescription>
                        Send a test email through the active provider.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="test-recipient"
                          className="text-xs font-semibold uppercase text-muted-foreground"
                        >
                          Recipient Address
                        </label>
                        <Input
                          id="test-recipient"
                          type="email"
                          placeholder="dev@example.com"
                          value={testRecipient}
                          onChange={(event) => setTestRecipient(event.target.value)}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={handleRequestSendTest}
                        disabled={isTesting || isLoading}
                      >
                        <Send className="h-4 w-4" />
                        {isTesting ? "Sending..." : "Send Test Email"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-muted/60">
                    <CardContent className="space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Connection Status
                          </p>
                          <p className="text-sm font-semibold">
                            {statusConfigured ? "Operational" : "Needs configuration"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            statusConfigured
                              ? "border-transparent bg-success-soft text-success"
                              : "border-transparent bg-warning-soft text-warning"
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {statusConfigured ? "Operational" : "Pending"}
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            statusConfigured ? "w-full bg-success" : "w-1/2 bg-warning"
                          }`}
                        />
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {statusItems.map(({ title, description, icon: Icon }) => (
                          <div key={title} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{title}</p>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center gap-2 text-primary"
                        onClick={() => handleLogsOpen(true)}
                      >
                        <History className="h-4 w-4" />
                        View delivery logs
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-transparent bg-info-soft">
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-info">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Security Note</span>
                      </div>
                      <p className="text-xs text-info/90">
                        Store provider secrets only in protected settings screens. Delivery logs
                        show provider, status, and message IDs without credential payloads.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          {error ? <div className="px-6 pb-6 text-sm text-destructive">{error}</div> : null}
          {success ? <div className="px-6 pb-6 text-sm text-success">{success}</div> : null}
        </div>
        <div className="sticky bottom-0 z-10 border-t border-border bg-card/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoSaveEnabled}
                onCheckedChange={(checked) => setAutoSaveEnabled(Boolean(checked))}
                disabled={busy}
              />
              <span>Auto-save settings across all screens</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={busy || hasValidationErrors}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <EmailLogsDrawer
        open={logsOpen}
        onOpenChange={handleLogsOpen}
        logs={logs}
        isLoading={logsLoading}
        error={logsError}
      />
      <ConfirmActionDialog
        open={sendTestReviewOpen}
        onOpenChange={setSendTestReviewOpen}
        title="Send test email?"
        description="This sends a real email through the configured email provider."
        targetLabel={testRecipient.trim()}
        confirmLabel="Send test email"
        confirmingLabel="Sending..."
        tone="warning"
        closeOnSuccess
        onConfirm={async () => {
          await handleSendTest();
        }}
      >
        Confirm the recipient address before sending an external message.
      </ConfirmActionDialog>
    </SettingsShell>
  );
}
