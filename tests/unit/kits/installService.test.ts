import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentTaxonomies,
  contentTerms,
  contentTypes,
  formFields,
  forms,
  menuItems,
  menus,
  pages,
  seoDocuments,
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../../core/db/schema";
import {
  applySolutionKitInstall,
  listSolutionKitInstallItems,
  rollbackSolutionKitInstall,
} from "../../../core/services/kits/solutionKitsInstallService";
import type { SolutionKitDefinition } from "../../../core/services/kits/solutionKitTypes";
import { hasTable } from "../../utils/db";

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasTable("solution_kit_install_runs"));
const testIfDb = hasDb ? test : test.skip;
const dbHookTimeoutMs = 60_000;
const dbTestTimeoutMs = 90_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedRunIds = new Set<string>();
const trackedFormSlugs = new Set<string>();
const trackedPageSlugs = new Set<string>();
const trackedTypeSlugs = new Set<string>();
const trackedMenuNames = new Set<string>();
const trackedMenuLocations = new Set<string>();

const registerRunId = (id: string | null | undefined) => {
  if (id) trackedRunIds.add(id);
};

const registerDefinition = (definition: SolutionKitDefinition) => {
  for (const form of definition.resourceBlueprint.forms) {
    trackedFormSlugs.add(form.slug);
  }
  for (const page of definition.resourceBlueprint.pages) {
    const slug = page.slug.trim();
    trackedPageSlugs.add(slug.length === 0 ? "/" : slug);
  }
  for (const type of definition.resourceBlueprint.contentTypes) {
    trackedTypeSlugs.add(type.slug);
  }
  for (const menu of definition.resourceBlueprint.menus) {
    trackedMenuNames.add(menu.name);
    if (menu.location) trackedMenuLocations.add(menu.location);
  }
};

const cleanup = async () => {
  if (!hasDb) return;

  const runIds = [...trackedRunIds];
  if (runIds.length > 0) {
    await db.delete(solutionKitInstallItems).where(inArray(solutionKitInstallItems.runId, runIds));
    await db.delete(solutionKitInstallRuns).where(inArray(solutionKitInstallRuns.id, runIds));
  }

  const formSlugs = [...trackedFormSlugs];
  if (formSlugs.length > 0) {
    await db.delete(forms).where(inArray(forms.slug, formSlugs));
  }

  const pageSlugs = [...trackedPageSlugs];
  if (pageSlugs.length > 0) {
    const pageRows = await db
      .select({ id: pages.id })
      .from(pages)
      .where(inArray(pages.slug, pageSlugs));
    const pageIds = pageRows.map((row) => row.id);
    if (pageIds.length > 0) {
      await db
        .delete(seoDocuments)
        .where(and(eq(seoDocuments.targetType, "page"), inArray(seoDocuments.targetId, pageIds)));
    }
    await db.delete(seoDocuments).where(inArray(seoDocuments.slug, pageSlugs));
    await db.delete(pages).where(inArray(pages.slug, pageSlugs));
  }

  const typeSlugs = [...trackedTypeSlugs];
  if (typeSlugs.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.slug, typeSlugs));
  }

  const menuLocations = [...trackedMenuLocations];
  if (menuLocations.length > 0) {
    await db.delete(menus).where(inArray(menus.location, menuLocations));
  }

  const menuNames = [...trackedMenuNames];
  if (menuNames.length > 0) {
    await db.delete(menus).where(inArray(menus.name, menuNames));
  }

  trackedRunIds.clear();
  trackedFormSlugs.clear();
  trackedPageSlugs.clear();
  trackedTypeSlugs.clear();
  trackedMenuNames.clear();
  trackedMenuLocations.clear();
};

beforeEach(async () => {
  await cleanup();
}, dbHookTimeoutMs);

afterAll(async () => {
  await cleanup();
}, dbHookTimeoutMs);

