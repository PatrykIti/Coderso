import { describe, expect, test } from "vitest";

import {
  resolveMediaKeyProjection,
  tryBuildAddressableMediaPath,
} from "../../../core/services/media/mediaUrlProjection";

describe("media URL projection", () => {
  test("projects addressable keys through the canonical encoded media path", () => {
    expect(tryBuildAddressableMediaPath("2026/07/a safe-ź.png")).toBe(
      "/media/2026/07/a%20safe-%C5%BA.png"
    );
    expect(resolveMediaKeyProjection({ id: "media-1", key: "2026/07/a safe-ź.png" })).toEqual({
      addressable: true,
      url: "/media/2026/07/a%20safe-%C5%BA.png",
    });
  });

  test.each([
    "../escape.png",
    "2026/%2f.png",
    "2026\\escape.png",
    "2026//empty.png",
    "2026/control\u0000.png",
  ])("projects an unsafe key to the decoded-NUL unavailable sentinel", (key) => {
    expect(tryBuildAddressableMediaPath(key)).toBeNull();
    expect(resolveMediaKeyProjection({ id: "media/id", key })).toEqual({
      addressable: false,
      url: "/media/%00unavailable/media%2Fid",
    });
  });
});
