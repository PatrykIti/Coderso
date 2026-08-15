import { useEffect, useState } from "react";
import {
  BellRing,
  Laptop,
  Mail,
  MapPin,
  Save,
  Share2,
  ShieldAlert,
  Users,
  Webhook,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  getSecuritySettings,
  updateSecuritySettings,
  type SecuritySettingsResponse,
} from "@/services/settingsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";

import { LoginAlertsCard } from "./LoginAlertsCard";
import { SettingsSidebar } from "./SettingsSidebar";

const tabTriggerClassName = "after:bg-primary data-[state=active]:text-primary";
const loginAlertBruteForceUnavailableReason = "Brute-force controls are not wired yet.";
const loginAlertAdminOnlyUnavailableReason = "Admin-only alerts are not available yet.";
const loginAlertTabsUnavailableReason =
  "Only Login Alerts is wired on this screen. TASK-359-07 owns the remaining security tabs.";

type LoginAlertsFormState = {
  enabled: boolean;
  notifyOnNewDevice: boolean;
  notifyOnNewLocation: boolean;
  emailChannelEnabled: boolean;
  recipients: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
};

const defaultFormState: LoginAlertsFormState = {
  enabled: true,
  notifyOnNewDevice: true,
  notifyOnNewLocation: true,
  emailChannelEnabled: true,
  recipients: "",
  webhookEnabled: false,
  webhookUrl: "",
  webhookSecret: "",
};

const parseRecipients = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const toFormState = (settings: SecuritySettingsResponse): LoginAlertsFormState => ({
  enabled: settings.loginAlerts.enabled,
  notifyOnNewDevice: settings.loginAlerts.notifyOnNewDevice,
  notifyOnNewLocation: settings.loginAlerts.notifyOnNewLocation,
  emailChannelEnabled: settings.loginAlerts.recipients.length > 0 || true,
  recipients: settings.loginAlerts.recipients.join("\n"),
  webhookEnabled: Boolean(settings.loginAlerts.webhookUrl),
  webhookUrl: settings.loginAlerts.webhookUrl ?? "",
  // Never hydrate the stored secret; the input is write-only.
  webhookSecret: "",
});

