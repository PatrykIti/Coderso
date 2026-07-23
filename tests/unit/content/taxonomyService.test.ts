import * as bunTest from "bun:test";
import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentEntries, contentTypes } from "../../../core/db/schema";
import { createEntry } from "../../../core/services/content/entryService";
import {
  applyEntryTaxonomyMutation,
  createTerm,
  deleteTerm,
  getEntryTaxonomies,
  getTaxonomyOverview,
  listTaxonomies,
  listTerms,
  prepareEntryTaxonomyMutation,
  replaceEntryTaxonomies,
  resolveEntryTagsFromTaxonomy,
  setTaxonomyConfig,
  updateTerm,
  type ContentTerm,
  type EntryTaxonomyAssignments,
  type EntryTaxonomyPlan,
  type TaxonomyExecutor,
} from "../../../core/services/content/taxonomyService";
import { createContentType } from "../../../core/services/content/typeService";

type DbTransactionSpy = {
  mock: { calls: unknown[][] };
  mockRestore: () => void;
};

const spyOnDbTransaction = () =>
  (
    bunTest as unknown as {
      spyOn: (target: typeof db, method: "transaction") => DbTransactionSpy;
    }
  ).spyOn(db, "transaction");

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

type Fixture = {
  token: string;
  type: Awaited<ReturnType<typeof createContentType>>;
  entry: Awaited<ReturnType<typeof createEntry>>;
};

