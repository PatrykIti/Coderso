import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentTypes,
  forms,
  pages,
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
    await db.delete(pages).where(inArray(pages.slug, pageSlugs));
  }

  const typeSlugs = [...trackedTypeSlugs];
  if (typeSlugs.length > 0) {
    await db.delete(contentTypes).where(inArray(contentTypes.slug, typeSlugs));
  }

  trackedRunIds.clear();
  trackedFormSlugs.clear();
  trackedPageSlugs.clear();
  trackedTypeSlugs.clear();
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

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
    pages: [{ slug: `landing-${seed}`, title: `Landing ${seed}`, status: "published" }],
    forms: [{ slug: `contact-${seed}`, name: `Contact ${seed}`, status: "draft" }],
    contentTypes: [{ slug: `service-${seed}`, name: `Service ${seed}` }],
    menus: [],
  },
});

testIfDb("applySolutionKitInstall dry-run stores run plan without creating resources", async () => {
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
  expect(result.summary.planned).toBe(3);

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
  expect(runItems).toHaveLength(3);
  expect(runItems.every((item) => item.status === "planned")).toBe(true);
});

testIfDb("applySolutionKitInstall is idempotent and does not create duplicates", async () => {
  const seed = randomUUID();
  const definition = buildDefinition(seed);
  registerDefinition(definition);

  const first = await applySolutionKitInstall({
    kitId: definition.id,
    kitDefinitionOverride: definition,
  });
  registerRunId(first.run.id);
  expect(first.run.status).toBe("success");
  expect(first.summary.success).toBe(3);

  const second = await applySolutionKitInstall({
    kitId: definition.id,
    kitDefinitionOverride: definition,
  });
  registerRunId(second.run.id);
  expect(second.run.status).toBe("success");
  expect(second.summary.operations.noop).toBeGreaterThanOrEqual(3);

  const typeRows = await db
    .select({ id: contentTypes.id })
    .from(contentTypes)
    .where(eq(contentTypes.slug, definition.resourceBlueprint.contentTypes[0]!.slug));
  const formRows = await db
    .select({ id: forms.id })
    .from(forms)
    .where(eq(forms.slug, definition.resourceBlueprint.forms[0]!.slug));
  const pageRows = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, definition.resourceBlueprint.pages[0]!.slug));

  expect(typeRows).toHaveLength(1);
  expect(formRows).toHaveLength(1);
  expect(pageRows).toHaveLength(1);
});

testIfDb("rollbackSolutionKitInstall restores updated rows and deletes created rows", async () => {
  const seed = randomUUID();
  const definition = buildDefinition(seed);
  registerDefinition(definition);

  const existingTypeSlug = definition.resourceBlueprint.contentTypes[0]!.slug;
  const existingPageSlug = definition.resourceBlueprint.pages[0]!.slug;
  const createdFormSlug = definition.resourceBlueprint.forms[0]!.slug;

  await db.insert(contentTypes).values({
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
  });

  await db.insert(pages).values({
    title: "Legacy Landing",
    slug: existingPageSlug,
    status: "draft",
    authorId: null,
    currentData: { blocks: [] },
    publishedData: null,
  });

  const applyResult = await applySolutionKitInstall({
    kitId: definition.id,
    kitDefinitionOverride: definition,
  });
  registerRunId(applyResult.run.id);
  expect(applyResult.run.status).toBe("success");

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
  const [restoredPage] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, existingPageSlug));
  const [remainingForm] = await db
    .select()
    .from(forms)
    .where(eq(forms.slug, createdFormSlug));

  expect(restoredType?.name).toBe("Legacy Service Type");
  expect(asRecord(restoredType?.schema).legacy).toBeDefined();
  expect(restoredPage?.title).toBe("Legacy Landing");
  expect(restoredPage?.status).toBe("draft");
  expect(remainingForm).toBeUndefined();
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