const buildDefinition = (seed: string): SolutionKitDefinition => ({
  id: "automotive-workshop",
  title: `Automotive Kit ${seed}`,
  shortDescription: "Test kit",
  longDescription: "Kit used by install service tests",
  businessTypes: ["automotive_workshop"],
  defaultGoals: ["online_booking"],
  recommendedModules: ["booking", "forms", "widgets"],
  features: ["feature-a"],
  resourceBlueprint: {
    pages: [
      {
        slug: `landing-${seed}`,
        title: `Landing ${seed}`,
        status: "published",
        data: {
          blocks: [
            {
              id: `hero-${seed}`,
              type: "hero",
              data: { title: `Welcome ${seed}` },
            },
            {
              id: `form-${seed}`,
              type: "form-embed",
              data: {
                formId: `contact-${seed}`,
                title: `Contact ${seed}`,
              },
            },
          ],
          settings: {
            showInNav: true,
          },
        },
        seo: {
          title: `SEO Landing ${seed}`,
          description: `Description ${seed}`,
          robots: "index,follow",
        },
      },
    ],
    forms: [
      {
        slug: `contact-${seed}`,
        name: `Contact ${seed}`,
        status: "published",
        description: `Contact form ${seed}`,
        successMessage: "Thanks",
        submissionAccess: "public",
        settings: {
          layoutMode: "single",
          saveProgress: true,
        },
        fields: [
          {
            type: "text",
            label: "Full name",
            name: "full_name",
            required: true,
          },
          {
            type: "email",
            label: "Email",
            name: "email",
            required: true,
          },
        ],
      },
    ],
    contentTypes: [
      {
        slug: `service-${seed}`,
        name: `Service ${seed}`,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            price: { type: "number" },
          },
          required: ["title"],
        },
        taxonomy: {
          categories: [{ name: "Category One" }, { name: "Category Two" }],
          tags: [{ name: "Tag One" }, { name: "Tag Two" }],
        },
      },
    ],
    menus: [
      {
        location: "primary",
        name: `Primary ${seed}`,
        items: [
          { key: "home", label: "Home", pageSlug: `landing-${seed}` },
          { key: "contact", label: "Contact", href: `/landing-${seed}#contact` },
        ],
      },
    ],
  },
});

const getTypeTaxonomyState = async (typeId: string) => {
  const taxonomies = await db
    .select()
    .from(contentTaxonomies)
    .where(eq(contentTaxonomies.typeId, typeId));
  if (taxonomies.length === 0) {
    return { categories: [] as string[], tags: [] as string[] };
  }
  const taxonomyIds = taxonomies.map((row) => row.id);
  const termsRows = await db
    .select()
    .from(contentTerms)
    .where(inArray(contentTerms.taxonomyId, taxonomyIds));

  const namesByTaxonomyId = new Map(
    taxonomies.map((taxonomy) => [
      taxonomy.id,
      termsRows
        .filter((term) => term.taxonomyId === taxonomy.id)
        .map((term) => term.name)
        .sort(),
    ])
  );

  const findByKind = (kind: "category" | "tag") =>
    taxonomies
      .filter((taxonomy) => taxonomy.kind === kind)
      .flatMap((taxonomy) => namesByTaxonomyId.get(taxonomy.id) ?? [])
      .sort();

  return {
    categories: findByKind("category"),
    tags: findByKind("tag"),
  };
};

testIfDb(
  "applySolutionKitInstall dry-run stores run plan without creating resources",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    registerDefinition(definition);

    const result = await applySolutionKitInstall({
      kitId: definition.id,
      dryRun: true,
      kitDefinitionOverride: definition,
    });
    registerRunId(result.run.id);

    expect(result.run.mode).toBe("dry_run");
    expect(result.run.status).toBe("success");
    expect(result.summary.planned).toBe(4);

    const [storedType] = await db
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.slug, definition.resourceBlueprint.contentTypes[0]!.slug));
    const [storedForm] = await db
      .select()
      .from(forms)
      .where(eq(forms.slug, definition.resourceBlueprint.forms[0]!.slug));
    const [storedPage] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, definition.resourceBlueprint.pages[0]!.slug));

    expect(storedType).toBeUndefined();
    expect(storedForm).toBeUndefined();
    expect(storedPage).toBeUndefined();

    const runItems = await listSolutionKitInstallItems(result.run.id);
    expect(runItems).toHaveLength(4);
    expect(runItems.every((item) => item.status === "planned")).toBe(true);
  },
  dbTestTimeoutMs
);

