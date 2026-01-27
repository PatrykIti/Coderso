import type { ComponentType } from "react";
import { API_VERSION } from "./shared";
import type {
  AssetsAPI,
  PermissionsAPI,
  PluginMeta,
  SettingsAPI,
} from "./shared";

export interface AdminUIAPI {
  registerAdminPage(input: {
    path: string;
    title: string;
    component: ComponentType<unknown>;
  }): void;
  registerDashboardWidget(input: {
    id: string;
    title: string;
    component: ComponentType<unknown>;
  }): void;
  registerSettingsSection(input: {
    id: string;
    title: string;
    component: ComponentType<unknown>;
  }): void;
}

export interface BlocksAPI {
  registerBlock(input: {
    type: string;
    schema: Record<string, unknown>;
    render: ComponentType<unknown>;
    editor?: ComponentType<unknown>;
  }): void;
}

export interface HttpAPI {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

export interface ClientContext {
  apiVersion: typeof API_VERSION;
  plugin: PluginMeta;
  ui: AdminUIAPI;
  blocks: BlocksAPI;
  assets: AssetsAPI;
  permissions: PermissionsAPI;
  settings: SettingsAPI;
  http: HttpAPI;
}

export type AdminRegister = (ctx: ClientContext) => void | Promise<void>;

export function defineAdmin(register: AdminRegister) {
  return register;
}
