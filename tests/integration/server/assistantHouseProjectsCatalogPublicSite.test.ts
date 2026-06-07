import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import { buildSiteBuilderIntakeCompileResult } from "../../../core/services/assistant/assistantSiteBuilderIntakeCompiler";
import { buildReviewedContentEngineActionPlanFromIntake } from "../../../core/services/assistant/assistantSiteBuilderIntakeContentEnginePlans";
import { normalizeAssistantSiteBuilderIntakeSession } from "../../../core/services/assistant/assistantSiteBuilderIntakeNormalizer";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";
import {
  createEntry,
  deleteEntry,
  getEntryBySlug,
  publishEntry,
} from "../../../core/services/content/entryService";
import {
  deleteContentType,
  getContentTypeBySlug,
} from "../../../core/services/content/typeService";
import { deleteDetailPageDocument } from "../../../core/services/content/detailPageDocumentService";
import {
  deleteCustomScreen,
  listCustomScreens,
} from "../../../core/services/customScreens/customScreenService";
import {
  deleteListingQuery,
  listListingQueries,
} from "../../../core/services/content/listingQueriesService";
import {
  deleteListingTemplate,
  listListingTemplates,
} from "../../../core/services/content/listingTemplatesService";
import { deletePage, getPageBySlug } from "../../../core/services/pages/pageService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";
import { startHttpServer } from "../../../core/server/httpServer";
import { withConfirmedSiteBuilderIntakeReview } from "../../utils/assistantSiteBuilderIntake";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

let server: ReturnType<typeof Bun.serve> | null = null;
const createdUserIds = new Set<string>();
const createdEntryIds = new Set<string>();
const plansToCleanup: Array<{
  contentTypeSlug: string;
  listingQueryName: string;
  listingTemplateSlug: string;
  pageSlug: string;
  detailPageId: string;
}> = [];
let originalContentRoutes: ContentRouteSetting[] | null = null;

const stopServer = () => {
  if (!server) return;
  server.stop(true);
  server = null;
};

const clonePlanWithToken = (sourcePlan: AssistantActionPlan, token: string) => {
  const plan = JSON.parse(JSON.stringify(sourcePlan)) as AssistantActionPlan;

  const contentTypeSlug = `intake-services-${token}`;
  const listingQueryName = `Intake Services Query ${token}`;
  const listingTemplateSlug = `intake-services-grid-${token}`;
  const pageSlug = `/intake-services-${token}`;
  const listPath = `/_catalog/intake-services-${token}`;
  const detailPath = `${pageSlug}/:slug`;
  const detailPageId = `00000000-0000-5000-8000-${token.padEnd(12, "0")}`;

  plan.id = `plan-house-projects-catalog-${token}`;
  plan.actions = plan.actions.map((action) => {
    switch (action.type) {
      case "setting.content-route.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            typeSlug: contentTypeSlug,
            listPath,
            detailPath,
            detailPageId,
          },
        };
      case "content-type.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            slug: contentTypeSlug,
            name: `Intake Services ${token}`,
          },
        };
      case "detail-page.upsert": {
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            document: {
              ...action.input.document,
              id: detailPageId,
              name: `Intake Services Detail Template ${token}`,
              contentTypeSlug,
            },
            contentTypeId: {
              kind: "stable-slug",
              resourceType: "content-type",
              slug: contentTypeSlug,
            },
            expectedExistingId: detailPageId,
          },
        };
      }
      case "custom-screen.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: `Intake Services ${token}`,
            sidebarLabel: `Intake Services ${token}`,
            contentTypeSlug,
          },
        };
      case "listing-query.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: listingQueryName,
            contentTypeSlug,
          },
        };
      case "listing-template.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: `Intake Services Grid ${token}`,
            slug: listingTemplateSlug,
          },
        };
      case "page.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            title: `Intake Services ${token}`,
            slug: pageSlug,
            listingQueryName,
            listingTemplateSlug,
            introTitle: `Intake Services ${token}`,
            collectionLink: {
              contentTypeSlug,
              pageRole: "canonical-list-page",
              listingQueryName,
              listingTemplateSlug,
            },
          },
        };
      default:
        return action;
    }
  });

  plansToCleanup.push({
    contentTypeSlug,
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
    detailPageId,
  });

  return {
    plan,
    contentTypeSlug,
    pageSlug,
    listPath,
    detailPath,
    listingQueryName,
    listingTemplateSlug,
  };
};

