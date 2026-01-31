import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  ShieldEllipsis,
  Sliders,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import {
  getSecuritySettings,
  updateSecuritySettings,
  type SecuritySettingsResponse,
} from "@/services/settingsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";

import { IpAllowlistTable } from "./IpAllowlistTable";
import { LoginAlertsCard } from "./LoginAlertsCard";
import { SecurityPolicyCard } from "./SecurityPolicyCard";
import { SettingsSidebar } from "./SettingsSidebar";
import { useIpAllowlist } from "./useIpAllowlist";
import {
  listToText,
  normalizeOptional,
  parseListWithFallback,
  parsePositiveNumber,
} from "./securitySettingsUtils";

type SecurityFormState = {
  requestIdEnabled: boolean;
  requestIdHeaderName: string;
  csrfEnabled: boolean;
  csrfHeaderName: string;
  csrfTtlMinutes: string;
  corsAllowedOrigins: string;
  corsAllowCredentials: boolean;
  corsAllowedMethods: string;
  corsAllowedHeaders: string;
  corsMaxAgeSeconds: string;
  rateLimitEnabled: boolean;
  rateLimitAdminWindowSeconds: string;
  rateLimitAdminMaxRequests: string;
  rateLimitAuthWindowSeconds: string;
  rateLimitAuthMaxRequests: string;
  headersEnabled: boolean;
  frameOptions: "DENY" | "SAMEORIGIN";
  contentTypeOptions: boolean;
  referrerPolicy: string;
  permissionsPolicy: string;
  csp: string;
  hsts: string;
  validationRejectUnknownFields: boolean;
  pluginSafeMode: boolean;
  sessionTtlDays: string;
  sessionMaxPerUser: string;
  sessionSingleSession: boolean;
  loginAlertsEnabled: boolean;
  loginAlertsNewDevice: boolean;
  loginAlertsNewLocation: boolean;
};

const toFormState = (settings: SecuritySettingsResponse): SecurityFormState => ({
  requestIdEnabled: settings.requestId.enabled,
  requestIdHeaderName: settings.requestId.headerName,
  csrfEnabled: settings.csrf.enabled,
  csrfHeaderName: settings.csrf.headerName,
  csrfTtlMinutes: String(settings.csrf.tokenTtlMinutes),
  corsAllowedOrigins: listToText(settings.cors.allowedOrigins),
  corsAllowCredentials: settings.cors.allowCredentials,
  corsAllowedMethods: listToText(settings.cors.allowedMethods),
  corsAllowedHeaders: listToText(settings.cors.allowedHeaders),
  corsMaxAgeSeconds: String(settings.cors.maxAgeSeconds),
  rateLimitEnabled: settings.rateLimit.enabled,
  rateLimitAdminWindowSeconds: String(settings.rateLimit.admin.windowSeconds),
  rateLimitAdminMaxRequests: String(settings.rateLimit.admin.maxRequests),
  rateLimitAuthWindowSeconds: String(settings.rateLimit.auth.windowSeconds),
  rateLimitAuthMaxRequests: String(settings.rateLimit.auth.maxRequests),
  headersEnabled: settings.headers.enabled,
  frameOptions: settings.headers.frameOptions,
  contentTypeOptions: settings.headers.contentTypeOptions,
  referrerPolicy: settings.headers.referrerPolicy ?? "",
  permissionsPolicy: settings.headers.permissionsPolicy ?? "",
  csp: settings.headers.csp ?? "",
  hsts: settings.headers.hsts ?? "",
  validationRejectUnknownFields: settings.validation.rejectUnknownFields,
  pluginSafeMode: settings.plugins.safeMode,
  sessionTtlDays: String(settings.session.ttlDays),
  sessionMaxPerUser: String(settings.session.maxPerUser),
  sessionSingleSession: settings.session.singleSession,
  loginAlertsEnabled: settings.loginAlerts.enabled,
  loginAlertsNewDevice: settings.loginAlerts.notifyOnNewDevice,
  loginAlertsNewLocation: settings.loginAlerts.notifyOnNewLocation,
});