testIfDb(
  "applySolutionKitInstall dry-run updates existing menus with planned page links",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    const menu = definition.resourceBlueprint.menus[0]! as Omit<
      (typeof definition.resourceBlueprint.menus)[number],
      "location"
    > & { location?: "primary" | "footer" };
    const existingMenuName = `Existing Menu ${seed}`;
    menu.name = existingMenuName;
    delete menu.location;
    registerDefinition(definition);

    const [existingMenu] = await db
      .insert(menus)
      .values({
        name: existingMenuName,
        location: null,
        status: "draft",
        publishedAt: null,
        createdAt: new Date(),
      })
      .returning();
    expect(existingMenu).toBeDefined();

    const result = await applySolutionKitInstall({
      kitId: definition.id,
      dryRun: true,
      kitDefinitionOverride: definition,
    });
    registerRunId(result.run.id);

    expect(result.run.status).toBe("success");
    expect(result.summary.failed).toBe(0);

    const runItems = await listSolutionKitInstallItems(result.run.id);
    const menuItem = runItems.find((item) => item.resourceType === "menu");
    expect(menuItem?.operation).toBe("update");
    expect(menuItem?.status).toBe("planned");

    const afterSnapshot = asRecord(menuItem?.afterSnapshot);
    expect(afterSnapshot.status).toBe("published");
    expect(typeof afterSnapshot.publishedAt).toBe("string");
    const plannedItems = Array.isArray(afterSnapshot.items)
      ? afterSnapshot.items.map((item) => asRecord(item))
      : [];
    expect(
      plannedItems.some(
        (item) => item.pageId === `predicted:page:${definition.resourceBlueprint.pages[0]!.slug}`
      )
    ).toBe(true);

    const [storedMenu] = await db.select().from(menus).where(eq(menus.name, existingMenuName));
    expect(storedMenu?.name).toBe(existingMenuName);
    expect(storedMenu?.status).toBe("draft");
    expect(storedMenu?.publishedAt).toBeNull();
  },
  dbTestTimeoutMs
);

