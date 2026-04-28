import { expect, test } from "vitest";

import { definePlugin } from "../../../packages/sdk/src/server";
import { API_VERSION } from "../../../packages/sdk/src/shared";

test("definePlugin returns the provided register function", async () => {
  const actionNames: string[] = [];
  const routePaths: string[] = [];

  const register = definePlugin(async (ctx) => {
    ctx.hooks.addAction("plugin.init", () => {});
    ctx.routes.register({
      method: "GET",
      path: "/catalog/status",
      handler: () => new Response("ok"),
      permission: "catalog.read",
    });
    actionNames.push(ctx.apiVersion);
  });

  await register({
    apiVersion: API_VERSION,
    plugin: { name: "catalog-tools", version: "1.0.0" },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    config: { get: () => null },
    hooks: {
      addAction: (name) => actionNames.push(name),
      addFilter: () => {},
      removeAction: () => {},
      removeFilter: () => {},
    },
    routes: {
      register: (input) => routePaths.push(`${input.method}:${input.path}`),
    },
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
    storage: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    },
  });

  expect(actionNames).toEqual(["plugin.init", "1"]);
  expect(routePaths).toEqual(["GET:/catalog/status"]);
});
