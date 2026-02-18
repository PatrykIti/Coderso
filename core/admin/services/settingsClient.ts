import { apiRequest } from "./apiClient";

export type StorageDriver = "local" | "s3" | "azure";

export type SettingResponse = {
  key: string;
  value: unknown;
};

export type AssistantMode = "docs-only" | "llm-rag";
export type AssistantLlmProvider = "openrouter" | "none";
export type AssistantDocsBackend = "filesystem" | "db";

export type AssistantSettingsPayload = {
  "assistant.enabled": boolean;
  "assistant.defaultMode": AssistantMode;
  "assistant.docs.backend": AssistantDocsBackend;
  "assistant.docs.sourceRoot": string;
  "assistant.docs.paths": string[];
  "assistant.docs.reindexOnBoot": boolean;
  "assistant.llm.enabled": boolean;
  "assistant.llm.provider": AssistantLlmProvider;
  "assistant.llm.model": string;
  "assistant.llm.maxInputTokens": number;
  "assistant.llm.maxOutputTokens": number;
  "assistant.llm.timeoutMs": number;
  "assistant.quotas.requestsPerMinute": number;
  "assistant.quotas.requestsPerDay": number;
};

export type RuntimeSettingsPayload = {
  "site.publicBaseUrl": string | null;
  "auth.sessionTtlDays": number;
  "auth.resetTtlMinutes": number;
  "setup.completed": boolean;
};

export type GeneralSettingsPayload = {
  "site.name": string;
  "site.locale": string;
  "site.publicBaseUrl": string | null;
} & AssistantSettingsPayload;

export type SettingsResponse = Record<string, unknown> &
  Partial<GeneralSettingsPayload & RuntimeSettingsPayload>;

export type SettingsUpdate = Record<string, unknown> &
  Partial<GeneralSettingsPayload & RuntimeSettingsPayload>;

export type StorageSettingsResponse = {
  driver: StorageDriver;
  local: { dir: string | null };
  publicBaseUrl: string | null;
  maxSizeBytes: number | null;
  allowedMime: string | null;
  delivery: {
    accessMode: "public" | "internal";
  };
  s3: {
    bucket: string | null;
    region: string | null;
    endpoint: string | null;
    accessKey: { configured: boolean };
    secretKey: { configured: boolean };
  };
  azure: {
    container: string | null;
    account: string | null;
    key: { configured: boolean };
    connectionString: { configured: boolean };
  };
};

export type StorageSettingsUpdate = {
  driver?: StorageDriver;
  local?: { dir?: string | null };
  publicBaseUrl?: string | null;
  maxSizeBytes?: number | null;
  allowedMime?: string | string[] | null;
  delivery?: {
    accessMode?: "public" | "internal";
  };
  s3?: {
    bucket?: string | null;
    region?: string | null;
    endpoint?: string | null;
    accessKey?: string | null;
    secretKey?: string | null;
  };
  azure?: {
    container?: string | null;
    account?: string | null;
    key?: string | null;
    connectionString?: string | null;
  };
};

export type SecuritySettingsResponse = {
  requestId: { enabled: boolean; headerName: string };
  csrf: { enabled: boolean; headerName: string; tokenTtlMinutes: number };
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAgeSeconds: number;
  };
  rateLimit: {
    enabled: boolean;
    buckets: {
      auth: { windowSeconds: number; maxRequests: number };
      admin_read: { windowSeconds: number; maxRequests: number };
      admin_write: { windowSeconds: number; maxRequests: number };
      public_read: { windowSeconds: number; maxRequests: number };
      public_write: { windowSeconds: number; maxRequests: number };
      assistant: { windowSeconds: number; maxRequests: number };
    };
  };
  headers: {
    enabled: boolean;
    frameOptions: "DENY" | "SAMEORIGIN";
    contentTypeOptions: boolean;
    referrerPolicy: string | null;
    permissionsPolicy: string | null;
    csp: string | null;
    hsts: string | null;
  };
  validation: { rejectUnknownFields: boolean };
  plugins: { safeMode: boolean };
  session: { ttlDays: number; maxPerUser: number; singleSession: boolean };
  loginAlerts: {
    enabled: boolean;
    notifyOnNewDevice: boolean;
    notifyOnNewLocation: boolean;
  };
  botProtection: {
    enabled: boolean;
    provider: "recaptcha_v3";
    siteKey: string | null;
    secretKey: { configured: boolean };
    thresholds: {
      login: number;
      reset: number;
      publicWrite: number;
    };
    enforceOnLocalhost: boolean;
  };
  passwordPepperConfigured: boolean;
};

export type SecuritySettingsUpdate = {
  requestId?: Partial<SecuritySettingsResponse["requestId"]>;
  csrf?: Partial<SecuritySettingsResponse["csrf"]>;
  cors?: Partial<SecuritySettingsResponse["cors"]>;
  rateLimit?: {
    enabled?: boolean;
    buckets?: Partial<{
      auth: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["auth"]>;
      admin_read: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["admin_read"]>;
      admin_write: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["admin_write"]>;
      public_read: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["public_read"]>;
      public_write: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["public_write"]>;
      assistant: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["assistant"]>;
    }>;
    admin?: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["admin_read"]>;
    auth?: Partial<SecuritySettingsResponse["rateLimit"]["buckets"]["auth"]>;
  };
  headers?: Partial<SecuritySettingsResponse["headers"]>;
  validation?: Partial<SecuritySettingsResponse["validation"]>;
  plugins?: Partial<SecuritySettingsResponse["plugins"]>;
  session?: Partial<SecuritySettingsResponse["session"]>;
  loginAlerts?: Partial<SecuritySettingsResponse["loginAlerts"]>;
  botProtection?: {
    enabled?: boolean;
    provider?: "recaptcha_v3";
    siteKey?: string | null;
    secretKey?: string | null;
    thresholds?: Partial<SecuritySettingsResponse["botProtection"]["thresholds"]>;
    enforceOnLocalhost?: boolean;
  };
};

export async function getStorageSettings() {
  return apiRequest<StorageSettingsResponse>("/settings/storage", {
    method: "GET",
  });
}

export async function getSettings() {
  return apiRequest<SettingsResponse>("/settings", {
    method: "GET",
  });
}

export async function getSecuritySettings() {
  return apiRequest<SecuritySettingsResponse>("/settings/security", {
    method: "GET",
  });
}

export async function getSetting(key: string) {
  return apiRequest<SettingResponse>(`/settings/${encodeURIComponent(key)}`, {
    method: "GET",
  });
}

export async function updateSettings(payload: SettingsUpdate) {
  return apiRequest<SettingsResponse>(
    "/settings",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateSecuritySettings(payload: SecuritySettingsUpdate) {
  return apiRequest<SecuritySettingsResponse>(
    "/settings/security",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateStorageSettings(payload: StorageSettingsUpdate) {
  return apiRequest<StorageSettingsResponse>(
    "/settings/storage",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}
