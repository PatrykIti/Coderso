import { afterEach, expect, test } from "vitest";

import {
  buildBlueprintPageSectionSeed,
  listBlueprintPageSectionLibrary,
  resolveBlueprintPageSectionAlias,
} from "../../../core/services/assistant/blueprints/blueprintPageSectionLibrary";
import { clearWidgets, listWidgetsForSurface } from "../../../core/widgets/registry";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

afterEach(() => {
  clearWidgets();
});

test("page section library resolves ready aliases from page-builder widget and pack metadata", () => {
  const library = listBlueprintPageSectionLibrary();
  const hero = library.find((entry) => entry.alias === "hero");
  const filters = library.find((entry) => entry.alias === "listing-filters");

  expect(hero).toMatchObject({
    status: "ready",
    alias: "hero",
    widgetType: "hero",
    slot: "hero",
    widgetModule: "content",
    pack: {
      module: "content",
      pagePresets: ["content:landing-home"],
      sectionPresets: ["content:hero-benefits"],
      widgetType: "hero",
    },
  });
  expect(filters).toMatchObject({
    status: "ready",
    alias: "listing-filters",
    widgetType: "listing-filters",
    slot: "before-listing",
    widgetModule: "listings",
    pack: {
      module: "listings",
      pagePresets: ["listings:directory-index"],
      sectionPresets: ["listings:grid-filters"],
      widgetType: "listing-filters",
    },
  });
});

test("page section library keeps unsupported aliases gated instead of inventing pseudo-sections", () => {
  const steps = resolveBlueprintPageSectionAlias("steps");

  expect(steps).toMatchObject({
    status: "gated",
    alias: "steps",
    slot: "after-listing",
    reason: expect.stringContaining("No deterministic steps widget"),
  });
});

test("page section library returns gated when the mapped widget capability is missing", () => {
  ensureRuntimeWidgetsRegistered();
  const widgetsWithoutHero = listWidgetsForSurface("page-builder").filter(
    (widget) => widget.type !== "hero"
  );

  const hero = resolveBlueprintPageSectionAlias("hero", {
    widgets: widgetsWithoutHero,
  });

  expect(hero).toMatchObject({
    status: "gated",
    alias: "hero",
    widgetType: "hero",
    reason: expect.stringContaining('Widget "hero" is not registered'),
  });
});

test("buildBlueprintPageSectionSeed normalizes a seeded widget block through the existing widget owner", () => {
  const block = buildBlueprintPageSectionSeed("hero", {
    id: "hero-section",
  });

  expect(block).toMatchObject({
    id: "hero-section",
    type: "hero",
    variant: "centered",
  });
  expect(block.slots).toEqual({
    content: [],
  });
  expect(block.data).toEqual(
    expect.objectContaining({
      headline: expect.any(String),
      subhead: expect.any(String),
    })
  );
});

test("buildBlueprintPageSectionSeed accepts trusted media library asset ids for media-bearing section data", () => {
  const block = buildBlueprintPageSectionSeed("hero", {
    data: {
      media: {
        type: "image",
        source: "library",
        assetId: "media-hero",
      },
      background: {
        media: {
          type: "image",
          source: "library",
          assetId: "media-background",
        },
      },
    },
  });

  expect(block).toMatchObject({
    type: "hero",
    data: {
      media: {
        type: "image",
        source: "library",
        assetId: "media-hero",
      },
      background: {
        media: {
          type: "image",
          source: "library",
          assetId: "media-background",
        },
      },
    },
  });
});

test("buildBlueprintPageSectionSeed rejects untrusted raw media URLs for media-bearing section data", () => {
  for (const src of [
    "https://example.com/hero.jpg",
    "data:image/png;base64,Zm9v",
    "blob:https://example.com/123",
    "file:///tmp/hero.jpg",
  ]) {
    expect(() =>
      buildBlueprintPageSectionSeed("hero", {
        data: {
          media: {
            source: "external",
            type: "image",
            src,
          },
        },
      })
    ).toThrowError("assistant_blueprint_page_section_media_untrusted");
  }
});
