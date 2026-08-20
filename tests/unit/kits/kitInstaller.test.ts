import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentTypes,
  forms,
  menus,
  pages,
  seoDocuments,
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../../core/db/schema";
import { applyKitInstall, rollbackKitInstall } from "../../../core/services/kits/kitInstaller";
import type { SolutionKitDefinition } from "../../../core/services/kits/solutionKitTypes";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
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

const buildPageData = (seed: string) => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  sections: [
    createPageSectionV2("hero", {
      id: `sec-hero-${seed}`,
      name: "Hero",
      blocks: [
        createPageBlockV2("heading", {
          id: `hero-${seed}`,
          props: {
            text: `Welcome ${seed}`,
            level: "h1",
            align: "left",
          },
        }),
      ],
    }),
  ],
  settings: {
    template: "page-v2",
    showInNav: true,
  },
});

const buildDefinition = (seed: string): SolutionKitDefinition => ({
  id: "automotive-workshop",
  title: `Automotive Kit ${seed}`,
  shortDescription: "Test kit",
  longDescription: "Kit used by kit installer tests",
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
        data: buildPageData(seed),
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
          },
          required: ["title"],
        },
        taxonomy: {
          categories: [{ name: "Category One" }],
          tags: [{ name: "Tag One" }],
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

testIfDb(
  "applyKitInstall dry-run returns manifest without a templateInstall surface",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    registerDefinition(definition);

    const result = await applyKitInstall({
      kitId: definition.id,
      dryRun: true,
      kitDefinitionOverride: definition,
    });
    registerRunId(result.run.id);

    expect(result.run.mode).toBe("dry_run");
    expect(result.run.status).toBe("success");
    expect(result.manifest.id).toBe(definition.id);
    expect(result.manifest.includes.contentTypes).toEqual([`service-${seed}`]);
    expect(result.manifest.includes.forms).toEqual([`contact-${seed}`]);
    expect(result.manifest.includes.menus).toEqual(["primary"]);
    expect(result.manifest.includes.templates).toEqual(["page-v2"]);

    expect("templateInstall" in result).toBe(false);
  },
  dbTestTimeoutMs
);

testIfDb(
  "applyKitInstall persists manifest run options and rollbackKitInstall reuses the apply run",
  async () => {
    const seed = randomUUID();
    const definition = buildDefinition(seed);
    registerDefinition(definition);

    const result = await applyKitInstall({
      kitId: definition.id,
      dryRun: false,
      kitDefinitionOverride: definition,
    });
    registerRunId(result.run.id);

    expect(result.run.status).toBe("success");
    expect(result.manifest.requiredModules).toEqual(["booking", "forms", "widgets"]);

    const storedRun = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, result.run.id));
    expect(storedRun).toHaveLength(1);
    const storedOptions = storedRun[0]!.options as Record<string, unknown>;
    expect((storedOptions.manifest as Record<string, unknown>).id).toBe(definition.id);

    const rollback = await rollbackKitInstall({
      sourceRunId: result.run.id,
    });
    registerRunId(rollback.run.id);
    expect(rollback.run.mode).toBe("rollback");
    expect(rollback.run.status).toBe("success");
  },
  dbTestTimeoutMs
);
