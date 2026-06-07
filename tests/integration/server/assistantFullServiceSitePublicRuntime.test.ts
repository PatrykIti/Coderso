import { expect, test } from "bun:test";

import { buildFullServiceSitePlan } from "../../../core/services/assistant/blueprints/fullServiceSiteBlueprint";
import type { AssistantPlannedAction } from "../../../core/services/assistant/actionPlanTypes";
import {
  resolveDetailPageBlocks,
  type DetailPageBindingResolverEntry,
} from "../../../core/services/content/detailPageBindingResolver";
import { renderPublicPageRuntimeHtml } from "../../../core/site/renderPublicPage";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

type PageUpsertAction = Extract<AssistantPlannedAction, { type: "page.upsert" }>;
type ContentTypeUpsertAction = Extract<AssistantPlannedAction, { type: "content-type.upsert" }>;
type DetailPageUpsertAction = Extract<AssistantPlannedAction, { type: "detail-page.upsert" }>;
type EntrySampleCreateAction = Extract<AssistantPlannedAction, { type: "entry.sample.create" }>;

const fullServicePrompt = [
  "Stworz premium strone dla studia architektonicznego Studio Forma.",
  "Potrzebuje portfolio realizacji, oferte uslug z podstronami, proces wspolpracy i kontakt z formularzem leadowym.",
  "Realizacje maja miec katalog z kategoria, lokalizacja i rokiem.",
].join(" ");

const expectedPageSlugs = [
  "/",
  "/portfolio",
  "/uslugi",
  "/o-nas",
  "/proces",
  "/referencje",
  "/kontakt",
];

const getPageAction = (actions: PageUpsertAction[], slug: string) => {
  const action = actions.find((candidate) => candidate.input.slug === slug);
  if (!action) throw new Error(`missing_page_action:${slug}`);
  return action;
};

const renderPlanPage = async (action: PageUpsertAction) =>
  renderPublicPageRuntimeHtml({
    title: action.input.title,
    blocks: action.input.blocks ?? [],
    inlineCss:
      ":root{--color-bg:#fff;--color-text:#111827;--color-border:#d1d5db;--color-primary:#1d4ed8;--color-surface:#f8fafc;}",
    themeName: "default",
    templateKey: "landing",
  });

const createDetailEntry = (action: EntrySampleCreateAction): DetailPageBindingResolverEntry => ({
  id: `entry-${action.input.slug}`,
  typeId: "type-1",
  title: action.input.title,
  slug: action.input.slug,
  status: action.input.status,
  data: action.input.values,
  tags: [],
  scheduledAt: null,
  publishedAt: new Date("2026-06-05T10:00:00.000Z"),
  createdAt: new Date("2026-06-05T09:00:00.000Z"),
  updatedAt: new Date("2026-06-05T10:00:00.000Z"),
  author: null,
});

test("full-service assistant plan renders public runtime pages with valid navigation and footer links", async () => {
  ensureRuntimeWidgetsRegistered();

  const plan = buildFullServiceSitePlan({
    prompt: fullServicePrompt,
  });

  expect(plan.intentId).toBe("service-business-full-site");
  expect(plan.actions).toHaveLength(49);
  expect(plan.metadata?.launchReadiness?.kind).toBe("full-service-site");

  const pageActions = plan.actions.filter(
    (action): action is PageUpsertAction => action.type === "page.upsert"
  );
  expect(pageActions.map((action) => action.input.slug).sort()).toEqual(
    [...expectedPageSlugs].sort()
  );

  for (const action of pageActions) {
    const blockTypes = (action.input.blocks ?? []).map((block) => block.type);
    expect(blockTypes[0]).toBe("navigation");
    expect(blockTypes.at(-1)).toBe("footer");

    const html = await renderPlanPage(action);
    expect(html).not.toContain("This page has no content yet.");
    expect(html).not.toContain("Missing widget");
    expect(html).not.toContain("Invalid widget data");
    expect(html).not.toContain("/polityka-prywatnosci");
    expect(html).not.toContain("/regulamin");
  }

  const homeHtml = await renderPlanPage(getPageAction(pageActions, "/"));
  expect(homeHtml).toContain("Studio Forma");
  expect(homeHtml).toContain("<img");
  expect(homeHtml).toContain("https://images.unsplash.com/");
  for (const slug of expectedPageSlugs) {
    expect(homeHtml).toContain(`href="${slug}"`);
  }

  const detailAction = plan.actions.find(
    (action): action is DetailPageUpsertAction =>
      action.type === "detail-page.upsert" &&
      action.input.document.contentTypeSlug === "portfolio-projects"
  );
  const sampleAction = plan.actions.find(
    (action): action is EntrySampleCreateAction =>
      action.type === "entry.sample.create" && action.input.contentTypeSlug === "portfolio-projects"
  );
  const contentTypeAction = plan.actions.find(
    (action): action is ContentTypeUpsertAction =>
      action.type === "content-type.upsert" && action.input.slug === "portfolio-projects"
  );
  if (!detailAction || !sampleAction || !contentTypeAction) {
    throw new Error("missing_portfolio_detail_fixture");
  }

  const detailBlocks = await resolveDetailPageBlocks({
    document: detailAction.input.document,
    entry: createDetailEntry(sampleAction),
    contentType: {
      id: "type-1",
      slug: contentTypeAction.input.slug,
      schema: contentTypeAction.input.schema,
    },
    preview: false,
  });
  const detailHtml = await renderPublicPageRuntimeHtml({
    title: sampleAction.input.title,
    blocks: detailBlocks,
    inlineCss:
      ":root{--color-bg:#fff;--color-text:#111827;--color-border:#d1d5db;--color-primary:#1d4ed8;--color-surface:#f8fafc;}",
    themeName: "default",
    templateKey: "detail",
  });
  expect(detailHtml).toContain("<img");
  expect(detailHtml).toContain("https://images.unsplash.com/");
});
