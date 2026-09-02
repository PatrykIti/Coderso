import { expect, test } from "vitest";

import { preloadRecaptcha } from "../../../core/admin/ui/auth/recaptcha";

// Runs in the default node environment: `typeof window === "undefined"` so
// loadScript resolves immediately and waitUntilReady resolves without waiting.
test("preloadRecaptcha resolves immediately when there is no window", async () => {
  await expect(preloadRecaptcha("site-key-1")).resolves.toBeUndefined();
  await expect(preloadRecaptcha("site-key-2")).resolves.toBeUndefined();
});

test("preloadRecaptcha still rejects a missing site key without a window", async () => {
  await expect(preloadRecaptcha("  ")).rejects.toThrow("recaptcha_site_key_missing");
});