const defaultFormState: SecurityFormState = {
  requestIdEnabled: true,
  requestIdHeaderName: "x-request-id",
  csrfEnabled: true,
  csrfHeaderName: "x-csrf-token",
  csrfTtlMinutes: "30",
  corsAllowedOrigins: "",
  corsAllowCredentials: true,
  corsAllowedMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  corsAllowedHeaders: "content-type, x-csrf-token",
  corsMaxAgeSeconds: "600",
  rateLimitEnabled: true,
  rateLimitAdminWindowSeconds: "60",
  rateLimitAdminMaxRequests: "120",
  rateLimitAuthWindowSeconds: "60",
  rateLimitAuthMaxRequests: "20",
  headersEnabled: true,
  frameOptions: "DENY",
  contentTypeOptions: true,
  referrerPolicy: "no-referrer",
  permissionsPolicy: "",
  csp: "",
  hsts: "",
  validationRejectUnknownFields: true,
  pluginSafeMode: false,
  sessionTtlDays: "7",
  sessionMaxPerUser: "3",
  sessionSingleSession: false,
  loginAlertsEnabled: true,
  loginAlertsNewDevice: true,
  loginAlertsNewLocation: true,
};

export function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettingsResponse | null>(null);
  const [form, setForm] = useState<SecurityFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    entries: allowlistEntries,
    isLoading: allowlistLoading,
    error: allowlistError,
    removeEntry,
  } = useIpAllowlist();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
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
          setError("Failed to load security settings.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const busy = isLoading || isSaving;

  const handleFieldChange = <K extends keyof SecurityFormState>(
    key: K,
    value: SecurityFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDiscard = () => {
    if (settings) {
      setForm(toFormState(settings));
      setSuccess(null);
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const requestIdHeader = form.requestIdHeaderName.trim();
      const csrfHeader = form.csrfHeaderName.trim();
      if (!requestIdHeader || !csrfHeader) {
        throw new Error("header_required");
      }

      const payload = {
        requestId: {
          enabled: form.requestIdEnabled,
          headerName: requestIdHeader,
        },
        csrf: {
          enabled: form.csrfEnabled,
          headerName: csrfHeader,
          tokenTtlMinutes: parsePositiveNumber(form.csrfTtlMinutes, "csrf_ttl"),
        },
        cors: {
          allowedOrigins: parseListWithFallback(
            form.corsAllowedOrigins,
            settings.cors.allowedOrigins,
            true
          ),
          allowCredentials: form.corsAllowCredentials,
          allowedMethods: parseListWithFallback(
            form.corsAllowedMethods,
            settings.cors.allowedMethods
          ),
          allowedHeaders: parseListWithFallback(
            form.corsAllowedHeaders,
            settings.cors.allowedHeaders
          ),
          maxAgeSeconds: parsePositiveNumber(form.corsMaxAgeSeconds, "cors_max_age"),
        },
        rateLimit: {
          enabled: form.rateLimitEnabled,
          admin: {
            windowSeconds: parsePositiveNumber(
              form.rateLimitAdminWindowSeconds,
              "rate_admin_window"
            ),
            maxRequests: parsePositiveNumber(
              form.rateLimitAdminMaxRequests,
              "rate_admin_max"
            ),
          },
          auth: {
            windowSeconds: parsePositiveNumber(
              form.rateLimitAuthWindowSeconds,
              "rate_auth_window"
            ),
            maxRequests: parsePositiveNumber(
              form.rateLimitAuthMaxRequests,
              "rate_auth_max"
            ),
          },
        },
        headers: {
          enabled: form.headersEnabled,
          frameOptions: form.frameOptions,
          contentTypeOptions: form.contentTypeOptions,
          referrerPolicy: normalizeOptional(form.referrerPolicy),
          permissionsPolicy: normalizeOptional(form.permissionsPolicy),
          csp: normalizeOptional(form.csp),
          hsts: normalizeOptional(form.hsts),
        },
        validation: {
          rejectUnknownFields: form.validationRejectUnknownFields,
        },
        plugins: {
          safeMode: form.pluginSafeMode,
        },
        session: {
          ttlDays: parsePositiveNumber(form.sessionTtlDays, "session_ttl"),
          maxPerUser: parsePositiveNumber(form.sessionMaxPerUser, "session_max"),
          singleSession: form.sessionSingleSession,
        },
        loginAlerts: {
          enabled: form.loginAlertsEnabled,
          notifyOnNewDevice: form.loginAlertsNewDevice,
          notifyOnNewLocation: form.loginAlertsNewLocation,
        },
      };

      const updated = await updateSecuritySettings(payload);
      setSettings(updated);
      setForm(toFormState(updated));
      setSuccess("Security settings updated.");
    } catch (err) {
      if (err instanceof Error && err.message.endsWith("_missing")) {
        setError("Please fill in all required numeric fields.");
      } else if (err instanceof Error && err.message.endsWith("_invalid")) {
        setError("All numeric values must be greater than zero.");
      } else if (err instanceof Error && err.message === "header_required") {
        setError("Header names cannot be empty.");
      } else if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update security settings.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = useMemo(
    () => (form.csrfEnabled || form.rateLimitEnabled ? "Protected" : "Relaxed"),
    [form.csrfEnabled, form.rateLimitEnabled]
  );

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="security" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Security</span>
        </div>
      }
      topbarActions={
        <Button size="sm" className="px-4" disabled={busy} onClick={handleSave}>
          {busy ? "Saving..." : "Save changes"}
        </Button>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/20 text-primary">
              {statusBadge}
            </Badge>
            <h1 className="text-2xl font-semibold">Security Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure request pipeline security, CSRF, CORS, and rate limits.
          </p>
        </div>
        <div className="flex-1">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-10">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Security settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}

            <SecurityPolicyCard
              title="Request Context"
              description="Track request IDs and enforce strict payload validation."
              icon={<Sliders className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Request ID Header</p>
                  <p className="text-xs text-muted-foreground">
                    Adds a unique request identifier for tracing.
                  </p>
                </div>
                <Input
                  value={form.requestIdHeaderName}
                  onChange={(event) =>
                    handleFieldChange("requestIdHeaderName", event.target.value)
                  }
                  className="w-56"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Request ID</p>
                  <p className="text-xs text-muted-foreground">
                    Attach IDs to every API response.
                  </p>
                </div>
                <Switch
                  checked={form.requestIdEnabled}
                  onCheckedChange={(value) =>
                    handleFieldChange("requestIdEnabled", value)
                  }
                  aria-label="Enable request IDs"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Reject Unknown Fields</p>
                  <p className="text-xs text-muted-foreground">
                    Enforce strict schema validation for API payloads.
                  </p>
                </div>
                <Switch
                  checked={form.validationRejectUnknownFields}
                  onCheckedChange={(value) =>
                    handleFieldChange("validationRejectUnknownFields", value)
                  }
                  aria-label="Reject unknown fields"
                />
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="CSRF Protection"
              description="Protect state-changing requests with CSRF tokens."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Header Name</p>
                  <Input
                    value={form.csrfHeaderName}
                    onChange={(event) =>
                      handleFieldChange("csrfHeaderName", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Token TTL (minutes)</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.csrfTtlMinutes}
                    onChange={(event) =>
                      handleFieldChange("csrfTtlMinutes", event.target.value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Enabled</p>
                    <p className="text-xs text-muted-foreground">
                      Require CSRF tokens for writes.
                    </p>
                  </div>
                  <Switch
                    checked={form.csrfEnabled}
                    onCheckedChange={(value) =>
                      handleFieldChange("csrfEnabled", value)
                    }
                    aria-label="Enable CSRF"
                  />
                </div>
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="CORS Policy"
              description="Define which admin origins are allowed to call the API."
              icon={<ShieldEllipsis className="h-4 w-4" />}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">Allowed Origins</p>
                <Textarea
                  rows={3}
                  value={form.corsAllowedOrigins}
                  onChange={(event) =>
                    handleFieldChange("corsAllowedOrigins", event.target.value)
                  }
                  placeholder="https://admin.example.com, https://staging.example.com"
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Allowed Methods</p>
                  <Textarea
                    rows={2}
                    value={form.corsAllowedMethods}
                    onChange={(event) =>
                      handleFieldChange("corsAllowedMethods", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Allowed Headers</p>
                  <Textarea
                    rows={2}
                    value={form.corsAllowedHeaders}
                    onChange={(event) =>
                      handleFieldChange("corsAllowedHeaders", event.target.value)
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preflight Max Age (seconds)</p>
                  <Input
                    type="number"
                    min={60}
                    value={form.corsMaxAgeSeconds}
                    onChange={(event) =>
                      handleFieldChange("corsMaxAgeSeconds", event.target.value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Allow Credentials</p>
                    <p className="text-xs text-muted-foreground">
                      Enable cookies for allowed origins.
                    </p>
                  </div>
                  <Switch
                    checked={form.corsAllowCredentials}
                    onCheckedChange={(value) =>
                      handleFieldChange("corsAllowCredentials", value)
                    }
                    aria-label="Allow credentials"
                  />
                </div>
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Rate Limiting"
              description="Protect authentication and admin APIs from abuse."
              icon={<Clock3 className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Rate Limits</p>
                  <p className="text-xs text-muted-foreground">
                    Applies per-IP throttling on critical endpoints.
                  </p>
                </div>
                <Switch
                  checked={form.rateLimitEnabled}
                  onCheckedChange={(value) =>
                    handleFieldChange("rateLimitEnabled", value)
                  }
                  aria-label="Enable rate limiting"
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Window (seconds)</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.rateLimitAdminWindowSeconds}
                    onChange={(event) =>
                      handleFieldChange(
                        "rateLimitAdminWindowSeconds",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Max Requests</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.rateLimitAdminMaxRequests}
                    onChange={(event) =>
                      handleFieldChange(
                        "rateLimitAdminMaxRequests",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Auth Window (seconds)</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.rateLimitAuthWindowSeconds}
                    onChange={(event) =>
                      handleFieldChange(
                        "rateLimitAuthWindowSeconds",
                        event.target.value
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Auth Max Requests</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.rateLimitAuthMaxRequests}
                    onChange={(event) =>
                      handleFieldChange(
                        "rateLimitAuthMaxRequests",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Session Limits"
              description="Control session lifespan and concurrent logins."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Session TTL (days)</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.sessionTtlDays}
                    onChange={(event) =>
                      handleFieldChange("sessionTtlDays", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Max Sessions per User</p>
                  <Input
                    type="number"
                    min={1}
                    value={form.sessionMaxPerUser}
                    onChange={(event) =>
                      handleFieldChange("sessionMaxPerUser", event.target.value)
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Single Session Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Single session overrides max per user.
                  </p>
                </div>
                <Switch
                  checked={form.sessionSingleSession}
                  onCheckedChange={(value) =>
                    handleFieldChange("sessionSingleSession", value)
                  }
                  aria-label="Enable single session mode"
                />
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Security Headers"
              description="Control HTTP response headers for the admin surface."
              icon={<LockKeyhole className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Headers</p>
                  <p className="text-xs text-muted-foreground">
                    Apply security headers to API and admin UI responses.
                  </p>
                </div>
                <Switch
                  checked={form.headersEnabled}
                  onCheckedChange={(value) =>
                    handleFieldChange("headersEnabled", value)
                  }
                  aria-label="Enable security headers"
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Frame Options</p>
                  <Select
                    value={form.frameOptions}
                    onValueChange={(value) =>
                      handleFieldChange("frameOptions", value as "DENY" | "SAMEORIGIN")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DENY">DENY</SelectItem>
                      <SelectItem value="SAMEORIGIN">SAMEORIGIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Nosniff Content Types</p>
                    <p className="text-xs text-muted-foreground">
                      Prevent MIME type sniffing.
                    </p>
                  </div>
                  <Switch
                    checked={form.contentTypeOptions}
                    onCheckedChange={(value) =>
                      handleFieldChange("contentTypeOptions", value)
                    }
                    aria-label="Enable nosniff"
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Referrer Policy</p>
                  <Input
                    value={form.referrerPolicy}
                    onChange={(event) =>
                      handleFieldChange("referrerPolicy", event.target.value)
                    }
                    placeholder="no-referrer"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissions Policy</p>
                  <Input
                    value={form.permissionsPolicy}
                    onChange={(event) =>
                      handleFieldChange("permissionsPolicy", event.target.value)
                    }
                    placeholder="geolocation=()"
                  />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Content Security Policy</p>
                  <Textarea
                    rows={2}
                    value={form.csp}
                    onChange={(event) =>
                      handleFieldChange("csp", event.target.value)
                    }
                    placeholder="default-src 'self'"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">HSTS</p>
                  <Textarea
                    rows={2}
                    value={form.hsts}
                    onChange={(event) =>
                      handleFieldChange("hsts", event.target.value)
                    }
                    placeholder="max-age=31536000; includeSubDomains"
                  />
                </div>
              </div>
            </SecurityPolicyCard>

            <SecurityPolicyCard
              title="Plugin Safety"
              description="Temporarily disable runtime plugins during maintenance or debugging."
              icon={<PlugZap className="h-4 w-4" />}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable Safe Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Prevents plugin code from loading until disabled again.
                  </p>
                </div>
                <Switch
                  checked={form.pluginSafeMode}
                  onCheckedChange={(value) => handleFieldChange("pluginSafeMode", value)}
                  aria-label="Enable plugin safe mode"
                />
              </div>
            </SecurityPolicyCard>

            <IpAllowlistTable
              entries={allowlistEntries}
              isLoading={allowlistLoading}
              error={allowlistError}
              onRemove={removeEntry}
            />
            <LoginAlertsCard
              title="Suspicious Login Alerts"
              description="Get notified whenever someone logs in from a new device, browser, or location."
              icon={<BellRing className="h-4 w-4" />}
              iconWrapperClassName="bg-primary/10 text-primary"
              checked={form.loginAlertsEnabled}
              onCheckedChange={(value) =>
                handleFieldChange("loginAlertsEnabled", value)
              }
              disabled={busy}
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={handleDiscard} disabled={busy}>
                Discard
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" />
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
