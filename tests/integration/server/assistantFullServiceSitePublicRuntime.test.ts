import { expect, test } from "bun:test";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import type { AssistantPlannedAction } from "../../../core/services/assistant/actionPlanTypes";
import { renderPublicPageRuntimeHtml } from "../../../core/site/renderPublicPage";
import { ensureRuntimeWidgetsRegistered } from "../../../core/widgets/runtime";

type PageUpsertAction = Extract<AssistantPlannedAction, { type: "page.upsert" }>;

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

test("full-service assistant plan renders public runtime pages with valid navigation and footer links", async () => {
  ensureRuntimeWidgetsRegistered();

  const plan = planAssistantActions({
    prompt: fullServicePrompt,
    context: {
      page: "/admin/settings/assistant",
      locale: "pl-PL",
    },
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
  for (const slug of expectedPageSlugs) {
    expect(homeHtml).toContain(`href="${slug}"`);
  }
});
