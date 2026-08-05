import { expect, test } from "vitest";

import { normalizeAdminColorValue } from "../../../core/admin/ui/shared/colorValue";
import {
  normalizeFormSettings,
  normalizeFormTheme,
} from "../../../core/services/forms/formSettings";
import { resolveFormTheme } from "../../../core/services/forms/formTheme";
import {
  MenuAppearanceError,
  normalizeMenuAppearance,
  normalizeMenuColorValue,
  sanitizeMenuAppearance,
} from "../../../core/services/menus/normalizeMenuAppearance";
import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  normalizeCssColorValue,
  type CssColorProfile,
} from "../../../core/services/theme/cssColorContract";
import { accordionDefaults, normalizeAccordionData } from "../../../core/widgets/core/accordion";
import { resolveClearableCssColorValue } from "../../../core/widgets/core/clearableStyle";
import { contactDefaults, normalizeContactData } from "../../../core/widgets/core/contact";
import { ctaBannerDefaults, normalizeCtaBannerData } from "../../../core/widgets/core/ctaBanner";
import {
  dividerDefaults,
  normalizeDividerColorValue,
  normalizeDividerData,
} from "../../../core/widgets/core/divider";
import { formEmbedDefaults, normalizeFormEmbedData } from "../../../core/widgets/core/formEmbed";
import {
  galleryMosaicDefaults,
  normalizeGalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import { normalizeGridColumnsColorValue } from "../../../core/widgets/core/gridColumns";
import {
  heroDefaults,
  normalizeHeroBackgroundGradient,
  normalizeHeroData,
} from "../../../core/widgets/core/hero";
import { navigationDefaults, normalizeNavigationData } from "../../../core/widgets/core/navigation";
import { newsletterDefaults, normalizeNewsletterData } from "../../../core/widgets/core/newsletter";
import { normalizeSectionData, sectionDefaults } from "../../../core/widgets/core/section";
import { normalizeTabsData, tabsDefaults } from "../../../core/widgets/core/tabs";
import {
  normalizeTimelineData,
  normalizeTimelineSteps,
  timelineDefaults,
} from "../../../core/widgets/core/timeline";
import { normalizeToggleBlockColorValue } from "../../../core/widgets/core/toggleBlock";
import {
  CSS_COLOR_CORPUS_CASES,
  CSS_COLOR_CORPUS_PROFILES,
  CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS,
  type CssColorCorpusCase,
} from "./cssColorCorpus";
import {
  assertAllProductionClearableColorCallsHaveExplicitClassifiedProfile,
  assertClearableAstBindingRejectsIndirectAliasesAndNamespaceDestructuring,
} from "./cssColorClearableInventoryAssertions";
import {
  assertCtaCompositeSymbolsHaveOneProductionOwnerAndOnlyBoundReuse,
  assertPageKeepsExactOrderedSevenTokenCompatibilityGate,
  assertRegexAstInventoryHasNoCopiedSimpleColorGrammar,
  assertRegexAstInventoryRejectsConstructorEscapesAndInventoriesDirectGlobalMembers,
} from "./cssColorRegexInventoryAssertions";

type ConsumerAdapter = Readonly<{
  id: string;
  profile: CssColorProfile;
  allowInheritKeyword: boolean;
  fallback: string | undefined;
  read: (raw: unknown) => string | undefined;
}>;

const authoringConsumers: readonly ConsumerAdapter[] = [
  {
    id: "canonical-authoring-owner",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) => normalizeCssColorValue(raw, "authoring"),
  },
  {
    id: "admin-authoring-commit",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) => normalizeAdminColorValue(raw as string | null | undefined),
  },
  {
    id: "retained-default-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: resolveClearableCssColorValue,
  },
  {
    id: "retained-explicit-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) => resolveClearableCssColorValue(raw, "authoring"),
  },
  {
    id: "grid-columns-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: normalizeGridColumnsColorValue,
  },
  {
    id: "newsletter-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      normalizeNewsletterData({
        ...newsletterDefaults,
        style: {
          ...newsletterDefaults.style,
          background: raw as string | undefined,
        },
      }).style.background,
  },
  {
    id: "timeline-marker-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      normalizeTimelineSteps([
        {
          id: "parity-step",
          title: "Parity step",
          markerIconColor: raw as string | undefined,
        },
      ])[0]?.markerIconColor,
  },
  {
    id: "timeline-background-authoring",
    profile: "authoring",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      normalizeTimelineData({
        ...timelineDefaults,
        background: { color: raw as string | undefined },
      }).background?.color,
  },
] as const;

