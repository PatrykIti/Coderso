import { expect, test } from "vitest";

import {
  isPluginManifestLike,
  normalizePluginManifest,
} from "../../../packages/sdk/src/pluginManifest";

test("isPluginManifestLike accepts legacy api/core aliases and rejects invalid input", () => {
  expect(
    isPluginManifestLike({
      name: "Catalog tools",
      version: "1.0.0",
      apiVersion: "1",
      coreVersion: "1",
      entry: { server: "./server.js" },
    })
  ).toBe(true);

  expect(
    isPluginManifestLike({
      name: "Catalog tools",
      version: "1.0.0",
      apiVersion: "1",
      coreVersion: "1",
      entry: { client: "./client.js" },
    })
  ).toBe(false);

  expect(isPluginManifestLike(null)).toBe(false);
});

test("normalizePluginManifest trims values, applies defaults, and deduplicates refs", () => {
  expect(
    normalizePluginManifest({
      id: "catalog-tools",
      name: "  Catalog Tools  ",
      version: " 1.2.3 ",
      apiVersion: " 1 ",
      coreVersion: " 1 ",
      entry: {
        server: " ./dist/server.js ",
        client: " ./dist/client.js ",
        styles: " ./dist/styles.css ",
      },
      provides: {
        modules: ["catalog", "catalog"],
        widgets: ["hero.banner", "hero.banner"],
        routes: ["/catalog", "/catalog"],
      },
      permissions: ["catalog.read", "catalog.read"],
      dependencies: ["base-kit", "base-kit"],
      featureFlags: ["catalog-ui", "catalog-ui"],
      migrations: [{ id: "001-init", file: "./migrations/001.sql" }],
      metadata: { category: "commerce" },
      integrity: {
        server: "sha256-server",
        client: "sha256-client",
      },
      signature: "signed",
    })
  ).toEqual({
    id: "catalog-tools",
    name: "Catalog Tools",
    version: "1.2.3",
    targetApiVersion: "1",
    targetCoreVersion: "1",
    entry: {
      server: "./dist/server.js",
      client: "./dist/client.js",
      styles: "./dist/styles.css",
    },
    provides: {
      modules: ["catalog"],
      widgets: ["hero.banner"],
      routes: ["/catalog"],
    },
    permissions: ["catalog.read"],
    dependencies: ["base-kit"],
    featureFlags: ["catalog-ui"],
    migrations: [{ id: "001-init", file: "./migrations/001.sql" }],
    metadata: { category: "commerce" },
    integrity: {
      server: "sha256-server",
      client: "sha256-client",
    },
    signature: "signed",
  });
});

test("normalizePluginManifest omits empty optional entry fields and metadata", () => {
  expect(
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.2.3",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: {
        server: "./dist/server.js",
        client: " ",
        styles: " ",
      },
      integrity: {
        server: "sha256-server",
      },
      metadata: "not-an-object",
      signature: null,
    })
  ).toEqual({
    id: "catalog-tools",
    name: "Catalog Tools",
    version: "1.2.3",
    targetApiVersion: "1",
    targetCoreVersion: "1",
    entry: {
      server: "./dist/server.js",
    },
    provides: {},
    permissions: [],
    dependencies: [],
    featureFlags: [],
    migrations: [],
    metadata: undefined,
    integrity: {
      server: "sha256-server",
    },
    signature: undefined,
  });
});

test("normalizePluginManifest rejects invalid manifest shapes and specific ref groups", () => {
  expect(() => normalizePluginManifest(null as never)).toThrow(
    "plugin_manifest_invalid"
  );
  expect(() =>
    normalizePluginManifest({
      id: "Catalog Tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      permissions: ["bad ref!"],
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_permissions_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      dependencies: ["bad ref!"],
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_dependencies_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      featureFlags: ["bad ref!"],
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_feature_flags_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      provides: { modules: ["bad ref!"] },
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_provides_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      migrations: [{ id: "", file: "./migrations/001.sql" }],
      integrity: { server: "sha" },
    })
  ).toThrow("plugin_manifest_migrations_invalid");
  expect(() =>
    normalizePluginManifest({
      id: "catalog-tools",
      name: "Catalog Tools",
      version: "1.0.0",
      targetApiVersion: "1",
      targetCoreVersion: "1",
      entry: { server: "./dist/server.js" },
      integrity: { server: "" },
    })
  ).toThrow("plugin_manifest_invalid");
});
