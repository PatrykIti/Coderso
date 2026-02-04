import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
} from "../../../core/db/schema";
import { createEntry } from "../../../core/services/content/entryService";
import {
  createTerm,
  getEntryTaxonomies,
  listTaxonomies,
  listTerms,
  replaceEntryTaxonomies,
  resolveEntryTagsFromTaxonomy,
  setTaxonomyConfig,
  updateTerm,
  deleteTerm,
} from "../../../core/services/content/taxonomyService";
import { createContentType } from "../../../core/services/content/typeService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
};

let contentTypeId: string | undefined;
let entryId: string | undefined;

const cleanup = async () => {
  if (entryId) {
    await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
  }
  if (contentTypeId) {
    await db.delete(contentTypes).where(eq(contentTypes.id, contentTypeId));
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("taxonomy config creates defaults", async () => {
  const type = await createContentType({
    name: "Blog",
    slug: `blog-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const items = await setTaxonomyConfig(type.id, { categories: true, tags: true });
  expect(items.length).toBe(2);

  const list = await listTaxonomies(type.id);
  expect(list.some((item) => item.kind === "category")).toBe(true);
  expect(list.some((item) => item.kind === "tag")).toBe(true);

  await cleanup();
  contentTypeId = undefined;
});

testIfDb("terms and assignments resolve tags", async () => {
  const type = await createContentType({
    name: "News",
    slug: `news-${randomUUID()}`,
    schema,
  });
  contentTypeId = type.id;

  const items = await setTaxonomyConfig(type.id, { categories: true, tags: true });
  const categoryTax = items.find((item) => item.kind === "category");
  const tagTax = items.find((item) => item.kind === "tag");
  expect(categoryTax).toBeTruthy();
  expect(tagTax).toBeTruthy();

  const category = await createTerm(categoryTax!.id, { name: "Updates" });
  const tag = await createTerm(tagTax!.id, { name: "Launch" });

  const entry = await createEntry(type.id, {
    title: "Entry",
    slug: `entry-${randomUUID()}`,
    data: { title: "Hello" },
  });
  entryId = entry?.id;

  await replaceEntryTaxonomies(entry.id, type.id, {
    categoryId: category?.id ?? null,
    tagIds: tag ? [tag.id] : [],
  });

  const assignments = await getEntryTaxonomies(entry.id);
  expect(assignments.category?.name).toBe("Updates");
  expect(assignments.tags.map((item) => item.name)).toEqual(["Launch"]);

  const tags = await resolveEntryTagsFromTaxonomy(entry.id, type.id);
  expect(tags).toEqual(["Launch"]);

  const terms = await listTerms(tagTax!.id);
  expect(terms.length).toBe(1);

  await updateTerm(tag!.id, { name: "Launchpad" });
  await deleteTerm(category!.id);

  await cleanup();
  contentTypeId = undefined;
  entryId = undefined;
});