const inheritedConsumers: readonly ConsumerAdapter[] = [
  {
    id: "canonical-inherited-owner",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) => normalizeCssColorValue(raw, "inherited-render"),
  },
  {
    id: "admin-explicit-inherited-commit",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) => normalizeAdminColorValue(raw as string | null | undefined, "inherited-render"),
  },
  {
    id: "retained-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) => resolveClearableCssColorValue(raw, "inherited-render"),
  },
  {
    id: "retained-nested-inherited",
    profile: "inherited-render",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      resolveClearableCssColorValue(raw, "inherited-render", {
        allowInheritKeyword: false,
      }),
  },
  {
    id: "form-write-normalizer",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeFormTheme({
        surface: { background: raw as string | undefined },
      })?.surface?.background,
  },
  {
    id: "form-settings-normalizer",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeFormSettings({
        theme: { surface: { background: raw as string | undefined } },
      }).theme?.surface?.background,
  },
  {
    id: "form-read-resolver",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      resolveFormTheme({
        surface: { background: raw as string | undefined },
      }).surface.background,
  },
  {
    id: "section-direct-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeSectionData({
        ...sectionDefaults,
        heading: {
          ...sectionDefaults.heading,
          labelColor: raw as string | undefined,
        },
      }).heading?.labelColor,
  },
  {
    id: "section-nested-inherited",
    profile: "inherited-render",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      normalizeSectionData({
        ...sectionDefaults,
        style: {
          ...sectionDefaults.style,
          gradientFrom: raw as string | undefined,
        },
      }).style?.gradientFrom,
  },
  {
    id: "tabs-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeTabsData({
        ...tabsDefaults,
        style: {
          ...tabsDefaults.style,
          surfaceColor: raw as string | undefined,
        },
      }).style?.surfaceColor,
  },
  {
    id: "accordion-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeAccordionData({
        ...accordionDefaults,
        style: {
          ...accordionDefaults.style,
          surfaceColor: raw as string | undefined,
        },
      }).style?.surfaceColor,
  },
  {
    id: "contact-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeContactData({
        ...contactDefaults,
        style: {
          ...contactDefaults.style,
          background: raw as string | undefined,
        },
      }).style?.background,
  },
  {
    id: "toggle-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: normalizeToggleBlockColorValue,
  },
  {
    id: "divider-direct-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: "var(--color-border)",
    read: (raw) =>
      normalizeDividerData({
        ...dividerDefaults,
        labelColor: raw as string | undefined,
      }).labelColor,
  },
  {
    id: "divider-nested-inherited",
    profile: "inherited-render",
    allowInheritKeyword: false,
    fallback: undefined,
    read: normalizeDividerColorValue,
  },
  {
    id: "navigation-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeNavigationData({
        ...navigationDefaults,
        style: {
          ...navigationDefaults.style,
          textColor: raw as string | undefined,
        },
      }).style?.textColor,
  },
  {
    id: "form-embed-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeFormEmbedData({
        ...formEmbedDefaults,
        style: {
          ...formEmbedDefaults.style,
          background: raw as string | undefined,
        },
      }).style?.background,
  },
  {
    id: "hero-direct-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        style: {
          ...heroDefaults.style,
          textColor: raw as string | undefined,
        },
      }).style?.textColor,
  },
  {
    id: "hero-media-overlay-inherited",
    profile: "inherited-render",
    allowInheritKeyword: false,
    fallback: undefined,
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
    id: "hero-background-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        background: {
          ...heroDefaults.background,
          color: raw as string | undefined,
        },
      }).background?.color,
  },
  {
    id: "hero-background-overlay-inherited",
    profile: "inherited-render",
    allowInheritKeyword: false,
    fallback: undefined,
    read: (raw) =>
      normalizeHeroData({
        ...heroDefaults,
        background: {
          ...heroDefaults.background,
          media: {
            type: "image",
            src: "/parity.jpg",
            overlay: raw as string | undefined,
          },
        },
      }).background?.media?.overlay,
  },
  {
    id: "gallery-overlay-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeGalleryMosaicData({
        ...galleryMosaicDefaults,
        style: {
          ...galleryMosaicDefaults.style,
          overlay: raw as string | undefined,
        },
      }).style?.overlay,
  },
  {
    id: "cta-simple-inherited",
    profile: "inherited-render",
    allowInheritKeyword: true,
    fallback: undefined,
    read: (raw) =>
      normalizeCtaBannerData({
        ...ctaBannerDefaults,
        style: {
          ...ctaBannerDefaults.style,
          text: raw as string | undefined,
        },
      }).style?.text,
  },
] as const;

