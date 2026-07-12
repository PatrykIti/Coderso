import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { mediaFolders } from "../../db/schema";

export type MediaFolderRow = typeof mediaFolders.$inferSelect;

export type MediaFolderInput = {
  name: string;
  slug?: string;
  parentId?: string | null;
  orderIndex?: number;
};

// present-only name/slug/parentId/orderIndex
export type MediaFolderPatch = Partial<MediaFolderInput>;

export type MediaFolderOrder = { id: string; orderIndex: number; parentId?: string | null };

export const MAX_DEPTH = 5;

const MEDIA_FOLDER_SLUG_CONSTRAINT = "media_folders_slug_idx";
const MAX_POSTGRES_ERROR_CANDIDATES = 3;

type OwnDataValue = Readonly<{ value: unknown }>;

const readOwnDataValue = (candidate: unknown, key: PropertyKey): OwnDataValue | null => {
  if (typeof candidate !== "object" || candidate === null) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (!descriptor || !("value" in descriptor)) return null;
    return { value: descriptor.value };
  } catch {
    return null;
  }
};

const getPostgresErrorCandidates = (error: unknown): unknown[] => {
  const candidates: unknown[] = [];
  const seen = new Set<object>();
  let current = error;

  while (
    candidates.length < MAX_POSTGRES_ERROR_CANDIDATES &&
    typeof current === "object" &&
    current !== null &&
    !seen.has(current)
  ) {
    seen.add(current);
    candidates.push(current);
    const cause = readOwnDataValue(current, "cause");
    if (!cause) break;
    current = cause.value;
  }

  return candidates;
};

export const isMediaFolderSlugConflict = (error: unknown): boolean =>
  getPostgresErrorCandidates(error).some((candidate) => {
    const code = readOwnDataValue(candidate, "code");
    const constraintName = readOwnDataValue(candidate, "constraint_name");
    return code?.value === "23505" && constraintName?.value === MEDIA_FOLDER_SLUG_CONSTRAINT;
  });

export const mapOwnedFolderConstraint = (error: unknown): never => {
  if (isMediaFolderSlugConflict(error)) {
    throw new Error("media_folder_slug_conflict");
  }
  throw error;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeOrderIndex = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("media_folder_order_invalid");
  return Math.max(0, Math.floor(parsed));
};

/**
 * Logically PURE — no DB access. Trims + requires name, normalizes slug (derive from
 * name if omitted), coerces orderIndex to a non-negative int. Present-only: parentId /
 * orderIndex are only set on the result when present on the input (subset invariant).
 * Cycle / existence / uniqueness checks stay in the DB-touching functions.
 */
export function normalizeMediaFolderInput(input: MediaFolderInput): {
  name: string;
  slug: string;
  parentId?: string | null;
  orderIndex?: number;
} {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new Error("media_folder_name_required");

  const rawSlug = typeof input.slug === "string" && input.slug.trim() ? input.slug : name;
  const slug = slugify(rawSlug);
  if (!slug) throw new Error("media_folder_slug_invalid");

  const result: { name: string; slug: string; parentId?: string | null; orderIndex?: number } = {
    name,
    slug,
  };
  if (Object.prototype.hasOwnProperty.call(input, "parentId")) {
    result.parentId = input.parentId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "orderIndex")) {
    result.orderIndex = normalizeOrderIndex(input.orderIndex);
  }
  return result;
}

const buildParentMap = (rows: MediaFolderRow[]): Map<string, string | null> => {
  const map = new Map<string, string | null>();
  for (const row of rows) map.set(row.id, row.parentId ?? null);
  return map;
};

// Returns the depth of `id` (root = 1); throws media_folder_cycle on a parent-chain cycle.
const nodeDepth = (id: string, parents: Map<string, string | null>): number => {
  let depth = 1;
  let current = parents.get(id) ?? null;
  const seen = new Set<string>([id]);
  while (current) {
    if (seen.has(current)) throw new Error("media_folder_cycle");
    seen.add(current);
    depth += 1;
    current = parents.get(current) ?? null;
  }
  return depth;
};

// Validates the whole projected graph: throws media_folder_cycle on any cycle and
// media_folder_depth_exceeded if any node's depth would exceed MAX_DEPTH.
const assertGraphValid = (parents: Map<string, string | null>) => {
  let maxDepth = 0;
  for (const id of parents.keys()) {
    maxDepth = Math.max(maxDepth, nodeDepth(id, parents));
  }
  if (maxDepth > MAX_DEPTH) throw new Error("media_folder_depth_exceeded");
};

async function loadFolders(): Promise<MediaFolderRow[]> {
  return db
    .select()
    .from(mediaFolders)
    .orderBy(asc(mediaFolders.parentId), asc(mediaFolders.orderIndex));
}