testIfDb(
  "applySolutionKitInstall is idempotent and does not create duplicates",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    registerDefinition(definition);

    const first = await applySolutionKitInstall({
      kitId: definition.id,
      kitDefinitionOverride: definition,
    });
    registerRunId(first.run.id);
    expect(first.run.status).toBe("success");
    expect(first.summary.success).toBe(4);

    const second = await applySolutionKitInstall({
      kitId: definition.id,
      kitDefinitionOverride: definition,
    });
    registerRunId(second.run.id);
    expect(second.run.status).toBe("success");
    expect(second.summary.operations.noop).toBeGreaterThanOrEqual(4);

    const typeRows = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(eq(contentTypes.slug, definition.resourceBlueprint.contentTypes[0]!.slug));
    const formRows = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.slug, definition.resourceBlueprint.forms[0]!.slug));
    const pageRows = await db
      .select({ id: pages.id, currentData: pages.currentData })
      .from(pages)
      .where(eq(pages.slug, definition.resourceBlueprint.pages[0]!.slug));
    const menuRows = await db
      .select({ id: menus.id, status: menus.status, publishedAt: menus.publishedAt })
      .from(menus)
      .where(eq(menus.location, definition.resourceBlueprint.menus[0]!.location!));

    expect(typeRows).toHaveLength(1);
    expect(formRows).toHaveLength(1);
    expect(pageRows).toHaveLength(1);
    expect(menuRows).toHaveLength(1);
    expect(menuRows[0]?.status).toBe("published");
    expect(menuRows[0]?.publishedAt).toBeInstanceOf(Date);

    const [taxonomyState, storedFields, storedSeo, storedMenuItems] = await Promise.all([
      getTypeTaxonomyState(typeRows[0]!.id),
      db.select().from(formFields).where(eq(formFields.formId, formRows[0]!.id)),
      db
        .select()
        .from(seoDocuments)
        .where(
          and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, pageRows[0]!.id))
        ),
      db.select().from(menuItems).where(eq(menuItems.menuId, menuRows[0]!.id)),
    ]);

    expect(taxonomyState.categories).toEqual(["Category One", "Category Two"]);
    expect(taxonomyState.tags).toEqual(["Tag One", "Tag Two"]);
    expect(storedFields).toHaveLength(2);
    const pageData = pageRows[0]!.currentData as {
      blocks?: Array<{ id?: string; type?: string; data?: { formId?: string } }>;
    };
    const formEmbedBlock = (pageData.blocks ?? []).find((block) => block.type === "form-embed");
    expect(formEmbedBlock?.data?.formId).toBe(formRows[0]!.id);
    expect(storedSeo).toHaveLength(1);
    expect(storedSeo[0]?.title).toBe(definition.resourceBlueprint.pages[0]?.seo?.title);
    expect(storedMenuItems).toHaveLength(2);
  },
  dbTestTimeoutMs
);

