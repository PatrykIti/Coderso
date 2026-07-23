import { desc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { contentTypes, customScreens } from "../../db/schema";
import type { WidgetBlock } from "../../widgets/types";
import {
  normalizeCustomScreenDefinitionForWrite,
  normalizeCustomScreenDefinitionForRead,
  normalizeCustomScreenSchemaVersion,
  normalizeCustomScreenCollectionLink,
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
  type CustomScreenBinding,
  type CustomScreenCollectionRole,
  type CustomScreenDefinition,
  type CustomScreenDefinitionVersion,
  normalizeCustomScreenSidebarConfig,
  type CustomScreenStatus,
  type CustomScreenBindingWarning,
  type ScreenBindingWarningSink,
} from "./customScreenSchemas";
import { resolveCustomScreenCapabilities, type CustomScreenCapabilities } from "./capabilities";

export type CustomScreenRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  collectionRole: CustomScreenCollectionRole | null;
  compositionKey: string | null;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion: CustomScreenDefinitionVersion;
  definition: CustomScreenDefinition;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities: CustomScreenCapabilities;
  createdAt: Date;
  updatedAt: Date;
  // Transient binding-GC warnings surfaced on POST/PATCH success — computed at normalize
  // time and never persisted. The editor renders the existing removal notice; the field
  // stays absent when nothing was pruned.
  warnings?: CustomScreenBindingWarning[];
};

// De-dupe field names in source order; drop an empty warning bucket.
const buildBindingWarnings = (sink: ScreenBindingWarningSink): CustomScreenBindingWarning[] => {
  const warnings: CustomScreenBindingWarning[] = [];
  const dedupe = (fields: string[]) => [...new Set(fields)];
  if (sink.removedFieldOrphans.length > 0) {
    warnings.push({ code: "binding_field_removed", fields: dedupe(sink.removedFieldOrphans) });
  }
  if (sink.removedBlockOrphans.length > 0) {
    warnings.push({ code: "binding_block_removed", fields: dedupe(sink.removedBlockOrphans) });
  }
  return warnings;
};

export type CustomScreenCreateInput = {
  name: string;
  contentTypeId: string;
  status?: CustomScreenStatus;
  collectionRole?: CustomScreenCollectionRole | null;
  compositionKey?: string | null;
  showInSidebar?: boolean;
  sidebarLabel?: string | null;
  schemaVersion?: 4;
  definition?: CustomScreenDefinition | null;
};

export type CustomScreenUpdateInput = {
  name?: string;
  contentTypeId?: string;
  status?: CustomScreenStatus;
  collectionRole?: CustomScreenCollectionRole | null;
  compositionKey?: string | null;
  showInSidebar?: boolean;
  sidebarLabel?: string | null;
  schemaVersion?: 4;
  definition?: CustomScreenDefinition | null;
};

const allowedStatuses = new Set<CustomScreenStatus>(["draft", "active"]);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeName = (value: unknown) => {
  const name = normalizeText(value);
  if (!name) throw new Error("custom_screen_invalid");
  return name;
};

const normalizeContentTypeId = (value: unknown) => {
  const id = normalizeText(value);
  if (!id) throw new Error("custom_screen_invalid");
  return id;
};

const normalizeStatus = (value: unknown): CustomScreenStatus => {
  const status = normalizeText(value) ?? "draft";
  if (!allowedStatuses.has(status as CustomScreenStatus)) {
    throw new Error("custom_screen_status_invalid");
  }
  return status as CustomScreenStatus;
};

type ContentTypeDefinitionContext = {
  id: string;
  slug: string;
  name: string;
  schema: {
    required?: string[];
    properties?: Record<string, unknown>;
  };
};

