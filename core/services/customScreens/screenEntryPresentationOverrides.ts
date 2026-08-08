import type {
  CustomScreenDefinition,
  CustomScreenDefinitionContext,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "./customScreenSchemas";
import {
  isScreenMediaAssetUuid,
  normalizeCustomScreenDefinitionForRead,
} from "./customScreenSchemas";
import {
  customScreenOverrideErrorCodes,
  isScreenEntryPresentationSingleMediaSchemaDefinition,
  normalizeScreenEntryPresentationOverrideList,
  normalizeScreenEntryPresentationOverrideReplacePayload,
  normalizeScreenEntryPresentationScopeId,
  type ScreenEntryPresentationOverrideDraft,
  type ScreenEntryPresentationOverridePropPath,
  type ScreenEntryPresentationOverrideRecord,
  type ScreenEntryPresentationOverrideValue,
} from "./screenEntryPresentationOverrideContract";
import { collectScreenDocumentBlocks } from "./screenDocumentOps";

export {
  customScreenOverrideErrorCodes,
  isScreenEntryPresentationSingleMediaField,
  isScreenEntryPresentationSingleMediaSchemaDefinition,
  normalizeScreenEntryPresentationOverrideDraft as normalizeScreenEntryPresentationOverride,
  normalizeScreenEntryPresentationOverrideList,
  normalizeScreenEntryPresentationOverrideReplacePayload,
  screenEntryPresentationOverridePropPaths,
  screenEntryPresentationOverrideReplaceSchema,
  screenEntryPresentationOverrideSchema,
  screenEntryPresentationTextEmphasisValues,
  screenEntryPresentationTextSizes,
  screenEntryPresentationToneValues,
  type ScreenEntryPresentationOverrideDraft,
  type ScreenEntryPresentationOverridePropPath,
  type ScreenEntryPresentationOverrideRecord,
  type ScreenEntryPresentationOverrideReplacePayload,
  type ScreenEntryPresentationOverrideValue,
} from "./screenEntryPresentationOverrideContract";

export type ScreenEntryPresentationOverrideScreenContext = {
  id: string;
  contentTypeId: string;
  schemaVersion: unknown;
  definition: unknown;
  contentType: NonNullable<CustomScreenDefinitionContext["contentType"]> | null;
};

export type ScreenEntryPresentationOverrideEntryContext = {
  id: string;
  typeId: string;
};

export type ScreenEntryPresentationOverrideRepository = {
  loadScreen: (screenId: string) => Promise<ScreenEntryPresentationOverrideScreenContext | null>;
  loadEntry: (entryId: string) => Promise<ScreenEntryPresentationOverrideEntryContext | null>;
  listScopedOverrides: (
    screenId: string,
    entryId: string
  ) => Promise<ScreenEntryPresentationOverrideRecord[]>;
  listScreenOverrides: (screenId: string) => Promise<ScreenEntryPresentationOverrideRecord[]>;
  replaceScopedOverrides: (input: {
    screenId: string;
    entryId: string;
    overrides: ScreenEntryPresentationOverrideDraft[];
    actorId: string;
  }) => Promise<ScreenEntryPresentationOverrideRecord[]>;
  deleteByScreen: (screenId: string) => Promise<number>;
  deleteByEntry: (entryId: string) => Promise<number>;
  deleteExact: (
    targets: Array<{
      screenId: string;
      entryId: string;
      blockId: string;
      propPath: string;
    }>
  ) => Promise<number>;
};

export type ScreenEntryPresentationOverrideDeps = {
  repository?: ScreenEntryPresentationOverrideRepository;
};

type ScopeContext = {
  screen: ScreenEntryPresentationOverrideScreenContext;
  definition: CustomScreenDefinition;
  entry: ScreenEntryPresentationOverrideEntryContext;
};

type ScreenOnlyContext = {
  screen: ScreenEntryPresentationOverrideScreenContext;
  definition: CustomScreenDefinition;
};

const mediaPropPathSet = new Set<string>(["image", "mediaAssetId"]);
const textPresentationPropPathSet = new Set<string>(["textSize", "textEmphasis", "tone"]);
const systemFieldRoots = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);
const recordHeaderPresentationBindings = new Set([
  "title",
  "eyebrow",
  "subtitle",
  "description",
  "badge",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createOverrideError = (code: (typeof customScreenOverrideErrorCodes)[number]) =>
  new Error(code);

const assertUniqueOverrideTargets = (overrides: ScreenEntryPresentationOverrideDraft[]) => {
  const keys = new Set<string>();
  for (const override of overrides) {
    const key = `${override.blockId}\u0000${override.propPath}`;
    if (keys.has(key)) {
      throw createOverrideError("custom_screen_override_conflict");
    }
    keys.add(key);
  }
};

const readSchemaProperties = (
  contentType: ScreenEntryPresentationOverrideScreenContext["contentType"]
) => {
  const schema = contentType?.schema;
  if (!isRecord(schema)) return {};
  const properties = schema.properties;
  if (!isRecord(properties)) return {};
  return properties;
};

const readFieldRoot = (field: string) => field.split(".")[0] ?? field;

const isFieldResolvable = (field: string, properties: Record<string, unknown>) => {
  const root = readFieldRoot(field);
  return systemFieldRoots.has(root) || Object.prototype.hasOwnProperty.call(properties, root);
};

const isSingleMediaFieldResolvable = (field: string, properties: Record<string, unknown>) => {
  const root = readFieldRoot(field);
  if (!Object.prototype.hasOwnProperty.call(properties, root)) return false;
  return isScreenEntryPresentationSingleMediaSchemaDefinition(properties[root]);
};

const findBlockFieldBinding = (
  block: ScreenBlockV1,
  bindings: ScreenFieldBinding[],
  propPath: string
) => bindings.find((binding) => binding.blockId === block.id && binding.propPath === propPath);

const resolveFieldBlockField = (block: ScreenBlockV1, bindings: ScreenFieldBinding[]) => {
  const binding = findBlockFieldBinding(block, bindings, "value");
  if (binding) return binding.field;
  return normalizeText(block.data.field);
};

const areRecordHeaderBindingsResolvable = (
  block: ScreenBlockV1,
  bindings: ScreenFieldBinding[],
  properties: Record<string, unknown>
) =>
  bindings
    .filter(
      (binding) =>
        binding.blockId === block.id && recordHeaderPresentationBindings.has(binding.propPath)
    )
    .every((binding) => isFieldResolvable(binding.field, properties));

const isOverrideTargetActive = (
  override: ScreenEntryPresentationOverrideDraft,
  definition: CustomScreenDefinition,
  contentType: ScreenEntryPresentationOverrideScreenContext["contentType"]
) => {
  const blockMap = new Map(
    collectScreenDocumentBlocks(definition.editorView.document).map((block) => [block.id, block])
  );
  const block = blockMap.get(override.blockId);
  if (!block) return false;

  const properties = readSchemaProperties(contentType);
  const bindings = definition.editorView.bindings;

  if (mediaPropPathSet.has(override.propPath)) {
    if (block.type === "image") return true;
    if (block.type !== "field") return false;
    const field = resolveFieldBlockField(block, bindings);
    return field ? isSingleMediaFieldResolvable(field, properties) : false;
  }

  if (!textPresentationPropPathSet.has(override.propPath)) return false;

  if (block.type === "field") {
    const field = resolveFieldBlockField(block, bindings);
    return field ? isFieldResolvable(field, properties) : false;
  }

  if (block.type === "record-header") {
    return areRecordHeaderBindingsResolvable(block, bindings, properties);
  }

  return block.type === "rich-text";
};

export function resolveActiveScreenEntryPresentationOverrides(input: {
  overrides: ScreenEntryPresentationOverrideRecord[];
  definition: CustomScreenDefinition;
  contentType: ScreenEntryPresentationOverrideScreenContext["contentType"];
}) {
  const normalized = normalizeScreenEntryPresentationOverrideList(input.overrides, {
    source: "repository-record",
  });
  return normalized.filter((row) =>
    isOverrideTargetActive(row, input.definition, input.contentType)
  );
}

let defaultRepositoryPromise: Promise<ScreenEntryPresentationOverrideRepository> | null = null;

const createDefaultRepository = async (): Promise<ScreenEntryPresentationOverrideRepository> => {
  const [{ db }, schema, orm, { acquireNativeCmsWriterFence }] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
    import("drizzle-orm"),
    import("../../db/nativeCmsWriterFence"),
  ]);
  const table = schema.customScreenEntryPresentationOverrides;
  const mapRow = (row: typeof table.$inferSelect): ScreenEntryPresentationOverrideRecord => ({
    screenId: row.screenId,
    entryId: row.entryId,
    blockId: row.blockId,
    propPath: row.propPath as ScreenEntryPresentationOverridePropPath,
    value: row.value as ScreenEntryPresentationOverrideValue,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  return {
    async loadScreen(screenId) {
      const [row] = await db
        .select({
          id: schema.customScreens.id,
          contentTypeId: schema.customScreens.contentTypeId,
          schemaVersion: schema.customScreens.schemaVersion,
          definition: schema.customScreens.definition,
          contentTypeSlug: schema.contentTypes.slug,
          contentTypeName: schema.contentTypes.name,
          contentTypeSchema: schema.contentTypes.schema,
        })
        .from(schema.customScreens)
        .leftJoin(
          schema.contentTypes,
          orm.eq(schema.customScreens.contentTypeId, schema.contentTypes.id)
        )
        .where(orm.eq(schema.customScreens.id, screenId))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        contentTypeId: row.contentTypeId,
        schemaVersion: row.schemaVersion,
        definition: row.definition,
        contentType: row.contentTypeSchema
          ? {
              id: row.contentTypeId,
              slug: row.contentTypeSlug ?? undefined,
              name: row.contentTypeName ?? undefined,
              schema: row.contentTypeSchema as NonNullable<
                CustomScreenDefinitionContext["contentType"]
              >["schema"],
            }
          : null,
      };
    },
    async loadEntry(entryId) {
      const [row] = await db
        .select({ id: schema.contentEntries.id, typeId: schema.contentEntries.typeId })
        .from(schema.contentEntries)
        .where(orm.eq(schema.contentEntries.id, entryId))
        .limit(1);
      return row ?? null;
    },
    async listScopedOverrides(screenId, entryId) {
      const rows = await db
        .select()
        .from(table)
        .where(orm.and(orm.eq(table.screenId, screenId), orm.eq(table.entryId, entryId)))
        .orderBy(orm.asc(table.blockId), orm.asc(table.propPath));
      return rows.map(mapRow);
    },
    async listScreenOverrides(screenId) {
      const rows = await db
        .select()
        .from(table)
        .where(orm.eq(table.screenId, screenId))
        .orderBy(orm.asc(table.entryId), orm.asc(table.blockId), orm.asc(table.propPath));
      return rows.map(mapRow);
    },
    async replaceScopedOverrides(input) {
      return db.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          const [screen] = await tx
            .select({
              id: schema.customScreens.id,
              contentTypeId: schema.customScreens.contentTypeId,
            })
            .from(schema.customScreens)
            .where(orm.eq(schema.customScreens.id, input.screenId))
            .for("key share");
          const [entry] = await tx
            .select({ id: schema.contentEntries.id, typeId: schema.contentEntries.typeId })
            .from(schema.contentEntries)
            .where(orm.eq(schema.contentEntries.id, input.entryId))
            .for("key share");
          if (!screen || !entry || entry.typeId !== screen.contentTypeId) {
            throw createOverrideError("custom_screen_override_not_found");
          }
          await tx
            .delete(table)
            .where(
              orm.and(orm.eq(table.screenId, input.screenId), orm.eq(table.entryId, input.entryId))
            );

          const now = new Date();
          if (input.overrides.length > 0) {
            await tx.insert(table).values(
              input.overrides.map((override) => ({
                screenId: input.screenId,
                entryId: input.entryId,
                blockId: override.blockId,
                propPath: override.propPath,
                value: override.value,
                updatedBy: input.actorId,
                createdAt: now,
                updatedAt: now,
              }))
            );
          }

          const rows = await tx
            .select()
            .from(table)
            .where(
              orm.and(orm.eq(table.screenId, input.screenId), orm.eq(table.entryId, input.entryId))
            )
            .orderBy(orm.asc(table.blockId), orm.asc(table.propPath));
          return rows.map(mapRow);
        },
        { isolationLevel: "read committed" }
      );
    },
    async deleteByScreen(screenId) {
      return db.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          const rows = await tx.delete(table).where(orm.eq(table.screenId, screenId)).returning();
          return rows.length;
        },
        { isolationLevel: "read committed" }
      );
    },
    async deleteByEntry(entryId) {
      return db.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          const rows = await tx.delete(table).where(orm.eq(table.entryId, entryId)).returning();
          return rows.length;
        },
        { isolationLevel: "read committed" }
      );
    },
    async deleteExact(targets) {
      if (targets.length === 0) return 0;
      return db.transaction(
        async (tx) => {
          await acquireNativeCmsWriterFence(tx);
          let deleted = 0;
          for (const target of targets) {
            const rows = await tx
              .delete(table)
              .where(
                orm.and(
                  orm.eq(table.screenId, target.screenId),
                  orm.eq(table.entryId, target.entryId),
                  orm.eq(table.blockId, target.blockId),
                  orm.eq(table.propPath, target.propPath)
                )
              )
              .returning();
            deleted += rows.length;
          }
          return deleted;
        },
        { isolationLevel: "read committed" }
      );
    },
  };
};

