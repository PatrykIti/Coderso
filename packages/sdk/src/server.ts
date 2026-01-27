import { API_VERSION } from "./shared";
import type {
  AssetsAPI,
  HookContext,
  PermissionsAPI,
  PluginMeta,
  SettingsAPI,
  StorageAPI,
} from "./shared";

export type HookHandler<T> = (payload: T, ctx: HookContext) => void;

export interface HooksAPI {
  addAction<T>(name: string, fn: HookHandler<T>): void;
  addFilter<T>(name: string, fn: (value: T, ctx: HookContext) => T): void;
  removeAction<T>(name: string, fn: HookHandler<T>): void;
  removeFilter<T>(name: string, fn: (value: T, ctx: HookContext) => T): void;
}

export interface RoutesAPI {
  register(input: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    handler: (req: Request) => Response | Promise<Response>;
    permission?: string;
  }): void;
}

export interface ServerContext {
  apiVersion: typeof API_VERSION;
  plugin: PluginMeta;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  config: { get: (key: string) => string | null };
  hooks: HooksAPI;
  routes: RoutesAPI;
  assets: AssetsAPI;
  permissions: PermissionsAPI;
  settings: SettingsAPI;
  storage: StorageAPI;
}

export type PluginRegister = (ctx: ServerContext) => void | Promise<void>;

export function definePlugin(register: PluginRegister) {
  return register;
}
