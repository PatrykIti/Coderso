import { beforeEach, expect, test } from "bun:test";
import {
  normalizePluginManifest,
  type CodersoPluginManifestInput,
} from "../../../packages/sdk/src/pluginManifest";
import {
  clearPluginRoutes,
  createServerContext,
  getPluginRoutes,
} from "../../../core/plugins/sdkRuntime";
import type { PluginRecord } from "../../../core/plugins/registry";
import { validatePluginManifest } from "../../../core/plugins/runtime/manifestValidator";
import { assertManifestDependencies } from "../../../core/plugins/runtime/moduleRegistrar";

function createManifestInput(overrides: Partial<CodersoPluginManifestInput> = {}): CodersoPluginManifestInput {
  return {
    name: "seo-boost",
    version: "1.0.0",
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    entry: {
      server: "dist/server.mjs",
      client: "dist/client.mjs",
      styles: "dist/style.css",
    },
    integrity: {
      sha256: "manifest",
    },
    permissions: ["admin:ui", "content:read"],
    provides: {
      modules: ["widgets"],
      widgets: ["plugin:seo-boost/hero-pro"],
      routes: ["/sync"],
    },
    ...overrides,
  };
}

function createPluginRecord(overrides: Partial<PluginRecord> = {}): PluginRecord {
  return {
    id: "plugin-id",
    name: "seo-boost",
    version: "1.0.0",
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    enabled: true,
    status: "installed",
    permissions: ["admin:ui", "content:read"],
    entry: { server: "dist/server.mjs" },
    integrity: { sha256: "manifest" },
    signature: null,
    installedAt: new Date(),
    updatedAt: new Date(),
    lastError: null,
    errorCount: 0,
    ...overrides,
  } as PluginRecord;
}

beforeEach(() => {
  clearPluginRoutes();
});

test("normalizePluginManifest maps legacy api/core aliases", () => {
  const manifest = normalizePluginManifest(createManifestInput());

  expect(manifest.id).toBe("seo-boost");
  expect(manifest.targetApiVersion).toBe("1");
  expect(manifest.targetCoreVersion).toBe(">=0.1.0");
  expect(manifest.permissions).toEqual(["admin:ui", "content:read"]);
});

test("validatePluginManifest rejects id/name mismatch", () => {
  expect(() =>
    validatePluginManifest(
      createManifestInput({ id: "other-plugin" })
    )
  ).toThrow("plugin_manifest_id_mismatch");
});

test("validatePluginManifest rejects invalid module contributions", () => {
  expect(() =>
    validatePluginManifest(
      createManifestInput({
        provides: {
          modules: ["invalid-module"],
        },
      })
    )
  ).toThrow("plugin_manifest_modules_invalid");
});

test("assertManifestDependencies fails when dependency is missing", () => {
  const manifest = validatePluginManifest(
    createManifestInput({ dependencies: ["booking-suite"] })
  );

  expect(() =>
    assertManifestDependencies(manifest, ["seo-boost", "forms-plus"])
  ).toThrow("plugin_dependency_missing");
});

test("plugin routes require declared write permission", () => {
  const plugin = createPluginRecord();
  const ctx = createServerContext(plugin, undefined, {
    declaredRoutes: ["/sync"],
  });

  expect(() =>
    ctx.routes.register({
      method: "POST",
      path: "/sync",
      handler: () => new Response("ok"),
    })
  ).toThrow("plugin_route_permission_required");
});

test("plugin routes are scoped and must be declared", () => {
  const plugin = createPluginRecord();
  const ctx = createServerContext(plugin, undefined, {
    declaredRoutes: ["/sync"],
  });

  ctx.routes.register({
    method: "GET",
    path: "/sync",
    handler: () => new Response("ok"),
  });

  const [route] = getPluginRoutes();
  expect(route?.path).toBe("/plugins/seo-boost/sync");

  expect(() =>
    ctx.routes.register({
      method: "GET",
      path: "/secret",
      handler: () => new Response("ok"),
    })
  ).toThrow("plugin_route_not_declared");
});

test("plugin routes reject undeclared permission names", () => {
  const plugin = createPluginRecord({ permissions: ["content:read"] });
  const ctx = createServerContext(plugin, undefined, {
    declaredRoutes: ["/sync"],
  });

  expect(() =>
    ctx.routes.register({
      method: "GET",
      path: "/sync",
      permission: "plugins:manage",
      handler: () => new Response("ok"),
    })
  ).toThrow("plugin_permission_missing");
});