const resolveRepository = async (deps?: ScreenEntryPresentationOverrideDeps) => {
  if (deps?.repository) return deps.repository;
  defaultRepositoryPromise ??= createDefaultRepository();
  return defaultRepositoryPromise;
};

const loadScreenContext = async (
  repository: ScreenEntryPresentationOverrideRepository,
  screenId: string
): Promise<ScreenOnlyContext> => {
  const screen = await repository.loadScreen(screenId);
  if (!screen) throw createOverrideError("custom_screen_override_not_found");
  const definition = normalizeCustomScreenDefinitionForRead(
    {
      definition: screen.definition,
      schemaVersion: screen.schemaVersion,
    },
    { contentType: screen.contentType }
  );
  return { screen, definition };
};

const loadScopeContext = async (
  repository: ScreenEntryPresentationOverrideRepository,
  screenId: string,
  entryId: string
): Promise<ScopeContext> => {
  const [screenContext, entry] = await Promise.all([
    loadScreenContext(repository, screenId),
    repository.loadEntry(entryId),
  ]);
  if (!entry || entry.typeId !== screenContext.screen.contentTypeId) {
    throw createOverrideError("custom_screen_override_not_found");
  }
  return { ...screenContext, entry };
};

const normalizeScopeId = (value: unknown) => normalizeScreenEntryPresentationScopeId(value);

