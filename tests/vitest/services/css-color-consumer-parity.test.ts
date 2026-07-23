import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  canHaveModifiers,
  createSourceFile,
  forEachChild,
  getModifiers,
  isBindingElement,
  isCallExpression,
  isClassDeclaration,
  isElementAccessExpression,
  isFunctionDeclaration,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isImportSpecifier,
  isNamedImports,
  isNamespaceImport,
  isNewExpression,
  isNoSubstitutionTemplateLiteral,
  isObjectLiteralExpression,
  isParameter,
  isPropertyAccessExpression,
  isPropertyAssignment,
  isRegularExpressionLiteral,
  isSpreadAssignment,
  isStringLiteral,
  isVariableDeclaration,
  isVariableStatement,
  type Expression,
  type Node,
  type SourceFile,
} from "typescript";
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
  authoringColorTokenNames,
  isAuthoringColorToken,
} from "../../../core/services/pages/pageAuthoringSanitizers";
import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  normalizeCssColorValue,
  type CssColorProfile,
} from "../../../core/services/theme/cssColorContract";
import { accordionDefaults, normalizeAccordionData } from "../../../core/widgets/core/accordion";
import { resolveClearableCssColorValue } from "../../../core/widgets/core/clearableStyle";
import { contactDefaults, normalizeContactData } from "../../../core/widgets/core/contact";
import {
  CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH,
  CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
  ctaBannerDefaults,
  normalizeCtaBannerData,
  parseCtaBannerBackgroundGradient,
} from "../../../core/widgets/core/ctaBanner";
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
  HERO_BACKGROUND_GRADIENT_MAX_LENGTH,
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

type ClearableCallInventory = Readonly<{
  profile: CssColorProfile;
  calls: number;
  nested: number;
}>;

const expectedClearableCallInventory: Readonly<Record<string, ClearableCallInventory>> =
  Object.freeze({
    "core/widgets/core/accordion.tsx": {
      profile: "inherited-render",
      calls: 1,
      nested: 0,
    },
    "core/widgets/core/contact.tsx": { profile: "inherited-render", calls: 2, nested: 0 },
    "core/widgets/core/ctaBanner.tsx": { profile: "inherited-render", calls: 1, nested: 0 },
    "core/widgets/core/divider.tsx": { profile: "inherited-render", calls: 2, nested: 1 },
    "core/widgets/core/footer.tsx": { profile: "inherited-render", calls: 1, nested: 0 },
    "core/widgets/core/formEmbed.tsx": { profile: "inherited-render", calls: 15, nested: 0 },
    "core/widgets/core/galleryMosaic.tsx": {
      profile: "inherited-render",
      calls: 2,
      nested: 0,
    },
    "core/widgets/core/gridColumns.tsx": { profile: "authoring", calls: 2, nested: 0 },
    "core/widgets/core/hero.tsx": { profile: "inherited-render", calls: 18, nested: 4 },
    "core/widgets/core/navigation.tsx": {
      profile: "inherited-render",
      calls: 2,
      nested: 0,
    },
    "core/widgets/core/newsletter.tsx": { profile: "authoring", calls: 4, nested: 0 },
    "core/widgets/core/section.tsx": { profile: "inherited-render", calls: 16, nested: 4 },
    "core/widgets/core/tabs.tsx": { profile: "inherited-render", calls: 15, nested: 0 },
    "core/widgets/core/timeline.tsx": { profile: "authoring", calls: 4, nested: 0 },
    "core/widgets/core/toggleBlock.tsx": {
      profile: "inherited-render",
      calls: 1,
      nested: 0,
    },
  });

const repoRoot = process.cwd();

const sourceTextCache = new Map<string, string>();
const parsedSourceCache = new Map<string, SourceFile>();

const readSource = (path: string): string => {
  const cached = sourceTextCache.get(path);
  if (cached !== undefined) return cached;
  const source = readFileSync(resolve(repoRoot, path), "utf8");
  sourceTextCache.set(path, source);
  return source;
};

const listTypeScriptSources = (directory: string): string[] => {
  const absoluteDirectory = resolve(repoRoot, directory);
  const paths: string[] = [];
  const visit = (currentDirectory: string) => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        paths.push(relative(repoRoot, absolutePath).replaceAll("\\", "/"));
      }
    }
  };
  visit(absoluteDirectory);
  return paths.sort();
};

const coreSources = listTypeScriptSources("core");

const parseSourceText = (file: string, source: string): SourceFile =>
  createSourceFile(
    file,
    source,
    ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS
  );

const parseSourceFile = (file: string): SourceFile => {
  const cached = parsedSourceCache.get(file);
  if (cached !== undefined) return cached;
  const sourceFile = parseSourceText(file, readSource(file));
  parsedSourceCache.set(file, sourceFile);
  return sourceFile;
};

const resolveImportedModule = (importer: string, specifier: string): string | undefined => {
  if (!specifier.startsWith(".")) return undefined;
  const importedBase = resolve(dirname(resolve(repoRoot, importer)), specifier);
  const extensionlessBase = importedBase.replace(/\.(?:c|m)?jsx?$/, "");
  const candidates = [
    importedBase,
    `${extensionlessBase}.ts`,
    `${extensionlessBase}.tsx`,
    resolve(extensionlessBase, "index.ts"),
    resolve(extensionlessBase, "index.tsx"),
  ];
  const resolvedPath = candidates.find((candidate) => existsSync(candidate));
  return resolvedPath ? relative(repoRoot, resolvedPath).replaceAll("\\", "/") : undefined;
};

