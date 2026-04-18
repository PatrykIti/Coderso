import { expect, test } from "vitest";

import {
  assertLiveResourcePrefix,
  createLiveCleanupStack,
  createLiveRunPrefix,
  getLiveProviderAvailability,
} from "../../integration/assistant-live/liveCmsHarness";

test("getLiveProviderAvailability reports provider-specific missing env without exposing values", () => {
  expect(
    getLiveProviderAvailability({
      TEST_OPENAI_API_KEY: "openai-secret",
      TEST_OPENAI_MODEL: "gpt-test",
      TEST_OPENROUTER_API_KEY: "",
      TEST_OPENROUTER_MODEL: "router-test",
    })
  ).toEqual([
    {
      id: "openai",
      enabled: true,
      missing: [],
      model: "gpt-test",
    },
    {
      id: "openrouter",
      enabled: false,
      missing: ["TEST_OPENROUTER_API_KEY"],
      model: "router-test",
    },
  ]);
});

test("createLiveRunPrefix creates disposable llm-live prefixes", () => {
  const prefix = createLiveRunPrefix("Pages Matrix", "abc-123-xyz");

  expect(prefix).toBe("llm-live-pages-matrix-abc-123-xyz");
  expect(assertLiveResourcePrefix(prefix)).toBe(prefix);
  expect(() => assertLiveResourcePrefix("pages-matrix-abc")).toThrow(
    "assistant_live_prefix_invalid"
  );
});

test("createLiveCleanupStack runs cleanup in reverse order and reports failures", async () => {
  const calls: string[] = [];
  const stack = createLiveCleanupStack();
  stack.add("first", () => {
    calls.push("first");
  });
  stack.add("second", () => {
    calls.push("second");
  });

  expect(stack.size()).toBe(2);
  await stack.run();
  expect(calls).toEqual(["second", "first"]);
  expect(stack.size()).toBe(0);

  const failing = createLiveCleanupStack();
  failing.add("bad", () => {
    throw new Error("cleanup_failed");
  });

  await expect(failing.run()).rejects.toThrow("assistant_live_cleanup_failed:bad");
});
