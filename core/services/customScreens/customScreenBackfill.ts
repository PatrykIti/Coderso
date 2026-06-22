import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type CustomScreenDefinitionContext,
} from "./customScreenSchemas";

export type CustomScreenV4BackfillRow = {
  id: string;
  schemaVersion?: unknown;
  definition?: unknown;
  blocks?: unknown;
  bindings?: unknown;
};

export type CustomScreenV4BackfillPatch = {
  id: string;
  schemaVersion: 4;
  definition: CustomScreenDefinition;
};

export function buildCustomScreenV4BackfillPatch(
  row: CustomScreenV4BackfillRow,
  context?: CustomScreenDefinitionContext
): CustomScreenV4BackfillPatch {
  const definition = normalizeCustomScreenDefinitionForRead(
    {
      definition: row.definition,
      schemaVersion: row.schemaVersion,
      blocks: row.blocks,
      bindings: row.bindings,
    },
    context
  );

  return {
    id: row.id,
    schemaVersion: 4,
    definition,
  };
}