type ImportedSymbolBindings = Readonly<{
  named: ReadonlySet<string>;
  namespaces: ReadonlySet<string>;
}>;

const collectImportedSymbolBindings = (
  sourceFile: SourceFile,
  file: string,
  modulePath: string,
  exportName: string
): ImportedSymbolBindings => {
  const named = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !isImportDeclaration(statement) ||
      !isStringLiteral(statement.moduleSpecifier) ||
      resolveImportedModule(file, statement.moduleSpecifier.text) !== modulePath ||
      statement.importClause?.isTypeOnly
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings && isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        const importedName = specifier.propertyName?.text ?? specifier.name.text;
        if (!specifier.isTypeOnly && importedName === exportName) named.add(specifier.name.text);
      }
    } else if (bindings && isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
    }
  }
  return { named, namespaces };
};

const propertyNameText = (node: Node): string | undefined => {
  if (isIdentifier(node) || isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
};

type ClearableCall = Readonly<{
  file: string;
  profile: CssColorProfile;
  nested: boolean;
  line: number;
}>;

type ClearableCallScan = Readonly<{
  calls: readonly ClearableCall[];
  issues: readonly string[];
}>;

const clearableModulePath = "core/widgets/core/clearableStyle.ts";
const clearableExportName = "resolveClearableCssColorValue";

const parseNestedClearableOption = (
  optionsArgument: Expression | undefined,
  location: string,
  issues: string[]
): boolean => {
  if (!optionsArgument) return false;
  if (!isObjectLiteralExpression(optionsArgument)) {
    issues.push(`${location}: clearable options must be an object literal`);
    return false;
  }

  let allowInherit: boolean | undefined;
  for (const property of optionsArgument.properties) {
    if (isSpreadAssignment(property)) {
      issues.push(`${location}: clearable options may not use a spread`);
      continue;
    }
    if (
      !isPropertyAssignment(property) ||
      propertyNameText(property.name) !== "allowInheritKeyword"
    ) {
      issues.push(`${location}: clearable options contain an unclassified property`);
      continue;
    }
    if (allowInherit !== undefined) {
      issues.push(`${location}: allowInheritKeyword is duplicated`);
      continue;
    }
    if (property.initializer.kind === SyntaxKind.FalseKeyword) allowInherit = false;
    else if (property.initializer.kind === SyntaxKind.TrueKeyword) allowInherit = true;
    else issues.push(`${location}: allowInheritKeyword must be a boolean literal`);
  }
  if (allowInherit === undefined) {
    issues.push(
      `${location}: explicit clearable options must classify allowInheritKeyword structurally`
    );
  }
  return allowInherit === false;
};

const scanClearableSource = (file: string, source: string): ClearableCallScan => {
  if (!source.includes(clearableExportName) && !source.includes("clearableStyle")) {
    return { calls: [], issues: [] };
  }
  const sourceFile = parseSourceText(file, source);
  const bindings = collectImportedSymbolBindings(
    sourceFile,
    file,
    clearableModulePath,
    clearableExportName
  );
  const calls: ClearableCall[] = [];
  const issues: string[] = [];
  const importedLocalNames = new Set([...bindings.named, ...bindings.namespaces]);

  const visit = (node: Node) => {
    const declaredName =
      (isVariableDeclaration(node) ||
        isBindingElement(node) ||
        isParameter(node) ||
        isFunctionDeclaration(node) ||
        isClassDeclaration(node)) &&
      node.name &&
      isIdentifier(node.name)
        ? node.name.text
        : undefined;
    if (declaredName && importedLocalNames.has(declaredName)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      issues.push(`${file}:${line}: imported clearable binding is shadowed by ${declaredName}`);
    }

    if (isIdentifier(node) && bindings.named.has(node.text)) {
      const importRole = isImportSpecifier(node.parent) && node.parent.name === node;
      const directCallRole = isCallExpression(node.parent) && node.parent.expression === node;
      if (!importRole && !directCallRole) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: bound clearable import escapes a direct call`);
      }
    }
    if (isIdentifier(node) && bindings.namespaces.has(node.text)) {
      const importRole = isNamespaceImport(node.parent) && node.parent.name === node;
      const member = isPropertyAccessExpression(node.parent) ? node.parent : undefined;
      const directMemberCallRole =
        member?.expression === node &&
        member.name.text === clearableExportName &&
        isCallExpression(member.parent) &&
        member.parent.expression === member;
      if (!importRole && !directMemberCallRole) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: bound clearable namespace escapes a direct member call`);
      }
    }

    if (isCallExpression(node)) {
      let bound = false;
      let spoofed = false;
      if (isIdentifier(node.expression)) {
        bound = bindings.named.has(node.expression.text);
        spoofed = node.expression.text === clearableExportName && !bound;
      } else if (isPropertyAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        if (node.expression.name.text === clearableExportName) {
          bound = isIdentifier(receiver) && bindings.namespaces.has(receiver.text);
          spoofed = !bound;
        }
      } else if (isElementAccessExpression(node.expression)) {
        const member = node.expression.argumentExpression;
        if (member && isStringLiteral(member) && member.text === clearableExportName) {
          spoofed = true;
        }
      }

      if (!bound && !spoofed) {
        forEachChild(node, visit);
        return;
      }

      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const location = `${file}:${line}`;
      if (spoofed) {
        issues.push(`${location}: clearable call is not bound to ${clearableModulePath}`);
        forEachChild(node, visit);
        return;
      }

      const profileArgument = node.arguments[1];
      if (
        !profileArgument ||
        !isStringLiteral(profileArgument) ||
        (profileArgument.text !== "authoring" && profileArgument.text !== "inherited-render")
      ) {
        issues.push(`${location}: clearable profile must be an explicit policy literal`);
        forEachChild(node, visit);
        return;
      }
      if (node.arguments.length > 3) {
        issues.push(`${location}: clearable call has unclassified extra arguments`);
      }
      calls.push({
        file,
        profile: profileArgument.text,
        nested: parseNestedClearableOption(node.arguments[2], location, issues),
        line,
      });
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return { calls, issues };
};

const collectClearableCalls = (file: string): ClearableCallScan =>
  scanClearableSource(file, readSource(file));

test("all production clearable-color calls have an explicit classified profile", () => {
  const scans = coreSources.map(collectClearableCalls);
  const calls = scans.flatMap((scan) => scan.calls);
  const issues = scans.flatMap((scan) => scan.issues);
  const actual: Record<string, Readonly<{ profile: string; calls: number; nested: number }>> = {};
  for (const file of Object.keys(expectedClearableCallInventory)) {
    const fileCalls = calls.filter((call) => call.file === file);
    const profiles = [...new Set(fileCalls.map((call) => call.profile))];
    actual[file] = {
      profile: profiles.length === 1 ? profiles[0]! : `unclassified:${profiles.join(",")}`,
      calls: fileCalls.length,
      nested: fileCalls.filter((call) => call.nested).length,
    };
  }

  expect(issues).toEqual([]);
  expect(calls).toHaveLength(86);
  expect({
    total: calls.length,
    authoring: calls.filter((call) => call.profile === "authoring").length,
    inherited: calls.filter((call) => call.profile === "inherited-render").length,
    nested: calls.filter((call) => call.nested).length,
  }).toEqual({ total: 86, authoring: 10, inherited: 76, nested: 9 });
  expect([...new Set(calls.map((call) => call.file))].sort()).toEqual(
    Object.keys(expectedClearableCallInventory).sort()
  );
  expect(actual).toEqual(expectedClearableCallInventory);
});

test("clearable AST binding rejects indirect aliases and namespace destructuring", () => {
  const fixturePath = "core/widgets/core/__css_color_parity_fixture__.ts";
  const direct = scanClearableSource(
    fixturePath,
    `
      import { resolveClearableCssColorValue as namedColor } from "./clearableStyle";
      import * as colorNamespace from "./clearableStyle";
      namedColor(value, "authoring");
      colorNamespace.resolveClearableCssColorValue(value, "inherited-render");
    `
  );
  expect(direct.issues).toEqual([]);
  expect(direct.calls.map(({ profile, nested }) => ({ profile, nested }))).toEqual([
    { profile: "authoring", nested: false },
    { profile: "inherited-render", nested: false },
  ]);

  const localAlias = scanClearableSource(
    fixturePath,
    `
      import { resolveClearableCssColorValue as namedColor } from "./clearableStyle";
      const escapedColor = namedColor;
    `
  );
  expect(localAlias.calls).toEqual([]);
  expect(localAlias.issues.some((issue) => issue.includes("escapes a direct call"))).toBe(true);

  const namespaceDestructure = scanClearableSource(
    fixturePath,
    `
      import * as colorNamespace from "./clearableStyle";
      const { resolveClearableCssColorValue: escapedColor } = colorNamespace;
    `
  );
  expect(namespaceDestructure.calls).toEqual([]);
  expect(
    namespaceDestructure.issues.some((issue) =>
      issue.includes("namespace escapes a direct member call")
    )
  ).toBe(true);
});

type RegexInventory = Readonly<{ literals: number; constructors: number }>;

const expectedRegexInventory: Readonly<Record<string, RegexInventory>> = Object.freeze({
  "core/admin/ui/forms/FormDesignPanel.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/AccordionEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/ContactEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/CtaBannerEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/DividerEditors.tsx": { literals: 2, constructors: 0 },
  "core/admin/ui/widgets/editors/FooterEditors.tsx": { literals: 7, constructors: 0 },
  "core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/HeroEditors.tsx": { literals: 3, constructors: 0 },
  "core/admin/ui/widgets/editors/NavigationEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/SectionEditors.tsx": { literals: 1, constructors: 0 },
  "core/admin/ui/widgets/editors/TabsEditors.tsx": { literals: 0, constructors: 0 },
  "core/admin/ui/widgets/editors/ToggleBlockEditors.tsx": { literals: 0, constructors: 0 },
  "core/services/forms/formSettings.ts": { literals: 0, constructors: 0 },
  "core/services/forms/formTheme.ts": { literals: 0, constructors: 0 },
  "core/widgets/core/accordion.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/clearableStyle.ts": { literals: 0, constructors: 0 },
  "core/widgets/core/contact.tsx": { literals: 11, constructors: 0 },
  "core/widgets/core/ctaBanner.tsx": { literals: 0, constructors: 1 },
  "core/widgets/core/divider.tsx": { literals: 3, constructors: 0 },
  "core/widgets/core/footer.tsx": { literals: 5, constructors: 0 },
  "core/widgets/core/formEmbed.tsx": { literals: 3, constructors: 0 },
  "core/widgets/core/galleryMosaic.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/gridColumns.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/hero.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/navigation.tsx": { literals: 2, constructors: 0 },
  "core/widgets/core/newsletter.tsx": { literals: 11, constructors: 0 },
  "core/widgets/core/section.tsx": { literals: 7, constructors: 0 },
  "core/widgets/core/tabs.tsx": { literals: 0, constructors: 0 },
  "core/widgets/core/timeline.tsx": { literals: 3, constructors: 0 },
  "core/widgets/core/toggleBlock.tsx": { literals: 1, constructors: 0 },
});

type RegexConstruction = Readonly<{
  file: string;
  kind: "literal" | "constructor";
  pattern: string;
  flags: string;
  argumentBinding?: string;
  functionOwner?: string;
  variableOwner?: string;
  line: number;
}>;

type RegexScan = Readonly<{
  records: readonly RegexConstruction[];
  issues: readonly string[];
}>;

const readRegexLiteral = (
  text: string
): Readonly<{ pattern: string; flags: string }> | undefined => {
  const match = /^\/([\s\S]*)\/([a-z]*)$/.exec(text);
  return match ? { pattern: match[1]!, flags: match[2]! } : undefined;
};

const enclosingFunctionName = (node: Node): string | undefined => {
  let current = node.parent;
  while (current) {
    if (isFunctionDeclaration(current) && current.name) return current.name.text;
    current = current.parent;
  }
  return undefined;
};

const enclosingVariableName = (node: Node): string | undefined => {
  let current = node.parent;
  while (current) {
    if (isVariableDeclaration(current) && isIdentifier(current.name)) return current.name.text;
    if (isFunctionDeclaration(current)) return undefined;
    current = current.parent;
  }
  return undefined;
};

const topLevelStringConstants = (sourceFile: SourceFile): ReadonlyMap<string, string> => {
  const constants = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        isIdentifier(declaration.name) &&
        declaration.initializer &&
        (isStringLiteral(declaration.initializer) ||
          isNoSubstitutionTemplateLiteral(declaration.initializer))
      ) {
        constants.set(declaration.name.text, declaration.initializer.text);
      }
    }
  }
  return constants;
};

