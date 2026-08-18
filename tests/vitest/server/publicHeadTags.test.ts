// TASK-568: public <head> analytics resolution log hygiene. The resolver must
// fail closed to null and log ONLY the fixed allowlisted code
// ("analytics_head_resolution_failed") -- never the raw error, decrypted
// config, URLs, or error internals.
//
// publicHeadTags.ts is NOT Bun-free: line 12 re-exports
// buildLiveAnalyticsScriptHtml from ./publicSitePageRuntime, which
// transitively imports db/client (postgres instantiates at import). Both
// dependency modules are vi.mock'd before the module under test is imported
// so this stays in the Bun-free Vitest lane.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../core/services/integrations/analyticsRuntime", () => ({
  resolvePublicAnalyticsHead: vi.fn(),
}));

vi.mock("../../../core/server/publicSitePageRuntime", () => ({
  buildLiveAnalyticsScriptHtml: vi.fn(),
}));

import { resolvePublicAnalyticsHead } from "../../../core/services/integrations/analyticsRuntime";
import { resolvePublicAnalyticsHeadSnippet } from "../../../core/server/publicHeadTags";

const SECRET_SENTINEL = "SUPER-SECRET-GA-CONFIG-7f3a9c";
const SECRET_URL = "https://internal.example/secret-endpoint";

describe("resolvePublicAnalyticsHeadSnippet log hygiene (TASK-568)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(resolvePublicAnalyticsHead).mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("logs only the allowlisted code and never the secret sentinel when resolution throws", async () => {
    const resolutionError = new Error("decryption failed");
    // Realistic error internals that must never reach the log surface:
    // decrypted config, a URL, and the raw payload.
    (resolutionError as unknown as Record<string, unknown>).config = {
      measurementId: SECRET_SENTINEL,
    };
    (resolutionError as unknown as Record<string, unknown>).url = SECRET_URL;
    (resolutionError as unknown as Record<string, unknown>).payload = SECRET_SENTINEL;
    resolutionError.stack = `Error: ${SECRET_SENTINEL}\n    at resolvePublicAnalyticsHead`;

    vi.mocked(resolvePublicAnalyticsHead).mockRejectedValue(resolutionError);

    const snippet = await resolvePublicAnalyticsHeadSnippet();

    expect(snippet).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("analytics_head_resolution_failed");

    for (const call of warnSpy.mock.calls) {
      const serialized = call.map(String).join(" ");
      expect(serialized).not.toContain(SECRET_SENTINEL);
      expect(serialized).not.toContain(SECRET_URL);
      expect(serialized).not.toContain("decryption failed");
    }
  });

  it("keeps fail-closed null for any resolution failure", async () => {
    vi.mocked(resolvePublicAnalyticsHead).mockRejectedValue(new Error("boom"));

    await expect(resolvePublicAnalyticsHeadSnippet()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("analytics_head_resolution_failed");
  });

  it("returns the snippet unchanged when resolution succeeds", async () => {
    vi.mocked(resolvePublicAnalyticsHead).mockResolvedValue(
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"></script>'
    );

    await expect(resolvePublicAnalyticsHeadSnippet()).resolves.toContain("G-TEST123");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
