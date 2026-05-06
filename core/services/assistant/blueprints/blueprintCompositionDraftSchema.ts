import { getBlueprintCapability } from "./blueprintCapabilityRegistry";

type JsonRecord = Record<string, unknown>;

export type ProviderBlueprintCompositionDraft = {
  schemaVersion: 1;
  primaryCapabilityId: string;
  adjunctCapabilityIds: string[];
  gatedCapabilityIds: string[];
  notes?: string[];
};

const draftKeys = new Set([
  "schemaVersion",
  "primaryCapabilityId",
  "adjunctCapabilityIds",
  "gatedCapabilityIds",
  "notes",
]);

const fail = (): never => {
  throw new Error("assistant_blueprint_composition_draft_invalid");
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : fail());

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown) => {
  const text = typeof value === "string" ? value : fail();
  const trimmed = text.trim();
  if (!trimmed) fail();
  return trimmed;
};

const readStringArray = (value: unknown) => {
  const entries = Array.isArray(value) ? value : fail();
  return entries.map((entry: unknown) => readText(entry));
};

const assertKnownCapability = (id: string) => {
  if (!getBlueprintCapability(id)) fail();
  return id;
};

const assertUnique = (values: string[]) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail();
    seen.add(value);
  }
};

export const normalizeProviderBlueprintCompositionDraft = (
  value: unknown
): ProviderBlueprintCompositionDraft => {
  const input = assertRecord(value);
  assertKeys(input, draftKeys);
  const schemaVersion =
    typeof input.schemaVersion === "number" && Number.isFinite(input.schemaVersion)
      ? input.schemaVersion
      : fail();
  if (schemaVersion !== 1) fail();

  const primaryCapabilityId = assertKnownCapability(readText(input.primaryCapabilityId));
  const adjunctCapabilityIds = readStringArray(input.adjunctCapabilityIds).map(
    assertKnownCapability
  );
  const gatedCapabilityIds = readStringArray(input.gatedCapabilityIds).map(assertKnownCapability);
  assertUnique([primaryCapabilityId, ...adjunctCapabilityIds, ...gatedCapabilityIds]);

  return {
    schemaVersion: 1,
    primaryCapabilityId,
    adjunctCapabilityIds,
    gatedCapabilityIds,
    ...(input.notes !== undefined ? { notes: readStringArray(input.notes) } : {}),
  };
};
