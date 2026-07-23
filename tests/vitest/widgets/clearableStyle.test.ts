import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
} from "../../../core/services/theme/cssColorContract";
import { normalizeFormSettings } from "../../../core/services/forms/formSettings";
import { resolveFormTheme } from "../../../core/services/forms/formTheme";
import {
  accordionDefaults,
  accordionSchema,
  normalizeAccordionData,
} from "../../../core/widgets/core/accordion";
import {
  compactObject,
  compactStyle,
  resolveClearableCssColorValue,
  resolveClearableStyleValue,
} from "../../../core/widgets/core/clearableStyle";
import {
  contactDefaults,
  contactSchema,
  normalizeContactData,
} from "../../../core/widgets/core/contact";
import {
  ctaBannerDefaults,
  ctaBannerSchema,
  normalizeCtaBannerData,
} from "../../../core/widgets/core/ctaBanner";
import {
  dividerDefaults,
  dividerSchema,
  normalizeDividerColorValue,
  normalizeDividerData,
} from "../../../core/widgets/core/divider";
import { footerDefaults, footerSchema, FooterBlock } from "../../../core/widgets/core/footer";
import {
  formEmbedDefaults,
  formEmbedSchema,
  normalizeFormEmbedData,
} from "../../../core/widgets/core/formEmbed";
import {
  galleryMosaicDefaults,
  galleryMosaicSchema,
  normalizeGalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import {
  gridColumnsSchema,
  normalizeGridColumnsColorValue,
} from "../../../core/widgets/core/gridColumns";
import { heroDefaults, heroSchema, normalizeHeroData } from "../../../core/widgets/core/hero";
import {
  navigationDefaults,
  navigationSchema,
  normalizeNavigationData,
} from "../../../core/widgets/core/navigation";
import {
  newsletterDefaults,
  newsletterSchema,
  normalizeNewsletterData,
} from "../../../core/widgets/core/newsletter";
import {
  normalizeSectionData,
  sectionDefaults,
  sectionSchema,
} from "../../../core/widgets/core/section";
import { normalizeTabsData, tabsDefaults, tabsSchema } from "../../../core/widgets/core/tabs";
import {
  normalizeTimelineData,
  normalizeTimelineSteps,
  timelineDefaults,
  timelineSchema,
} from "../../../core/widgets/core/timeline";
import {
  normalizeToggleBlockColorValue,
  toggleBlockSchema,
} from "../../../core/widgets/core/toggleBlock";
import { CSS_COLOR_CORPUS_CASES } from "../services/cssColorCorpus";
import { RETAINED_COLOR_FIELDS } from "./retainedColorConsumerTable";

test("resolveClearableStyleValue keeps intentional transparent values", () => {
  expect(resolveClearableStyleValue("transparent")).toBe("transparent");
  expect(resolveClearableStyleValue(" rgba(0,0,0,0.2) ")).toBe("rgba(0,0,0,0.2)");
});

test("resolveClearableStyleValue treats missing and empty values as cleared", () => {
  expect(resolveClearableStyleValue(undefined)).toBeUndefined();
  expect(resolveClearableStyleValue(null)).toBeUndefined();
  expect(resolveClearableStyleValue("")).toBeUndefined();
  expect(resolveClearableStyleValue("   ")).toBeUndefined();
});

test("compact helpers omit only cleared fields", () => {
  expect(
    compactStyle({
      backgroundColor: undefined,
      borderColor: "transparent",
    })
  ).toEqual({ borderColor: "transparent" });

  expect(compactObject({ a: undefined, b: "", c: "value" })).toEqual({ c: "value" });
});

test("resolveClearableCssColorValue accepts bounded authorable color grammar", () => {
  expect(resolveClearableCssColorValue("#abc")).toBe("#abc");
  expect(resolveClearableCssColorValue("#aabbccdd")).toBe("#aabbccdd");
  expect(resolveClearableCssColorValue(" rgb(12, 24, 36) ")).toBe("rgb(12, 24, 36)");
  expect(resolveClearableCssColorValue("rgba(12, 24, 36, 0.4)")).toBe("rgba(12, 24, 36, 0.4)");
  expect(resolveClearableCssColorValue("hsl(210, 50%, 40%)")).toBe("hsl(210, 50%, 40%)");
  expect(resolveClearableCssColorValue("hsla(210, 50%, 40%, 25%)")).toBe(
    "hsla(210, 50%, 40%, 25%)"
  );
  expect(resolveClearableCssColorValue("var(--color-primary)")).toBe("var(--color-primary)");
  expect(resolveClearableCssColorValue("transparent")).toBe("transparent");
  expect(resolveClearableCssColorValue("currentcolor")).toBeUndefined();
  expect(resolveClearableCssColorValue("inherit")).toBeUndefined();
  expect(resolveClearableCssColorValue("currentcolor", "inherited-render")).toBe("currentColor");
  expect(resolveClearableCssColorValue("inherit", "inherited-render")).toBe("inherit");
  expect(
    resolveClearableCssColorValue("inherit", "inherited-render", {
      allowInheritKeyword: false,
    })
  ).toBeUndefined();
});

test("resolveClearableCssColorValue rejects inline CSS injection strings", () => {
  expect(resolveClearableCssColorValue("url(javascript:alert(1))")).toBeUndefined();
  expect(resolveClearableCssColorValue("expression(alert(1))")).toBeUndefined();
  expect(resolveClearableCssColorValue("javascript:alert(1)")).toBeUndefined();
  expect(resolveClearableCssColorValue("linear-gradient(red, blue)")).toBeUndefined();
  expect(resolveClearableCssColorValue("rgb(999, 0, 0)")).toBeUndefined();
  expect(resolveClearableCssColorValue("rgba(0, 0, 0, 2)")).toBeUndefined();
  expect(resolveClearableCssColorValue("var(--section-surface)")).toBeUndefined();
  expect(resolveClearableCssColorValue("")).toBeUndefined();
});

test("resolveClearableCssColorValue passes original bytes to the bounded parser", () => {
  const terminal = "#abc";
  const exactCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;

  expect(exactCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
  expect(resolveClearableCssColorValue(exactCap)).toBe(terminal);
  expect(resolveClearableCssColorValue(` ${exactCap}`)).toBeUndefined();

  for (const hiddenWhitespace of ["\t", "\n", "\u001f", "\u0085", "\u00a0", "\u2003"]) {
    expect(resolveClearableCssColorValue(`${hiddenWhitespace}${terminal}`)).toBeUndefined();
  }
});

type ColorSchemaNode = Readonly<{
  properties?: Readonly<Record<string, ColorSchemaNode>>;
  items?: ColorSchemaNode;
  anyOf?: readonly ColorSchemaNode[];
  not?: ColorSchemaNode;
  const?: string;
  maxLength?: number;
  pattern?: string;
}>;

const schemaPaths = (group: string, fields: readonly string[]) =>
  fields.map((field) => `${group}.${field}`);

const retainedColorSchemaInventories = [
  {
    id: "section",
    schema: sectionSchema,
    profile: "inherited-render",
    paths: [
      ...schemaPaths("heading", ["labelColor", "titleColor", "descriptionColor"]),
      ...schemaPaths("style", [
        "backgroundColor",
        "gradientFrom",
        "gradientTo",
        "borderColor",
        "overlayColor",
      ]),
    ],
    nested: new Set(["style.gradientFrom", "style.gradientTo"]),
  },
  {
    id: "tabs",
    schema: tabsSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "surfaceColor",
      "borderColor",
      "activeBackgroundColor",
      "activeTextColor",
      "inactiveTextColor",
      "panelBackgroundColor",
    ]),
  },
  {
    id: "accordion",
    schema: accordionSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "surfaceColor",
      "borderColor",
      "summaryTextColor",
      "descriptionTextColor",
    ]),
  },
  {
    id: "contact",
    schema: contactSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "background",
      "surfaceColor",
      "borderColor",
      "textColor",
      "mutedTextColor",
      "buttonBackgroundColor",
      "buttonTextColor",
      "buttonBorderColor",
    ]),
  },
  {
    id: "toggle",
    schema: toggleBlockSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "surfaceColor",
      "borderColor",
      "accentColor",
      "accentContrastColor",
    ]),
  },
  {
    id: "divider",
    schema: dividerSchema,
    profile: "inherited-render",
    paths: ["labelColor", "color"],
    nested: new Set(["color"]),
  },
  {
    id: "navigation",
    schema: navigationSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "textColor",
      "logoColor",
      "linkColor",
      "linkHoverColor",
      "linkActiveColor",
      "surfaceColor",
      "borderColor",
      "ctaTextColor",
      "ctaBackgroundColor",
      "ctaBorderColor",
    ]),
  },
  {
    id: "grid-columns",
    schema: gridColumnsSchema,
    profile: "authoring",
    paths: [
      "style.columnBackground",
      "style.columnBorderColor",
      "columns.items.style.background",
      "columns.items.style.borderColor",
    ],
  },
  {
    id: "footer",
    schema: footerSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "surfaceColor",
      "borderColor",
      "textColor",
      "headingColor",
      "linkColor",
      "legalTextColor",
      "socialColor",
      "linkHoverColor",
      "linkActiveColor",
    ]),
  },
  {
    id: "newsletter",
    schema: newsletterSchema,
    profile: "authoring",
    paths: schemaPaths("style", ["background", "textColor", "buttonBackground", "buttonTextColor"]),
  },
  {
    id: "form-embed",
    schema: formEmbedSchema,
    profile: "inherited-render",
    paths: schemaPaths("style", [
      "background",
      "surface",
      "borderColor",
      "titleColor",
      "labelColor",
      "helperColor",
      "submitBackground",
      "submitTextColor",
    ]),
  },
  {
    id: "timeline",
    schema: timelineSchema,
    profile: "authoring",
    paths: ["steps.items.markerIconColor", "background.color"],
  },
  {
    id: "hero",
    schema: heroSchema,
    profile: "inherited-render",
    paths: [
      "media.overlay",
      ...schemaPaths("style", [
        "textColor",
        "subheadColor",
        "bodyColor",
        "borderColor",
        "mediaBorderColor",
        "primaryButtonBg",
        "primaryButtonText",
        "primaryButtonBorder",
        "secondaryButtonBg",
        "secondaryButtonText",
        "secondaryButtonBorder",
      ]),
      "background.color",
      "background.media.overlay",
    ],
    nested: new Set(["media.overlay", "background.media.overlay"]),
  },
  {
    id: "gallery",
    schema: galleryMosaicSchema,
    profile: "inherited-render",
    paths: ["style.overlay"],
  },
  {
    id: "cta",
    schema: ctaBannerSchema,
    profile: "inherited-render",
    paths: [
      ...schemaPaths("style", [
        "background",
        "text",
        "border",
        "badgeBackground",
        "badgeText",
        "primaryButtonBg",
        "primaryButtonText",
        "primaryButtonBorder",
        "secondaryButtonBg",
        "secondaryButtonText",
        "secondaryButtonBorder",
      ]),
      "background.color",
    ],
  },
] as const;

