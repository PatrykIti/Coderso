import { expect, test } from "vitest";

import {
  ALIGNMENT_OPTIONS,
  BLOG_SEO_ROBOTS_OPTIONS,
  BLOCK_STYLE_SCOPE,
  BUTTON_SIZE_OPTIONS,
  BUTTON_VARIANT_OPTIONS,
  CALLOUT_TONE_OPTIONS,
  EMBED_ASPECT_OPTIONS,
  EMBED_PROVIDER_OPTIONS,
  IMAGE_MARGIN_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  IMAGE_WRAP_OPTIONS,
  SEPARATOR_STYLE_OPTIONS,
  SPACING_OPTIONS,
  TEXT_SCALE_OPTIONS,
  WIDTH_OPTIONS,
  normalizeOptionalString,
  normalizeTagList,
} from "../../../core/admin/ui/posts/editor/inspector/inspectorSchemas";

test("inspectorSchemas export stable option catalogs for block controls", () => {
  expect(ALIGNMENT_OPTIONS.map((option) => option.value)).toEqual(["left", "center", "right"]);
  expect(WIDTH_OPTIONS.at(-1)).toEqual({ value: "full", label: "Full width" });
  expect(SPACING_OPTIONS.map((option) => option.label)).toContain("Medium");
  expect(TEXT_SCALE_OPTIONS.map((option) => option.value)).toEqual(["sm", "md", "lg", "xl"]);
  expect(BUTTON_VARIANT_OPTIONS.map((option) => option.value)).toContain("link");
  expect(BUTTON_SIZE_OPTIONS.map((option) => option.label)).toContain("Large");
  expect(CALLOUT_TONE_OPTIONS.map((option) => option.value)).toContain("danger");
  expect(SEPARATOR_STYLE_OPTIONS.map((option) => option.value)).toEqual([
    "solid",
    "dashed",
    "dotted",
  ]);
  expect(EMBED_PROVIDER_OPTIONS.map((option) => option.value)).toEqual([
    "custom",
    "youtube",
    "vimeo",
    "loom",
  ]);
  expect(EMBED_ASPECT_OPTIONS.map((option) => option.label)).toContain("1:1 (square)");
  expect(IMAGE_WRAP_OPTIONS.map((option) => option.label)).toEqual([
    "No wrap",
    "Wrap left",
    "Wrap right",
  ]);
  expect(IMAGE_WIDTH_OPTIONS.at(0)?.label).toBe("25%");
  expect(IMAGE_MARGIN_OPTIONS.map((option) => option.label)).toEqual([
    "Compact",
    "Balanced",
    "Spacious",
  ]);
  expect(BLOG_SEO_ROBOTS_OPTIONS.map((option) => option.value)).toEqual([
    "index,follow",
    "noindex,follow",
    "noindex,nofollow",
  ]);
});

test("inspectorSchemas expose block style scope and normalize optional strings and tags", () => {
  expect(BLOCK_STYLE_SCOPE.paragraph).toEqual(["alignment", "width", "spacing", "textScale"]);
  expect(BLOCK_STYLE_SCOPE["writing-canvas"]).toEqual([]);
  expect(BLOCK_STYLE_SCOPE.image).toEqual(["alignment", "width", "spacing"]);
  expect(BLOCK_STYLE_SCOPE.embed).toEqual(["alignment", "width", "spacing"]);

  expect(normalizeOptionalString("  hero-title  ")).toBe("hero-title");
  expect(normalizeOptionalString("   ")).toBe("");

  expect(normalizeTagList("News, updates\nnews, Launch, launch,  ")).toEqual([
    "News",
    "updates",
    "Launch",
  ]);
});
