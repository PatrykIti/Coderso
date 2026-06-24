import type {
  CustomScreenDefinition,
  CustomScreenDefinitionContext,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "./customScreenSchemas";
import { normalizeCustomScreenDefinitionForRead } from "./customScreenSchemas";
import { collectScreenDocumentBlocks } from "./screenDocumentOps";

export const customScreenOverrideErrorCodes = [
  "custom_screen_override_invalid",
  "custom_screen_override_not_found",
  "custom_screen_override_conflict",
] as const;

export const screenEntryPresentationOverridePropPaths = [
  "image",
  "mediaAssetId",
  "textSize",
  "textEmphasis",
  "tone",
] as const;

export const screenEntryPresentationTextSizes = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

export const screenEntryPresentationTextEmphasisValues = [
  "normal",
  "medium",
  "semibold",
  "bold",
] as const;

export const screenEntryPresentationToneValues = [
  "default",
  "muted",
  "strong",
  "neutral",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
] as const;

export type ScreenEntryPresentationOverridePropPath =
  (typeof screenEntryPresentationOverridePropPaths)[number];
export type ScreenEntryPresentationTextSize = (typeof screenEntryPresentationTextSizes)[number];
export type ScreenEntryPresentationTextEmphasis =
  (typeof screenEntryPresentationTextEmphasisValues)[number];
export type ScreenEntryPresentationTone = (typeof screenEntryPresentationToneValues)[number];
export type ScreenEntryPresentationOverrideValue =
  | string
  | ScreenEntryPresentationTextSize
  | ScreenEntryPresentationTextEmphasis
  | ScreenEntryPresentationTone;

export type ScreenEntryPresentationOverrideDraft = {
  blockId: string;
  propPath: ScreenEntryPresentationOverridePropPath;
  value: ScreenEntryPresentationOverrideValue;
};

export type ScreenEntryPresentationOverrideRecord = ScreenEntryPresentationOverrideDraft & {
  screenId: string;
  entryId: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScreenEntryPresentationOverrideReplacePayload = {
  overrides: ScreenEntryPresentationOverrideDraft[];
};

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

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);
const overridePropPathSet = new Set<string>(screenEntryPresentationOverridePropPaths);
const mediaPropPathSet = new Set<string>(["image", "mediaAssetId"]);
const textPresentationPropPathSet = new Set<string>(["textSize", "textEmphasis", "tone"]);
const textSizeSet = new Set<string>(screenEntryPresentationTextSizes);
const textEmphasisSet = new Set<string>(screenEntryPresentationTextEmphasisValues);
const toneSet = new Set<string>(screenEntryPresentationToneValues);
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
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createOverrideError = (code: (typeof customScreenOverrideErrorCodes)[number]) =>
  new Error(code);

const rejectUnknownOverrideKeys = (input: Record<string, unknown>, allowed: readonly string[]) => {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(input).find((key) => !allowedSet.has(key));
  if (unknown) throw createOverrideError("custom_screen_override_invalid");
};

const normalizeSafePath = (value: unknown, maxLength = 160) => {
  const text = normalizeText(value);
  if (!text || text.length > maxLength || !/^[a-zA-Z0-9_.-]+$/.test(text)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return text;
};

const normalizePropPath = (value: unknown): ScreenEntryPresentationOverridePropPath => {
  const propPath = normalizeSafePath(value);
  if (!overridePropPathSet.has(propPath)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return propPath as ScreenEntryPresentationOverridePropPath;
};

const normalizeStringEnumValue = (
  value: unknown,
  allowed: Set<string>
): ScreenEntryPresentationOverrideValue => {
  const text = normalizeText(value);
  if (!text || !allowed.has(text)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return text;
};

const normalizeMediaAssetId = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !uuidPattern.test(text)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return text;
};

const normalizeAllowedPresentationValue = (
  propPath: ScreenEntryPresentationOverridePropPath,
  value: unknown
): ScreenEntryPresentationOverrideValue => {
  if (propPath === "image" || propPath === "mediaAssetId") {
    return normalizeMediaAssetId(value);
  }
  if (propPath === "textSize") return normalizeStringEnumValue(value, textSizeSet);
  if (propPath === "textEmphasis") return normalizeStringEnumValue(value, textEmphasisSet);
  return normalizeStringEnumValue(value, toneSet);
};

export function normalizeScreenEntryPresentationOverride(
  input: unknown
): ScreenEntryPresentationOverrideDraft {
  if (!isRecord(input)) throw createOverrideError("custom_screen_override_invalid");
  rejectUnknownOverrideKeys(input, ["blockId", "propPath", "value"]);
  const blockId = normalizeSafePath(input.blockId);
  const propPath = normalizePropPath(input.propPath);
  return {
    blockId,
    propPath,
    value: normalizeAllowedPresentationValue(propPath, input.value),
  };
}

export function normalizeScreenEntryPresentationOverrideReplacePayload(
  input: unknown
): ScreenEntryPresentationOverrideReplacePayload {
  if (!isRecord(input)) throw createOverrideError("custom_screen_override_invalid");
  rejectUnknownOverrideKeys(input, ["overrides"]);
  if (!Array.isArray(input.overrides) || input.overrides.length > 200) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return {
    overrides: input.overrides.map(normalizeScreenEntryPresentationOverride),
  };
}

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

const isMediaFieldDefinition = (definition: unknown) => {
  if (!isRecord(definition)) return false;
  if (definition.xFieldType === "media") return true;
  const fieldConfig = definition.xFieldConfig;
  if (isRecord(fieldConfig) && isRecord(fieldConfig.media)) return true;
  return false;
};

const isMediaFieldResolvable = (field: string, properties: Record<string, unknown>) => {
  const root = readFieldRoot(field);
  if (!Object.prototype.hasOwnProperty.call(properties, root)) return false;
  return isMediaFieldDefinition(properties[root]);
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
    if (block.type !== "field") return false;
    const field = resolveFieldBlockField(block, bindings);
    return field ? isMediaFieldResolvable(field, properties) : false;
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

const normalizeStoredOverride = (
  row: ScreenEntryPresentationOverrideRecord
): ScreenEntryPresentationOverrideRecord | null => {
  try {
    const normalized = normalizeScreenEntryPresentationOverride({
      blockId: row.blockId,
      propPath: row.propPath,
      value: row.value,
    });
    return {
      screenId: row.screenId,
      entryId: row.entryId,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...normalized,
    };
  } catch {
    return null;
  }
};

export function resolveActiveScreenEntryPresentationOverrides(input: {
  overrides: ScreenEntryPresentationOverrideRecord[];
  definition: CustomScreenDefinition;
  contentType: ScreenEntryPresentationOverrideScreenContext["contentType"];
}) {
  return input.overrides.flatMap((row) => {
    const normalized = normalizeStoredOverride(row);
    if (!normalized) return [];
    return isOverrideTargetActive(normalized, input.definition, input.contentType)
      ? [normalized]
      : [];
  });
}

let defaultRepositoryPromise: Promise<ScreenEntryPresentationOverrideRepository> | null = null;

const createDefaultRepository = async (): Promise<ScreenEntryPresentationOverrideRepository> => {
  const [{ db }, schema, orm] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
    import("drizzle-orm"),
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
      return db.transaction(async (tx) => {
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
      });
    },
    async deleteByScreen(screenId) {
      const rows = await db.delete(table).where(orm.eq(table.screenId, screenId)).returning();
      return rows.length;
    },
    async deleteByEntry(entryId) {
      const rows = await db.delete(table).where(orm.eq(table.entryId, entryId)).returning();
      return rows.length;
    },
    async deleteExact(targets) {
      if (targets.length === 0) return 0;
      return db.transaction(async (tx) => {
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
      });
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

const normalizeScopeId = (value: unknown) => normalizeSafePath(value);

const normalizeActorId = (value: unknown) => {
  const actorId = normalizeText(value);
  if (!actorId || !uuidPattern.test(actorId)) {
    throw createOverrideError("custom_screen_override_invalid");
  }
  return actorId;
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

export const screenEntryPresentationOverrideSchema = {
  type: "object",
  required: ["blockId", "propPath", "value"],
  properties: {
    blockId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^[a-zA-Z0-9_.-]+$",
    },
    propPath: { enum: screenEntryPresentationOverridePropPaths },
    value: { type: "string", minLength: 1, maxLength: 160 },
  },
  additionalProperties: false,
} as const;

export const screenEntryPresentationOverrideReplaceSchema = {
  type: "object",
  required: ["overrides"],
  properties: {
    overrides: {
      type: "array",
      maxItems: 200,
      items: screenEntryPresentationOverrideSchema,
    },
  },
  additionalProperties: false,
} as const;
