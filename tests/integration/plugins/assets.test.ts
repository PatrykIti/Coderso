import { expect, test } from "bun:test";
import { createPluginAssetHandler } from "../../../core/plugins/loader";
import { createPluginFixture } from "../../utils/pluginFixture";

function createContext(params: Record<string, string>) {
  return {
    params,
    query: {},
    body: null,
  };
}

test("serves plugin assets with cache headers", async () => {
  const fixture = await createPluginFixture({
    assets: { "icon.svg": "<svg>ok</svg>" },
  });

  const handler = createPluginAssetHandler({
    runtimeDir: fixture.runtimeDir,
    cacheSeconds: 120,
  });

  try {
    const response = await handler(
      createContext({ name: fixture.name, version: fixture.version, path: "icon.svg" })
    );

    expect(response instanceof Response).toBe(true);
    if (response instanceof Response) {
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("max-age=120");
      const text = await response.text();
      expect(text).toContain("<svg>ok</svg>");
    }

    const badResponse = await handler(
      createContext({ name: fixture.name, version: fixture.version, path: "../secret" })
    );
    expect(badResponse instanceof Response).toBe(true);
    if (badResponse instanceof Response) {
      expect(badResponse.status).toBe(400);
    }
  } finally {
    await fixture.cleanup();
  }
});
