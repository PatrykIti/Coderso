import { apiRequest } from "./apiClient";

export type StorageDriver = "local" | "s3" | "azure";

export type SettingResponse = {
  key: string;
  value: unknown;
};

export type SettingsResponse = Record<string, unknown>;

export type SettingsUpdate = Record<string, unknown>;

export type StorageSettingsResponse = {
  driver: StorageDriver;
  local: { dir: string | null };
  publicBaseUrl: string | null;
  maxSizeBytes: number | null;
  allowedMime: string | null;
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
    admin: { windowSeconds: number; maxRequests: number };
    auth: { windowSeconds: number; maxRequests: number };
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
};

export type SecuritySettingsUpdate = {
  requestId?: Partial<SecuritySettingsResponse["requestId"]>;
  csrf?: Partial<SecuritySettingsResponse["csrf"]>;
  cors?: Partial<SecuritySettingsResponse["cors"]>;
  rateLimit?: {
    enabled?: boolean;
    admin?: Partial<SecuritySettingsResponse["rateLimit"]["admin"]>;
    auth?: Partial<SecuritySettingsResponse["rateLimit"]["auth"]>;
  };
  headers?: Partial<SecuritySettingsResponse["headers"]>;
  validation?: Partial<SecuritySettingsResponse["validation"]>;
  plugins?: Partial<SecuritySettingsResponse["plugins"]>;
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
