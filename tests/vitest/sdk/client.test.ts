import { expect, test } from "vitest";

import { defineAdmin } from "../../../packages/sdk/src/client";
import { API_VERSION } from "../../../packages/sdk/src/shared";

test("defineAdmin returns the provided register function", async () => {
  const calls: string[] = [];
  const register = defineAdmin(async (ctx) => {
    calls.push(ctx.apiVersion);
    ctx.ui.registerAdminPage({
      path: "/catalog",
      title: "Catalog",
      component: (() => null) as never,
    });
  });

  const uiCalls: string[] = [];
  await register({
    apiVersion: API_VERSION,
    plugin: { name: "catalog-tools", version: "1.0.0" },
    ui: {
      registerAdminPage: (input) => uiCalls.push(`${input.path}:${input.title}`),
      registerDashboardWidget: () => {},
      registerSettingsSection: () => {},
    },
    blocks: { registerBlock: () => {} },
    assets: {
      getUrl: (path) => path,
      getPublicPath: (path) => path,
    },
    permissions: {
      has: () => true,
      require: () => {},
    },
    settings: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    },
    http: {
      fetch: async () => new Response(null, { status: 204 }),
    },
  });

  expect(calls).toEqual(["1"]);
  expect(uiCalls).toEqual(["/catalog:Catalog"]);
});
