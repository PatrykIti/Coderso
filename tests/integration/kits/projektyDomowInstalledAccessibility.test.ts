import { expect, test } from "bun:test";

import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import {
  createProjektyDomowInstalledHarness,
  readInstalledShellState,
} from "./projektyDomowInstalledTestSupport";

test("the installed home switcher exposes its exact Polish accessible name", async () => {
  const harness = await createProjektyDomowInstalledHarness();
  try {
    await harness.apply();
    clearSiteCache();
    resetRateLimitBuckets();

    const response = await handlePublicRequest(
      new Request("http://task-547.invalid/", {
        headers: {
          "user-agent": "task-547-installed-home-accessibility-test",
          "x-forwarded-for": "127.0.0.91",
        },
      })
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    const tablist = html.match(/<[^>]+role="tablist"[^>]*>/)?.[0] ?? "";
    expect(tablist).toContain('aria-label="Wybór stylu domu"');

    await harness.rollback();
    expect(await readInstalledShellState()).toEqual(harness.shellBefore);
  } finally {
    await harness.cleanup();
  }
}, 360_000);