const readSchemaNode = (schema: unknown, path: string): ColorSchemaNode | undefined => {
  let node = schema as ColorSchemaNode;
  for (const segment of path.split(".")) {
    node = segment === "items" ? node.items! : node.properties?.[segment]!;
    if (!node) return undefined;
  }
  return node;
};

test("all 96 retained simple-color schema leaves reuse their profile cap and sentinel", () => {
  expect(retainedColorSchemaInventories.flatMap((inventory) => inventory.paths)).toHaveLength(96);
  for (const inventory of retainedColorSchemaInventories) {
    for (const path of inventory.paths) {
      const leaf = readSchemaNode(inventory.schema, path);
      expect(leaf, `${inventory.id}:${path}`).toBeDefined();
      expect(
        leaf?.anyOf?.some((branch) => branch.const === ""),
        `${inventory.id}:${path}:clear`
      ).toBe(true);
      expect(
        leaf?.anyOf?.some(
          (branch) =>
            branch.maxLength === CSS_COLOR_VALUE_MAX_LENGTH &&
            branch.pattern === CSS_COLOR_SCHEMA_PATTERNS[inventory.profile]
        ),
        `${inventory.id}:${path}:profile`
      ).toBe(true);
      const isNested = "nested" in inventory && inventory.nested.has(path);
      expect(Boolean(leaf?.not), `${inventory.id}:${path}:nested`).toBe(isNested);
    }
  }
});

