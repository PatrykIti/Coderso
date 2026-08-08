import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

import { buildReferencePlan } from "../../core/services/kits/fullSitePackage/referenceGraph";
import { normalizeFullSitePackageForWrite } from "../../core/services/kits/fullSitePackage/normalize";
import type {
  FullSitePackageV1,
  ResourceSeed,
  VisualResidual,
} from "../../core/services/kits/fullSitePackage/types";
import { buildFormaDomContentResources } from "./content/buildFormaDomContentResources";
import { HOUSE_PROJECT_RESOURCE_KEY } from "./content/constants";
import { PROJECT_DETAIL_KEY } from "./content/projectDetail";
import {
  PROJECT_BRIEF_FORM_KEY,
  PROJECT_BRIEF_FORM_TITLE,
  PROJECT_BRIEF_INITIAL_NOTE,
} from "./content/projectForm";
import { PROJECT_FIXTURES } from "./content/projectFixtures";
import { PROJECT_LISTING_QUERY_KEY, PROJECT_LISTING_TEMPLATE_KEY } from "./content/projectListing";
import { FORMA_DOM_PAGE_SEO_DESCRIPTION } from "./pages/shared";
import { buildFormaDomPages } from "./pages";
import { buildFooterTemplate, buildPrimaryMenu, buildShellSettings } from "./shell";

const noImpact = {
  functional: false,
  accessibility: false,
  data: false,
  security: false,
  testIntegrity: false,
} as const;

const residual = (
  id: string,
  prototypeEvidence: string,
  cmsConstraint: string,
  installedApproximation: string,
  userVisibleDifference: string,
  postInstallRemediation: string
): VisualResidual => ({
  id,
  prototypeEvidence,
  cmsConstraint,
  installedApproximation,
  userVisibleDifference,
  impact: { ...noImpact },
  postInstallRemediation,
});

const buildFormaDomResiduals = (): VisualResidual[] => [
  residual(
    "favicon-not-installed",
    "projekty-domow-wow-site/assets/favicon.svg and every prototype HTML favicon link",
    "FullSitePackageV1 has no asset or media resource kind",
    "the site keeps its existing favicon",
    "the FormaDom favicon is not installed",
    "upload and configure the approved favicon through the Media Library"
  ),
  residual(
    "theme-color-not-installed",
    "every prototype HTML meta theme-color declaration with #08111f",
    "the package contract has no document-head theme-color setting",
    "the existing document-head theme color remains unchanged",
    "browser chrome may use the pre-existing site color",
    "add a bounded document-head theme-color setting in a separate product task"
  ),
  residual(
    "header-brand-and-floating-frame-approximated",
    "the repeated prototype HTML header, assets/styles.css and assets/app.js",
    "the native Menu document owns safe icons, radius clamp 40, sticky placement and an 8px scroll threshold",
    "a safe house icon with FormaDom text, native Menu disclosure, device CTAs and authored scrolled frame",
    "the Studio projektów domów subline, custom hamburger overlay, 999px radius, fixed offsets, 20px threshold and exact CTA placement differ",
    "extend the bounded Menu brand and frame contracts before seeking pixel parity"
  ),
  residual(
    "native-form-heading-approximated",
    "projekty-domow-wow-site/kontakt.html lines 40 and 48-62",
    "the native Form block requires a visible title",
    "the installed Form uses the shared title Zacznij projekt",
    "one native form heading is visible in addition to the prototype field chrome",
    "add an explicit accessible title-visibility option to the Form Embed contract"
  ),
  residual(
    "prototype-css-art-and-motion-approximated",
    "projekty-domow-wow-site/index.html, detail/page artwork, assets/styles.css and assets/app.js",
    "Page v2 exposes sanitizer-owned SVG, gradients and bounded motion instead of arbitrary CSS or scripts",
    "safe SVG, gradients, spotlight, reveal, tilt, ticker, switcher and magnetic primitives preserve the visual intent",
    "exact clipping, keyframes, pointer timing and the source icon-only scroll pill differ; one visible Przewiń do treści link replaces it and no second scrollHint is emitted",
    "extend bounded Page art and motion controls after product review"
  ),
  residual(
    "portfolio-filter-and-card-chrome-approximated",
    "projekty-domow-wow-site/projekty.html and its project-card/filter CSS",
    "the native listing runtime owns accessible filter, summary, reset, count and empty-state chrome",
    "Wszystkie is a reset link, four source-ordered categories are radio options, Pokaż projekty applies them, and each whole card remains its semantic link without a CTA label",
    "native chrome additionally shows Filtruj wyniki, localized description, Kategoria, option counts, active-filter summary, Wyczyść wszystko and Brak wyników / Zmień filtry, aby zobaczyć inne projekty.",
    "add a bounded listing-presentation variant without weakening native filtering or accessibility"
  ),
  residual(
    "exact-breakpoints-approximated",
    "prototype CSS media queries at 1060px and 700px",
    "Coderso owns canonical desktop, tablet and mobile branches",
    "responsive Page and Menu overrides preserve readable geometry and reachable navigation",
    "layout and disclosure transitions occur at canonical breakpoints instead of exactly 1060px and 700px",
    "change the global breakpoint policy only through a separate product contract"
  ),
];