const normalizeActorId = (value: unknown) => {
  if (!isScreenMediaAssetUuid(value)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return value;
};

export async function getScreenEntryPresentationOverrides(input: {
  screenId: string;
  entryId: string;
  deps?: ScreenEntryPresentationOverrideDeps;
}) {
  const screenId = normalizeScopeId(input.screenId);
  const entryId = normalizeScopeId(input.entryId);
  const repository = await resolveRepository(input.deps);
  const context = await loadScopeContext(repository, screenId, entryId);
  const rows = await repository.listScopedOverrides(screenId, entryId);
  return resolveActiveScreenEntryPresentationOverrides({
    overrides: rows,
    definition: context.definition,
    contentType: context.screen.contentType,
  });
}

export async function saveScreenEntryPresentationOverrides(input: {
  screenId: string;
  entryId: string;
  overrides: unknown;
  actorId: string;
  deps?: ScreenEntryPresentationOverrideDeps;
}) {
  const screenId = normalizeScopeId(input.screenId);
  const entryId = normalizeScopeId(input.entryId);
  const actorId = normalizeActorId(input.actorId);
  const { overrides } = normalizeScreenEntryPresentationOverrideReplacePayload({
    overrides: input.overrides,
  });
  assertUniqueOverrideTargets(overrides);

  const repository = await resolveRepository(input.deps);
  const context = await loadScopeContext(repository, screenId, entryId);
  if (
    overrides.some(
      (override) =>
        !isOverrideTargetActive(override, context.definition, context.screen.contentType)
    )
  ) {
    throw createOverrideError("custom_screen_override_invalid");
  }

  const rows = await repository.replaceScopedOverrides({
    screenId,
    entryId,
    overrides,
    actorId,
  });
  return resolveActiveScreenEntryPresentationOverrides({
    overrides: rows,
    definition: context.definition,
    contentType: context.screen.contentType,
  });
}

export async function cleanupOverridesForDeletedScreen(
  screenId: string,
  deps?: ScreenEntryPresentationOverrideDeps
) {
  const repository = await resolveRepository(deps);
  return repository.deleteByScreen(normalizeScopeId(screenId));
}

export async function cleanupOverridesForDeletedEntry(
  entryId: string,
  deps?: ScreenEntryPresentationOverrideDeps
) {
  const repository = await resolveRepository(deps);
  return repository.deleteByEntry(normalizeScopeId(entryId));
}

export async function cleanupStaleScreenEntryPresentationOverrides(input: {
  screenId: string;
  entryId?: string;
  deps?: ScreenEntryPresentationOverrideDeps;
}) {
  const screenId = normalizeScopeId(input.screenId);
  const entryId = input.entryId ? normalizeScopeId(input.entryId) : null;
  const repository = await resolveRepository(input.deps);
  const context = await loadScreenContext(repository, screenId);
  const rows = entryId
    ? await repository.listScopedOverrides(screenId, entryId)
    : await repository.listScreenOverrides(screenId);
  const active = resolveActiveScreenEntryPresentationOverrides({
    overrides: rows,
    definition: context.definition,
    contentType: context.screen.contentType,
  });
  const activeKeys = new Set(
    active.map((override) =>
      [override.screenId, override.entryId, override.blockId, override.propPath].join("\u0000")
    )
  );
  const staleTargets = rows.filter(
    (row) => !activeKeys.has([row.screenId, row.entryId, row.blockId, row.propPath].join("\u0000"))
  );
  const deleted = await repository.deleteExact(staleTargets);
  return {
    deleted,
    staleTargets,
  };
}
