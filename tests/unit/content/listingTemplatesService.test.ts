import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { listingTemplates } from "../../../core/db/schema";
import {
  createListingTemplate,
  deleteListingTemplate,
  listListingTemplates,
  normalizeListingTemplateConfig,
  updateListingTemplate,
} from "../../../core/services/content/listingTemplatesService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

const createdTemplateIds = new Set<string>();

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function ensureListingTemplatesTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "listing_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL,
      "description" text,
      "layout" text NOT NULL DEFAULT 'grid',
      "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "listing_templates_slug_idx" ON "listing_templates" ("slug")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "listing_templates_layout_idx" ON "listing_templates" ("layout")`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "listing_templates_updated_at_idx" ON "listing_templates" ("updated_at")`
  );
}

afterAll(async () => {
  if (!hasDb || createdTemplateIds.size === 0) return;
  await db
    .delete(listingTemplates)
    .where(eq(listingTemplates.id, Array.from(createdTemplateIds)[0]));
  for (const id of Array.from(createdTemplateIds).slice(1)) {
    await db.delete(listingTemplates).where(eq(listingTemplates.id, id));
  }
});

test("normalizeListingTemplateConfig returns defaults", () => {
  const config = normalizeListingTemplateConfig(undefined);
  expect(config.fields).toEqual([]);
  expect(config.itemActions).toEqual([]);
  expect(config.emptyState.title).toBe("No items found");
  expect(config.style.columns).toBe(3);
});

test("normalizeListingTemplateConfig rejects unsafe field paths", () => {
  expect(() =>
    normalizeListingTemplateConfig({
      fields: [{ key: "title", source: "__proto__.polluted" }],
    })
  ).toThrow("listing_template_config_invalid");
});

test("normalizeListingTemplateConfig rejects custom actions without href", () => {
  expect(() =>
    normalizeListingTemplateConfig({
      itemActions: [{ id: "cta", label: "Apply", kind: "custom" }],
    })
  ).toThrow("listing_template_config_invalid");
});

testIfDb("listing template CRUD flow with slug uniqueness", async () => {
  await ensureListingTemplatesTable();
  const unique = randomUUID();

  const created = await createListingTemplate({
    name: `Homepage Cards ${unique}`,
    description: "Cards for home page",
    layout: "grid",
    config: {
      fields: [{ key: "title", source: "title", format: "text" }],
      itemActions: [{ id: "view", label: "View", kind: "custom", href: "/post/:slug" }],
      style: { columns: 4, gap: "lg", cardVariant: "compact" },
    },
  });

  createdTemplateIds.add(created.id);
  expect(created.layout).toBe("grid");
  expect(created.slug).toContain("homepage-cards");
  expect(created.config.style.columns).toBe(4);

  await expect(
    createListingTemplate({
      name: `Homepage Cards duplicate ${unique}`,
      slug: created.slug,
    })
  ).rejects.toThrow("listing_template_slug_exists");

  const updated = await updateListingTemplate(created.id, {
    name: `Homepage Cards Updated ${unique}`,
    layout: "list",
    config: {
      fields: [{ key: "name", source: "title", format: "text" }],
      emptyState: { title: "Nothing yet" },
      style: { columns: 2, gap: "sm", cardVariant: "minimal" },
    },
  });

  expect(updated?.layout).toBe("list");
  expect(updated?.config.style.columns).toBe(2);
  expect(updated?.config.emptyState.title).toBe("Nothing yet");

  const listed = await listListingTemplates();
  expect(listed.some((entry) => entry.id === created.id)).toBe(true);

  const removed = await deleteListingTemplate(created.id);
  expect(removed?.id).toBe(created.id);
  createdTemplateIds.delete(created.id);
});
