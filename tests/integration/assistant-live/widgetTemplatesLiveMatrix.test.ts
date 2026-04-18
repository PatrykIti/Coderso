import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import type { WidgetBlock } from "../../../core/widgets/types";
import {
  canConnectToLiveDatabase,
  createEnabledLiveProviderRuntimes,
  createLiveCleanupStack,
  createLiveRunPrefix,
  dryRunLivePlan,
  executeLivePlan,
  expectSuccessfulExecution,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const hasDb = await canConnectToLiveDatabase();
const providers = createEnabledLiveProviderRuntimes();
const testIfLive = hasDb && providers.length > 0 ? test : test.skip;
const globalCleanup = createLiveCleanupStack();

const loadDb = async () => {
  const [{ db }, { users }] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/db/schema"),
  ]);
  return { db, users };
};

const loadWidgetTemplates = () => import("../../../core/services/widgets/widgetTemplateService");
const loadWidgetTemplateCategories = () =>
  import("../../../core/services/widgets/widgetTemplateCategoryService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@nextless.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Widget Templates Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db.delete(users).where(eq(users.id, actor.id)).catch(() => undefined);
  });
  return actor;
};

const resolveCategoryName = async (prefix: string) => {
  const { createWidgetTemplateCategory, listWidgetTemplateCategories } =
    await loadWidgetTemplateCategories();
  const existing = await listWidgetTemplateCategories();
  if (existing[0]) return existing[0].name;
  const created = await createWidgetTemplateCategory({ name: `${prefix} Category` });
  return created.name;
};

const createTemplateBlock = (prefix: string): WidgetBlock => ({
  id: `${prefix}-hero`,
  type: "hero",
  variant: "centered",
  data: {
    headline: `${prefix} Headline`,
    subhead: "Live template subhead",
    body: `${prefix} body`,
    primaryCta: { label: "Get started", href: "#" },
    secondaryCta: { label: "Learn more", href: "#" },
    media: { type: "none", source: "external" },
    layout: { align: "center", maxWidth: "xl", contentWidth: "lg" },
    spacing: { paddingTop: "xl", paddingBottom: "xl" },
    background: { color: "transparent" },
    responsive: { hideMediaOnMobile: false },
  },
});

const createTemplateFixture = async (
  input: {
    name: string;
    category: string;
    actorId: string;
    cleanup: ReturnType<typeof createLiveCleanupStack>;
  }
) => {
  const { createWidgetTemplate, deleteWidgetTemplate } = await loadWidgetTemplates();
  const template = await createWidgetTemplate(
    {
      name: input.name,
      description: `${input.name} description`,
      category: input.category,
      status: "published",
      blocks: [createTemplateBlock(input.name)],
      settings: {
        wrapperContainer: "default",
        sectionGap: "md",
      },
    },
    input.actorId
  );
  input.cleanup.add(`widget-template:${template.id}`, async () => {
    await deleteWidgetTemplate(template.id).catch(() => undefined);
  });
  return template;
};

