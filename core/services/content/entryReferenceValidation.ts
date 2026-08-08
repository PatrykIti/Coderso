import { and, eq, inArray, ne } from "drizzle-orm";
import type { db } from "../../db/client";
import { contentEntries, contentTypes, media } from "../../db/schema";
import type { ContentSchema } from "./validation";
import type { EntryData } from "./entryTypes";

export type EntryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type EntryDbClient = typeof db | EntryTransaction;

type RelationFieldConfig = {
  name: string;
  targetSlug: string;
  multiple: boolean;
};

type MediaFieldConfig = {
  name: string;
  multiple: boolean;
  accept: string[] | undefined;
  maxItems: number | undefined;
};

type EntryFieldError = Error & { field?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createEntryFieldError = (code: string, field?: string): EntryFieldError =>
  Object.assign(new Error(code), field ? { field } : {});

const readRelationConfig = (value: unknown) => {
  if (!isRecord(value)) return { target: undefined, multiple: false };
  const relation = value.relation;
  if (!isRecord(relation)) return { target: undefined, multiple: false };
  const target = typeof relation.target === "string" ? relation.target.trim() : undefined;
  return { target: target || undefined, multiple: relation.multiple === true };
};

const readMediaConfig = (value: unknown) => {
  if (!isRecord(value)) return {};
  const mediaValue = isRecord(value.media) ? value.media : value;
  if (!isRecord(mediaValue)) return {};
  const accept = Array.isArray(mediaValue.accept)
    ? mediaValue.accept
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : undefined;
  return {
    multiple: mediaValue.multiple === true,
    accept: accept?.length ? accept : undefined,
    maxItems:
      typeof mediaValue.maxItems === "number" && Number.isFinite(mediaValue.maxItems)
        ? mediaValue.maxItems
        : undefined,
  };
};

const extractRelationFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const properties = (schema as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const xRelationTarget =
        typeof definition.xRelationTarget === "string"
          ? definition.xRelationTarget.trim()
          : undefined;
      const { target, multiple } = readRelationConfig(definition.xFieldConfig);
      const resolvedTarget = xRelationTarget ?? target;
      const isRelation = definition.xFieldType === "relation" || Boolean(resolvedTarget);
      if (!isRelation || !resolvedTarget) return null;
      return {
        name,
        targetSlug: resolvedTarget,
        multiple: definition.type === "array" || multiple,
      };
    })
    .filter((entry): entry is RelationFieldConfig => Boolean(entry));
};

const extractMediaFields = (schema: ContentSchema) => {
  if (!schema || typeof schema !== "object") return [];
  const properties = (schema as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];

  return Object.entries(properties)
    .map(([name, definition]) => {
      if (!isRecord(definition)) return null;
      const mediaConfig = readMediaConfig(definition.xFieldConfig);
      const isMedia =
        definition.xFieldType === "media" ||
        mediaConfig.multiple === true ||
        Boolean(mediaConfig.accept);
      if (!isMedia) return null;
      return {
        name,
        multiple: definition.type === "array" || mediaConfig.multiple === true,
        accept: mediaConfig.accept,
        maxItems:
          typeof mediaConfig.maxItems === "number"
            ? mediaConfig.maxItems
            : typeof definition.maxItems === "number"
              ? definition.maxItems
              : undefined,
      };
    })
    .filter((entry): entry is MediaFieldConfig => Boolean(entry));
};

const matchesMimeAccept = (mimeType: string, accept?: string[]) => {
  if (!accept || accept.length === 0) return true;
  const candidate = mimeType.toLowerCase();
  return accept.some((entry) => {
    const pattern = entry.toLowerCase();
    if (pattern === "*/*") return true;
    if (pattern.endsWith("/*")) {
      return candidate.startsWith(`${pattern.slice(0, pattern.indexOf("/"))}/`);
    }
    return candidate === pattern;
  });
};

const mediaAssetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateMediaAssets = async (
  schema: ContentSchema,
  data: EntryData,
  client: EntryDbClient
) => {
  const mediaFields = extractMediaFields(schema);
  if (mediaFields.length === 0) return;

  const selectedIds = new Set<string>();
  const allowedById = new Map<string, string[][]>();
  for (const field of mediaFields) {
    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;

    const addId = (id: string) => {
      if (!mediaAssetIdPattern.test(id)) {
        throw createEntryFieldError("media_asset_missing", field.name);
      }
      selectedIds.add(id);
      if (field.accept) {
        const bucket = allowedById.get(id) ?? [];
        bucket.push(field.accept);
        allowedById.set(id, bucket);
      }
    };

    if (field.multiple) {
      if (!Array.isArray(rawValue) || (field.maxItems && rawValue.length > field.maxItems)) {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      for (const id of rawValue) {
        if (typeof id !== "string" || id.trim() === "") {
          throw createEntryFieldError("media_value_invalid", field.name);
        }
        addId(id);
      }
    } else {
      if (Array.isArray(rawValue) || typeof rawValue !== "string" || rawValue.trim() === "") {
        throw createEntryFieldError("media_value_invalid", field.name);
      }
      addId(rawValue);
    }
  }

  const ids = [...selectedIds];
  if (ids.length === 0) return;
  const rows = await client
    .select({ id: media.id, mimeType: media.mimeType })
    .from(media)
    .where(inArray(media.id, ids));
  const found = new Map(rows.map((row) => [row.id, row.mimeType]));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    const field = mediaFields.find((candidate) => {
      const value = data[candidate.name];
      return Array.isArray(value)
        ? value.some((item) => missing.includes(String(item)))
        : typeof value === "string" && missing.includes(value);
    });
    throw createEntryFieldError("media_asset_missing", field?.name);
  }

  for (const [id, acceptLists] of allowedById) {
    const mimeType = found.get(id);
    if (!mimeType) continue;
    for (const accept of acceptLists) {
      if (matchesMimeAccept(mimeType, accept)) continue;
      const field = mediaFields.find((candidate) => {
        const value = data[candidate.name];
        return Array.isArray(value) ? value.includes(id) : value === id;
      });
      throw createEntryFieldError("media_type_not_allowed", field?.name);
    }
  }
};

const validateRelationEntries = async (
  schema: ContentSchema,
  data: EntryData,
  client: EntryDbClient
) => {
  const relationFields = extractRelationFields(schema);
  if (relationFields.length === 0) return;

  const uniqueTargets = [...new Set(relationFields.map((field) => field.targetSlug))];
  const targetRows = await client
    .select({ id: contentTypes.id, slug: contentTypes.slug })
    .from(contentTypes)
    .where(inArray(contentTypes.slug, uniqueTargets));
  const targetsBySlug = new Map(targetRows.map((row) => [row.slug, row.id]));
  if (targetsBySlug.size !== uniqueTargets.length) throw new Error("relation_target_not_found");

  const idsByTarget = new Map<string, Set<string>>();
  for (const field of relationFields) {
    const rawValue = data[field.name];
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;
    const addId = (id: string) => {
      const bucket = idsByTarget.get(field.targetSlug) ?? new Set<string>();
      bucket.add(id);
      idsByTarget.set(field.targetSlug, bucket);
    };
    if (field.multiple) {
      if (!Array.isArray(rawValue)) {
        throw createEntryFieldError("relation_value_invalid", field.name);
      }
      for (const id of rawValue) {
        if (typeof id !== "string" || id.trim() === "") {
          throw createEntryFieldError("relation_value_invalid", field.name);
        }
        addId(id);
      }
    } else {
      if (Array.isArray(rawValue) || typeof rawValue !== "string" || rawValue.trim() === "") {
        throw createEntryFieldError("relation_value_invalid", field.name);
      }
      addId(rawValue);
    }
  }

  for (const [targetSlug, ids] of idsByTarget) {
    const targetId = targetsBySlug.get(targetSlug);
    const idList = [...ids];
    if (!targetId || idList.length === 0) continue;
    const rows = await client
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(and(eq(contentEntries.typeId, targetId), inArray(contentEntries.id, idList)));
    const found = new Set(rows.map((row) => row.id));
    const missing = idList.filter((id) => !found.has(id));
    if (missing.length === 0) continue;
    const field = relationFields.find((candidate) => {
      if (candidate.targetSlug !== targetSlug) return false;
      const value = data[candidate.name];
      return Array.isArray(value)
        ? value.some((item) => missing.includes(String(item)))
        : typeof value === "string" && missing.includes(value);
    });
    throw createEntryFieldError("relation_entry_missing", field?.name);
  }
};

export const getEntryContentTypeWithExecutor = async (client: EntryDbClient, typeId: string) => {
  const [row] = await client.select().from(contentTypes).where(eq(contentTypes.id, typeId));
  return row ?? null;
};

export const ensureEntrySlugAvailableWithExecutor = async (
  client: EntryDbClient,
  typeId: string,
  slug: string,
  excludeEntryId?: string
) => {
  const rows = await client
    .select({ id: contentEntries.id })
    .from(contentEntries)
    .where(
      excludeEntryId
        ? and(
            eq(contentEntries.typeId, typeId),
            eq(contentEntries.slug, slug),
            ne(contentEntries.id, excludeEntryId)
          )
        : and(eq(contentEntries.typeId, typeId), eq(contentEntries.slug, slug))
    );
  if (rows.length > 0) throw createEntryFieldError("entry_slug_conflict", "slug");
};

export const validateEntryReferences = async (
  schema: ContentSchema,
  data: EntryData,
  client: EntryDbClient
) => {
  await validateRelationEntries(schema, data, client);
  await validateMediaAssets(schema, data, client);
};
