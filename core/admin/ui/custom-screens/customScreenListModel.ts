import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { CustomScreenRecord } from "@/services/customScreensClient";

import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";

export type CustomScreenSidebarShortcutState =
  | "visible"
  | "configured_after_activation"
  | "hidden";

export type CustomScreenListRow = {
  screen: CustomScreenRecord;
  contentTypeLabel: string;
  contentTypeSlug?: string;
  modeLabel: string;
  sidebarShortcutLabel: string | null;
  sidebarShortcutState: CustomScreenSidebarShortcutState;
  updatedAt: string;
};

export type CustomScreenFilterStatus = "all" | "active" | "draft";

export type CustomScreenContentTypeFilterOption = {
  value: string;
  label: string;
};

const modeLabels = {
  "collection-only": "Collection",
  dashboard: "Dashboard",
  editor: "Editor",
} as const;

export const resolveCustomScreenModeLabel = (screen: CustomScreenRecord) => {
  const capabilities =
    screen.capabilities ??
    resolveCustomScreenCapabilities({
      blocks: screen.blocks,
      bindings: screen.bindings,
    });
  return modeLabels[capabilities.mode] ?? "Collection";
};

export const resolveCustomScreenSidebarShortcutState = (
  screen: CustomScreenRecord
): CustomScreenSidebarShortcutState => {
  if (!screen.showInSidebar) return "hidden";
  if (screen.status === "active") return "visible";
  return "configured_after_activation";
};

export const buildCustomScreenListRows = (
  screens: CustomScreenRecord[],
  contentTypes: ContentTypeSummary[]
): CustomScreenListRow[] => {
  const contentTypeMap = new Map(
    contentTypes.map((type) => [type.id, type] as const)
  );
  return screens.map((screen) => {
    const contentType = contentTypeMap.get(screen.contentTypeId);
    const sidebarShortcutState = resolveCustomScreenSidebarShortcutState(screen);
    return {
      screen,
      contentTypeLabel: contentType?.name ?? screen.contentTypeId,
      contentTypeSlug: contentType?.slug,
      modeLabel: resolveCustomScreenModeLabel(screen),
      sidebarShortcutLabel: screen.showInSidebar
        ? screen.sidebarLabel?.trim() || screen.name
        : null,
      sidebarShortcutState,
      updatedAt: screen.updatedAt,
    };
  });
};

export function filterCustomScreenRows(
  rows: CustomScreenListRow[],
  query: string,
  status: CustomScreenFilterStatus,
  contentTypeId: string
) {
  const normalized = query.trim().toLowerCase();
  return rows.filter((row) => {
    const screen = row.screen;
    const matchesQuery =
      !normalized ||
      screen.name.toLowerCase().includes(normalized) ||
      (screen.sidebarLabel ?? "").toLowerCase().includes(normalized) ||
      row.contentTypeLabel.toLowerCase().includes(normalized) ||
      screen.contentTypeId.toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || screen.status === status;
    const matchesContentType =
      contentTypeId === "all" || screen.contentTypeId === contentTypeId;
    return matchesQuery && matchesStatus && matchesContentType;
  });
}

export const buildCustomScreenContentTypeFilterOptions = (
  rows: CustomScreenListRow[],
  contentTypes: ContentTypeSummary[]
): CustomScreenContentTypeFilterOption[] => {
  const byId = new Map<string, string>();
  for (const type of contentTypes) {
    byId.set(type.id, type.name);
  }
  for (const row of rows) {
    if (!byId.has(row.screen.contentTypeId)) {
      byId.set(row.screen.contentTypeId, row.contentTypeLabel);
    }
  }
  return Array.from(byId.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
};
