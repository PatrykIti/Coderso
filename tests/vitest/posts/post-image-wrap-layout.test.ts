import { expect, test } from "vitest";

import {
  buildPostImageLayoutClasses,
  normalizePostImageLayout,
  normalizePostImageMargin,
  normalizePostImageWidth,
  normalizePostImageWrap,
  resolvePostImageLayoutFromAttrs,
} from "../../../core/services/posts/postImageWrapLayout";

test("post image layout normalizers return deterministic defaults", () => {
  expect(normalizePostImageWrap("unknown")).toBe("none");
  expect(normalizePostImageWidth(999)).toBe(50);
  expect(normalizePostImageMargin("invalid")).toBe("md");
});

test("normalizePostImageLayout accepts valid wrap/width/margin values", () => {
  const layout = normalizePostImageLayout({
    wrap: "right",
    widthPercent: "66",
    marginPreset: "lg",
  });

  expect(layout).toEqual({
    wrap: "right",
    widthPercent: 66,
    marginPreset: "lg",
  });
});

test("resolvePostImageLayoutFromAttrs maps attrs contract used by blocks", () => {
  const layout = resolvePostImageLayoutFromAttrs({
    wrap: "left",
    widthPercent: 33,
    marginPreset: "sm",
  });

  expect(layout.wrap).toBe("left");
  expect(layout.widthPercent).toBe(33);
  expect(layout.marginPreset).toBe("sm");
});

test("buildPostImageLayoutClasses encodes wrap semantics for renderer css hooks", () => {
  const classes = buildPostImageLayoutClasses({
    wrap: "left",
    widthPercent: 25,
    marginPreset: "lg",
  });

  expect(classes).toContain("post-image-layout");
  expect(classes).toContain("post-image-wrap-left");
  expect(classes).toContain("post-image-width-25");
  expect(classes).toContain("post-image-margin-lg");
});