const staticRegexArgument = (
  argument: Expression | undefined,
  constants: ReadonlyMap<string, string>
): Readonly<{ value: string; binding?: string }> | undefined => {
  if (!argument) return undefined;
  if (isStringLiteral(argument) || isNoSubstitutionTemplateLiteral(argument)) {
    return { value: argument.text };
  }
  if (isIdentifier(argument)) {
    const value = constants.get(argument.text);
    return value === undefined ? undefined : { value, binding: argument.text };
  }
  return undefined;
};

const localValueBindingLines = (sourceFile: SourceFile, bindingName: string): readonly number[] => {
  const lines: number[] = [];
  const visit = (node: Node) => {
    const declarationName =
      (isVariableDeclaration(node) ||
        isBindingElement(node) ||
        isParameter(node) ||
        isFunctionDeclaration(node) ||
        isClassDeclaration(node)) &&
      node.name &&
      isIdentifier(node.name)
        ? node.name.text
        : undefined;
    const importName =
      (isImportSpecifier(node) || isNamespaceImport(node)) && isIdentifier(node.name)
        ? node.name.text
        : isImportClause(node) && node.name
          ? node.name.text
          : undefined;
    if (declarationName === bindingName || importName === bindingName) {
      lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
};

const globalRegExpReceivers = new Set(["globalThis", "window", "self"]);

const regExpMemberReceiver = (expression: Expression): string | undefined => {
  if (
    isPropertyAccessExpression(expression) &&
    expression.name.text === "RegExp" &&
    isIdentifier(expression.expression)
  ) {
    return expression.expression.text;
  }
  if (
    isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    isStringLiteral(expression.argumentExpression) &&
    expression.argumentExpression.text === "RegExp" &&
    isIdentifier(expression.expression)
  ) {
    return expression.expression.text;
  }
  return undefined;
};

const isRegExpMemberReference = (node: Node): node is Expression =>
  (isPropertyAccessExpression(node) && node.name.text === "RegExp") ||
  (isElementAccessExpression(node) &&
    Boolean(
      node.argumentExpression &&
      isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "RegExp"
    ));

const isDirectInvocationCallee = (node: Node): boolean =>
  (isCallExpression(node.parent) || isNewExpression(node.parent)) &&
  node.parent.expression === node;

const scanRegexSource = (file: string, source: string): RegexScan => {
  const sourceFile = parseSourceText(file, source);
  const constants = topLevelStringConstants(sourceFile);
  const localRegExpBindings = localValueBindingLines(sourceFile, "RegExp");
  const shadowedGlobalReceivers = new Map(
    [...globalRegExpReceivers].map((receiver) => [
      receiver,
      localValueBindingLines(sourceFile, receiver),
    ])
  );
  const records: RegexConstruction[] = [];
  const issues = localRegExpBindings.map(
    (line) => `${file}:${line}: local RegExp value binding shadows the global constructor`
  );
  const visit = (node: Node) => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (isRegularExpressionLiteral(node)) {
      const parsed = readRegexLiteral(node.text);
      if (!parsed) issues.push(`${file}:${line}: regex literal could not be inventoried`);
      else {
        records.push({
          file,
          kind: "literal",
          ...parsed,
          functionOwner: enclosingFunctionName(node),
          variableOwner: enclosingVariableName(node),
          line,
        });
      }
    }

    if (isRegExpMemberReference(node)) {
      const receiver = regExpMemberReceiver(node);
      const directGlobalCall =
        receiver !== undefined &&
        globalRegExpReceivers.has(receiver) &&
        shadowedGlobalReceivers.get(receiver)?.length === 0 &&
        isDirectInvocationCallee(node);
      if (!directGlobalCall) {
        issues.push(
          `${file}:${line}: ${receiver ?? "unknown"}.RegExp escapes a direct global call`
        );
      }
    }

    if (isIdentifier(node) && node.text === "RegExp") {
      const memberNameRole = isPropertyAccessExpression(node.parent) && node.parent.name === node;
      const declarationRole =
        ((isVariableDeclaration(node.parent) ||
          isParameter(node.parent) ||
          isFunctionDeclaration(node.parent) ||
          isClassDeclaration(node.parent)) &&
          node.parent.name === node) ||
        ((isImportSpecifier(node.parent) || isNamespaceImport(node.parent)) &&
          node.parent.name === node) ||
        (isImportClause(node.parent) && node.parent.name === node);
      const directGlobalCall = localRegExpBindings.length === 0 && isDirectInvocationCallee(node);
      if (!memberNameRole && !declarationRole && !directGlobalCall) {
        issues.push(`${file}:${line}: RegExp identifier escapes a direct global call`);
      }
    }

    if (isNewExpression(node) || isCallExpression(node)) {
      const identifierCallee = isIdentifier(node.expression) && node.expression.text === "RegExp";
      const memberReceiver = regExpMemberReceiver(node.expression);
      const globalMemberCallee =
        memberReceiver !== undefined &&
        globalRegExpReceivers.has(memberReceiver) &&
        shadowedGlobalReceivers.get(memberReceiver)?.length === 0;
      if ((identifierCallee && localRegExpBindings.length === 0) || globalMemberCallee) {
        const pattern = staticRegexArgument(node.arguments?.[0], constants);
        const flags = staticRegexArgument(node.arguments?.[1], constants);
        if (!pattern || (node.arguments && node.arguments.length > 1 && !flags)) {
          issues.push(
            `${file}:${line}: RegExp constructor must use statically inventoried strings`
          );
        } else {
          records.push({
            file,
            kind: "constructor",
            pattern: pattern.value,
            flags: flags?.value ?? "",
            argumentBinding: pattern.binding,
            functionOwner: enclosingFunctionName(node),
            variableOwner: enclosingVariableName(node),
            line,
          });
        }
      } else if (identifierCallee || memberReceiver !== undefined) {
        issues.push(`${file}:${line}: RegExp call is not bound to a direct global constructor`);
      }
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return { records, issues };
};

const collectRegexConstructions = (file: string): RegexScan =>
  scanRegexSource(file, readSource(file));

const regexMatchesWhole = (record: RegexConstruction, value: string): boolean => {
  const match = new RegExp(record.pattern, record.flags).exec(value);
  return match?.[0] === value;
};

const simpleColorProbePairs = [
  ["#abc", "#ab"],
  ["#11223380", "#112233800"],
  ["rgb(1,2,3)", "rgb(1,2)"],
  ["rgba(1,2,3,.5)", "rgba(1,2,3,2)"],
  ["hsl(210,50%,40%)", "hsl(210,50,40%)"],
  ["hsla(210,50%,40%,.5)", "hsla(210,50%,40%,2)"],
] as const;

const compositeProbePairs = [
  ["linear-gradient(1deg, #abc, #def)", "radial-gradient(1deg, #abc, #def)"],
  ["1deg", "+1deg"],
] as const;

const recognizesProbeGrammar = (
  record: RegexConstruction,
  probes: readonly (readonly [string, string])[]
): boolean =>
  probes.some(
    ([valid, malformed]) =>
      regexMatchesWhole(record, valid) && !regexMatchesWhole(record, malformed)
  );

test("enumerated regex AST inventory has no copied simple-color grammar", () => {
  const scans = Object.keys(expectedRegexInventory).map(collectRegexConstructions);
  const records = scans.flatMap((scan) => scan.records);
  const issues = scans.flatMap((scan) => scan.issues);
  const actual: Record<string, RegexInventory> = {};
  for (const file of Object.keys(expectedRegexInventory)) {
    const fileRecords = records.filter((record) => record.file === file);
    actual[file] = {
      literals: fileRecords.filter((record) => record.kind === "literal").length,
      constructors: fileRecords.filter((record) => record.kind === "constructor").length,
    };
  }

  expect(issues).toEqual([]);
  expect(records).toHaveLength(66);
  expect(actual).toEqual(expectedRegexInventory);
  expect(records.filter((record) => recognizesProbeGrammar(record, simpleColorProbePairs))).toEqual(
    []
  );

  const compositeRecords = records
    .filter(
      (record) =>
        recognizesProbeGrammar(record, [compositeProbePairs[0]!]) ||
        (record.functionOwner === "normalizeHeroBackgroundGradient" &&
          recognizesProbeGrammar(record, [compositeProbePairs[1]!]))
    )
    .map(({ file, kind, pattern, flags, argumentBinding, functionOwner, variableOwner }) => ({
      file,
      kind,
      pattern,
      flags,
      argumentBinding,
      functionOwner,
      variableOwner,
    }));
  expect(compositeRecords).toEqual([
    {
      file: "core/widgets/core/ctaBanner.tsx",
      kind: "constructor",
      pattern: CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN,
      flags: "",
      argumentBinding: "CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN",
      functionOwner: undefined,
      variableOwner: "ctaBannerBackgroundGradientPattern",
    },
    {
      file: "core/widgets/core/hero.tsx",
      kind: "literal",
      pattern: "^[lL][iI][nN][eE][aA][rR]-[gG][rR][aA][dD][iI][eE][nN][tT]\\((.*)\\)$",
      flags: "",
      argumentBinding: undefined,
      functionOwner: "normalizeHeroBackgroundGradient",
      variableOwner: "match",
    },
    {
      file: "core/widgets/core/hero.tsx",
      kind: "literal",
      pattern: "^[ ]*([0-9]+)[dD][eE][gG][ ]*$",
      flags: "",
      argumentBinding: undefined,
      functionOwner: "normalizeHeroBackgroundGradient",
      variableOwner: "angleMatch",
    },
  ]);

  expect(
    records.filter((record) => record.file === "core/admin/ui/widgets/editors/CtaBannerEditors.tsx")
  ).toEqual([]);
});

test("RegExp AST inventory rejects constructor escapes and inventories direct global members", () => {
  const fixturePath = "core/widgets/core/__css_color_regex_fixture__.ts";
  const directGlobals = scanRegexSource(
    fixturePath,
    `
      const first = new globalThis.RegExp("^first$");
      const second = window.RegExp("^second$");
      const third = new self["RegExp"]("^third$");
    `
  );
  expect(directGlobals.issues).toEqual([]);
  expect(directGlobals.records.map(({ kind, pattern }) => ({ kind, pattern }))).toEqual([
    { kind: "constructor", pattern: "^first$" },
    { kind: "constructor", pattern: "^second$" },
    { kind: "constructor", pattern: "^third$" },
  ]);

  const identifierAlias = scanRegexSource(
    fixturePath,
    `
      const ColorRegExp = RegExp;
      ColorRegExp("^color$");
    `
  );
  expect(identifierAlias.records).toEqual([]);
  expect(identifierAlias.issues.some((issue) => issue.includes("identifier escapes"))).toBe(true);

  const extractedMember = scanRegexSource(
    fixturePath,
    `
      const ExtractedRegExp = globalThis.RegExp;
      ExtractedRegExp("^extracted$");
    `
  );
  expect(extractedMember.records).toEqual([]);
  expect(
    extractedMember.issues.some((issue) => issue.includes("escapes a direct global call"))
  ).toBe(true);

  const destructuredMember = scanRegexSource(
    fixturePath,
    `
      const { RegExp: ExtractedRegExp } = globalThis;
    `
  );
  expect(destructuredMember.records).toEqual([]);
  expect(destructuredMember.issues.some((issue) => issue.includes("identifier escapes"))).toBe(
    true
  );

  const unknownReceiver = scanRegexSource(
    fixturePath,
    `
      tools.RegExp("^unknown$");
    `
  );
  expect(unknownReceiver.records).toEqual([]);
  expect(unknownReceiver.issues.some((issue) => issue.includes("not bound"))).toBe(true);

  const shadowedGlobalReceiver = scanRegexSource(
    fixturePath,
    `
      const window = { "RegExp": (pattern) => pattern };
      window.RegExp("^shadowed-window$");
    `
  );
  expect(shadowedGlobalReceiver.records).toEqual([]);
  expect(
    shadowedGlobalReceiver.issues.some((issue) => issue.includes("escapes a direct global call"))
  ).toBe(true);

  const localShadow = scanRegexSource(
    fixturePath,
    `
      const RegExp = (pattern) => pattern;
      RegExp("^shadow$");
    `
  );
  expect(localShadow.records).toEqual([]);
  expect(localShadow.issues.some((issue) => issue.includes("shadows the global"))).toBe(true);
});

type ValueDeclarationInventory = Readonly<{
  file: string;
  kind: "function" | "variable";
  exported: boolean;
}>;

const hasExportKeyword = (node: Node): boolean =>
  canHaveModifiers(node) &&
  Boolean(getModifiers(node)?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword));

const collectValueDeclarations = (file: string, name: string): ValueDeclarationInventory[] => {
  const sourceFile = parseSourceFile(file);
  const declarations: ValueDeclarationInventory[] = [];
  const visit = (node: Node) => {
    if (isFunctionDeclaration(node) && node.name?.text === name) {
      declarations.push({ file, kind: "function", exported: hasExportKeyword(node) });
    } else if (isVariableDeclaration(node) && isIdentifier(node.name) && node.name.text === name) {
      let statement: Node | undefined = node.parent;
      while (statement && !isVariableStatement(statement)) statement = statement.parent;
      declarations.push({
        file,
        kind: "variable",
        exported: statement ? hasExportKeyword(statement) : false,
      });
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
};

type BoundCallScan = Readonly<{
  calls: readonly Readonly<{ file: string; line: number }>[];
  imports: readonly Readonly<{ file: string; kind: "named" | "namespace" }>[];
  issues: readonly string[];
}>;

const collectBoundModuleCalls = (
  modulePath: string,
  exportName: string,
  ownerPath: string
): BoundCallScan => {
  const calls: Array<Readonly<{ file: string; line: number }>> = [];
  const imports: Array<Readonly<{ file: string; kind: "named" | "namespace" }>> = [];
  const issues: string[] = [];

  for (const file of coreSources) {
    const source = readSource(file);
    if (
      !source.includes(exportName) &&
      !source.includes(
        modulePath
          .split("/")
          .at(-1)!
          .replace(/\.tsx?$/, "")
      )
    ) {
      continue;
    }
    const sourceFile = parseSourceFile(file);
    const bindings = collectImportedSymbolBindings(sourceFile, file, modulePath, exportName);
    for (const _localName of bindings.named) imports.push({ file, kind: "named" });
    for (const _localName of bindings.namespaces) imports.push({ file, kind: "namespace" });
    const importedLocalNames = new Set([...bindings.named, ...bindings.namespaces]);

    const visit = (node: Node) => {
      const declaredName =
        (isVariableDeclaration(node) ||
          isParameter(node) ||
          isFunctionDeclaration(node) ||
          isClassDeclaration(node)) &&
        node.name &&
        isIdentifier(node.name)
          ? node.name.text
          : undefined;
      if (declaredName && importedLocalNames.has(declaredName)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        issues.push(`${file}:${line}: imported ${exportName} binding is shadowed`);
      }

      if (isIdentifier(node)) {
        const isOwnerDeclaration =
          file === ownerPath &&
          node.text === exportName &&
          isFunctionDeclaration(node.parent) &&
          node.parent.name === node;
        const isImportRole =
          isImportSpecifier(node.parent) &&
          (node.parent.name === node || node.parent.propertyName === node);
        const isNamedCallRole =
          isCallExpression(node.parent) &&
          node.parent.expression === node &&
          (bindings.named.has(node.text) || (file === ownerPath && node.text === exportName));
        const isNamespaceReceiverRole =
          (isPropertyAccessExpression(node.parent) || isElementAccessExpression(node.parent)) &&
          node.parent.expression === node &&
          isCallExpression(node.parent.parent) &&
          node.parent.parent.expression === node.parent;
        const isNamespaceMemberRole =
          isPropertyAccessExpression(node.parent) &&
          node.parent.name === node &&
          node.text === exportName &&
          isIdentifier(node.parent.expression) &&
          bindings.namespaces.has(node.parent.expression.text) &&
          isCallExpression(node.parent.parent) &&
          node.parent.parent.expression === node.parent;
        const isRelevantIdentifier =
          node.text === exportName ||
          bindings.named.has(node.text) ||
          bindings.namespaces.has(node.text);
        if (
          isRelevantIdentifier &&
          !isOwnerDeclaration &&
          !isImportRole &&
          !isNamedCallRole &&
          !isNamespaceReceiverRole &&
          !isNamespaceMemberRole &&
          !(isNamespaceImport(node.parent) && node.parent.name === node)
        ) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          issues.push(`${file}:${line}: ${exportName} has an unclassified reference role`);
        }
      }

      if (isCallExpression(node)) {
        let bound = false;
        let spoofed = false;
        if (isIdentifier(node.expression)) {
          bound =
            bindings.named.has(node.expression.text) ||
            (file === ownerPath && node.expression.text === exportName);
          spoofed = node.expression.text === exportName && !bound;
        } else if (isPropertyAccessExpression(node.expression)) {
          if (node.expression.name.text === exportName) {
            bound =
              isIdentifier(node.expression.expression) &&
              bindings.namespaces.has(node.expression.expression.text);
            spoofed = !bound;
          }
        } else if (isElementAccessExpression(node.expression)) {
          const member = node.expression.argumentExpression;
          if (member && isStringLiteral(member) && member.text === exportName) {
            spoofed = true;
          }
        }
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        if (spoofed) issues.push(`${file}:${line}: ${exportName} call is not module-bound`);
        if (bound) calls.push({ file, line });
      }
      forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return { calls, imports, issues };
};

const collectExactIdentifierRoles = (file: string, name: string): string[] => {
  const sourceFile = parseSourceFile(file);
  const roles: string[] = [];
  const visit = (node: Node) => {
    if (isIdentifier(node) && node.text === name) {
      if (isVariableDeclaration(node.parent) && node.parent.name === node)
        roles.push("declaration");
      else if (
        (isNewExpression(node.parent) || isCallExpression(node.parent)) &&
        node.parent.arguments?.[0] === node &&
        isIdentifier(node.parent.expression) &&
        node.parent.expression.text === "RegExp"
      ) {
        roles.push("regexp-argument");
      } else if (
        isPropertyAssignment(node.parent) &&
        node.parent.initializer === node &&
        propertyNameText(node.parent.name) === "pattern"
      ) {
        roles.push("schema-pattern");
      } else roles.push("unclassified");
    }
    forEachChild(node, visit);
  };
  visit(sourceFile);
  return roles.sort();
};

type ExternalSymbolUseInventory = Readonly<{
  importedFiles: readonly string[];
  references: readonly string[];
}>;

const collectExternalModuleSymbolUses = (
  modulePath: string,
  exportName: string,
  ownerPath: string
): ExternalSymbolUseInventory => {
  const importedFiles = new Set<string>();
  const references: string[] = [];
  const moduleStem = modulePath
    .split("/")
    .at(-1)!
    .replace(/\.tsx?$/, "");
  for (const file of coreSources) {
    if (file === ownerPath) continue;
    const source = readSource(file);
    if (!source.includes(exportName) && !source.includes(moduleStem)) continue;
    const sourceFile = parseSourceFile(file);
    const bindings = collectImportedSymbolBindings(sourceFile, file, modulePath, exportName);
    if (bindings.named.size > 0 || bindings.namespaces.size > 0) importedFiles.add(file);

    const visit = (node: Node) => {
      if (isIdentifier(node)) {
        const importRole =
          isImportSpecifier(node.parent) &&
          (node.parent.name === node || node.parent.propertyName === node);
        if (!importRole && (node.text === exportName || bindings.named.has(node.text))) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          references.push(`${file}:${line}`);
        }
      } else if (
        isStringLiteral(node) &&
        node.text === exportName &&
        isElementAccessExpression(node.parent) &&
        node.parent.argumentExpression === node
      ) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        references.push(`${file}:${line}`);
      }
      forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return { importedFiles: [...importedFiles].sort(), references: references.sort() };
};

test("CTA composite symbols have one production owner and only bound schema/editor reuse", () => {
  const ownerPath = "core/widgets/core/ctaBanner.tsx";
  const editorPath = "core/admin/ui/widgets/editors/CtaBannerEditors.tsx";
  const schemaExportName = "CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN";
  const parserExportName = "parseCtaBannerBackgroundGradient";

  const schemaDeclarations = coreSources.flatMap((file) =>
    readSource(file).includes(schemaExportName)
      ? collectValueDeclarations(file, schemaExportName)
      : []
  );
  const parserDeclarations = coreSources.flatMap((file) =>
    readSource(file).includes(parserExportName)
      ? collectValueDeclarations(file, parserExportName)
      : []
  );
  expect(schemaDeclarations).toEqual([{ file: ownerPath, kind: "variable", exported: true }]);
  expect(parserDeclarations).toEqual([{ file: ownerPath, kind: "function", exported: true }]);
  expect(collectExactIdentifierRoles(ownerPath, schemaExportName)).toEqual([
    "declaration",
    "regexp-argument",
    "schema-pattern",
  ]);
  expect(collectExternalModuleSymbolUses(ownerPath, schemaExportName, ownerPath)).toEqual({
    importedFiles: [],
    references: [],
  });

  const parserScan = collectBoundModuleCalls(ownerPath, parserExportName, ownerPath);
  expect(parserScan.issues).toEqual([]);
  expect(parserScan.imports).toEqual([{ file: editorPath, kind: "named" }]);
  expect(parserScan.calls).toHaveLength(5);
  expect(
    Object.fromEntries(
      [ownerPath, editorPath].map((file) => [
        file,
        parserScan.calls.filter((call) => call.file === file).length,
      ])
    )
  ).toEqual({ [ownerPath]: 2, [editorPath]: 3 });

  expect(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(96);
  expect(HERO_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(320);
  expect(HERO_BACKGROUND_GRADIENT_MAX_LENGTH).toBe(CSS_COLOR_VALUE_MAX_LENGTH * 2 + 64);

  const terminal = "linear-gradient(-1.5deg, #abcde, #ABCDEF7)";
  const exactCap = `${" ".repeat(
    CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH - terminal.length
  )}${terminal}`;
  const capPlusOne = ` ${exactCap}`;
  expect(exactCap).toHaveLength(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH);
  expect(capPlusOne).toHaveLength(CTA_BANNER_BACKGROUND_GRADIENT_MAX_LENGTH + 1);
  expect(new RegExp(CTA_BANNER_BACKGROUND_GRADIENT_SCHEMA_PATTERN).test(exactCap)).toBe(true);
  expect(parseCtaBannerBackgroundGradient(exactCap)?.normalized).toBe(terminal);
  expect(parseCtaBannerBackgroundGradient(capPlusOne)).toBeUndefined();
});

test("Page keeps the exact ordered seven-token compatibility gate after shared admin parsing", () => {
  const expectedPageTokens = [
    "primary",
    "secondary",
    "accent",
    "bg",
    "surface",
    "text",
    "border",
  ] as const;
  expect(authoringColorTokenNames).toEqual(expectedPageTokens);
  for (const token of expectedPageTokens) {
    expect(isAuthoringColorToken(`var(--color-${token})`), token).toBe(true);
  }

  const sharedButNotPageToken = "var(--color-extra)";
  expect(normalizeAdminColorValue(sharedButNotPageToken)).toBe(sharedButNotPageToken);
  expect(isAuthoringColorToken(sharedButNotPageToken)).toBe(false);
});
