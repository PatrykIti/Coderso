import { expect, test } from "bun:test";
import { loadPluginFromDir } from "../../../core/plugins/loader";
import { createPluginFixture } from "../../utils/pluginFixture";

function createTestContext(name: string, version: string) {
  const storage = new Map<string, unknown>();
  return {
    apiVersion: "1" as const,
    plugin: { name, version },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    config: { get: () => null },
    hooks: {
      addAction: () => {},
      addFilter: () => {},
      removeAction: () => {},
      removeFilter: () => {},
    },
    routes: {
      register: () => {},
    },
    assets: {
      getUrl: () => "",
      getPublicPath: () => "",
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
      get: async (key: string) => storage.get(key),
      set: async (key: string, value: unknown) => {
        storage.set(key, value);
      },
      delete: async (key: string) => {
        storage.delete(key);
      },
    },
    _storage: storage,
  };
}

test("loads valid plugin", async () => {
  const fixture = await createPluginFixture();
  const ctx = createTestContext(fixture.name, fixture.version);

  try {
    await loadPluginFromDir(fixture.pluginDir, ctx);
    expect(ctx._storage.get("loaded")).toBe(true);
  } finally {
    await fixture.cleanup();
  }
});
