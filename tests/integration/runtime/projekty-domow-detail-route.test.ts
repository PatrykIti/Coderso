import { expect, test } from "bun:test";

import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resolvePublishedDetailPageRuntime } from "../../../core/services/content/detailPageRuntimeResolver";
import { listEntries } from "../../../core/services/content/entryService";
import { getContentType } from "../../../core/services/content/typeService";
import type { ContentSchema } from "../../../core/services/content/validation";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsContracts";
import { getSetting } from "../../../core/services/settings/settingsService";
import { clearSiteCache } from "../../../core/site/cache/siteCache";
import {
  PROJECT_FIXTURES,
  PROJECT_SEO_DESCRIPTION,
} from "../../../scripts/projekty-domow/content/projectFixtures";
import {
  createProjektyDomowInstalledHarness,
  getInstalledResourceId,
  readInstalledShellState,
} from "../kits/projektyDomowInstalledTestSupport";

const NEGATIVE_ARRAY_FIELDS = [
  "resolvedDetailDocumentKeys",
  "renderedProjectDetailRootSelectors",
  "renderedProjectDetailBlockIds",
  "installedProjectTitleMatches",
  "installedProjectDetailCorpusMatches",
  "dynamicDetailSeoTitleMatches",
  "dynamicDetailSeoDescriptionMatches",
  "canonicalHrefs",
] as const;

type IneligibleDetailObservation = Readonly<{
  status: 404;
  resolverOutcome: "detail_not_found_before_metadata";
  resolvedDetailDocumentKeys: readonly string[];
  renderedProjectDetailRootSelectors: readonly string[];
  renderedProjectDetailBlockIds: readonly string[];
  installedProjectTitleMatches: readonly string[];
  installedProjectDetailCorpusMatches: readonly string[];
  dynamicDetailSeoTitleMatches: readonly string[];
  dynamicDetailSeoDescriptionMatches: readonly string[];
  canonicalHrefs: readonly string[];
}>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );

const assertIneligibleDetailObservation: (
  value: unknown
) => asserts value is IneligibleDetailObservation = (value) => {
  if (!isPlainRecord(value)) throw new Error("detail_observation_invalid");
  const expectedKeys = ["status", "resolverOutcome", ...NEGATIVE_ARRAY_FIELDS].sort();
  if (
    Object.keys(value).sort().join("\0") !== expectedKeys.join("\0") ||
    value.status !== 404 ||
    value.resolverOutcome !== "detail_not_found_before_metadata"
  ) {
    throw new Error("detail_observation_invalid");
  }
  for (const field of NEGATIVE_ARRAY_FIELDS) {
    const entries = value[field];
    if (!Array.isArray(entries) || entries.length !== 0) {
      throw new Error(`detail_observation_${field}_invalid`);
    }
  }
};

const extractCanonicalHrefs = (html: string): string[] =>
  [...html.matchAll(/<link\s+[^>]*rel="canonical"[^>]*>/g)]
    .map((match) => match[0]!.match(/\shref="([^"]+)"/)?.[1] ?? null)
    .filter((href): href is string => href !== null);

const PROJECT_DETAIL_BLOCK_IDS = [
  "project-back-link",
  "project-hero",
  "project-hero-art",
  "project-statistics",
  "project-contact-cta",
  "project-assumptions",
  "project-gallery",
] as const;

const PROJECT_DETAIL_ROOT_SELECTORS = [
  'data-template="project-detail"',
  'data-page-template="project-detail"',
  'data-detail-page="true"',
] as const;

const PROJECT_DETAIL_STATIC_STRINGS = [
  "← Wróć do projektów",
  "Chcę podobny dom",
  "Projekt pokazowy",
  ...PROJECT_FIXTURES.flatMap((fixture) => [
    fixture.title,
    fixture.cardDescription,
    fixture.detailEyebrow,
    fixture.detailLead,
    fixture.assumptionsEyebrow,
    fixture.assumptionsTitle,
    fixture.assumptionsLead,
    ...(fixture.detailStats?.flatMap((stat) => [stat.value, stat.label]) ?? []),
    ...(fixture.assumptions?.flatMap((assumption) => [assumption.title, assumption.description]) ??
      []),
  ]),
].filter((value): value is string => typeof value === "string" && value.length > 0);

const collectMatches = (html: string, candidates: readonly string[]): string[] => [
  ...new Set(candidates.filter((candidate) => html.includes(candidate))),
];