const buildServicesIntakeSession = (token: string): AssistantSiteBuilderIntakeSession =>
  withConfirmedSiteBuilderIntakeReview({
    version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
    mode: "advanced",
    currentStepId: "review",
    answers: [
      {
        stepId: "business-profile",
        values: {
          siteName: `Services Intake ${token}`,
          topic: "local service providers with a searchable directory",
          vertical: "services directory",
          audience: "people comparing verified local providers",
          locale: "pl",
          region: "Warsaw",
          summary: "Create a service directory site that a non-technical editor can maintain.",
        },
      },
      {
        stepId: "site-goals",
        values: {
          goals: ["show services", "collect leads", "publish provider listings"],
          primaryGoal: "collect leads",
        },
      },
      {
        stepId: "site-map",
        values: {
          pageRoles: ["home", "services", "locations", "contact"],
        },
      },
      {
        stepId: "menu",
        values: {
          menuPreset: "conversion-focused",
          primaryActionLabel: "Zapytaj o projekt",
          primaryActionPageRole: "contact",
        },
      },
      {
        stepId: "homepage-sections",
        values: {
          sectionRoles: [
            "value-proposition",
            "services-overview",
            "featured-items",
            "lead-capture",
          ],
        },
      },
      {
        stepId: "hero",
        values: {
          heroPreset: "offer-with-proof",
          headline: "Find the right local provider",
        },
      },
      {
        stepId: "media-policy",
        values: {
          mediaPolicy: "placeholder",
        },
      },
      {
        stepId: "content-engine",
        values: {
          contentEngines: ["services"],
        },
      },
    ],
  });

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `assistant-public-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Public Runtime Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  stopServer();

  if (!hasDb) return;

  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
  }

  for (const entryId of createdEntryIds) {
    await deleteEntry(entryId).catch(() => undefined);
  }
  createdEntryIds.clear();

  for (const plan of plansToCleanup.reverse()) {
    const page =
      (await getPageBySlug(plan.pageSlug)) ??
      (await getPageBySlug(plan.pageSlug.replace(/^\/+/, "")));
    if (page) {
      await deletePage(page.id).catch(() => undefined);
    }

    const templates = await listListingTemplates();
    const template = templates.find((entry) => entry.slug === plan.listingTemplateSlug);
    if (template) {
      await deleteListingTemplate(template.id).catch(() => undefined);
    }

    const queries = await listListingQueries();
    const query = queries.find((entry) => entry.name === plan.listingQueryName);
    if (query) {
      await deleteListingQuery(query.id).catch(() => undefined);
    }

    await deleteDetailPageDocument(plan.detailPageId).catch(() => undefined);

    const contentType = await getContentTypeBySlug(plan.contentTypeSlug);
    if (contentType) {
      const screens = await listCustomScreens();
      for (const screen of screens.filter((entry) => entry.contentTypeId === contentType.id)) {
        await deleteCustomScreen(screen.id).catch(() => undefined);
      }
      await deleteContentType(contentType.id).catch(() => undefined);
    }
  }

  for (const userId of createdUserIds) {
    await db
      .delete(users)
      .where(eq(users.id, userId))
      .catch(() => undefined);
  }
  createdUserIds.clear();
});

testIfDbWithOptions(
  "executed reviewed-intake services content engine plan renders public catalog and detail routes",
  async () => {
    originalContentRoutes =
      originalContentRoutes ??
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
      [];

    const token = randomUUID().slice(0, 8);
    const actor = await createActor();
    const intakeSession = buildServicesIntakeSession(token);
    const normalizedIntake = normalizeAssistantSiteBuilderIntakeSession(intakeSession);
    const compileResult = buildSiteBuilderIntakeCompileResult(normalizedIntake.facts ?? {});
    const contentEnginePlan = buildReviewedContentEngineActionPlanFromIntake(intakeSession);
    const { plan, contentTypeSlug, pageSlug, detailPath, listingQueryName, listingTemplateSlug } =
      clonePlanWithToken(contentEnginePlan.plan, token);

    expect(compileResult.gates).toEqual([]);
    expect(
      compileResult.reviewFacts.contentEngineDecisions.decisions.map((item) => item.id)
    ).toEqual(expect.arrayContaining(["services"]));
    expect(
      compileResult.reviewFacts.customScreenDecisions.candidates.map(
        (candidate) => candidate.engineId
      )
    ).toEqual(expect.arrayContaining(["services"]));
    expect(contentEnginePlan.engineId).toBe("services");
    expect(contentEnginePlan.plan.intentId).toBe("services-directory");
    expect(plan.actions.map((action) => action.type)).toEqual([
      "content-type.upsert",
      "detail-page.upsert",
      "setting.content-route.upsert",
      "custom-screen.upsert",
      "listing-query.upsert",
      "listing-template.upsert",
      "page.upsert",
    ]);
    const dryRun = await dryRunAssistantActionPlan({ plan });
    expect(dryRun.readyToExecute).toBe(true);
    expect(dryRun.changes.map((change) => change.targetType)).toEqual([
      "content-type",
      "detail-page",
      "content-route",
      "custom-screen",
      "listing-query",
      "listing-template",
      "page",
    ]);

    const execution = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-public-${token}-1`,
    });
    if (execution.summary.failed > 0) {
      throw new Error(
        `assistant_public_runtime_execute_failed:${JSON.stringify(
          execution.results.filter((result) => result.status === "failed")
        )}`
      );
    }
    expect(execution.summary.failed).toBe(0);
    expect(execution.results.length).toBe(plan.actions.length);
    expect(execution.summary.create).toBeGreaterThan(0);

    const contentType = await getContentTypeBySlug(contentTypeSlug);
    if (!contentType) throw new Error("missing_content_type");
    const publicPage =
      (await getPageBySlug(pageSlug)) ?? (await getPageBySlug(pageSlug.replace(/^\/+/, "")));
    if (!publicPage) throw new Error("missing_public_catalog_page");
    const publicPagePath = publicPage.slug.startsWith("/")
      ? publicPage.slug
      : `/${publicPage.slug}`;

    const entry = await createEntry(contentType.id, {
      title: `Usługa ${token}`,
      slug: `usluga-${token}`,
      data: {
        title: `Usługa ${token}`,
        slug: `usluga-${token}`,
        summary: `Usługa lokalnego dostawcy ${token}`,
        description: `Szczegoly uslugi lokalnego dostawcy ${token}`,
        serviceType: "Consulting",
        responseTimeHours: 24,
        priceFrom: 500,
        location: "Warsaw",
        projectStatus: "available",
      },
      authorId: actor.id,
    });
    createdEntryIds.add(entry.id);
    await publishEntry(entry.id, actor.id);

    server = startHttpServer({ port: 0 });
    const baseUrl = `http://127.0.0.1:${server.port}`;

    const catalogResponse = await fetch(`${baseUrl}${publicPagePath}`);
    expect(catalogResponse.status).toBe(200);
    const catalogHtml = await catalogResponse.text();
    expect(catalogHtml).toContain('data-listing-widget="content-list"');
    expect(catalogHtml).toContain(`Usługa ${token}`);
    expect(catalogHtml).not.toContain('data-template="content-list"');

    const detailUrl = detailPath.replace(":slug", `usluga-${token}`);
    const detailResponse = await fetch(`${baseUrl}${detailUrl}`);
    expect(detailResponse.status).toBe(200);
    const detailHtml = await detailResponse.text();
    expect(detailHtml).toContain(`Usługa ${token}`);
    expect(detailHtml).toContain(`Usługa lokalnego dostawcy ${token}`);

    const bySlug = await getEntryBySlug(contentType.id, `usluga-${token}`);
    expect(bySlug?.id).toBe(entry.id);
  },
  { timeout: 30_000 }
);