export const FORMA_DOM_SCENARIO_IDS = [
  "home-desktop-effects",
  "all-routes-desktop-shell",
  "tablet-responsive",
  "mobile-navigation",
  "portfolio-facets",
  "aurora-detail",
  "contact-form",
  "publish-lifecycle-parity",
] as const;

const staticSeoByKey = {
  home: "Nowoczesne projekty domów — FormaDom Studio",
  oferta: "Oferta — FormaDom Studio",
  projekty: "Projekty domów — FormaDom Studio",
  proces: "Proces projektowy — FormaDom Studio",
  cennik: "Cennik — FormaDom Studio",
  "o-nas": "O nas — FormaDom Studio",
  kontakt: "Kontakt — FormaDom Studio",
} as const;

const assertExactStaticSeo = (pages: readonly ResourceSeed[]) => {
  if (pages.length !== Object.keys(staticSeoByKey).length)
    throw new Error("Static Page count drifted.");
  for (const [key, title] of Object.entries(staticSeoByKey)) {
    const matches = pages.filter((page) => page.key === key);
    if (matches.length !== 1) throw new Error(`Static Page ${key} drifted.`);
    const data = matches[0].desired.data as { seo?: { title?: unknown; description?: unknown } };
    if (
      data?.seo?.title !== title ||
      data.seo.description !== FORMA_DOM_PAGE_SEO_DESCRIPTION ||
      Object.prototype.hasOwnProperty.call(matches[0].desired, "document")
    ) {
      throw new Error(`Static Page ${key} SEO drifted.`);
    }
  }
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const requireSeed = (seeds: readonly ResourceSeed[], key: string, code: string): ResourceSeed => {
  const matches = seeds.filter((seed) => seed.key === key);
  if (matches.length !== 1) throw new Error(code);
  return matches[0]!;
};

const collectPageBlocks = (value: unknown): JsonRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isRecord(candidate)) return [];
    const slots = isRecord(candidate.slots)
      ? Object.values(candidate.slots).flatMap(collectPageBlocks)
      : [];
    return [candidate, ...slots];
  });
};

const assertDynamicSeo = (
  entries: readonly ResourceSeed[],
  detailPages: readonly ResourceSeed[]
) => {
  const fixture = PROJECT_FIXTURES.find(({ key }) => key === "aurora");
  if (!fixture) throw new Error("FormaDom Aurora fixture drifted.");
  const entry = requireSeed(entries, fixture.key, "FormaDom Aurora entry drifted.");
  const detail = requireSeed(detailPages, PROJECT_DETAIL_KEY, "FormaDom detail Page drifted.");
  const entryData = isRecord(entry.desired.data) ? entry.desired.data : null;
  const detailSeo = isRecord(detail.desired.seo) ? detail.desired.seo : null;
  const titlePattern = "{{ title }} — projekt pokazowy — FormaDom Studio";
  if (
    entry.desired.title !== fixture.title ||
    entryData?.seoDescription !== fixture.seoDescription ||
    detailSeo?.titlePattern !== titlePattern ||
    detailSeo.descriptionField !== "seoDescription" ||
    titlePattern.replace("{{ title }}", fixture.title) !==
      "Dom Aurora — projekt pokazowy — FormaDom Studio"
  ) {
    throw new Error("FormaDom dynamic SEO drifted.");
  }
};

