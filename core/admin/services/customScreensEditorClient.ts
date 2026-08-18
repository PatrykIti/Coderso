// TASK-467-02: browser editor/detail client for custom screens.
//
// Builder/editor routes import THIS module and run full definition
// normalization before rendering blocks/bindings. It intentionally wraps the
// lightweight list/cache client (customScreensClient.ts): list/sidebar flows
// keep the lightweight summary DTO, while editor routes upgrade records with
// the full definition, editor-view blocks/bindings, and capabilities here.

import type { WidgetBlock } from "../../widgets/types";
import type {
  CustomScreenBinding,
  CustomScreenDefinition,
  CustomScreenStatus,
} from "../../services/customScreens/customScreenContracts";
import type { CustomScreenBindingWarning } from "../../services/customScreens/customScreenContracts";
import { normalizeCustomScreenDefinitionForRead } from "../../services/customScreens/customScreenSchemas";
import {
  getCustomScreenEditorViewBindings,
  getCustomScreenEditorViewBlocks,
} from "../../services/customScreens/customScreenLegacyAdapters";
import {
  resolveCustomScreenCapabilities,
  type CustomScreenCapabilities,
} from "../../services/customScreens/capabilities";
import {
  getCachedCustomScreen,
  getCustomScreenRawCached,
  type CustomScreenSummaryRecord,
} from "./customScreensClient";

export type CustomScreenRecord = CustomScreenSummaryRecord & {
  definition: CustomScreenDefinition;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  capabilities: CustomScreenCapabilities;
  warnings?: CustomScreenBindingWarning[];
};

export type { CustomScreenStatus };

export type CustomScreenBindingWarningCarrier = {
  warnings?: CustomScreenBindingWarning[];
};

export function normalizeCustomScreenRecordForEditor(
  raw: CustomScreenSummaryRecord
): CustomScreenRecord {
  const definition = normalizeCustomScreenDefinitionForRead({
    definition: raw.definition,
    schemaVersion: raw.schemaVersion,
    blocks: raw.blocks,
    bindings: raw.bindings,
  });
  return {
    ...raw,
    definition,
    blocks: getCustomScreenEditorViewBlocks(definition),
    bindings: getCustomScreenEditorViewBindings(definition),
    capabilities: raw.capabilities ?? resolveCustomScreenCapabilities({ definition }),
    warnings: raw.warnings as CustomScreenBindingWarning[] | undefined,
  };
}

export async function getCustomScreenEditorCached(
  id: string,
  options?: { force?: boolean }
): Promise<CustomScreenRecord | null> {
  const raw = await getCustomScreenRawCached(id, options);
  return raw ? normalizeCustomScreenRecordForEditor(raw) : null;
}

export const getCachedCustomScreenEditor = (id: string): CustomScreenRecord | null => {
  const raw = getCachedCustomScreen(id);
  return raw ? normalizeCustomScreenRecordForEditor(raw) : null;
};