async function withFixture(label: string, run: (fixture: Fixture) => Promise<void>) {
  const token = randomUUID();
  let typeId: string | null = null;
  let entryId: string | null = null;

  try {
    const type = await createContentType({
      name: `${label} ${token}`,
      slug: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${token}`,
      schema,
    });
    typeId = type.id;
    const entry = await createEntry(type.id, {
      title: `${label} entry`,
      slug: `entry-${token}`,
      data: { title: "Hello" },
    });
    entryId = entry.id;
    await run({ token, type, entry });
  } finally {
    try {
      if (entryId) {
        await db.delete(contentEntries).where(eq(contentEntries.id, entryId));
      }
    } finally {
      if (typeId) {
        await db.delete(contentTypes).where(eq(contentTypes.id, typeId));
      }
    }
  }
}

const requireValue = <T>(value: T | null | undefined, label: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`test_fixture_missing:${label}`);
  }
  return value;
};

async function configureBoth(typeId: string) {
  const taxonomies = await setTaxonomyConfig(typeId, {
    categories: true,
    tags: true,
  });
  return {
    categoryTaxonomy: requireValue(
      taxonomies.find((taxonomy) => taxonomy.kind === "category"),
      "category_taxonomy"
    ),
    tagTaxonomy: requireValue(
      taxonomies.find((taxonomy) => taxonomy.kind === "tag"),
      "tag_taxonomy"
    ),
  };
}

function createRecordingExecutor(executor: TaxonomyExecutor) {
  const calls: Array<keyof TaxonomyExecutor> = [];
  const target = {
    select: executor.select.bind(executor) as TaxonomyExecutor["select"],
    insert: executor.insert.bind(executor) as TaxonomyExecutor["insert"],
    delete: executor.delete.bind(executor) as TaxonomyExecutor["delete"],
  } satisfies TaxonomyExecutor;
  const recording = new Proxy(target, {
    get(current, property, receiver) {
      if (property === "transaction") {
        throw new Error("nested_transaction_accessed");
      }
      if (property === "select" || property === "insert" || property === "delete") {
        calls.push(property);
      }
      return Reflect.get(current, property, receiver);
    },
  });
  return { executor: recording, calls };
}

testIfDb("taxonomy config and public list adapters preserve UUID/slug behavior", async () => {
  await withFixture("Taxonomy config", async ({ token, type }) => {
    const items = await setTaxonomyConfig(type.slug, {
      categories: true,
      tags: true,
    });
    expect(items).toHaveLength(2);

    const byId = await listTaxonomies(type.id);
    const bySlug = await listTaxonomies(type.slug);
    expect(byId.map((item) => item.kind)).toEqual(["category", "tag"]);
    expect(bySlug.map((item) => item.typeId)).toEqual([type.id, type.id]);
    expect(await listTaxonomies(`unknown-${token}`)).toEqual([]);
    expect(await listTaxonomies(randomUUID())).toEqual([]);

    const overview = await getTaxonomyOverview(type.slug);
    expect(overview.taxonomies.category?.typeId).toBe(type.id);
    expect(overview.taxonomies.tag?.typeId).toBe(type.id);
  });
});

testIfDb("standalone replacement opens one transaction and keeps its public shape", async () => {
  await withFixture("Standalone taxonomy", async ({ type, entry }) => {
    const { categoryTaxonomy, tagTaxonomy } = await configureBoth(type.id);
    const category = requireValue(
      await createTerm(categoryTaxonomy.id, { name: "Updates" }),
      "category"
    );
    const tag = requireValue(await createTerm(tagTaxonomy.id, { name: "Launch" }), "tag");

    const transactionSpy = spyOnDbTransaction();
    try {
      const byId: EntryTaxonomyAssignments = await replaceEntryTaxonomies(entry.id, type.id, {
        categoryId: category.id,
        tagIds: [tag.id],
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(Object.keys(byId).sort()).toEqual(["category", "tags"]);
      expect(byId.category?.name).toBe("Updates");
      expect(byId.tags.map((item) => item.name)).toEqual(["Launch"]);

      const bySlug = await replaceEntryTaxonomies(entry.id, type.slug, {
        categoryId: category.id,
        tagIds: [tag.id],
      });
      expect(transactionSpy).toHaveBeenCalledTimes(2);
      expect(bySlug.category?.id).toBe(category.id);
      expect(bySlug.tags.map((item) => item.id)).toEqual([tag.id]);
    } finally {
      transactionSpy.mockRestore();
    }

    const assignments = await getEntryTaxonomies(entry.id);
    const publicTerm: ContentTerm = requireValue(assignments.tags[0], "public_tag");
    expect(publicTerm.createdAt.getTime()).toBe(0);
    expect(publicTerm.updatedAt.getTime()).toBe(0);
    expect(await resolveEntryTagsFromTaxonomy(entry.id, type.id)).toEqual(["Launch"]);
    expect(await listTerms(tagTaxonomy.id)).toHaveLength(1);

    await updateTerm(tag.id, { name: "Launchpad" });
    await deleteTerm(category.id);
  });
});

testIfDb("standalone unknown slugs keep the no-key no-op compatibility", async () => {
  await withFixture("Unknown taxonomy slug", async ({ token, entry }) => {
    const unknownSlug = `unknown-taxonomy-${token}`;
    const transactionSpy = spyOnDbTransaction();
    try {
      await expect(replaceEntryTaxonomies(entry.id, unknownSlug, {})).resolves.toEqual({
        category: null,
        tags: [],
      });
      expect(transactionSpy).toHaveBeenCalledTimes(1);

      await expect(
        replaceEntryTaxonomies(entry.id, unknownSlug, { categoryId: null })
      ).rejects.toThrow("taxonomy_category_disabled");
      expect(transactionSpy).toHaveBeenCalledTimes(2);

      await expect(replaceEntryTaxonomies(entry.id, unknownSlug, { tagIds: [] })).rejects.toThrow(
        "taxonomy_tag_disabled"
      );
      expect(transactionSpy).toHaveBeenCalledTimes(3);
    } finally {
      transactionSpy.mockRestore();
    }
  });
});

testIfDb("prepared plans are deep-frozen, deterministic, and executor-owned", async () => {
  await withFixture("Frozen taxonomy", async ({ type, entry }) => {
    const { categoryTaxonomy, tagTaxonomy } = await configureBoth(type.id);
    const category = requireValue(
      await createTerm(categoryTaxonomy.id, { name: "Primary" }),
      "category"
    );
    const firstTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Equal", slug: `equal-a-${randomUUID()}` }),
      "first_tag"
    );
    const secondTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Equal", slug: `equal-b-${randomUUID()}` }),
      "second_tag"
    );
    const expectedTagIds = [firstTag.id, secondTag.id].sort();

    await db.transaction(async (tx) => {
      const recording = createRecordingExecutor(tx);
      const plan: EntryTaxonomyPlan = await prepareEntryTaxonomyMutation(
        recording.executor,
        entry.id,
        type.slug,
        {
          categoryId: category.id,
          tagIds: [secondTag.id, firstTag.id, secondTag.id],
        }
      );

      expect(plan.typeId).toBe(type.id);
      expect(plan.tags.map((term) => term.id)).toEqual(expectedTagIds);
      expect(plan.assignmentTermIds).toEqual([category.id, ...expectedTagIds]);
      expect(plan.resolvedTagNames).toEqual(["Equal", "Equal"]);
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.taxonomyIdsToClear)).toBe(true);
      expect(Object.isFrozen(plan.assignmentTermIds)).toBe(true);
      expect(Object.isFrozen(plan.resolvedTagNames)).toBe(true);
      expect(Object.isFrozen(plan.category)).toBe(true);
      expect(Object.isFrozen(plan.tags)).toBe(true);
      expect(plan.tags.every(Object.isFrozen)).toBe(true);
      expect(() => {
        Object.assign(plan.tags[0]!, { name: "Mutated" });
      }).toThrow();
      expect(() => {
        Reflect.get(recording.executor, "transaction");
      }).toThrow("nested_transaction_accessed");

      const first = await applyEntryTaxonomyMutation(recording.executor, plan);
      const second = await applyEntryTaxonomyMutation(recording.executor, plan);
      expect(first.tags.map((term) => term.name)).toEqual(["Equal", "Equal"]);
      expect(plan.tags.map((term) => term.name)).toEqual(["Equal", "Equal"]);
      const firstCategory = requireValue(first.category, "first_applied_category");
      const secondCategory = requireValue(second.category, "second_applied_category");
      expect(firstCategory.createdAt).not.toBe(secondCategory.createdAt);
      expect(firstCategory.updatedAt).not.toBe(secondCategory.updatedAt);
      expect(firstCategory.createdAt.getTime()).toBe(0);
      expect(secondCategory.updatedAt.getTime()).toBe(0);
      expect(first.tags[0]!.createdAt).not.toBe(second.tags[0]!.createdAt);
      expect(first.tags[0]!.updatedAt).not.toBe(second.tags[0]!.updatedAt);
      expect(first.tags[0]!.createdAt.getTime()).toBe(0);
      expect(second.tags[0]!.updatedAt.getTime()).toBe(0);
      expect(recording.calls).toEqual([
        "select",
        "select",
        "select",
        "select",
        "delete",
        "insert",
        "select",
        "delete",
        "insert",
      ]);
    });
  });
});

testIfDb("disabled taxonomy errors precede malformed term errors", async () => {
  await withFixture("Disabled taxonomy", async ({ type, entry }) => {
    await setTaxonomyConfig(type.id, { categories: false, tags: true });
    await db.transaction(async (tx) => {
      const recording = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(recording.executor, entry.id, type.id, {
          categoryId: "not-a-uuid",
        })
      ).rejects.toThrow("taxonomy_category_disabled");
      expect(recording.calls).not.toContain("insert");
      expect(recording.calls).not.toContain("delete");
    });

    await setTaxonomyConfig(type.id, { categories: true, tags: false });
    await db.transaction(async (tx) => {
      const recording = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(recording.executor, entry.id, type.id, {
          tagIds: ["not-a-uuid"],
        })
      ).rejects.toThrow("taxonomy_tag_disabled");
      expect(recording.calls).not.toContain("insert");
      expect(recording.calls).not.toContain("delete");
    });
  });
});

testIfDb("malformed, missing, and wrong-taxonomy terms fail before writes", async () => {
  await withFixture("Invalid taxonomy", async ({ type, entry }) => {
    const { categoryTaxonomy, tagTaxonomy } = await configureBoth(type.id);
    const category = requireValue(
      await createTerm(categoryTaxonomy.id, { name: "Category" }),
      "category"
    );
    const tag = requireValue(await createTerm(tagTaxonomy.id, { name: "Tag" }), "tag");

    await db.transaction(async (tx) => {
      const malformed = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(malformed.executor, entry.id, type.id, {
          categoryId: "not-a-uuid",
          tagIds: [tag.id],
        })
      ).rejects.toThrow("taxonomy_term_missing");
      expect(malformed.calls.filter((call) => call === "select")).toHaveLength(2);
      expect(malformed.calls).not.toContain("insert");
      expect(malformed.calls).not.toContain("delete");

      const missing = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(missing.executor, entry.id, type.id, {
          categoryId: randomUUID(),
        })
      ).rejects.toThrow("taxonomy_term_missing");
      expect(missing.calls).not.toContain("insert");
      expect(missing.calls).not.toContain("delete");

      const wrongCategory = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(wrongCategory.executor, entry.id, type.id, {
          categoryId: tag.id,
        })
      ).rejects.toThrow("taxonomy_term_invalid");
      expect(wrongCategory.calls).not.toContain("insert");
      expect(wrongCategory.calls).not.toContain("delete");

      const wrongTag = createRecordingExecutor(tx);
      await expect(
        prepareEntryTaxonomyMutation(wrongTag.executor, entry.id, type.id, {
          tagIds: [category.id],
        })
      ).rejects.toThrow("taxonomy_term_invalid");
      expect(wrongTag.calls).not.toContain("insert");
      expect(wrongTag.calls).not.toContain("delete");
    });

    expect(await getEntryTaxonomies(entry.id)).toEqual({ category: null, tags: [] });
  });
});

testIfDb("a present taxonomy mutation fully replaces both enabled kinds", async () => {
  await withFixture("Full taxonomy replace", async ({ type, entry }) => {
    const { categoryTaxonomy, tagTaxonomy } = await configureBoth(type.id);
    const category = requireValue(
      await createTerm(categoryTaxonomy.id, { name: "Original category" }),
      "category"
    );
    const originalTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Original tag" }),
      "original_tag"
    );
    const replacementTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Replacement tag" }),
      "replacement_tag"
    );

    await replaceEntryTaxonomies(entry.id, type.id, {
      categoryId: category.id,
      tagIds: [originalTag.id],
    });

    await db.transaction(async (tx) => {
      const plan = await prepareEntryTaxonomyMutation(tx, entry.id, type.id, {
        tagIds: [replacementTag.id],
      });
      expect(plan.category).toBeNull();
      expect(plan.taxonomyIdsToClear).toEqual([categoryTaxonomy.id, tagTaxonomy.id]);
      expect(plan.assignmentTermIds).toEqual([replacementTag.id]);
      expect(plan.resolvedTagNames).toEqual(["Replacement tag"]);
      await applyEntryTaxonomyMutation(tx, plan);
    });

    const assignments = await getEntryTaxonomies(entry.id);
    expect(assignments.category).toBeNull();
    expect(assignments.tags.map((term) => term.id)).toEqual([replacementTag.id]);
  });
});

testIfDb("an outer failure after apply rolls every assignment write back", async () => {
  await withFixture("Taxonomy rollback", async ({ type, entry }) => {
    const { categoryTaxonomy, tagTaxonomy } = await configureBoth(type.id);
    const category = requireValue(
      await createTerm(categoryTaxonomy.id, { name: "Stable category" }),
      "category"
    );
    const stableTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Stable tag" }),
      "stable_tag"
    );
    const rejectedTag = requireValue(
      await createTerm(tagTaxonomy.id, { name: "Rejected tag" }),
      "rejected_tag"
    );
    await replaceEntryTaxonomies(entry.id, type.id, {
      categoryId: category.id,
      tagIds: [stableTag.id],
    });

    const sentinel = new Error("taxonomy_apply_sentinel");
    await expect(
      db.transaction(async (tx) => {
        const recording = createRecordingExecutor(tx);
        const plan = await prepareEntryTaxonomyMutation(recording.executor, entry.id, type.id, {
          tagIds: [rejectedTag.id],
        });
        await applyEntryTaxonomyMutation(recording.executor, plan);
        throw sentinel;
      })
    ).rejects.toBe(sentinel);

    const assignments = await getEntryTaxonomies(entry.id);
    expect(assignments.category?.id).toBe(category.id);
    expect(assignments.tags.map((term) => term.id)).toEqual([stableTag.id]);
  });
});
