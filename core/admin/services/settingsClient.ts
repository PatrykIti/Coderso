import { apiRequest } from "./apiClient";

export type StorageDriver = "local" | "s3" | "azure";

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

export async function getStorageSettings() {
  return apiRequest<StorageSettingsResponse>("/settings/storage", {
    method: "GET",
  });
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