const expectedConsumerValue = (
  adapter: ConsumerAdapter,
  corpusCase: CssColorCorpusCase
): string | undefined => {
  const expected = corpusCase.parser[adapter.profile]?.normalized;
  if (expected === "inherit" && !adapter.allowInheritKeyword) return adapter.fallback;
  return expected ?? adapter.fallback;
};

test("manually authored consumer fallbacks match unauthored production behavior", () => {
  for (const adapter of [...authoringConsumers, ...inheritedConsumers]) {
    expect(adapter.read(undefined), adapter.id).toBe(adapter.fallback);
  }
});

test("original corpus bytes stay in parity across authoring consumers and Menu policies", () => {
  expect(Object.isFrozen(CSS_COLOR_CORPUS_CASES)).toBe(true);

  for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
    for (const adapter of authoringConsumers) {
      const actual = adapter.read(corpusCase.input);
      expect(actual, `${adapter.id}:${corpusCase.id}`).toBe(
        expectedConsumerValue(adapter, corpusCase)
      );
    }

    const expected = corpusCase.parser.authoring?.normalized;
    expect(normalizeMenuColorValue(corpusCase.input), `menu-scalar:${corpusCase.id}`).toBe(
      expected ?? null
    );

    if (expected !== undefined) {
      expect(
        normalizeMenuAppearance({ surfaceColor: corpusCase.input }),
        `menu-write:${corpusCase.id}`
      ).toEqual({ surfaceColor: expected });
      expect(
        sanitizeMenuAppearance({ surfaceColor: corpusCase.input }),
        `menu-read:${corpusCase.id}`
      ).toEqual({ surfaceColor: expected });
      continue;
    }

    if (corpusCase.input === null || corpusCase.input === undefined) {
      expect(
        normalizeMenuAppearance({ surfaceColor: corpusCase.input }),
        `menu-clear:${corpusCase.id}`
      ).toEqual({});
    } else {
      expect(
        () => normalizeMenuAppearance({ surfaceColor: corpusCase.input }),
        `menu-reject:${corpusCase.id}`
      ).toThrowError(MenuAppearanceError);
    }
    expect(
      sanitizeMenuAppearance({ surfaceColor: corpusCase.input }),
      `menu-omit:${corpusCase.id}`
    ).toEqual({});
  }
});