const mapRow = (
  row: typeof customScreens.$inferSelect,
  context?: { contentType?: ContentTypeDefinitionContext | null }
): CustomScreenRecord => {
  const definition = normalizeCustomScreenDefinitionForRead(
    {
      definition: row.definition,
      schemaVersion: row.schemaVersion,
    },
    context
  );

  return {
    id: row.id,
    name: row.name,
    contentTypeId: row.contentTypeId,
    status: normalizeStatus(row.status),
    ...normalizeCustomScreenCollectionLink({
      collectionRole: row.collectionRole,
      compositionKey: row.compositionKey,
    }),
    showInSidebar: row.showInSidebar,
    sidebarLabel: row.sidebarLabel ?? null,
    schemaVersion: definition.schemaVersion,
    definition,
    blocks: getCustomScreenEditorViewBlocks(definition),
    bindings: getCustomScreenEditorViewBindings(definition),
    capabilities: resolveCustomScreenCapabilities({ definition }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const mapContentTypeContext = (
  row: typeof contentTypes.$inferSelect | undefined
): ContentTypeDefinitionContext | null => {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    schema: row.schema as ContentTypeDefinitionContext["schema"],
  };
};

async function loadContentTypesById(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, ContentTypeDefinitionContext>();
  const rows = await db.select().from(contentTypes).where(inArray(contentTypes.id, uniqueIds));
  return new Map(rows.map((row) => [row.id, mapContentTypeContext(row)!]));
}

export async function listCustomScreens(): Promise<CustomScreenRecord[]> {
  const rows = await db.select().from(customScreens).orderBy(desc(customScreens.updatedAt));
  const contentTypesById = await loadContentTypesById(rows.map((row) => row.contentTypeId));
  return rows.map((row) =>
    mapRow(row, { contentType: contentTypesById.get(row.contentTypeId) ?? null })
  );
}

export async function getCustomScreen(id: string) {
  const [row] = await db.select().from(customScreens).where(eq(customScreens.id, id));
  if (!row) return null;
  const contentTypesById = await loadContentTypesById([row.contentTypeId]);
  return mapRow(row, {
    contentType: contentTypesById.get(row.contentTypeId) ?? null,
  });
}

export async function createCustomScreen(input: CustomScreenCreateInput) {
  const name = normalizeName(input.name);
  const contentTypeId = normalizeContentTypeId(input.contentTypeId);
  const contentTypesById = await loadContentTypesById([contentTypeId]);
  const contentType = contentTypesById.get(contentTypeId) ?? null;
  const rawInput = input as Record<string, unknown>;
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const definition = normalizeCustomScreenDefinitionForWrite(
    {
      definition: input.definition,
      schemaVersion: input.schemaVersion,
      blocks: rawInput.blocks,
      bindings: rawInput.bindings,
    },
    { contentType },
    sink
  );
  const sidebar = normalizeCustomScreenSidebarConfig({
    showInSidebar: input.showInSidebar,
    sidebarLabel: input.sidebarLabel,
  });
  const collectionLink = normalizeCustomScreenCollectionLink({
    collectionRole: input.collectionRole,
    compositionKey: input.compositionKey,
  });

  const now = new Date();
  const [row] = await db
    .insert(customScreens)
    .values({
      name,
      contentTypeId,
      status: normalizeStatus(input.status),
      collectionRole: collectionLink.collectionRole,
      compositionKey: collectionLink.compositionKey,
      showInSidebar: sidebar.showInSidebar,
      sidebarLabel: sidebar.sidebarLabel,
      schemaVersion: definition.schemaVersion,
      definition,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) throw new Error("custom_screen_invalid");
  const warnings = buildBindingWarnings(sink);
  return {
    ...mapRow(row, { contentType }),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export async function updateCustomScreen(id: string, input: CustomScreenUpdateInput) {
  const [existing] = await db.select().from(customScreens).where(eq(customScreens.id, id));
  if (!existing) return null;

  const nextContentTypeId =
    input.contentTypeId !== undefined
      ? normalizeContentTypeId(input.contentTypeId)
      : existing.contentTypeId;
  const contentTypesById = await loadContentTypesById([nextContentTypeId]);
  const contentType = contentTypesById.get(nextContentTypeId) ?? null;
  const baseDefinition = normalizeCustomScreenDefinitionForRead(
    {
      definition: existing.definition,
      schemaVersion: existing.schemaVersion,
    },
    { contentType }
  );
  const nextSchemaVersion =
    input.schemaVersion === undefined
      ? baseDefinition.schemaVersion
      : normalizeCustomScreenSchemaVersion(input.schemaVersion);
  const rawInput = input as Record<string, unknown>;
  // TASK-505-01 (Item B): collect pruned binding-orphan field names on Save (transient).
  const sink: ScreenBindingWarningSink = { removedFieldOrphans: [], removedBlockOrphans: [] };
  const definition = normalizeCustomScreenDefinitionForWrite(
    input.definition !== undefined ||
      input.schemaVersion !== undefined ||
      rawInput.blocks !== undefined ||
      rawInput.bindings !== undefined
      ? {
          definition: input.definition ?? baseDefinition,
          schemaVersion: nextSchemaVersion,
          blocks: rawInput.blocks,
          bindings: rawInput.bindings,
        }
      : {
          definition: baseDefinition,
        },
    { contentType },
    sink
  );
  const sidebar = normalizeCustomScreenSidebarConfig({
    showInSidebar: input.showInSidebar !== undefined ? input.showInSidebar : existing.showInSidebar,
    sidebarLabel: input.sidebarLabel !== undefined ? input.sidebarLabel : existing.sidebarLabel,
  });
  const collectionLink = normalizeCustomScreenCollectionLink({
    collectionRole:
      input.collectionRole !== undefined ? input.collectionRole : existing.collectionRole,
    compositionKey:
      input.compositionKey !== undefined ? input.compositionKey : existing.compositionKey,
  });

  const [row] = await db
    .update(customScreens)
    .set({
      name: input.name !== undefined ? normalizeName(input.name) : existing.name,
      contentTypeId: nextContentTypeId,
      status:
        input.status !== undefined
          ? normalizeStatus(input.status)
          : normalizeStatus(existing.status),
      collectionRole: collectionLink.collectionRole,
      compositionKey: collectionLink.compositionKey,
      showInSidebar: sidebar.showInSidebar,
      sidebarLabel: sidebar.sidebarLabel,
      schemaVersion: definition.schemaVersion,
      definition,
      updatedAt: new Date(),
    })
    .where(eq(customScreens.id, id))
    .returning();

  if (!row) return null;
  const warnings = buildBindingWarnings(sink);
  return {
    ...mapRow(row, { contentType }),
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export async function deleteCustomScreen(id: string) {
  const [row] = await db.delete(customScreens).where(eq(customScreens.id, id)).returning();
  if (!row) return null;
  const contentTypesById = await loadContentTypesById([row.contentTypeId]);
  return mapRow(row, {
    contentType: contentTypesById.get(row.contentTypeId) ?? null,
  });
}

export {
  cleanupOverridesForDeletedEntry,
  cleanupOverridesForDeletedScreen,
  cleanupStaleScreenEntryPresentationOverrides,
  getScreenEntryPresentationOverrides,
  normalizeScreenEntryPresentationOverride,
  normalizeScreenEntryPresentationOverrideReplacePayload,
  saveScreenEntryPresentationOverrides,
  screenEntryPresentationOverrideReplaceSchema,
} from "./screenEntryPresentationOverrides";
