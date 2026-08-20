import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentTypes, customScreens } from "../../db/schema";
import type { LegacyWidgetBlock } from "../renderContracts/legacyWidgetBlock";
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
  blocks: LegacyWidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities: CustomScreenCapabilities;
  revision: number;
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
  // TASK-569: optimistic-concurrency precondition. Required when the payload is
  // definition-bearing; a mismatch maps to custom_screen_conflict (HTTP 409).
  expectedRevision?: number;
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

type CustomScreenTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
    revision: row.revision,
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

const lockContentTypeContext = async (
  tx: CustomScreenTransaction,
  contentTypeId: string
): Promise<ContentTypeDefinitionContext> => {
  const [row] = await tx
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.id, contentTypeId))
    .for("key share");
  const context = mapContentTypeContext(row);
  if (!context) throw new Error("custom_screen_invalid");
  return context;
};

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
  const committed = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const name = normalizeName(input.name);
      const contentTypeId = normalizeContentTypeId(input.contentTypeId);
      const contentType = await lockContentTypeContext(tx, contentTypeId);
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
      const [row] = await tx
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
      return { row, contentType, warnings: buildBindingWarnings(sink) };
    },
    { isolationLevel: "read committed" }
  );
  return {
    ...mapRow(committed.row, { contentType: committed.contentType }),
    ...(committed.warnings.length > 0 ? { warnings: committed.warnings } : {}),
  };
}

export async function updateCustomScreen(id: string, input: CustomScreenUpdateInput) {
  const committed = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      // TASK-569 (N2): lock the screen row FIRST (FOR UPDATE), then resolve the
      // content type id from BOTH branches — the input when provided, otherwise the
      // locked row — before locking the content type context. A concurrent
      // contentTypeId change can therefore never produce a spurious
      // custom_screen_invalid 400, and a contentTypeId-changing PATCH validates
      // against the new content type.
      const [locked] = await tx
        .select()
        .from(customScreens)
        .where(eq(customScreens.id, id))
        .for("update");
      if (!locked) return null;
      const nextContentTypeId =
        input.contentTypeId !== undefined
          ? normalizeContentTypeId(input.contentTypeId)
          : locked.contentTypeId;
      const contentType = await lockContentTypeContext(tx, nextContentTypeId);
      // TASK-569: definition-bearing PATCHes carry an expectedRevision precondition.
      // The conditional UPDATE ... WHERE id = ? AND revision = ? maps zero returned
      // rows to custom_screen_conflict (HTTP 409) instead of silent last-writer-wins.
      // Definition-free metadata PATCHes (status/name/showInSidebar/...) proceed
      // without the revision check.
      const isDefinitionBearing =
        input.definition !== undefined || input.expectedRevision !== undefined;
      const baseDefinition = normalizeCustomScreenDefinitionForRead(
        { definition: locked.definition, schemaVersion: locked.schemaVersion },
        { contentType }
      );
      const nextSchemaVersion =
        input.schemaVersion === undefined
          ? baseDefinition.schemaVersion
          : normalizeCustomScreenSchemaVersion(input.schemaVersion);
      const rawInput = input as Record<string, unknown>;
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
          : { definition: baseDefinition },
        { contentType },
        sink
      );
      const sidebar = normalizeCustomScreenSidebarConfig({
        showInSidebar: input.showInSidebar ?? locked.showInSidebar,
        sidebarLabel: input.sidebarLabel !== undefined ? input.sidebarLabel : locked.sidebarLabel,
      });
      const collectionLink = normalizeCustomScreenCollectionLink({
        collectionRole:
          input.collectionRole !== undefined ? input.collectionRole : locked.collectionRole,
        compositionKey:
          input.compositionKey !== undefined ? input.compositionKey : locked.compositionKey,
      });
      const setValues = {
        name: input.name !== undefined ? normalizeName(input.name) : locked.name,
        contentTypeId: nextContentTypeId,
        status:
          input.status !== undefined
            ? normalizeStatus(input.status)
            : normalizeStatus(locked.status),
        collectionRole: collectionLink.collectionRole,
        compositionKey: collectionLink.compositionKey,
        showInSidebar: sidebar.showInSidebar,
        sidebarLabel: sidebar.sidebarLabel,
        schemaVersion: definition.schemaVersion,
        definition,
        updatedAt: new Date(),
      };
      let row: typeof customScreens.$inferSelect | undefined;
      if (isDefinitionBearing) {
        const expectedRevision = input.expectedRevision;
        if (expectedRevision == null) {
          throw new Error("custom_screen_revision_required");
        }
        [row] = await tx
          .update(customScreens)
          .set({ ...setValues, revision: sql`${customScreens.revision} + 1` })
          .where(and(eq(customScreens.id, id), eq(customScreens.revision, expectedRevision)))
          .returning();
        if (!row) throw new Error("custom_screen_conflict");
      } else {
        [row] = await tx
          .update(customScreens)
          .set(setValues)
          .where(eq(customScreens.id, id))
          .returning();
        if (!row) return null;
      }
      return { row, contentType, warnings: buildBindingWarnings(sink) };
    },
    { isolationLevel: "read committed" }
  );
  if (!committed) return null;
  return {
    ...mapRow(committed.row, { contentType: committed.contentType }),
    ...(committed.warnings.length > 0 ? { warnings: committed.warnings } : {}),
  };
}

export async function deleteCustomScreen(id: string) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [deleted] = await tx.delete(customScreens).where(eq(customScreens.id, id)).returning();
      return deleted ?? null;
    },
    { isolationLevel: "read committed" }
  );
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