const buildWidgetTemplateContext = async (
  activeTemplateId?: string
): Promise<AssistantActionContext> => {
  const { getWidgetTemplate, listWidgetTemplates } = await loadWidgetTemplates();
  const [templates, activeTemplate] = await Promise.all([
    listWidgetTemplates(),
    activeTemplateId ? getWidgetTemplate(activeTemplateId) : Promise.resolve(null),
  ]);
  const activeBlock = activeTemplate?.blocks[0] ?? null;
  return {
    page: activeTemplate
      ? `/admin/coderso/widgets/templates/${activeTemplate.id}`
      : "/admin/coderso/widgets",
    locale: "pl-PL",
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      budget: {
        maxItemsPerGroup: 100,
        maxFieldsPerResource: 24,
        truncated: false,
      },
      pages: [],
      contentTypes: [],
      customScreens: [],
      listings: { queries: [], templates: [] },
      forms: [],
      menus: [],
      seoDocuments: [],
      widgets: templates.map((template) => ({
        id: template.id,
        source: "template" as const,
        name: template.name,
        description: template.description,
        category: template.category,
        module: "widgets",
        complexity: "composite",
        audience: "beginner",
        variants: [],
        slots: [],
        surfaces: ["page-builder"],
        requires: [],
        status: template.status as "draft" | "published",
      })),
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 1,
      route: activeTemplate
        ? `/admin/coderso/widgets/templates/${activeTemplate.id}`
        : "/admin/coderso/widgets",
      activeHref: "/admin/coderso/widgets",
      area: "coderso",
      codersoModule: "widgets",
      selectedResource: activeTemplate ? { kind: "widget-template", id: activeTemplate.id } : null,
      visibleActions: [],
      permissionHints: {
        known: false,
        requiredForVisibleActions: [],
        reason: "frontend_user_has_no_permissions",
      },
    },
    activeSurface: activeTemplate
      ? {
          kind: "widget-template",
          template: {
            id: activeTemplate.id,
            name: activeTemplate.name,
            status: activeTemplate.status,
            category: activeTemplate.category,
          },
          selectedBlockId: activeBlock?.id ?? null,
          blocks: activeTemplate.blocks.map((block, index) => ({
            id: block.id,
            type: block.type,
            label: block.type,
            path: String(index),
            childCount: block.children?.length ?? 0,
            slotKeys: Object.keys(block.slots ?? {}),
            templateId: null,
            templateName: null,
          })),
          settings: {
            wrapperContainer: activeTemplate.settings.wrapperContainer,
            sectionGap: activeTemplate.settings.sectionGap,
            hasBackgroundMedia: Boolean(activeTemplate.settings.backgroundMediaId),
          },
          warnings: [],
        }
      : null,
  };
};

const runWidgetTemplatesMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`widget-templates-${provider.id}`);
  const actor = await createActor(prefix);
  const category = await resolveCategoryName(prefix);
  const template = await createTemplateFixture({
    name: `${prefix} Template`,
    category,
    actorId: actor.id,
    cleanup,
  });

  try {
    const lookupPlan = await planWithLiveProvider({
      provider,
      context: await buildWidgetTemplateContext(),
      prompt: `Znajdz widget template o nazwie "${template.name}"`,
    });
    expect(lookupPlan.responseKind, provider.id).toBe("inspection");
    expect(lookupPlan.inspection?.resourceKind, provider.id).toBe("widget-template");
    expect(lookupPlan.inspection?.candidates.map((candidate) => candidate.label), provider.id).toContain(template.name);

    const renamed = `${prefix} Template Renamed`;
    const updatePlan = await planWithLiveProvider({
      provider,
      context: await buildWidgetTemplateContext(template.id),
      prompt: `Zmien nazwe aktywnego widget template na "${renamed}"`,
    });
    expect(updatePlan.actions.map((action) => action.type), provider.id).toContain("widget-template.update");
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-template-update`,
      })
    );
    const { getWidgetTemplate } = await loadWidgetTemplates();
    expect((await getWidgetTemplate(template.id))?.name, provider.id).toBe(renamed);

    const patchPlan = await planWithLiveProvider({
      provider,
      context: await buildWidgetTemplateContext(template.id),
      prompt: `Zmien headline wybranego bloku widget template na "${prefix} Patched Headline"`,
    });
    expect(patchPlan.actions.map((action) => action.type), provider.id).toContain("widget-template.block.patch");
    expect((await dryRunLivePlan(patchPlan)).readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: patchPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-template-block-patch`,
      })
    );
    expect(
      ((await getWidgetTemplate(template.id))?.blocks[0]?.data.headline),
      provider.id
    ).toBe(`${prefix} Patched Headline`);

    const broadDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildWidgetTemplateContext(),
      prompt: "usun wszystkie widget templates",
    });
    expect(broadDeletePlan.status, provider.id).toBe("needs_input");
    expect(broadDeletePlan.actions, provider.id).toEqual([]);

    const deletePlan = await planWithLiveProvider({
      provider,
      context: await buildWidgetTemplateContext(template.id),
      prompt: "Usun aktywny widget template",
    });
    expect(deletePlan.actions.map((action) => action.type), provider.id).toEqual([
      "widget-template.delete",
    ]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deletePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-template-delete`,
      })
    );
    expect(await getWidgetTemplate(template.id), provider.id).toBeNull();
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle widget templates matrix",
  async () => {
    for (const provider of providers) {
      await runWidgetTemplatesMatrixForProvider(provider);
    }
  },
  180_000
);