test("original corpus bytes stay in parity across Form and retained inherited consumers", () => {
  for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
    for (const adapter of inheritedConsumers) {
      const actual = adapter.read(corpusCase.input);
      expect(actual, `${adapter.id}:${corpusCase.id}`).toBe(
        expectedConsumerValue(adapter, corpusCase)
      );
    }
  }
});

test("canonical output bytes are idempotent in a separate consumer pass", () => {
  for (const adapter of [...authoringConsumers, ...inheritedConsumers]) {
    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      const canonical = corpusCase.parser[adapter.profile]?.normalized;
      if (canonical === undefined || (canonical === "inherit" && !adapter.allowInheritKeyword)) {
        continue;
      }
      expect(adapter.read(canonical), `${adapter.id}:${corpusCase.id}`).toBe(canonical);
    }
  }

  for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
    const canonical = corpusCase.parser.authoring?.normalized;
    if (canonical === undefined) continue;
    expect(normalizeMenuColorValue(canonical), `menu:${corpusCase.id}`).toBe(canonical);
    expect(normalizeMenuAppearance({ surfaceColor: canonical })).toEqual({
      surfaceColor: canonical,
    });
    expect(sanitizeMenuAppearance({ surfaceColor: canonical })).toEqual({
      surfaceColor: canonical,
    });
  }
});

test("inherited keywords reject ordinary authoring but survive explicit direct inheritance", () => {
  const keywordCases = CSS_COLOR_CORPUS_CASES.filter(
    (entry) =>
      entry.id === "keyword-current-color-profile" || entry.id === "keyword-inherit-profile"
  );
  expect(keywordCases).toHaveLength(2);

  for (const corpusCase of keywordCases) {
    const expected = corpusCase.parser["inherited-render"]?.normalized;
    expect(expected).toBeDefined();
    expect(normalizeCssColorValue(corpusCase.input, "authoring")).toBeUndefined();
    expect(normalizeAdminColorValue(corpusCase.input as string)).toBeUndefined();
    expect(normalizeMenuColorValue(corpusCase.input)).toBeNull();
    expect(() => normalizeMenuAppearance({ surfaceColor: corpusCase.input })).toThrowError(
      MenuAppearanceError
    );
    expect(normalizeAdminColorValue(corpusCase.input as string, "inherited-render")).toBe(expected);
    expect(
      normalizeFormTheme({
        submit: { background: corpusCase.input as string },
      })?.submit?.background
    ).toBe(expected);

    for (const adapter of inheritedConsumers.filter((entry) => entry.allowInheritKeyword)) {
      expect(adapter.read(corpusCase.input), `${adapter.id}:${corpusCase.id}`).toBe(expected);
    }
  }
});

test("Section, Divider, and both Hero nested stop families accept currentColor and reject inherit", () => {
  const currentColorCase = CSS_COLOR_CORPUS_CASES.find(
    (entry) => entry.id === "keyword-current-color-profile"
  );
  const inheritCase = CSS_COLOR_CORPUS_CASES.find(
    (entry) => entry.id === "keyword-inherit-profile"
  );
  expect(currentColorCase).toBeDefined();
  expect(inheritCase).toBeDefined();

  for (const corpusCase of [currentColorCase!, inheritCase!]) {
    const expected = corpusCase.id === "keyword-current-color-profile" ? "currentColor" : undefined;
    for (const adapter of inheritedConsumers.filter(
      (entry) => !entry.allowInheritKeyword && entry.id !== "retained-nested-inherited"
    )) {
      expect(adapter.read(corpusCase.input), `${adapter.id}:${corpusCase.id}`).toBe(
        expected ?? adapter.fallback
      );
    }

    const raw = corpusCase.input;
    if (typeof raw !== "string") throw new TypeError("Inherited keyword corpus input must be text");
    const gradient = `linear-gradient(45deg, ${raw}, #fff)`;
    expect(normalizeHeroBackgroundGradient(gradient), `hero-gradient:${corpusCase.id}`).toBe(
      expected === undefined ? undefined : "linear-gradient(45deg, currentColor, #fff)"
    );
  }
});