const readNegativeObservation = async (
  response: Response,
  resolvedDetail: Awaited<ReturnType<typeof resolvePublishedDetailPageRuntime>>
): Promise<IneligibleDetailObservation> => {
  const html = await response.text();
  const observation = {
    status: response.status,
    resolverOutcome:
      response.status === 404 && resolvedDetail === null
        ? "detail_not_found_before_metadata"
        : "detail_rendered",
    resolvedDetailDocumentKeys:
      resolvedDetail === null ? [] : Object.keys(resolvedDetail.document).sort(),
    renderedProjectDetailRootSelectors: PROJECT_DETAIL_ROOT_SELECTORS.filter((selector) =>
      html.includes(selector)
    ),
    renderedProjectDetailBlockIds: PROJECT_DETAIL_BLOCK_IDS.filter((id) =>
      html.includes(`data-block-id="${id}"`)
    ),
    installedProjectTitleMatches: collectMatches(
      html,
      PROJECT_FIXTURES.map((fixture) => fixture.title)
    ),
    installedProjectDetailCorpusMatches: collectMatches(html, PROJECT_DETAIL_STATIC_STRINGS),
    dynamicDetailSeoTitleMatches: collectMatches(
      html,
      PROJECT_FIXTURES.map((fixture) => `${fixture.title} — projekt pokazowy — FormaDom Studio`)
    ),
    dynamicDetailSeoDescriptionMatches: collectMatches(
      html,
      PROJECT_FIXTURES.map((fixture) => fixture.seoDescription)
    ),
    canonicalHrefs: extractCanonicalHrefs(html),
  };
  assertIneligibleDetailObservation(observation);
  return observation;
};

