// TASK-467-02: lightweight browser custom-screen summary contract.
//
// This module is the SINGLE pure owner of the browser-side "summary" DTO used
// by list/sidebar/prefetch flows. It intentionally imports NO domain editor
// machinery: no full definition schema, no capability resolver, no binding
// resolver, and no widget runtime. Server responses already carry fully
// normalized definition/blocks/bindings/capabilities (see
// customScreenService.mapRow), so this contract preserves those payloads as
// pass-through values and only null-defaults the stable summary fields.
//
// It is Bun-free: importing it from Vitest must not touch the DB, settings,
// runtime adapters, or integration services.

import {
  customScreenCollectionRoleValues,
  type CustomScreenCollectionRole,
  type CustomScreenStatus,
} from "./customScreenContracts";

export type CustomScreenSummaryMode = "collection-only" | "dashboard" | "editor";

export type CustomScreenSummaryCapabilities = {
  mode: CustomScreenSummaryMode;
  hasBlocks: boolean;
  hasBindings: boolean;
  hasReadableBindings: boolean;
  hasWritableBindings: boolean;
  supportsDedicatedPreview: boolean;
  supportsDedicatedEditor: boolean;
  bindingCounts: {
    total: number;
    readable: number;
    writable: number;
  };
};

export type CustomScreenSummaryRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  collectionRole: CustomScreenCollectionRole | null;
  compositionKey: string | null;
  showInSidebar: boolean;
  sidebarLabel: string | null;
  schemaVersion: number;
  // Pass-through: the server already normalized these payloads. The editor
  // client re-runs full normalization on demand from the same values.
  definition?: unknown;
  blocks?: unknown[];
  bindings?: unknown[];
  capabilities?: CustomScreenSummaryCapabilities | null;
  // TASK-569: monotonic server revision used as the optimistic-concurrency
  // precondition on definition saves.
  revision?: number;
  createdAt: string;
  updatedAt: string;
  // TASK-505-03 (Item B3): transient binding-GC warnings attached to the
  // PATCH 200 response record; never persisted. Passed through so the editor
  // can surface them without re-deriving anything.
  warnings?: unknown;
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
  definition?: unknown;
};

export type CustomScreenUpdateInput = Partial<CustomScreenCreateInput> & {
  // TASK-569: optimistic-concurrency precondition sent on definition saves.
  expectedRevision?: number;
};

export type CustomScreenMutationOptions = Readonly<{
  cacheEventOperationToken?: symbol;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCustomScreenStatusValue = (value: unknown): value is CustomScreenStatus =>
  value === "draft" || value === "active";

const isCustomScreenCollectionRoleValue = (value: unknown): value is CustomScreenCollectionRole =>
  customScreenCollectionRoleValues.includes(value as CustomScreenCollectionRole);

const isSummaryCapabilities = (value: unknown): value is CustomScreenSummaryCapabilities => {
  if (!isRecord(value)) return false;
  const counts = isRecord(value.bindingCounts) ? value.bindingCounts : null;
  return (
    (value.mode === "collection-only" || value.mode === "dashboard" || value.mode === "editor") &&
    typeof value.hasBlocks === "boolean" &&
    typeof value.hasBindings === "boolean" &&
    typeof value.hasReadableBindings === "boolean" &&
    typeof value.hasWritableBindings === "boolean" &&
    typeof value.supportsDedicatedPreview === "boolean" &&
    typeof value.supportsDedicatedEditor === "boolean" &&
    counts !== null &&
    typeof counts.total === "number" &&
    typeof counts.readable === "number" &&
    typeof counts.writable === "number"
  );
};

export const isCustomScreenSummaryRecord = (value: unknown): value is CustomScreenSummaryRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.contentTypeId === "string" &&
  isCustomScreenStatusValue(value.status) &&
  (value.collectionRole === undefined ||
    value.collectionRole === null ||
    isCustomScreenCollectionRoleValue(value.collectionRole)) &&
  (value.compositionKey === undefined ||
    value.compositionKey === null ||
    typeof value.compositionKey === "string") &&
  (value.showInSidebar === undefined || typeof value.showInSidebar === "boolean") &&
  (value.sidebarLabel === undefined ||
    value.sidebarLabel === null ||
    typeof value.sidebarLabel === "string") &&
  typeof value.schemaVersion === "number" &&
  (value.capabilities === undefined ||
    value.capabilities === null ||
    isSummaryCapabilities(value.capabilities)) &&
  (value.revision === undefined || typeof value.revision === "number") &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

export const isCustomScreenSummaryList = (value: unknown): value is CustomScreenSummaryRecord[] =>
  Array.isArray(value) && value.every(isCustomScreenSummaryRecord);

export function normalizeCustomScreenSummaryRecord(
  item: CustomScreenSummaryRecord
): CustomScreenSummaryRecord {
  return {
    ...item,
    collectionRole: item.collectionRole ?? null,
    compositionKey: item.compositionKey ?? null,
    showInSidebar: item.showInSidebar ?? false,
    sidebarLabel: item.sidebarLabel ?? null,
    capabilities: item.capabilities ?? null,
  };
}
