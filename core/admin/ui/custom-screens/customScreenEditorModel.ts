import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  findScreenBlockById,
  getFirstScreenBlockId,
  type ScreenBlockLocation,
} from "../../../services/customScreens/screenDocumentOps";

export type BuilderRouteVisit = Readonly<{ routeKey: string }>;

export type BuilderRouteMessage = Readonly<{
  routeVisit: BuilderRouteVisit;
  kind: "load" | "save";
  message: string;
}>;

export type BuilderLoadToken = Readonly<{
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  requestGeneration: number;
  draftGeneration: number;
}>;

export type BuilderSaveToken = Readonly<{
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  routeGeneration: number;
  saveGeneration: number;
  draftGeneration: number;
  externalEventGeneration: number;
  cacheEventOperationToken: symbol;
}>;

export type ScreenBindingOrphans = {
  blockOrphans: ScreenFieldBinding[];
  fieldOrphans: ScreenFieldBinding[];
};

export type ScreenDefinitionSource = {
  definition?: unknown;
  schemaVersion?: unknown;
  blocks?: unknown;
  bindings?: unknown;
};

export const buildCustomScreenEditorRouteKey = ({
  screenId,
  isCreateMode,
}: {
  screenId: string | null;
  isCreateMode: boolean;
}) => `${screenId ?? ""}\u0000${isCreateMode}`;

export const advanceBuilderDraftGeneration = (current: number) => current + 1;

export const runBuilderManualRefresh = ({
  saveActive,
  refresh,
}: {
  saveActive: boolean;
  refresh: () => void;
}) => {
  if (saveActive) return false;
  refresh();
  return true;
};

export const getBuilderExternalRevisionSaveError = (externalRevisionUnresolved: boolean) =>
  externalRevisionUnresolved ? "Refresh the newer Screen version before saving." : null;

export const normalizeScreenEditorText = (value: string) => value.trim();

const blockTreeContains = (blocks: readonly ScreenBlockV1[], blockId: string): boolean =>
  blocks.some(
    (block) =>
      block.id === blockId ||
      (block.children ? blockTreeContains(block.children, blockId) : false) ||
      (block.slots
        ? Object.values(block.slots).some((slotBlocks) => blockTreeContains(slotBlocks, blockId))
        : false)
  );

export const findScreenEditorBlockSectionId = (
  document: ScreenDocumentV1,
  blockId: string | null
) => {
  if (!blockId) return null;
  return (
    document.sections.find((section) => blockTreeContains(section.blocks, blockId))?.id ?? null
  );
};

const SCREEN_SYSTEM_FIELD_ROOTS = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

export const detectScreenBindingOrphans = (
  document: ScreenDocumentV1,
  bindings: readonly ScreenFieldBinding[],
  fields: ReadonlyArray<{ name: string }>
): ScreenBindingOrphans => {
  const liveIds = new Set<string>();
  const walk = (blocks: readonly ScreenBlockV1[]) =>
    blocks.forEach((block) => {
      liveIds.add(block.id);
      if (block.children) walk(block.children);
      if (block.slots) Object.values(block.slots).forEach(walk);
    });
  document.sections.forEach((section) => walk(section.blocks));

  // Schemaless content types allow every field root in the server normalizer.
  const allowAllFields = fields.length === 0;
  const allowedRoots = new Set<string>([
    ...SCREEN_SYSTEM_FIELD_ROOTS,
    ...fields.map((field) => field.name),
  ]);
  const blockOrphans: ScreenFieldBinding[] = [];
  const fieldOrphans: ScreenFieldBinding[] = [];
  for (const binding of bindings) {
    if (!liveIds.has(binding.blockId)) {
      blockOrphans.push(binding);
      continue;
    }
    if (allowAllFields) continue;
    const root = binding.field.split(".")[0] ?? binding.field;
    if (!allowedRoots.has(root)) fieldOrphans.push(binding);
  }
  return { blockOrphans, fieldOrphans };
};

export const uniqueFieldNames = (
  bindings: readonly ScreenFieldBinding[] | readonly string[]
): string[] => {
  const seen = new Set<string>();
  for (const item of bindings) {
    const field = typeof item === "string" ? item : item.field;
    const root = field.split(".")[0] ?? field;
    if (root) seen.add(root);
  }
  return [...seen];
};

export const buildScreenEditorSaveNotice = (
  warnings: ReadonlyArray<{ code: string; fields: readonly string[] }> | undefined
) => {
  const prunedFields = uniqueFieldNames(
    (warnings ?? [])
      .filter((warning) => warning.code === "binding_field_removed")
      .flatMap((warning) => warning.fields)
  );
  return prunedFields.length > 0
    ? `Removed binding(s) for deleted field(s): ${prunedFields.join(", ")}.`
    : null;
};

export const formatScreenEditorApiSaveError = (error: { message: string; details?: unknown }) => {
  const detail = error.details;
  const rawFields =
    detail && typeof detail === "object" && "fields" in detail
      ? (detail as { fields?: unknown }).fields
      : undefined;
  const fields = Array.isArray(rawFields)
    ? rawFields.filter((field): field is string => typeof field === "string")
    : [];
  return fields.length > 0 ? `${error.message} (field(s): ${fields.join(", ")})` : error.message;
};

export const resolveScreenEditorInitialSelection = (document: ScreenDocumentV1) => {
  const blockId = getFirstScreenBlockId(document);
  return {
    blockId,
    sectionId:
      findScreenEditorBlockSectionId(document, blockId) ?? document.sections[0]?.id ?? null,
  };
};

export const resolveScreenEditorDefinition = (
  screen: ScreenDefinitionSource | null | undefined
): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForRead({
    definition: screen?.definition,
    schemaVersion: screen?.schemaVersion,
    blocks: screen?.blocks,
    bindings: screen?.bindings,
  });

export const resolveScreenEditorSiblingList = (
  document: ScreenDocumentV1,
  location: ScreenBlockLocation
): ScreenBlockV1[] | null => {
  const section = document.sections.find((item) => item.id === location.sectionId);
  if (!section) return null;
  if (location.parentId === null) {
    return location.slotId === null ? section.blocks : null;
  }
  const parent = findScreenBlockById(document, location.parentId);
  if (!parent) return null;
  return location.slotId === null
    ? (parent.children ?? null)
    : (parent.slots?.[location.slotId] ?? null);
};