const readGridColumnTag = (html: string, slotId: string): string => {
  const escaped = slotId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<[^>]+data-grid-column="${escaped}"[^>]*>`))?.[0] ?? "";
};

test("the ineligible-detail validator rejects every nonempty proof array and resolver drift", () => {
  const baseline: IneligibleDetailObservation = {
    status: 404,
    resolverOutcome: "detail_not_found_before_metadata",
    resolvedDetailDocumentKeys: [],
    renderedProjectDetailRootSelectors: [],
    renderedProjectDetailBlockIds: [],
    installedProjectTitleMatches: [],
    installedProjectDetailCorpusMatches: [],
    dynamicDetailSeoTitleMatches: [],
    dynamicDetailSeoDescriptionMatches: [],
    canonicalHrefs: [],
  };
  assertIneligibleDetailObservation(baseline);
  for (const field of NEGATIVE_ARRAY_FIELDS) {
    const mutation: Record<keyof IneligibleDetailObservation, unknown> = {
      ...baseline,
      [field]: ["drift"],
    };
    expect(() => assertIneligibleDetailObservation(mutation)).toThrow(
      `detail_observation_${field}_invalid`
    );
  }
  expect(() =>
    assertIneligibleDetailObservation({ ...baseline, resolverOutcome: "detail_rendered" })
  ).toThrow("detail_observation_invalid");
});

test("only Aurora resolves through the installed six-slug detail route with exact SEO", async () => {
  const harness = await createProjektyDomowInstalledHarness({ canonicalDetailRoutes: true });
  const installedPublicOrigin = "http://task-547.invalid";
  try {
    const installation = await harness.apply();
    const contentTypeId = getInstalledResourceId(
      installation.resources,
      `content_type:${harness.package.resources.contentTypes[0]!.key}`
    );
    const detailPageId = getInstalledResourceId(
      installation.resources,
      `detail_page:${harness.package.resources.detailPages[0]!.key}`
    );
    const contentType = await getContentType(contentTypeId);
    if (!contentType) throw new Error("site_package_acceptance_content_type_missing");
    const entries = await listEntries(contentTypeId);
    const contentRoutes = (await getSetting("site.contentRoutes")) as ContentRouteSetting[];
    const resolveFixtureDetail = async (slug: string) => {
      const entry = entries.find((candidate) => candidate.slug === slug);
      if (!entry) throw new Error(`site_package_acceptance_entry_missing:${slug}`);
      return resolvePublishedDetailPageRuntime({
        detailPageId,
        entry,
        contentType: {
          id: contentType.id,
          slug: contentType.slug,
          schema: contentType.schema as ContentSchema,
        },
        contentRoutes,
      });
    };
    clearSiteCache();
    resetRateLimitBuckets();

    const auroraResponse = await handlePublicRequest(
      new Request(`${installedPublicOrigin}/projekty/aurora`, {
        headers: {
          "user-agent": "task-547-aurora-detail-route-test",
          "x-forwarded-for": "127.0.0.92",
        },
      })
    );
    expect(auroraResponse.status).toBe(200);
    const auroraHtml = await auroraResponse.text();
    const aurora = PROJECT_FIXTURES[0]!;
    expect(auroraHtml).toContain("<title>Dom Aurora — projekt pokazowy — FormaDom Studio</title>");
    expect(auroraHtml).toContain(`name="description" content="${PROJECT_SEO_DESCRIPTION}"`);
    expect(extractCanonicalHrefs(auroraHtml)).toEqual([
      new URL("/projekty/aurora", installedPublicOrigin).href,
    ]);
    expect(auroraHtml).toContain(aurora.detailLead!);
    expect(auroraHtml).toContain('data-grid-column="column:hero-art-main"');
    expect(auroraHtml).toContain('data-grid-column="column:hero-art-accent"');
    expect(auroraHtml).toContain("var(--color-primary)");
    expect(auroraHtml).toContain("var(--color-secondary)");
    const auroraRuntime = await resolveFixtureDetail(aurora.slug);
    expect(auroraRuntime?.blocks.map((block) => block.id)).toEqual(PROJECT_DETAIL_BLOCK_IDS);

    const heroMainTag = readGridColumnTag(auroraHtml, "column:hero-art-main");
    const heroAccentTag = readGridColumnTag(auroraHtml, "column:hero-art-accent");
    expect(heroMainTag).toContain("col-span-12");
    expect(heroMainTag).toContain("md:col-span-12");
    expect(heroMainTag).toContain("lg:col-span-8");
    expect(heroAccentTag).toContain("col-span-12");
    expect(heroAccentTag).toContain("md:col-span-12");
    expect(heroAccentTag).toContain("lg:col-span-4");

    for (const stat of aurora.detailStats ?? []) {
      expect(auroraHtml).toContain(stat.value);
      expect(auroraHtml).toContain(stat.label);
    }
    for (const assumption of aurora.assumptions ?? []) {
      expect(auroraHtml).toContain(assumption.title);
      expect(auroraHtml).toContain(assumption.description);
    }
    expect(auroraHtml).toContain('href="/kontakt"');
    expect(auroraHtml).toContain("Chcę podobny dom");

    const materialOrder = [
      auroraHtml.indexOf('data-grid-column="column:hero-art-main"'),
      auroraHtml.indexOf(aurora.detailStats![0]!.value),
      auroraHtml.indexOf("Chcę podobny dom"),
      auroraHtml.indexOf(aurora.assumptions![0]!.title),
      auroraHtml.indexOf('data-grid-column="column:gallery-tall"'),
    ];
    expect(materialOrder.every((index) => index >= 0)).toBe(true);
    expect(materialOrder).toEqual([...materialOrder].sort((left, right) => left - right));

    for (const [index, fixture] of PROJECT_FIXTURES.slice(1).entries()) {
      clearSiteCache();
      resetRateLimitBuckets();
      const response = await handlePublicRequest(
        new Request(`${installedPublicOrigin}/projekty/${fixture.slug}`, {
          headers: {
            "user-agent": `task-547-${fixture.slug}-detail-route-test`,
            "x-forwarded-for": `127.0.0.${93 + index}`,
          },
        })
      );
      expect(
        await readNegativeObservation(response, await resolveFixtureDetail(fixture.slug))
      ).toEqual({
        status: 404,
        resolverOutcome: "detail_not_found_before_metadata",
        resolvedDetailDocumentKeys: [],
        renderedProjectDetailRootSelectors: [],
        renderedProjectDetailBlockIds: [],
        installedProjectTitleMatches: [],
        installedProjectDetailCorpusMatches: [],
        dynamicDetailSeoTitleMatches: [],
        dynamicDetailSeoDescriptionMatches: [],
        canonicalHrefs: [],
      });
    }

    await harness.rollback();
    expect(await readInstalledShellState()).toEqual(harness.shellBefore);
  } finally {
    await harness.cleanup();
  }
}, 360_000);
