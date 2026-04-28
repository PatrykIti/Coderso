import {
  CheckCircle2,
  History,
  Info,
  KeyRound,
  Send,
  User,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  getEmailSettings,
  listEmailLogs,
  sendTestEmail,
  updateEmailSettings,
  type EmailDeliveryLog,
  type EmailSettingsResponse,
} from "@/services/emailClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
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
  status:
    log.status === "failed"
      ? "failed"
      : log.status === "delivered"
        ? "delivered"
        : "queued",
  timestamp: formatTimestamp(log.createdAt),
});

export function EmailSettingsPage() {
  const [logsOpen, setLogsOpen] = useState(false);
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getEmailSettings();
      setSettings(data);
      setSmtpHost(data.smtp.host ?? "");
      setSmtpPort(data.smtp.port ? String(data.smtp.port) : "");
      setSmtpSecure(data.smtp.secure);
      setSmtpUser(data.smtp.user ?? "");
      setFromName(data.from.name ?? "");
      setFromEmail(data.from.email ?? "");
      setUpdatePassword(false);
      setSmtpPassword("");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load email settings.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getEmailSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setSmtpHost(data.smtp.host ?? "");
        setSmtpPort(data.smtp.port ? String(data.smtp.port) : "");
        setSmtpSecure(data.smtp.secure);
        setSmtpUser(data.smtp.user ?? "");
        setFromName(data.from.name ?? "");
        setFromEmail(data.from.email ?? "");
        setUpdatePassword(false);
        setSmtpPassword("");
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

  const statusConfigured = settings?.status.configured ?? false;
  const statusItems = useMemo(
    () => [
      {
        title: "Host Configured",
        description: smtpHost ? "Host set" : "Missing host",
        icon: Wifi,
      },
      {
        title: "Authentication",
        description:
          settings?.smtp.user && settings.smtp.password.configured
            ? "Credentials stored"
            : "Missing credentials",
        icon: KeyRound,
      },
    ],
    [smtpHost, settings]
  );

  const autoSaveValue = useMemo(
    () => ({
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
  const portInvalid = Boolean(portValue) && !Number.isFinite(portNumber);
  const passwordInvalid = updatePassword && !smtpPassword.trim();
  const hasValidationErrors = portInvalid || passwordInvalid;

  const handleSave = useCallback(async () => {
    if (isSaving || isLoading) return false;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const normalizedPortValue = smtpPort.trim();
      const port = normalizedPortValue ? Number(normalizedPortValue) : null;
      if (normalizedPortValue && !Number.isFinite(port)) {
        throw new Error("invalid_port");
      }

      if (updatePassword && !smtpPassword.trim()) {
        throw new Error("password_required");
      }

      const payload = {
        smtp: {
          host: smtpHost.trim() || null,
          port,
          secure: smtpSecure,
          user: smtpUser.trim() || null,
          ...(updatePassword ? { password: smtpPassword.trim() || null } : {}),
        },
        from: {
          name: fromName.trim() || null,
          email: fromEmail.trim() || null,
        },
      };

      const updated = await updateEmailSettings(payload);
      setSettings(updated);
      setUpdatePassword(false);
      setSmtpPassword("");
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
      await loadSettings();
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
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">Email</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={
              statusConfigured
                ? "gap-2 border-emerald-200 bg-emerald-50 text-emerald-600"
                : "gap-2 border-amber-200 bg-amber-50 text-amber-700"
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                statusConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {statusConfigured ? "Connected" : "Needs setup"}
          </Badge>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="border-b bg-background/70 px-6 py-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Email Settings</h1>
              <p className="text-sm text-muted-foreground">
                System configuration - SMTP outbound
              </p>
            </div>
          </div>
          <div className="flex-1 p-6">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
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
                        Send a test email to verify your SMTP settings.
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
                        onClick={handleSendTest}
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
                              ? "border-emerald-200 text-emerald-600"
                              : "border-amber-200 text-amber-700"
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {statusConfigured ? "Operational" : "Pending"}
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            statusConfigured
                              ? "w-full bg-emerald-500"
                              : "w-1/2 bg-amber-500"
                          }`}
                        />
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {statusItems.map(({ title, description, icon: Icon }) => (
                          <div key={title} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{title}</p>
                              <p className="text-xs text-muted-foreground">
                                {description}
                              </p>
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

                  <Card className="border-blue-200/60 bg-blue-50/70">
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-blue-900">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Security Note</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        For production environments, we recommend using dedicated
                        providers like Postmark or Resend rather than generic SMTP
                        servers for better deliverability.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          {error ? (
            <div className="px-6 pb-6 text-sm text-destructive">{error}</div>
          ) : null}
          {success ? (
            <div className="px-6 pb-6 text-sm text-emerald-600">{success}</div>
          ) : null}
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
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
    </SettingsShell>
  );
}