async function assertSlugFree(slug: string, excludeId?: string): Promise<void> {
  const rows = excludeId
    ? await db
        .select({ id: mediaFolders.id })
        .from(mediaFolders)
        .where(and(eq(mediaFolders.slug, slug), ne(mediaFolders.id, excludeId)))
    : await db
        .select({ id: mediaFolders.id })
        .from(mediaFolders)
        .where(eq(mediaFolders.slug, slug));
  if (rows.length > 0) throw new Error("media_folder_slug_conflict");
}

export async function listMediaFolders(): Promise<MediaFolderRow[]> {
  return loadFolders();
}

export async function createMediaFolder(
  input: MediaFolderInput,
  userId?: string
): Promise<MediaFolderRow> {
  const normalized = normalizeMediaFolderInput(input);
  const parentId = normalized.parentId ?? null;

  await assertSlugFree(normalized.slug);

  const existing = await loadFolders();
  if (parentId !== null && !existing.some((row) => row.id === parentId)) {
    throw new Error("media_folder_not_found");
  }

  // Project the new folder into the graph and validate depth/cycle before inserting.
  const parents = buildParentMap(existing);
  const tempId = "__new__";
  parents.set(tempId, parentId);
  assertGraphValid(parents);

  try {
    const [row] = await db
      .insert(mediaFolders)
      .values({
        name: normalized.name,
        slug: normalized.slug,
        parentId,
        ...(normalized.orderIndex !== undefined ? { orderIndex: normalized.orderIndex } : {}),
        createdBy: userId,
      })
      .returning();
    return row;
  } catch (error) {
    return mapOwnedFolderConstraint(error);
  }
}

export async function updateMediaFolder(
  id: string,
  patch: MediaFolderPatch
): Promise<MediaFolderRow | null> {
  const [current] = await db.select().from(mediaFolders).where(eq(mediaFolders.id, id));
  if (!current) return null;

  const set: Partial<{ name: string; slug: string; parentId: string | null; orderIndex: number }> =
    {};

  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    const name = typeof patch.name === "string" ? patch.name.trim() : "";
    if (!name) throw new Error("media_folder_name_required");
    set.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "slug")) {
    const rawSlug =
      typeof patch.slug === "string" && patch.slug.trim() ? patch.slug : (set.name ?? current.name);
    const slug = slugify(rawSlug);
    if (!slug) throw new Error("media_folder_slug_invalid");
    await assertSlugFree(slug, id);
    set.slug = slug;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "orderIndex")) {
    set.orderIndex = normalizeOrderIndex(patch.orderIndex);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "parentId")) {
    const parentId = patch.parentId ?? null;
    if (parentId === id) throw new Error("media_folder_cycle");
    const existing = await loadFolders();
    if (parentId !== null && !existing.some((row) => row.id === parentId)) {
      throw new Error("media_folder_not_found");
    }
    const parents = buildParentMap(existing);
    parents.set(id, parentId);
    assertGraphValid(parents);
    set.parentId = parentId;
  }

  if (Object.keys(set).length === 0) {
    return current;
  }

  try {
    const [row] = await db.update(mediaFolders).set(set).where(eq(mediaFolders.id, id)).returning();
    return row ?? null;
  } catch (error) {
    return mapOwnedFolderConstraint(error);
  }
}

export async function deleteMediaFolder(id: string): Promise<{ ok: true }> {
  // onDelete:"set null" (512-01) un-files media (media.folderId -> null) and orphans
  // child folders (parent_id -> null); media is NEVER cascade-deleted.
  await db.delete(mediaFolders).where(eq(mediaFolders.id, id));
  return { ok: true };
}

export async function reorderMediaFolders(orders: MediaFolderOrder[]): Promise<void> {
  if (!Array.isArray(orders) || orders.length === 0) return;

  const existing = await loadFolders();
  const known = new Set(existing.map((row) => row.id));
  for (const order of orders) {
    if (!known.has(order.id)) throw new Error("media_folder_not_found");
  }

  // Build the projected parent graph applying any re-parenting in this batch.
  const parents = buildParentMap(existing);
  for (const order of orders) {
    if (Object.prototype.hasOwnProperty.call(order, "parentId")) {
      const parentId = order.parentId ?? null;
      if (parentId === order.id) throw new Error("media_folder_cycle");
      if (parentId !== null && !known.has(parentId)) throw new Error("media_folder_not_found");
      parents.set(order.id, parentId);
    }
  }
  assertGraphValid(parents);

  await db.transaction(async (tx) => {
    for (const order of orders) {
      const set: { orderIndex: number; parentId?: string | null } = {
        orderIndex: normalizeOrderIndex(order.orderIndex),
      };
      if (Object.prototype.hasOwnProperty.call(order, "parentId")) {
        set.parentId = order.parentId ?? null;
      }
      await tx.update(mediaFolders).set(set).where(eq(mediaFolders.id, order.id));
    }
  });
}