const assertContactFormOwnership = (
  pages: readonly ResourceSeed[],
  forms: readonly ResourceSeed[]
) => {
  const contact = requireSeed(pages, "kontakt", "FormaDom contact Page drifted.");
  const pageData = isRecord(contact.desired.data) ? contact.desired.data : null;
  const sections = pageData && Array.isArray(pageData.sections) ? pageData.sections : [];
  const blocks = sections.flatMap((section) =>
    isRecord(section) ? collectPageBlocks(section.blocks) : []
  );
  const formBlocks = blocks.filter((block) => block.type === "form");
  const props =
    formBlocks.length === 1 && isRecord(formBlocks[0]?.props) ? formBlocks[0].props : null;
  const form = requireSeed(forms, PROJECT_BRIEF_FORM_KEY, "FormaDom Form drifted.");
  const settings = isRecord(form.desired.settings) ? form.desired.settings : null;
  const theme = settings && isRecord(settings.theme) ? settings.theme : null;
  const submit = theme && isRecord(theme.submit) ? theme.submit : null;
  if (
    props?.title !== PROJECT_BRIEF_FORM_TITLE ||
    form.desired.name !== PROJECT_BRIEF_FORM_TITLE ||
    submit?.supportingText !== PROJECT_BRIEF_INITIAL_NOTE ||
    JSON.stringify(pages).includes(PROJECT_BRIEF_INITIAL_NOTE)
  ) {
    throw new Error("FormaDom Form ownership drifted.");
  }
};

const mergeSettings = (contentSettings: ResourceSeed[], shellSettings: ResourceSeed[]) => {
  const settings = [...contentSettings, ...shellSettings];
  const keys = settings.map(({ key }) => key);
  if (
    new Set(keys).size !== keys.length ||
    keys.filter((key) => key === "site.contentRoutes").length !== 1
  ) {
    throw new Error("FormaDom settings drifted.");
  }
  return settings;
};

export const buildFormaDomPackage = (): FullSitePackageV1 => {
  const content = buildFormaDomContentResources();
  const pages = buildFormaDomPages({
    contentType: { ref: "content_type", key: HOUSE_PROJECT_RESOURCE_KEY },
    listingQuery: { ref: "listing_query", key: PROJECT_LISTING_QUERY_KEY },
    listingTemplate: { ref: "listing_template", key: PROJECT_LISTING_TEMPLATE_KEY },
    form: { ref: "form", key: PROJECT_BRIEF_FORM_KEY },
  });
  assertExactStaticSeo(pages);
  assertDynamicSeo(content.entries, content.detailPages);
  assertContactFormOwnership(pages, content.forms);
  const pkg = normalizeFullSitePackageForWrite({
    schemaVersion: 1,
    key: "formadom-studio",
    metadata: {
      name: "FormaDom Studio",
      locale: "pl-PL",
      description: "Kompletny przykład witryny pracowni projektów domów.",
    },
    resources: {
      ...content,
      pageTemplates: [buildFooterTemplate()],
      pages,
      menus: [buildPrimaryMenu()],
      settings: mergeSettings(content.settings, buildShellSettings()),
    },
    compatibility: { unresolvedVisuals: buildFormaDomResiduals() },
    verification: { scenarioIds: [...FORMA_DOM_SCENARIO_IDS] },
  });
  buildReferencePlan(pkg);
  return pkg;
};

const canonicalArtifactPath = fileURLToPath(
  new URL("../../_docs/_DEMO/projekty-domow.site.json", import.meta.url)
);

export const serializeFormaDomPackage = async (): Promise<string> => {
  const prettierConfig = await resolveConfig(canonicalArtifactPath);
  return format(JSON.stringify(buildFormaDomPackage()), {
    ...(prettierConfig ?? {}),
    filepath: canonicalArtifactPath,
  });
};