test("retained editor field inventory is deeply runtime-frozen", () => {
  expect(Object.isFrozen(RETAINED_COLOR_FIELDS)).toBe(true);
  for (const [group, entries] of Object.entries(RETAINED_COLOR_FIELDS)) {
    expect(Object.isFrozen(entries), `${group}:array`).toBe(true);
    for (const entry of entries) {
      expect(Object.isFrozen(entry), `${group}:${entry.path}`).toBe(true);
    }
  }
});

type RetainedColorAdapter = Readonly<{
  id: string;
  profile: "authoring" | "inherited-render";
  allowInherit?: boolean;
  read: (raw: unknown) => string | undefined;
}>;

const retainedColorAdapters: readonly RetainedColorAdapter[] = [
  {
    id: "compat-authoring",
    profile: "authoring",
    read: (raw) => resolveClearableCssColorValue(raw, "authoring"),
  },
  {
    id: "compat-inherited",
    profile: "inherited-render",
    read: (raw) => resolveClearableCssColorValue(raw, "inherited-render"),
  },
  {
    id: "compat-nested",
    profile: "inherited-render",
    allowInherit: false,
    read: (raw) =>
      resolveClearableCssColorValue(raw, "inherited-render", { allowInheritKeyword: false }),
  },
  {
    id: "form-settings",
    profile: "inherited-render",
    read: (raw) =>
      normalizeFormSettings({ theme: { surface: { background: raw } } }).theme?.surface?.background,
  },
  {
    id: "form-theme",
    profile: "inherited-render",
    read: (raw) =>
      resolveFormTheme({ surface: { background: raw as string | undefined } }).surface.background,
  },
  {
    id: "section-direct",
    profile: "inherited-render",
    read: (raw) =>
      normalizeSectionData({
        ...sectionDefaults,
        heading: { ...sectionDefaults.heading, labelColor: raw as string | undefined },
      }).heading?.labelColor,
  },
  {
    id: "section-nested",
    profile: "inherited-render",
    allowInherit: false,
    read: (raw) =>
      normalizeSectionData({
        ...sectionDefaults,
        style: { ...sectionDefaults.style, gradientFrom: raw as string | undefined },
      }).style?.gradientFrom,
  },
  {
    id: "tabs",
    profile: "inherited-render",
    read: (raw) =>
      normalizeTabsData({
        ...tabsDefaults,
        style: { ...tabsDefaults.style, surfaceColor: raw as string | undefined },
      }).style?.surfaceColor,
  },
  {
    id: "accordion-shared-first",
    profile: "inherited-render",
    read: (raw) =>
      normalizeAccordionData({
        ...accordionDefaults,
        style: { ...accordionDefaults.style, surfaceColor: raw as string | undefined },
      }).style?.surfaceColor,
  },
  {
    id: "contact",
    profile: "inherited-render",
    read: (raw) =>
      normalizeContactData({
        ...contactDefaults,
        style: { ...contactDefaults.style, background: raw as string | undefined },
      }).style?.background,
  },
  {
    id: "toggle",
    profile: "inherited-render",
    read: normalizeToggleBlockColorValue,
  },
  {
    id: "divider-direct",
    profile: "inherited-render",
    read: (raw) =>
      normalizeDividerData({
        ...dividerDefaults,
        labelColor: raw as string | undefined,
      }).labelColor,
  },
  {
    id: "divider-nested",
    profile: "inherited-render",
    allowInherit: false,
    read: normalizeDividerColorValue,
  },
  {
    id: "navigation",
    profile: "inherited-render",
    read: (raw) =>
      normalizeNavigationData({
        ...navigationDefaults,
        style: { ...navigationDefaults.style, textColor: raw as string | undefined },
      }).style?.textColor,
  },
  {
    id: "grid-columns",
    profile: "authoring",
    read: normalizeGridColumnsColorValue,
  },
  {
    id: "footer-render-boundary",
    profile: "inherited-render",
    read: (raw) => {
      const html = renderToString(
        React.createElement(FooterBlock, {
          variant: "columns",
          data: {
            ...footerDefaults,
            brand: { ...footerDefaults.brand, logoText: "Color boundary" },
            style: { ...footerDefaults.style, textColor: raw as string | undefined },
          },
        })
      );
      return html.match(/style="color:([^;"]+)/)?.[1];
    },
  },
  {
    id: "newsletter",
    profile: "authoring",
    read: (raw) =>
      normalizeNewsletterData({
        ...newsletterDefaults,
        style: { ...newsletterDefaults.style, background: raw as string | undefined },
      }).style.background,
  },
  {
    id: "form-embed",
    profile: "inherited-render",
    read: (raw) =>
      normalizeFormEmbedData({
        ...formEmbedDefaults,
        style: { ...formEmbedDefaults.style, background: raw as string | undefined },
      }).style?.background,
  },
  {
    id: "timeline-marker",
    profile: "authoring",
    read: (raw) =>
      normalizeTimelineSteps([
        {
          id: "color-step",
          title: "Color step",
          markerIconColor: raw as string | undefined,
        },
      ])[0]?.markerIconColor,
  },
  {
    id: "timeline-background",
    profile: "authoring",
    read: (raw) =>
      normalizeTimelineData({
        ...timelineDefaults,
        background: { color: raw as string | undefined },
      }).background?.color,
  },
  {
    id: "hero-direct",
    profile: "inherited-render",
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        style: { ...heroDefaults.style, textColor: raw as string | undefined },
      }).style?.textColor,
  },
  {
    id: "hero-media-overlay",
    profile: "inherited-render",
    allowInherit: false,
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        media: {
          ...heroDefaults.media,
          type: heroDefaults.media?.type ?? "none",
          overlay: raw as string | undefined,
        },
      }).media?.overlay,
  },
  {
    id: "hero-background",
    profile: "inherited-render",
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        background: { ...heroDefaults.background, color: raw as string | undefined },
      }).background?.color,
  },
  {
    id: "hero-background-media-overlay",
    profile: "inherited-render",
    allowInherit: false,
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        background: {
          ...heroDefaults.background,
          media: {
            type: "image",
            src: "/color-boundary.jpg",
            overlay: raw as string | undefined,
          },
        },
      }).background?.media?.overlay,
  },
  {
    id: "gallery-overlay",
    profile: "inherited-render",
    read: (raw) =>
      normalizeGalleryMosaicData({
        ...galleryMosaicDefaults,
        style: { ...galleryMosaicDefaults.style, overlay: raw as string | undefined },
      }).style?.overlay,
  },
  {
    id: "cta-simple",
    profile: "inherited-render",
    read: (raw) =>
      normalizeCtaBannerData({
        ...ctaBannerDefaults,
        style: { ...ctaBannerDefaults.style, text: raw as string | undefined },
      }).style?.text,
  },
] as const;

test("every distinct retained color helper consumes the immutable original-byte corpus", () => {
  expect(Object.isFrozen(CSS_COLOR_CORPUS_CASES)).toBe(true);
  for (const adapter of retainedColorAdapters) {
    const fallback = adapter.read(undefined);
    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      const parsed = corpusCase.parser[adapter.profile];
      const expected =
        adapter.allowInherit === false && parsed?.normalized === "inherit"
          ? undefined
          : parsed?.normalized;
      expect(adapter.read(corpusCase.input), `${adapter.id}:${corpusCase.id}`).toBe(
        expected ?? fallback
      );
    }
  }
});
