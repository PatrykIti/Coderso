import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import {
  commerceProducts,
  contentEntries,
  contentTypes,
  pages,
  posts,
} from "../../db/schema";
import { containsMediaReference } from "./mediaReferenceMatcher";

export type MediaUsageTargetType = "page" | "entry" | "post" | "commerce";

export type MediaUsageSummary = {
  id: string;
  type: MediaUsageTargetType;
  title: string;
  context: string;
  targetId: string;
  targetSlug?: string | null;
  adminHref: string;
};

export type ListMediaUsageOptions = {
  limitPerFamily?: number;
};

const defaultLimitPerFamily = 25;
const clampLimit = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultLimitPerFamily;
  return Math.max(1, Math.min(100, Math.trunc(value)));
};

const pushUsage = (
  target: MediaUsageSummary[],
  seen: Set<string>,
  usage: MediaUsageSummary
) => {
  if (seen.has(usage.id)) return;
  seen.add(usage.id);
  target.push(usage);
};

export async function listMediaUsage(
  mediaId: string,
  options?: ListMediaUsageOptions
): Promise<MediaUsageSummary[]> {
  const limit = clampLimit(options?.limitPerFamily);
  const result: MediaUsageSummary[] = [];
  const seen = new Set<string>();

  const pageRows = await db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      currentData: pages.currentData,
      publishedData: pages.publishedData,
    })
    .from(pages);

  for (const page of pageRows) {
    if (result.filter((usage) => usage.type === "page").length >= limit) break;
    if (
      !containsMediaReference(page.currentData, mediaId) &&
      !containsMediaReference(page.publishedData, mediaId)
    ) {
      continue;
    }
    pushUsage(result, seen, {
      id: `page:${page.id}`,
      type: "page",
      title: page.title,
      context: "Page builder content",
      targetId: page.id,
      targetSlug: page.slug,
      adminHref: `/pages/${encodeURIComponent(page.id)}`,
    });
  }

  const entryRows = await db
    .select({
      id: contentEntries.id,
      slug: contentEntries.slug,
      title: contentEntries.title,
      data: contentEntries.data,
      typeSlug: contentTypes.slug,
      typeName: contentTypes.name,
    })
    .from(contentEntries)
    .leftJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id));

  for (const entry of entryRows) {
    if (result.filter((usage) => usage.type === "entry").length >= limit) break;
    if (!containsMediaReference(entry.data, mediaId)) continue;
    const typeSlug = entry.typeSlug ?? "entries";
    pushUsage(result, seen, {
      id: `entry:${entry.id}`,
      type: "entry",
      title: entry.title,
      context: `${entry.typeName ?? "Content"} entry`,
      targetId: entry.id,
      targetSlug: entry.slug,
      adminHref: `/coderso/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(entry.id)}`,
    });
  }

  const postRows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      featuredMediaId: posts.featuredMediaId,
      data: posts.data,
    })
    .from(posts);

  for (const post of postRows) {
    if (result.filter((usage) => usage.type === "post").length >= limit) break;
    if (post.featuredMediaId !== mediaId && !containsMediaReference(post.data, mediaId)) {
      continue;
    }
    pushUsage(result, seen, {
      id: `post:${post.id}`,
      type: "post",
      title: post.title,
      context: "Post content",
      targetId: post.id,
      targetSlug: post.slug,
      adminHref: `/coderso/posts/${encodeURIComponent(post.id)}`,
    });
  }

  const productRows = await db
    .select({
      id: commerceProducts.id,
      slug: commerceProducts.slug,
      title: commerceProducts.title,
      mediaIds: commerceProducts.mediaIds,
      data: commerceProducts.data,
    })
    .from(commerceProducts);

  for (const product of productRows) {
    if (result.filter((usage) => usage.type === "commerce").length >= limit) break;
    if (
      !containsMediaReference(product.mediaIds, mediaId) &&
      !containsMediaReference(product.data, mediaId)
    ) {
      continue;
    }
    pushUsage(result, seen, {
      id: `commerce:${product.id}`,
      type: "commerce",
      title: product.title,
      context: "Commerce product",
      targetId: product.id,
      targetSlug: product.slug,
      adminHref: `/coderso/commerce/${encodeURIComponent(product.id)}`,
    });
  }

  return result;
}
