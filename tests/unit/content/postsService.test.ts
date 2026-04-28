import { afterAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { like, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { contentTypes, posts } from "../../../core/db/schema";
import {
  createPost,
  deletePost,
  duplicatePost,
  ensurePostContentType,
  getPost,
  listPosts,
  POST_CONTENT_TYPE_SLUG,
  updatePostMetadata,
} from "../../../core/services/content/postsService";
import {
  createTerm,
  setTaxonomyConfig,
} from "../../../core/services/content/taxonomyService";
import { createContentType } from "../../../core/services/content/typeService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const slugPrefix = "task-059-02-posts-service";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(posts).where(like(posts.slug, `${slugPrefix}%`));
  await db.delete(contentTypes).where(like(contentTypes.slug, `${slugPrefix}%`));
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

test("ensurePostContentType returns stable virtual post type contract", async () => {
  const first = await ensurePostContentType();
  const second = await ensurePostContentType();

  expect(first.slug).toBe(POST_CONTENT_TYPE_SLUG);
  expect(first.id).toBe(POST_CONTENT_TYPE_SLUG);
  expect(second.id).toBe(first.id);
  expect(
    typeof (first.schema as Record<string, unknown>)?.properties === "object" &&
      (first.schema as Record<string, unknown>)?.properties !== null &&
      Object.prototype.hasOwnProperty.call(
        (first.schema as Record<string, unknown>).properties as Record<string, unknown>,
        "document"
      )
  ).toBe(true);
});

testIfDb("listPosts and getPost return records from dedicated posts table", async () => {
  const created = await createPost({
    title: `Task 059 post ${randomUUID()}`,
    slug: `${slugPrefix}-list`,
    data: { excerpt: "Post body" },
  });
  if (!created) throw new Error("post_create_failed");

  const items = await listPosts();
  expect(items.some((item) => item.id === created.id)).toBe(true);

  const loaded = await getPost(created.id);
  expect(loaded?.id).toBe(created.id);
  expect(loaded?.typeId).toBe(POST_CONTENT_TYPE_SLUG);
  expect(loaded?.data).toHaveProperty("document");
});

testIfDb("duplicatePost creates a draft clone with copied metadata", async () => {
  const source = await createPost({
    title: `Original ${randomUUID()}`,
    slug: `${slugPrefix}-original`,
    data: {
      excerpt: "Source excerpt",
      content: "Source content",
    },
  });
  if (!source) throw new Error("post_create_failed");

  await updatePostMetadata(source.id, {
    tags: ["news", "release"],
    seo: {
      description: "SEO description",
    },
  });

  const duplicated = await duplicatePost(source.id);
  if (!duplicated) throw new Error("post_duplicate_failed");

  expect(duplicated.id).not.toBe(source.id);
  expect(duplicated.slug).not.toBe(source.slug);
  expect(duplicated.title).toContain("(Copy");
  expect(duplicated.status).toBe("draft");
  expect(duplicated.tags).toEqual(expect.arrayContaining(["news", "release"]));
  expect(duplicated.seo?.description).toBe("SEO description");

  const deleted = await deletePost(duplicated.id);
  expect(deleted.ok).toBe(true);
});

testIfDbWithOptions(
  "updatePostMetadata preserves free-text tags when category changes",
  async () => {
    const id = randomUUID();
    const post = await createPost({
      title: `Taxonomy save ${id}`,
      slug: `${slugPrefix}-taxonomy-save-${id}`,
      data: {
        excerpt: "Taxonomy save",
        content: "Taxonomy save content",
      },
    });
    if (!post) throw new Error("post_create_failed");

    const type = await createContentType({
      name: `Post Taxonomy ${id}`,
      slug: `${slugPrefix}-taxonomy-type-${id}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    });
    const taxonomies = await setTaxonomyConfig(type.id, {
      categories: true,
      tags: true,
    });
    const categoryTaxonomy = taxonomies.find((item) => item.kind === "category");
    const tagTaxonomy = taxonomies.find((item) => item.kind === "tag");
    if (!categoryTaxonomy || !tagTaxonomy) {
      throw new Error("taxonomy_create_failed");
    }

    const category = await createTerm(categoryTaxonomy.id, { name: "Release" });
    const taxonomyTag = await createTerm(tagTaxonomy.id, { name: "Taxonomy tag" });
    if (!category || !taxonomyTag) throw new Error("term_create_failed");

    const categoryOnly = await updatePostMetadata(post.id, {
      tags: ["typed-tag"],
      taxonomy: { categoryId: category.id },
    });
    expect(categoryOnly?.tags).toEqual(["typed-tag"]);
    expect(categoryOnly?.taxonomy?.category?.id).toBe(category.id);

    const taxonomyTagUpdate = await updatePostMetadata(post.id, {
      tags: ["ignored-when-taxonomy-tags-are-explicit"],
      taxonomy: { tagIds: [taxonomyTag.id] },
    });
    expect(taxonomyTagUpdate?.tags).toEqual(["Taxonomy tag"]);
    expect(taxonomyTagUpdate?.taxonomy?.category?.id).toBe(category.id);
    expect(taxonomyTagUpdate?.taxonomy?.tags.map((term) => term.id)).toEqual([
      taxonomyTag.id,
    ]);
  },
  { timeout: 15_000 }
);
