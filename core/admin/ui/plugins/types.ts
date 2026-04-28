export type UpdatePolicy = "manual" | "auto-security" | "auto-all";
export type PluginRuntimeStatus = "enabled" | "disabled" | "error";

export type InstalledPlugin = {
  name: string;
  version: string;
  status: PluginRuntimeStatus;
  enabled: boolean;
  policy: UpdatePolicy;
  lastUpdated: string;
  updateAvailable?: string;
  permissions: string[];
  errorCount?: number;
  lastError?: string | null;
};
