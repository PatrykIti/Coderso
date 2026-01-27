export const API_VERSION = "1" as const;

export type PluginMeta = {
  name: string;
  version: string;
};

export type HookContext = {
  requestId: string;
  method?: string;
  path?: string;
  locale?: string;
  session?: { id: string; userId: string };
  user?: { id: string; email: string; roles: string[] };
  ip?: string;
  userAgent?: string;
};

export interface AssetsAPI {
  getUrl(path: string): string;
  getPublicPath(path: string): string;
}

export interface PermissionsAPI {
  has(permission: string): boolean;
  require(permission: string): void;
}

export interface SettingsAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface StorageAPI {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}
