import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Gauge,
  Globe,
  KeyRound,
  Network,
  Plus,
  Shield,
  ShieldCheck,
  Sliders,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  getSettings,
  getSecuritySettings,
  updateSettings,
  updateSecuritySettings,
  type SecuritySettingsResponse,
} from "@/services/settingsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { InfoTip } from "@/ui/shared/InfoTip";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import { IpAllowlistDrawer } from "./IpAllowlistDrawer";
import { IpAllowlistTable } from "./IpAllowlistTable";
import { SecurityPolicyCard } from "./SecurityPolicyCard";
import { SettingsSidebar } from "./SettingsSidebar";
import { useIpAllowlist } from "./useIpAllowlist";
import {
  listToText,
  normalizeOptional,
  parseListWithFallback,
  parsePositiveNumber,
} from "./securitySettingsUtils";

const SCORE_MIN = 0;
const SCORE_MAX = 1;

const parseScore = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label}_missing`);
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < SCORE_MIN || parsed > SCORE_MAX) {
    throw new Error(`${label}_invalid`);
  }
  return parsed;
};

const isPositiveNumberString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
};

const isScoreString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= SCORE_MIN && parsed <= SCORE_MAX;
};

const isInvalidNumber = (value: string) =>
  value.trim().length > 0 && !isPositiveNumberString(value);

const isInvalidScore = (value: string) =>
  value.trim().length > 0 && !isScoreString(value);

const isInvalidRequired = (value: string) => !value.trim();

const inputErrorClass = (invalid: boolean) =>
  invalid ? "border-destructive focus-visible:ring-destructive/30" : undefined;


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
  rateLimitAuthWindowSeconds: string;
  rateLimitAuthMaxRequests: string;
  rateLimitAdminReadWindowSeconds: string;
  rateLimitAdminReadMaxRequests: string;
  rateLimitAdminWriteWindowSeconds: string;
  rateLimitAdminWriteMaxRequests: string;
  rateLimitPublicReadWindowSeconds: string;
  rateLimitPublicReadMaxRequests: string;
  rateLimitPublicWriteWindowSeconds: string;
  rateLimitPublicWriteMaxRequests: string;
  rateLimitAssistantWindowSeconds: string;
  rateLimitAssistantMaxRequests: string;
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
  authSessionTtlDays: string;
  authResetTtlMinutes: string;
  loginAlertsEnabled: boolean;
  loginAlertsNewDevice: boolean;
  loginAlertsNewLocation: boolean;
  botProtectionEnabled: boolean;
  botProtectionSiteKey: string;
  botProtectionSecretKey: string;
  botProtectionClearSecret: boolean;
  botProtectionThresholdLogin: string;
  botProtectionThresholdReset: string;
  botProtectionThresholdPublicWrite: string;
  botProtectionEnforceLocalhost: boolean;
};

type SecuritySectionId =
  | "auth"
  | "rate_limits"
  | "csrf"
  | "cors"
  | "headers"
  | "sessions"
  | "ip_allowlist";

const SECURITY_SECTIONS: Array<{
  id: SecuritySectionId;
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    id: "auth",
    title: "Auth protection",
    description: "Bot defense and login safeguards.",
    icon: ShieldCheck,
  },
  {
    id: "rate_limits",
    title: "Rate limits",
    description: "Traffic safeguards for admin and public access.",
    icon: Gauge,
  },
  {
    id: "csrf",
    title: "CSRF",
    description: "Protect admin actions from forged requests.",
    icon: BadgeCheck,
  },
  {
    id: "cors",
    title: "CORS",
    description: "Trusted origins and allowed methods.",
    icon: Globe,
  },
  {
    id: "headers",
    title: "Security headers",
    description: "Browser-level protections and policies.",
    icon: Shield,
  },
  {
    id: "sessions",
    title: "Sessions",
    description: "Session lifetimes and login alerts.",
    icon: KeyRound,
  },
  {
    id: "ip_allowlist",
    title: "IP allowlist",
    description: "Restrict admin access to trusted networks.",
    icon: Network,
  },
];

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
  rateLimitAuthWindowSeconds: "60",
  rateLimitAuthMaxRequests: "10",
  rateLimitAdminReadWindowSeconds: "60",
  rateLimitAdminReadMaxRequests: "600",
  rateLimitAdminWriteWindowSeconds: "60",
  rateLimitAdminWriteMaxRequests: "120",
  rateLimitPublicReadWindowSeconds: "60",
  rateLimitPublicReadMaxRequests: "300",
  rateLimitPublicWriteWindowSeconds: "60",
  rateLimitPublicWriteMaxRequests: "30",
  rateLimitAssistantWindowSeconds: "60",
  rateLimitAssistantMaxRequests: "30",
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
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  loginAlertsEnabled: true,
  loginAlertsNewDevice: true,
  loginAlertsNewLocation: true,
  botProtectionEnabled: false,
  botProtectionSiteKey: "",
  botProtectionSecretKey: "",
  botProtectionClearSecret: false,
  botProtectionThresholdLogin: "0.5",
  botProtectionThresholdReset: "0.6",
  botProtectionThresholdPublicWrite: "0.5",
  botProtectionEnforceLocalhost: true,
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
  rateLimitAuthWindowSeconds: String(settings.rateLimit.buckets.auth.windowSeconds),
  rateLimitAuthMaxRequests: String(settings.rateLimit.buckets.auth.maxRequests),
  rateLimitAdminReadWindowSeconds: String(
    settings.rateLimit.buckets.admin_read.windowSeconds
  ),
  rateLimitAdminReadMaxRequests: String(settings.rateLimit.buckets.admin_read.maxRequests),
  rateLimitAdminWriteWindowSeconds: String(
    settings.rateLimit.buckets.admin_write.windowSeconds
  ),
  rateLimitAdminWriteMaxRequests: String(settings.rateLimit.buckets.admin_write.maxRequests),
  rateLimitPublicReadWindowSeconds: String(
    settings.rateLimit.buckets.public_read.windowSeconds
  ),
  rateLimitPublicReadMaxRequests: String(
    settings.rateLimit.buckets.public_read.maxRequests
  ),
  rateLimitPublicWriteWindowSeconds: String(
    settings.rateLimit.buckets.public_write.windowSeconds
  ),
  rateLimitPublicWriteMaxRequests: String(
    settings.rateLimit.buckets.public_write.maxRequests
  ),
  rateLimitAssistantWindowSeconds: String(
    settings.rateLimit.buckets.assistant.windowSeconds
  ),
  rateLimitAssistantMaxRequests: String(settings.rateLimit.buckets.assistant.maxRequests),
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
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  loginAlertsEnabled: settings.loginAlerts.enabled,
  loginAlertsNewDevice: settings.loginAlerts.notifyOnNewDevice,
  loginAlertsNewLocation: settings.loginAlerts.notifyOnNewLocation,
  botProtectionEnabled: settings.botProtection.enabled,
  botProtectionSiteKey: settings.botProtection.siteKey ?? "",
  botProtectionSecretKey: "",
  botProtectionClearSecret: false,
  botProtectionThresholdLogin: String(settings.botProtection.thresholds.login),
  botProtectionThresholdReset: String(settings.botProtection.thresholds.reset),
  botProtectionThresholdPublicWrite: String(settings.botProtection.thresholds.publicWrite),
  botProtectionEnforceLocalhost: settings.botProtection.enforceOnLocalhost,
});

const resolveRuntimeTtl = (
  payload: Record<string, unknown>,
  key: "auth.sessionTtlDays" | "auth.resetTtlMinutes",
  fallback: number,
  min: number,
  max: number
) => {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  if (normalized < min || normalized > max) return fallback;
  return normalized;
};

type PresetId = "wordpress" | "strict" | "relaxed" | "custom";

type RateLimitPreset = {
  id: PresetId;
  label: string;
  description: string;
  enabled: boolean;
  buckets: {
    auth: { windowSeconds: string; maxRequests: string };
    admin_read: { windowSeconds: string; maxRequests: string };
    admin_write: { windowSeconds: string; maxRequests: string };
    public_read: { windowSeconds: string; maxRequests: string };
    public_write: { windowSeconds: string; maxRequests: string };
    assistant: { windowSeconds: string; maxRequests: string };
  };
};

const RATE_LIMIT_PRESETS: RateLimitPreset[] = [
  {
    id: "wordpress",
    label: "WordPress-like",
    description: "Balanced limits that keep admin work smooth.",
    enabled: true,
    buckets: {
      auth: { windowSeconds: "60", maxRequests: "10" },
      admin_read: { windowSeconds: "60", maxRequests: "600" },
      admin_write: { windowSeconds: "60", maxRequests: "120" },
      public_read: { windowSeconds: "60", maxRequests: "300" },
      public_write: { windowSeconds: "60", maxRequests: "30" },
      assistant: { windowSeconds: "60", maxRequests: "30" },
    },
  },
  {
    id: "strict",
    label: "Strict",
    description: "Tighter limits for high-risk environments.",
    enabled: true,
    buckets: {
      auth: { windowSeconds: "60", maxRequests: "5" },
      admin_read: { windowSeconds: "60", maxRequests: "300" },
      admin_write: { windowSeconds: "60", maxRequests: "60" },
      public_read: { windowSeconds: "60", maxRequests: "150" },
      public_write: { windowSeconds: "60", maxRequests: "15" },
      assistant: { windowSeconds: "60", maxRequests: "15" },
    },
  },
  {
    id: "relaxed",
    label: "Relaxed",
    description: "High throughput or internal staging use.",
    enabled: false,
    buckets: {
      auth: { windowSeconds: "60", maxRequests: "10" },
      admin_read: { windowSeconds: "60", maxRequests: "600" },
      admin_write: { windowSeconds: "60", maxRequests: "120" },
      public_read: { windowSeconds: "60", maxRequests: "300" },
      public_write: { windowSeconds: "60", maxRequests: "30" },
      assistant: { windowSeconds: "60", maxRequests: "30" },
    },
  },
];

const resolveRateLimitPreset = (form: SecurityFormState): PresetId => {
  for (const preset of RATE_LIMIT_PRESETS) {
    if (form.rateLimitEnabled !== preset.enabled) continue;
    const matches =
      form.rateLimitAuthWindowSeconds === preset.buckets.auth.windowSeconds &&
      form.rateLimitAuthMaxRequests === preset.buckets.auth.maxRequests &&
      form.rateLimitAdminReadWindowSeconds === preset.buckets.admin_read.windowSeconds &&
      form.rateLimitAdminReadMaxRequests === preset.buckets.admin_read.maxRequests &&
      form.rateLimitAdminWriteWindowSeconds === preset.buckets.admin_write.windowSeconds &&
      form.rateLimitAdminWriteMaxRequests === preset.buckets.admin_write.maxRequests &&
      form.rateLimitPublicReadWindowSeconds === preset.buckets.public_read.windowSeconds &&
      form.rateLimitPublicReadMaxRequests === preset.buckets.public_read.maxRequests &&
      form.rateLimitPublicWriteWindowSeconds === preset.buckets.public_write.windowSeconds &&
      form.rateLimitPublicWriteMaxRequests === preset.buckets.public_write.maxRequests &&
      form.rateLimitAssistantWindowSeconds === preset.buckets.assistant.windowSeconds &&
      form.rateLimitAssistantMaxRequests === preset.buckets.assistant.maxRequests;
    if (matches) return preset.id;
  }
  return "custom";
};

export function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettingsResponse | null>(null);
  const [form, setForm] = useState<SecurityFormState>(defaultFormState);
  const [activeSection, setActiveSection] = useState<SecuritySectionId>("auth");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();
  const {
    entries: allowlistEntries,
    isLoading: allowlistLoading,
    error: allowlistError,
    addEntry,
    removeEntry,
  } = useIpAllowlist();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    Promise.all([getSecuritySettings(), getSettings()])
      .then(([securityResult, runtimeSettings]) => {
        if (!active) return;
        const authSessionTtlDays = resolveRuntimeTtl(
          runtimeSettings,
          "auth.sessionTtlDays",
          14,
          1,
          365
        );
        const authResetTtlMinutes = resolveRuntimeTtl(
          runtimeSettings,
          "auth.resetTtlMinutes",
          60,
          5,
          1440
        );
        setSettings(securityResult);
        setForm({
          ...toFormState(securityResult),
          authSessionTtlDays: String(authSessionTtlDays),
          authResetTtlMinutes: String(authResetTtlMinutes),
        });
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

  const requestIdHeaderInvalid = isInvalidRequired(form.requestIdHeaderName);
  const csrfHeaderInvalid = isInvalidRequired(form.csrfHeaderName);
  const csrfTtlInvalid = isInvalidNumber(form.csrfTtlMinutes);
  const corsMaxAgeInvalid = isInvalidNumber(form.corsMaxAgeSeconds);
  const authThrottleInvalid = [
    form.rateLimitAuthWindowSeconds,
    form.rateLimitAuthMaxRequests,
  ].some(isInvalidNumber);
  const rateLimitInvalid = [
    form.rateLimitAdminReadWindowSeconds,
    form.rateLimitAdminReadMaxRequests,
    form.rateLimitAdminWriteWindowSeconds,
    form.rateLimitAdminWriteMaxRequests,
    form.rateLimitPublicReadWindowSeconds,
    form.rateLimitPublicReadMaxRequests,
    form.rateLimitPublicWriteWindowSeconds,
    form.rateLimitPublicWriteMaxRequests,
    form.rateLimitAssistantWindowSeconds,
    form.rateLimitAssistantMaxRequests,
  ].some(isInvalidNumber);
  const sessionInvalid = [
    form.sessionTtlDays,
    form.sessionMaxPerUser,
    form.authSessionTtlDays,
    form.authResetTtlMinutes,
  ].some(isInvalidNumber);
  const botScoreInvalid = [
    form.botProtectionThresholdLogin,
    form.botProtectionThresholdReset,
    form.botProtectionThresholdPublicWrite,
  ].some(isInvalidScore);

  const headerInvalid = requestIdHeaderInvalid || csrfHeaderInvalid;
  const numericInvalid =
    csrfTtlInvalid || corsMaxAgeInvalid || authThrottleInvalid || rateLimitInvalid || sessionInvalid;
  const scoreInvalid = botScoreInvalid;
  const hasValidationErrors = headerInvalid || numericInvalid || scoreInvalid;
  const presetId = resolveRateLimitPreset(form);

  const handleApplyPreset = (id: PresetId) => {
    const preset = RATE_LIMIT_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      rateLimitEnabled: preset.enabled,
      rateLimitAuthWindowSeconds: preset.buckets.auth.windowSeconds,
      rateLimitAuthMaxRequests: preset.buckets.auth.maxRequests,
      rateLimitAdminReadWindowSeconds: preset.buckets.admin_read.windowSeconds,
      rateLimitAdminReadMaxRequests: preset.buckets.admin_read.maxRequests,
      rateLimitAdminWriteWindowSeconds: preset.buckets.admin_write.windowSeconds,
      rateLimitAdminWriteMaxRequests: preset.buckets.admin_write.maxRequests,
      rateLimitPublicReadWindowSeconds: preset.buckets.public_read.windowSeconds,
      rateLimitPublicReadMaxRequests: preset.buckets.public_read.maxRequests,
      rateLimitPublicWriteWindowSeconds: preset.buckets.public_write.windowSeconds,
      rateLimitPublicWriteMaxRequests: preset.buckets.public_write.maxRequests,
      rateLimitAssistantWindowSeconds: preset.buckets.assistant.windowSeconds,
      rateLimitAssistantMaxRequests: preset.buckets.assistant.maxRequests,
    }));
  };

  const handleSave = useCallback(async () => {
    if (busy || hasValidationErrors) return false;
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    try {
      const securityPayload = {
        requestId: {
          enabled: form.requestIdEnabled,
          headerName: form.requestIdHeaderName.trim().toLowerCase(),
        },
        csrf: {
          enabled: form.csrfEnabled,
          headerName: form.csrfHeaderName.trim().toLowerCase(),
          tokenTtlMinutes: parsePositiveNumber(form.csrfTtlMinutes, "csrf_ttl"),
        },
        cors: {
          allowedOrigins: parseListWithFallback(form.corsAllowedOrigins, [], true),
          allowCredentials: form.corsAllowCredentials,
          allowedMethods: parseListWithFallback(
            form.corsAllowedMethods,
            ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
          ),
          allowedHeaders: parseListWithFallback(
            form.corsAllowedHeaders,
            ["content-type", "x-csrf-token"]
          ),
          maxAgeSeconds: parsePositiveNumber(form.corsMaxAgeSeconds, "cors_max_age"),
        },
        rateLimit: {
          enabled: form.rateLimitEnabled,
          buckets: {
            auth: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitAuthWindowSeconds,
                "auth_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitAuthMaxRequests,
                "auth_requests"
              ),
            },
            admin_read: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitAdminReadWindowSeconds,
                "admin_read_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitAdminReadMaxRequests,
                "admin_read_requests"
              ),
            },
            admin_write: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitAdminWriteWindowSeconds,
                "admin_write_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitAdminWriteMaxRequests,
                "admin_write_requests"
              ),
            },
            public_read: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitPublicReadWindowSeconds,
                "public_read_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitPublicReadMaxRequests,
                "public_read_requests"
              ),
            },
            public_write: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitPublicWriteWindowSeconds,
                "public_write_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitPublicWriteMaxRequests,
                "public_write_requests"
              ),
            },
            assistant: {
              windowSeconds: parsePositiveNumber(
                form.rateLimitAssistantWindowSeconds,
                "assistant_window"
              ),
              maxRequests: parsePositiveNumber(
                form.rateLimitAssistantMaxRequests,
                "assistant_requests"
              ),
            },
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
        validation: { rejectUnknownFields: form.validationRejectUnknownFields },
        plugins: { safeMode: form.pluginSafeMode },
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
        botProtection: {
          enabled: form.botProtectionEnabled,
          provider: "recaptcha_v3",
          siteKey: normalizeOptional(form.botProtectionSiteKey),
          thresholds: {
            login: parseScore(form.botProtectionThresholdLogin, "bot_login"),
            reset: parseScore(form.botProtectionThresholdReset, "bot_reset"),
            publicWrite: parseScore(
              form.botProtectionThresholdPublicWrite,
              "bot_public"
            ),
          },
          enforceOnLocalhost: form.botProtectionEnforceLocalhost,
        } as Record<string, unknown>,
      };

      if (form.botProtectionClearSecret) {
        securityPayload.botProtection.secretKey = null;
      } else if (form.botProtectionSecretKey.trim()) {
        securityPayload.botProtection.secretKey = form.botProtectionSecretKey.trim();
      }

      const runtimePayload = {
        "auth.sessionTtlDays": parsePositiveNumber(
          form.authSessionTtlDays,
          "auth_session_ttl"
        ),
        "auth.resetTtlMinutes": parsePositiveNumber(
          form.authResetTtlMinutes,
          "auth_reset_ttl"
        ),
      };

      const [updatedSecurity] = await Promise.all([
        updateSecuritySettings(securityPayload),
        updateSettings(runtimePayload),
      ]);

      setSettings(updatedSecurity);
      setForm((prev) => ({
        ...prev,
        botProtectionSecretKey: "",
        botProtectionClearSecret: false,
      }));
      setSaveSuccess("Security settings updated.");
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save security settings.");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [busy, form, hasValidationErrors]);

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: !isLoading,
    hasErrors: hasValidationErrors,
    value: form,
    onSave: handleSave,
  });

    const saveDisabled = busy || hasValidationErrors;

  return (
    <SettingsShell
      activeHref="/admin/settings/security"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="security" />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">Security Settings</span>
          <span className="text-xs text-muted-foreground">
            Keep sign-in and public access safe without slowing down real users.
          </span>
        </div>
      }
      topbarActions={null}
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 pb-28">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saveError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                {SECURITY_SECTIONS.map((section) => {
                  const isActive = section.id === activeSection;
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                        isActive
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{section.title}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6">
                {activeSection === "auth" ? (
                  <div className="space-y-6">
                    <SecurityPolicyCard
                      title="Sign-in protection"
                      description="Protect the login screen from bots and abuse."
                      icon={<ShieldCheck className="h-4 w-4" />}
                      action={<Badge variant="secondary">Recommended</Badge>}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Enable reCAPTCHA v3</p>
                          <p className="text-xs text-muted-foreground">
                            Turn on after adding your Google keys.
                          </p>
                        </div>
                        <Switch
                          checked={form.botProtectionEnabled}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              botProtectionEnabled: checked,
                            }))
                          }
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" htmlFor="bot-site-key">
                              Site key
                            </label>
                            <InfoTip content="Public key from Google reCAPTCHA v3." />
                          </div>
                          <Input
                            id="bot-site-key"
                            placeholder="6Lc..."
                            value={form.botProtectionSiteKey}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                botProtectionSiteKey: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" htmlFor="bot-secret-key">
                              Secret key
                            </label>
                            <InfoTip content="Stored securely. Leave blank to keep existing." />
                          </div>
                          <Input
                            id="bot-secret-key"
                            type="password"
                            placeholder={
                              settings?.botProtection.secretKey.configured
                                ? "••••••••"
                                : "Secret key"
                            }
                            value={form.botProtectionSecretKey}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                botProtectionSecretKey: event.target.value,
                                botProtectionClearSecret: false,
                              }))
                            }
                            disabled={busy}
                          />
                          {settings?.botProtection.secretKey.configured ? (
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  botProtectionSecretKey: "",
                                  botProtectionClearSecret: true,
                                }))
                              }
                              disabled={busy}
                            >
                              Clear stored secret
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" htmlFor="bot-login-score">
                              Login score threshold
                            </label>
                            <InfoTip content="Scores range from 0.0 (bot) to 1.0 (human). Block below this value." />
                          </div>
                          <Input
                            id="bot-login-score"
                            aria-invalid={isInvalidScore(form.botProtectionThresholdLogin)}
                            className={inputErrorClass(isInvalidScore(form.botProtectionThresholdLogin))}
                            placeholder="0.5"
                            value={form.botProtectionThresholdLogin}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                botProtectionThresholdLogin: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" htmlFor="bot-reset-score">
                              Reset score threshold
                            </label>
                            <InfoTip content="Use a slightly higher threshold for password resets." />
                          </div>
                          <Input
                            id="bot-reset-score"
                            aria-invalid={isInvalidScore(form.botProtectionThresholdReset)}
                            className={inputErrorClass(isInvalidScore(form.botProtectionThresholdReset))}
                            placeholder="0.6"
                            value={form.botProtectionThresholdReset}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                botProtectionThresholdReset: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium" htmlFor="bot-public-score">
                              Public write threshold
                            </label>
                            <InfoTip content="Applies to public form submissions and similar actions." />
                          </div>
                          <Input
                            id="bot-public-score"
                            aria-invalid={isInvalidScore(form.botProtectionThresholdPublicWrite)}
                            className={inputErrorClass(isInvalidScore(form.botProtectionThresholdPublicWrite))}
                            placeholder="0.5"
                            value={form.botProtectionThresholdPublicWrite}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                botProtectionThresholdPublicWrite: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      {botScoreInvalid ? (
                        <p className="text-xs text-destructive">
                          Scores must stay between 0.0 and 1.0.
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Enforce on localhost</p>
                          <p className="text-xs text-muted-foreground">
                            Keep bot checks active during local testing.
                          </p>
                        </div>
                        <Switch
                          checked={form.botProtectionEnforceLocalhost}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              botProtectionEnforceLocalhost: checked,
                            }))
                          }
                          disabled={busy}
                        />
                      </div>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Login throttle"
                      description="Slow down repeated sign-in attempts."
                      icon={<Gauge className="h-4 w-4" />}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="auth-window">
                            Window seconds
                          </label>
                          <Input
                            id="auth-window"
                            aria-invalid={isInvalidNumber(form.rateLimitAuthWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAuthWindowSeconds))}
                            value={form.rateLimitAuthWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAuthWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="auth-max">
                            Attempts per window
                          </label>
                          <Input
                            id="auth-max"
                            aria-invalid={isInvalidNumber(form.rateLimitAuthMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAuthMaxRequests))}
                            value={form.rateLimitAuthMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAuthMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      {authThrottleInvalid ? (
                        <p className="text-xs text-destructive">
                          Use positive numbers for the login throttle.
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Prevents brute-force attempts without blocking normal users.
                      </p>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Password safety"
                      description="Extra protection for stored passwords."
                      icon={<ShieldCheck className="h-4 w-4" />}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Pepper enabled</p>
                          <p className="text-xs text-muted-foreground">
                            Set AUTH_PASSWORD_PEPPER in server ENV to enable.
                          </p>
                        </div>
                        <Badge variant={settings?.passwordPepperConfigured ? "default" : "secondary"}>
                          {settings?.passwordPepperConfigured ? "Enabled" : "Not configured"}
                        </Badge>
                      </div>
                    </SecurityPolicyCard>
                    {rateLimitInvalid ? (
                      <p className="text-xs text-destructive">
                        Rate limit fields must be positive numbers.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {activeSection === "rate_limits" ? (
                  <div className="space-y-6">
                    <SecurityPolicyCard
                      title="Smart presets"
                      description="Pick a ready-made safety level."
                      icon={<Sliders className="h-4 w-4" />}
                    >
                      <div className="flex items-center gap-3">
                        <Select value={presetId} onValueChange={(value) => handleApplyPreset(value as PresetId)}>
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Choose preset" />
                          </SelectTrigger>
                          <SelectContent>
                            {RATE_LIMIT_PRESETS.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                {preset.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {presetId === "wordpress" ? (
                          <Badge variant="secondary">Recommended</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Presets apply a recommended bundle of limits.
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Enable rate limits</p>
                          <p className="text-xs text-muted-foreground">
                            Disable only for trusted internal deployments.
                          </p>
                        </div>
                        <Switch
                          checked={form.rateLimitEnabled}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, rateLimitEnabled: checked }))
                          }
                          disabled={busy}
                        />
                      </div>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Admin usage"
                      description="Limits for the admin panel (read/write)."
                      icon={<ShieldCheck className="h-4 w-4" />}
                      action={<Badge variant="secondary">Recommended</Badge>}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="admin-read-max">
                            Admin read max (per window)
                          </label>
                          <Input
                            id="admin-read-max"
                            aria-invalid={isInvalidNumber(form.rateLimitAdminReadMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAdminReadMaxRequests))}
                            value={form.rateLimitAdminReadMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAdminReadMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="admin-read-window">
                            Admin read window (seconds)
                          </label>
                          <Input
                            id="admin-read-window"
                            aria-invalid={isInvalidNumber(form.rateLimitAdminReadWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAdminReadWindowSeconds))}
                            value={form.rateLimitAdminReadWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAdminReadWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="admin-write-max">
                            Admin write max (per window)
                          </label>
                          <Input
                            id="admin-write-max"
                            aria-invalid={isInvalidNumber(form.rateLimitAdminWriteMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAdminWriteMaxRequests))}
                            value={form.rateLimitAdminWriteMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAdminWriteMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="admin-write-window">
                            Admin write window (seconds)
                          </label>
                          <Input
                            id="admin-write-window"
                            aria-invalid={isInvalidNumber(form.rateLimitAdminWriteWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAdminWriteWindowSeconds))}
                            value={form.rateLimitAdminWriteWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAdminWriteWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Logged-in admins are not throttled. Anonymous access is still limited.
                      </p>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Public site usage"
                      description="Limits for public visitors."
                      icon={<Globe className="h-4 w-4" />}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="public-read-max">
                            Public read max (per window)
                          </label>
                          <Input
                            id="public-read-max"
                            aria-invalid={isInvalidNumber(form.rateLimitPublicReadMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitPublicReadMaxRequests))}
                            value={form.rateLimitPublicReadMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitPublicReadMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="public-read-window">
                            Public read window (seconds)
                          </label>
                          <Input
                            id="public-read-window"
                            aria-invalid={isInvalidNumber(form.rateLimitPublicReadWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitPublicReadWindowSeconds))}
                            value={form.rateLimitPublicReadWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitPublicReadWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="public-write-max">
                            Public write max (per window)
                          </label>
                          <Input
                            id="public-write-max"
                            aria-invalid={isInvalidNumber(form.rateLimitPublicWriteMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitPublicWriteMaxRequests))}
                            value={form.rateLimitPublicWriteMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitPublicWriteMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="public-write-window">
                            Public write window (seconds)
                          </label>
                          <Input
                            id="public-write-window"
                            aria-invalid={isInvalidNumber(form.rateLimitPublicWriteWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitPublicWriteWindowSeconds))}
                            value={form.rateLimitPublicWriteWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitPublicWriteWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Public write affects form submissions and other public actions.
                      </p>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Assistant usage"
                      description="Limits for the built-in assistant."
                      icon={<ShieldCheck className="h-4 w-4" />}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="assistant-max">
                            Requests per window
                          </label>
                          <Input
                            id="assistant-max"
                            aria-invalid={isInvalidNumber(form.rateLimitAssistantMaxRequests)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAssistantMaxRequests))}
                            value={form.rateLimitAssistantMaxRequests}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAssistantMaxRequests: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="assistant-window">
                            Window seconds
                          </label>
                          <Input
                            id="assistant-window"
                            aria-invalid={isInvalidNumber(form.rateLimitAssistantWindowSeconds)}
                            className={inputErrorClass(isInvalidNumber(form.rateLimitAssistantWindowSeconds))}
                            value={form.rateLimitAssistantWindowSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                rateLimitAssistantWindowSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </SecurityPolicyCard>
                  </div>
                ) : null}

                {activeSection === "csrf" ? (
                  <SecurityPolicyCard
                    title="Form safety"
                    description="Stops cross-site request forgery in the admin panel."
                    icon={<BadgeCheck className="h-4 w-4" />}
                    action={<Badge variant="secondary">Recommended</Badge>}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Enable CSRF</p>
                        <p className="text-xs text-muted-foreground">
                          Required for secure admin actions.
                        </p>
                      </div>
                      <Switch
                        checked={form.csrfEnabled}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, csrfEnabled: checked }))
                        }
                        disabled={busy}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="csrf-header">
                          CSRF header name
                        </label>
                        <Input
                          id="csrf-header"
                          aria-invalid={csrfHeaderInvalid}
                          className={inputErrorClass(csrfHeaderInvalid)}
                          value={form.csrfHeaderName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              csrfHeaderName: event.target.value,
                            }))
                          }
                          disabled={busy}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="csrf-ttl">
                          Token lifetime (minutes)
                        </label>
                        <Input
                          id="csrf-ttl"
                          aria-invalid={csrfTtlInvalid}
                          className={inputErrorClass(csrfTtlInvalid)}
                          value={form.csrfTtlMinutes}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              csrfTtlMinutes: event.target.value,
                            }))
                          }
                          disabled={busy}
                        />
                      </div>
                    </div>
                    {csrfHeaderInvalid || csrfTtlInvalid ? (
                      <p className="text-xs text-destructive">
                        Enter a header name and a positive TTL.
                      </p>
                    ) : null}
                  </SecurityPolicyCard>
                ) : null}

                {activeSection === "cors" ? (
                  <div className="space-y-6">
                    <SecurityPolicyCard
                      title="Trusted origins"
                      description="Which domains can call the admin API."
                      icon={<Globe className="h-4 w-4" />}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="cors-origins">
                          Allowed origins
                        </label>
                        <Textarea
                          id="cors-origins"
                          placeholder="https://admin.example.com"
                          value={form.corsAllowedOrigins}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              corsAllowedOrigins: event.target.value,
                            }))
                          }
                          disabled={busy}
                        />
                        <p className="text-xs text-muted-foreground">
                          Empty means same-origin only.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Allow credentials</p>
                          <p className="text-xs text-muted-foreground">
                            Only enable for trusted origins.
                          </p>
                        </div>
                        <Switch
                          checked={form.corsAllowCredentials}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              corsAllowCredentials: checked,
                            }))
                          }
                          disabled={busy}
                        />
                      </div>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Allowed methods"
                      description="HTTP methods allowed for the admin API."
                      icon={<Shield className="h-4 w-4" />}
                    >
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="cors-methods">
                            Methods
                          </label>
                          <Input
                            id="cors-methods"
                            value={form.corsAllowedMethods}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                corsAllowedMethods: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="cors-headers">
                            Allowed headers
                          </label>
                          <Input
                            id="cors-headers"
                            value={form.corsAllowedHeaders}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                corsAllowedHeaders: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="cors-max-age">
                            Max age seconds
                          </label>
                          <Input
                            id="cors-max-age"
                            aria-invalid={corsMaxAgeInvalid}
                            className={inputErrorClass(corsMaxAgeInvalid)}
                            value={form.corsMaxAgeSeconds}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                corsMaxAgeSeconds: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      {corsMaxAgeInvalid ? (
                        <p className="text-xs text-destructive">
                          Max age must be a positive number.
                        </p>
                      ) : null}
                    </SecurityPolicyCard>
                  </div>
                ) : null}

                {activeSection === "headers" ? (
                  <div className="space-y-6">
                    <SecurityPolicyCard
                      title="Browser protection"
                      description="Extra safety headers for modern browsers."
                      icon={<ShieldCheck className="h-4 w-4" />}
                      action={<Badge variant="secondary">Recommended</Badge>}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Enable headers</p>
                          <p className="text-xs text-muted-foreground">
                            Prevents click-jacking and reduces data leaks.
                          </p>
                        </div>
                        <Switch
                          checked={form.headersEnabled}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, headersEnabled: checked }))
                          }
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="frame-options">
                            Frame options
                          </label>
                          <Select
                            value={form.frameOptions}
                            onValueChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                frameOptions: value as "DENY" | "SAMEORIGIN",
                              }))
                            }
                          >
                            <SelectTrigger id="frame-options">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DENY">DENY</SelectItem>
                              <SelectItem value="SAMEORIGIN">SAMEORIGIN</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="referrer-policy">
                            Referrer policy
                          </label>
                          <Input
                            id="referrer-policy"
                            value={form.referrerPolicy}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                referrerPolicy: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4 md:col-span-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">No-sniff content type</p>
                            <p className="text-xs text-muted-foreground">
                              Adds X-Content-Type-Options: nosniff.
                            </p>
                          </div>
                          <Switch
                            checked={form.contentTypeOptions}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                contentTypeOptions: checked,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Advanced headers"
                      description="Optional strict policies (for advanced setups)."
                      icon={<Shield className="h-4 w-4" />}
                    >
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="csp">
                            Content-Security-Policy
                          </label>
                          <Textarea
                            id="csp"
                            placeholder="default-src 'self'; img-src 'self' https:"
                            value={form.csp}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, csp: event.target.value }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="hsts">
                            HSTS
                          </label>
                          <Input
                            id="hsts"
                            placeholder="max-age=31536000; includeSubDomains; preload"
                            value={form.hsts}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, hsts: event.target.value }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="permissions-policy">
                            Permissions policy
                          </label>
                          <Input
                            id="permissions-policy"
                            value={form.permissionsPolicy}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                permissionsPolicy: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </SecurityPolicyCard>
                  </div>
                ) : null}

                {activeSection === "sessions" ? (
                  <div className="space-y-6">
                    <SecurityPolicyCard
                      title="Session lifetime"
                      description="How long users stay signed in."
                      icon={<KeyRound className="h-4 w-4" />}
                      action={<Badge variant="secondary">Recommended</Badge>}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="session-ttl">
                            Session TTL (days)
                          </label>
                          <Input
                            id="session-ttl"
                            aria-invalid={isInvalidNumber(form.sessionTtlDays)}
                            className={inputErrorClass(isInvalidNumber(form.sessionTtlDays))}
                            value={form.sessionTtlDays}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                sessionTtlDays: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="auth-session-ttl">
                            Auth session TTL (days)
                          </label>
                          <Input
                            id="auth-session-ttl"
                            aria-invalid={isInvalidNumber(form.authSessionTtlDays)}
                            className={inputErrorClass(isInvalidNumber(form.authSessionTtlDays))}
                            value={form.authSessionTtlDays}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                authSessionTtlDays: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="auth-reset-ttl">
                            Password reset TTL (minutes)
                          </label>
                          <Input
                            id="auth-reset-ttl"
                            aria-invalid={isInvalidNumber(form.authResetTtlMinutes)}
                            className={inputErrorClass(isInvalidNumber(form.authResetTtlMinutes))}
                            value={form.authResetTtlMinutes}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                authResetTtlMinutes: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                      {sessionInvalid ? (
                        <p className="text-xs text-destructive">
                          Session values must be positive numbers.
                        </p>
                      ) : null}
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Concurrent sessions"
                      description="Control how many devices can be signed in."
                      icon={<ShieldCheck className="h-4 w-4" />}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="session-max">
                            Max sessions per user
                          </label>
                          <Input
                            id="session-max"
                            aria-invalid={isInvalidNumber(form.sessionMaxPerUser)}
                            className={inputErrorClass(isInvalidNumber(form.sessionMaxPerUser))}
                            value={form.sessionMaxPerUser}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                sessionMaxPerUser: event.target.value,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Single session mode</p>
                            <p className="text-xs text-muted-foreground">
                              Signing in revokes previous sessions.
                            </p>
                          </div>
                          <Switch
                            checked={form.sessionSingleSession}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                sessionSingleSession: checked,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </SecurityPolicyCard>

                    <SecurityPolicyCard
                      title="Login alerts"
                      description="Notify when a new device signs in."
                      icon={<ShieldCheck className="h-4 w-4" />}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Enable alerts</p>
                            <p className="text-xs text-muted-foreground">
                              Get a warning if someone signs in unexpectedly.
                            </p>
                          </div>
                          <Switch
                            checked={form.loginAlertsEnabled}
                            onCheckedChange={(checked) =>
                              setForm((prev) => ({
                                ...prev,
                                loginAlertsEnabled: checked,
                              }))
                            }
                            disabled={busy}
                          />
                        </div>
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={form.loginAlertsNewDevice}
                              onCheckedChange={(checked) =>
                                setForm((prev) => ({
                                  ...prev,
                                  loginAlertsNewDevice: Boolean(checked),
                                }))
                              }
                              disabled={busy}
                            />
                            Notify on new device
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={form.loginAlertsNewLocation}
                              onCheckedChange={(checked) =>
                                setForm((prev) => ({
                                  ...prev,
                                  loginAlertsNewLocation: Boolean(checked),
                                }))
                              }
                              disabled={busy}
                            />
                            Notify on new location
                          </label>
                        </div>
                      </div>
                    </SecurityPolicyCard>
                  </div>
                ) : null}

                {activeSection === "ip_allowlist" ? (
                  <SecurityPolicyCard
                    title="Access restrictions"
                    description="Allow admin access only from trusted networks."
                    icon={<Network className="h-4 w-4" />}
                    action={
                      <div className="flex items-center gap-2">
                        <InfoTip content="Add CIDR ranges to enable the allowlist. Leave empty to allow access from anywhere." />
                        <IpAllowlistDrawer
                          trigger={
                            <Button size="sm" variant="outline" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Add IP Range
                            </Button>
                          }
                          onSubmit={addEntry}
                          error={allowlistError}
                        />
                      </div>
                    }
                  >
                    <div className="space-y-2">
                      {allowlistError ? (
                        <Alert variant="destructive">
                          <AlertDescription>{allowlistError}</AlertDescription>
                        </Alert>
                      ) : null}
                      <IpAllowlistTable
                        entries={allowlistEntries}
                        isLoading={allowlistLoading}
                        onRemove={removeEntry}
                      />
                    </div>
                  </SecurityPolicyCard>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoSaveEnabled}
                onCheckedChange={(checked) => setAutoSaveEnabled(Boolean(checked))}
                disabled={busy}
              />
              <span>Auto-save settings across all screens</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={saveDisabled}
              >
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