export function LoginAlertsPage() {
  const [settings, setSettings] = useState<SecuritySettingsResponse | null>(null);
  const [form, setForm] = useState<LoginAlertsFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSecuritySettings()
      .then((result) => {
        if (!active) return;
        setSettings(result);
        setForm(toFormState(result));
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load login alert settings.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleFieldChange = <K extends keyof LoginAlertsFormState>(
    key: K,
    value: LoginAlertsFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiscard = () => {
    if (settings) {
      setForm(toFormState(settings));
      setError(null);
      setSuccess(null);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const updated = await updateSecuritySettings({
        loginAlerts: {
          enabled: form.enabled,
          notifyOnNewDevice: form.notifyOnNewDevice,
          notifyOnNewLocation: form.notifyOnNewLocation,
          recipients: parseRecipients(form.recipients),
          webhookUrl: form.webhookEnabled ? form.webhookUrl.trim() || null : null,
          ...(form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {}),
        },
      });
      setSettings(updated);
      setForm(toFormState(updated));
      setSuccess("Login alert settings updated.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update login alert settings.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const busy = isLoading || isSaving;
  const isDirty = settings ? JSON.stringify(form) !== JSON.stringify(toFormState(settings)) : false;
  useRegisterSettingsDirty(isDirty);

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="login-alerts" />}
      showSearch={false}
      breadcrumbs={["Security", "Login Alerts"]}
      topbarActions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={busy} onClick={handleDiscard}>
            Discard
          </Button>
          <Button size="sm" className="gap-2" disabled={busy} onClick={handleSave}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="border-b border-border bg-card px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Login Alerts</h1>
              <p className="text-sm text-muted-foreground">
                Security • Notifications &amp; Protection
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              System Status: Active
            </span>
          </div>
        </div>

        <Tabs defaultValue="login-alerts" className="flex flex-1 flex-col">
          <div className="border-b border-border bg-card px-6">
            <TabsList variant="line" className="h-12 gap-6">
              <TabsTrigger
                value="general"
                className={tabTriggerClassName}
                disabled
                title={loginAlertTabsUnavailableReason}
                data-no-op-control="settings-login-alerts-tab-general"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="active-sessions"
                className={tabTriggerClassName}
                disabled
                title={loginAlertTabsUnavailableReason}
                data-no-op-control="settings-login-alerts-tab-active-sessions"
              >
                Active Sessions
              </TabsTrigger>
              <TabsTrigger value="login-alerts" className={tabTriggerClassName}>
                Login Alerts
              </TabsTrigger>
              <TabsTrigger
                value="audit-log"
                className={tabTriggerClassName}
                disabled
                title={loginAlertTabsUnavailableReason}
                data-no-op-control="settings-login-alerts-tab-audit-log"
              >
                Audit Log
              </TabsTrigger>
              <TabsTrigger
                value="two-factor"
                className={tabTriggerClassName}
                disabled
                title={loginAlertTabsUnavailableReason}
                data-no-op-control="settings-login-alerts-tab-two-factor"
              >
                Two-Factor Auth
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="login-alerts" className="flex-1 pb-28 pt-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6">
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Login alerts unavailable</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {success ? (
                <Alert>
                  <AlertTitle>Saved</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : null}

              <LoginAlertsCard
                title="Suspicious Login Alerts"
                description="Get notified whenever someone logs in from a new device, browser, or location."
                icon={<BellRing className="h-5 w-5" />}
                iconWrapperClassName="bg-primary-soft text-primary"
                checked={form.enabled}
                onCheckedChange={(value) => handleFieldChange("enabled", value)}
                disabled={busy}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <LoginAlertsCard
                  title="Alert on new device"
                  description="Notify when a login comes from a different browser or device fingerprint."
                  icon={<Laptop className="h-5 w-5" />}
                  checked={form.notifyOnNewDevice}
                  onCheckedChange={(value) => handleFieldChange("notifyOnNewDevice", value)}
                  disabled={busy || !form.enabled}
                />
                <LoginAlertsCard
                  title="Alert on new location"
                  description="Notify when a login comes from a different IP location."
                  icon={<MapPin className="h-5 w-5" />}
                  checked={form.notifyOnNewLocation}
                  onCheckedChange={(value) => handleFieldChange("notifyOnNewLocation", value)}
                  disabled={busy || !form.enabled}
                />
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">Brute Force Protection</h2>
                      <p className="text-sm text-muted-foreground">
                        Protect your account from automated login attempts by setting a lockout
                        threshold.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-14">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Failed attempts threshold</span>
                      <span className="font-semibold text-primary">5 attempts</span>
                    </div>
                    <Slider
                      defaultValue={[5]}
                      min={3}
                      max={15}
                      step={1}
                      disabled
                      aria-label="Failed attempts threshold"
                      title={loginAlertBruteForceUnavailableReason}
                      data-no-op-control="settings-login-alerts-brute-force-threshold"
                    />
                    <p className="text-xs text-muted-foreground italic">
                      User will be temporarily locked out for 30 minutes after reaching the
                      threshold.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">Recipients</h2>
                      <p className="text-sm text-muted-foreground">
                        Choose who receives the security alerts and system warnings.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 pl-14">
                    <LoginAlertsCard
                      title="Admin-only alerts"
                      description="Send notifications only to account administrators."
                      checked
                      switchSize="sm"
                      disabled
                      unavailableReason={loginAlertAdminOnlyUnavailableReason}
                      noOpControlId="settings-login-alerts-admin-only"
                      className="border-muted/60 bg-muted/40 py-4 shadow-none"
                      contentClassName="px-4"
                    />
                    <Separator className="bg-border/60" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Custom Email List
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Textarea
                          className="pl-9"
                          placeholder="security@company.com, admin@company.com"
                          value={form.recipients}
                          onChange={(event) => handleFieldChange("recipients", event.target.value)}
                          disabled={busy || !form.enabled}
                          aria-label="Custom email list recipients"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Comma or newline separated list of email addresses. The account owner is
                        always notified.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold">Notification Channels</h2>
                      <p className="text-sm text-muted-foreground">
                        Select the platforms where you want to receive security events.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 pl-14 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Email</span>
                      </div>
                      <Switch
                        size="sm"
                        checked={form.emailChannelEnabled}
                        onCheckedChange={(value) => handleFieldChange("emailChannelEnabled", value)}
                        disabled={busy || !form.enabled}
                        aria-label="Email login alerts channel"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Webhook</span>
                      </div>
                      <Switch
                        size="sm"
                        checked={form.webhookEnabled}
                        onCheckedChange={(value) => handleFieldChange("webhookEnabled", value)}
                        disabled={busy || !form.enabled}
                        aria-label="Webhook login alerts channel"
                      />
                    </div>
                  </div>
                  {form.webhookEnabled && (
                    <div className="space-y-4 pl-14">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Webhook URL</label>
                        <Input
                          type="url"
                          placeholder="https://example.com/hooks/login-alerts"
                          value={form.webhookUrl}
                          onChange={(event) => handleFieldChange("webhookUrl", event.target.value)}
                          disabled={busy}
                          aria-label="Webhook URL"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">
                            Webhook Secret
                          </label>
                          {settings?.loginAlerts.webhookSecret.configured ? (
                            <span className="text-xs text-muted-foreground">Configured</span>
                          ) : null}
                        </div>
                        <Input
                          type="password"
                          placeholder="Leave blank to keep the current secret"
                          value={form.webhookSecret}
                          onChange={(event) =>
                            handleFieldChange("webhookSecret", event.target.value)
                          }
                          disabled={busy}
                          aria-label="Webhook secret"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  )}
                  {settings?.loginAlerts.deliveryError ? (
                    <p className="pl-14 text-xs text-amber-600 dark:text-amber-400">
                      Last delivery error: {settings.loginAlerts.deliveryError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 mt-auto border-t border-border bg-card/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{loginAlertBruteForceUnavailableReason}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled
                title={loginAlertBruteForceUnavailableReason}
                data-no-op-control="settings-login-alerts-sticky-discard"
              >
                Discard
              </Button>
              <Button
                disabled
                title={loginAlertBruteForceUnavailableReason}
                data-no-op-control="settings-login-alerts-sticky-save"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