test("raw cap, control, Unicode-space, and semantic rejections fail closed without Timeline fallback", () => {
  const terminal = "#abc";
  const exactCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
  const capPlusOne = ` ${exactCap}`;
  expect(exactCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
  expect(capPlusOne).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

  for (const adapter of [...authoringConsumers, ...inheritedConsumers]) {
    expect(adapter.read(exactCap), `${adapter.id}:exact-cap`).toBe(terminal);
    expect(adapter.read(capPlusOne), `${adapter.id}:cap-plus-one`).toBe(adapter.fallback);
  }

  const rejectedRawValues = [
    capPlusOne,
    `\u001f${terminal}`,
    `\u0085${terminal}`,
    `\u00a0${terminal}`,
    `\u2003${terminal}`,
    "rgb(256,0,0)",
    "hsl(360.1,50%,50%)",
  ] as const;

  for (const raw of rejectedRawValues) {
    const normalizedSteps = normalizeTimelineSteps([
      { id: "timeline-reject", title: "Timeline reject", markerIconColor: raw },
    ]);
    const normalizedTimeline = normalizeTimelineData({
      ...timelineDefaults,
      background: { color: raw },
    });
    expect(
      normalizedSteps[0]?.markerIconColor,
      `timeline-marker:${JSON.stringify(raw)}`
    ).toBeUndefined();
    expect(
      normalizedTimeline.background?.color,
      `timeline-background:${JSON.stringify(raw)}`
    ).toBeUndefined();
  }
});

test("structural schema patterns remain prefilters while semantic false positives reject", () => {
  for (const profile of CSS_COLOR_CORPUS_PROFILES) {
    const pattern = new RegExp(CSS_COLOR_SCHEMA_PATTERNS[profile]);
    for (const corpusCase of CSS_COLOR_CORPUS_CASES) {
      const raw = corpusCase.input;
      const structuralWithCap =
        typeof raw === "string" && raw.length <= CSS_COLOR_VALUE_MAX_LENGTH && pattern.test(raw);
      const expectedStructuralWithCap =
        corpusCase.structural[profile] &&
        typeof raw === "string" &&
        raw.length <= CSS_COLOR_VALUE_MAX_LENGTH;
      expect(structuralWithCap, `${profile}:${corpusCase.id}`).toBe(expectedStructuralWithCap);
    }
  }

  for (const id of CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS) {
    const corpusCase = CSS_COLOR_CORPUS_CASES.find((entry) => entry.id === id);
    expect(corpusCase, id).toBeDefined();
    expect(normalizeCssColorValue(corpusCase!.input, "authoring"), id).toBeUndefined();
    expect(normalizeCssColorValue(corpusCase!.input, "inherited-render"), id).toBeUndefined();
  }
});

test("all production clearable-color calls have an explicit classified profile", () => {
  assertAllProductionClearableColorCallsHaveExplicitClassifiedProfile();
});

test("clearable AST binding rejects indirect aliases and namespace destructuring", () => {
  assertClearableAstBindingRejectsIndirectAliasesAndNamespaceDestructuring();
});

test("enumerated regex AST inventory has no copied simple-color grammar", () => {
  assertRegexAstInventoryHasNoCopiedSimpleColorGrammar();
});

test("RegExp AST inventory rejects constructor escapes and inventories direct global members", () => {
  assertRegexAstInventoryRejectsConstructorEscapesAndInventoriesDirectGlobalMembers();
});

test("CTA composite symbols have one production owner and only bound schema/editor reuse", () => {
  assertCtaCompositeSymbolsHaveOneProductionOwnerAndOnlyBoundReuse();
});

test("Page keeps the exact ordered seven-token compatibility gate after shared admin parsing", () => {
  assertPageKeepsExactOrderedSevenTokenCompatibilityGate();
});