testIfDb(
  "rollbackSolutionKitInstall restores updated rows and deletes created rows",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    registerDefinition(definition);

    const existingTypeSlug = definition.resourceBlueprint.contentTypes[0]!.slug;
    const existingPageSlug = definition.resourceBlueprint.pages[0]!.slug;
    const createdFormSlug = definition.resourceBlueprint.forms[0]!.slug;
    const existingMenuLocation = definition.resourceBlueprint.menus[0]!.location!;

    const [existingType] = await db
      .insert(contentTypes)
      .values({
        name: "Legacy Service Type",
        slug: existingTypeSlug,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            legacy: { type: "string" },
          },
          required: [],
        },
      })
      .returning();

    const [legacyCategory] = await db
      .insert(contentTaxonomies)
      .values({
        typeId: existingType!.id,
        name: "Legacy Categories",
        slug: "legacy-categories",
        kind: "category",
      })
      .returning();
    const [legacyTag] = await db
      .insert(contentTaxonomies)
      .values({
        typeId: existingType!.id,
        name: "Legacy Tags",
        slug: "legacy-tags",
        kind: "tag",
      })
      .returning();
    await db.insert(contentTerms).values([
      { taxonomyId: legacyCategory!.id, name: "Legacy Category", slug: "legacy-category" },
      { taxonomyId: legacyTag!.id, name: "Legacy Tag", slug: "legacy-tag" },
    ]);

    const [existingPage] = await db
      .insert(pages)
      .values({
        title: "Legacy Landing",
        slug: existingPageSlug,
        status: "draft",
        authorId: null,
        currentData: { blocks: [] },
        publishedData: null,
      })
      .returning();
    await db.insert(seoDocuments).values({
      targetType: "page",
      targetId: existingPage!.id,
      slug: existingPageSlug,
      title: "Legacy SEO",
      description: "Legacy description",
      robots: "noindex,nofollow",
      status: "warning",
      issues: [],
    });

    const [existingMenu] = await db
      .insert(menus)
      .values({
        name: "Legacy Menu",
        location: existingMenuLocation,
        status: "draft",
        publishedAt: null,
      })
      .returning();
    await db.insert(menuItems).values({
      menuId: existingMenu!.id,
      label: "Legacy Item",
      href: "/legacy",
      orderIndex: 0,
      parentId: null,
      settings: {},
    });

    const applyResult = await applySolutionKitInstall({
      kitId: definition.id,
      kitDefinitionOverride: definition,
    });
    registerRunId(applyResult.run.id);
    expect(applyResult.run.status).toBe("success");
    const [appliedType, appliedForm, appliedPage, appliedMenu] = await Promise.all([
      db
        .select()
        .from(contentTypes)
        .where(eq(contentTypes.slug, existingTypeSlug))
        .then((rows) => rows[0]),
      db
        .select()
        .from(forms)
        .where(eq(forms.slug, createdFormSlug))
        .then((rows) => rows[0]),
      db
        .select()
        .from(pages)
        .where(eq(pages.slug, existingPageSlug))
        .then((rows) => rows[0]),
      db
        .select()
        .from(menus)
        .where(eq(menus.location, existingMenuLocation))
        .then((rows) => rows[0]),
    ]);
    const [appliedTaxonomy, appliedFields, appliedSeo, appliedItems] = await Promise.all([
      getTypeTaxonomyState(appliedType!.id),
      db.select().from(formFields).where(eq(formFields.formId, appliedForm!.id)),
      db
        .select()
        .from(seoDocuments)
        .where(
          and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, appliedPage!.id))
        ),
      db.select().from(menuItems).where(eq(menuItems.menuId, appliedMenu!.id)),
    ]);
    expect(appliedTaxonomy.categories).toEqual(["Category One", "Category Two"]);
    expect(appliedFields).toHaveLength(2);
    expect(appliedSeo[0]?.title).toBe(`SEO Landing ${seed}`);
    expect(appliedMenu?.status).toBe("published");
    expect(appliedMenu?.publishedAt).toBeInstanceOf(Date);
    expect(appliedItems).toHaveLength(2);

    const rollbackResult = await rollbackSolutionKitInstall({
      sourceRunId: applyResult.run.id,
    });
    registerRunId(rollbackResult.run.id);
    expect(rollbackResult.run.status).toBe("success");
    expect(rollbackResult.summary.failed).toBe(0);

    const [restoredType] = await db
      .select()
      .from(contentTypes)
      .where(eq(contentTypes.slug, existingTypeSlug));
    const [restoredPage] = await db.select().from(pages).where(eq(pages.slug, existingPageSlug));
    const [restoredMenu] = await db
      .select()
      .from(menus)
      .where(eq(menus.location, existingMenuLocation));
    const [remainingForm] = await db.select().from(forms).where(eq(forms.slug, createdFormSlug));
    const restoredTaxonomy = await getTypeTaxonomyState(restoredType!.id);
    const restoredSeo = await db
      .select()
      .from(seoDocuments)
      .where(and(eq(seoDocuments.targetType, "page"), eq(seoDocuments.targetId, restoredPage!.id)));
    const restoredItems = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.menuId, restoredMenu!.id));

    expect(restoredType?.name).toBe("Legacy Service Type");
    const restoredTypeProperties = asRecord(asRecord(restoredType?.schema).properties);
    expect(restoredTypeProperties.legacy).toBeDefined();
    expect(restoredTaxonomy.categories).toEqual(["Legacy Category"]);
    expect(restoredTaxonomy.tags).toEqual(["Legacy Tag"]);
    expect(restoredPage?.title).toBe("Legacy Landing");
    expect(restoredPage?.status).toBe("draft");
    expect(restoredSeo).toHaveLength(1);
    expect(restoredSeo[0]?.title).toBe("Legacy SEO");
    expect(restoredMenu?.name).toBe("Legacy Menu");
    expect(restoredMenu?.status).toBe("draft");
    expect(restoredMenu?.publishedAt).toBeNull();
    expect(restoredItems).toHaveLength(1);
    expect(restoredItems[0]?.label).toBe("Legacy Item");
    expect(restoredItems[0]?.href).toBe("/legacy");
    expect(remainingForm).toBeUndefined();
  },
  dbTestTimeoutMs
);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
