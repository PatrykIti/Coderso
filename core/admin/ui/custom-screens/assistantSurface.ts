import type { AssistantActiveCustomScreenSurfaceContext } from "../../../services/assistant/actionPlanTypes";
import type { CustomScreenRecord } from "@/services/customScreensClient";
import {
  resolveCustomScreenCapabilities,
  type CustomScreenCapabilities,
} from "../../../services/customScreens/capabilities";
import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import type { Block } from "@/ui/pages/builder/types";

const readBlockDataText = (block: Block, key: string) => {
  const data = block.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const summarizeBlocks = (blocks: Block[], options: { maxBlocks?: number } = {}) => {
  const maxBlocks = options.maxBlocks ?? 80;
  const result: AssistantActiveCustomScreenSurfaceContext["blocks"] = [];

  const visit = (items: Block[], pathPrefix: string) => {
    items.forEach((block, index) => {
      if (result.length >= maxBlocks) return;
      const path = pathPrefix ? `${pathPrefix}.${index}` : String(index);
      const slotEntries =
        block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)
          ? Object.entries(block.slots)
          : [];
      const childBlocks = Array.isArray(block.children) ? block.children : [];
      const slotChildCount = slotEntries.reduce(
        (count, [, value]) => count + (Array.isArray(value) ? value.length : 0),
        0
      );
      result.push({
        id: block.id,
        type: block.type,
        label: readBlockDataText(block, "title") ?? readBlockDataText(block, "headline"),
        path,
        childCount: childBlocks.length + slotChildCount,
        slotKeys: slotEntries.map(([key]) => key).sort((left, right) => left.localeCompare(right)),
        templateId: block.type === "template-section" ? readBlockDataText(block, "templateId") : null,
        templateName: block.type === "template-section" ? readBlockDataText(block, "templateName") : null,
      });

      if (result.length >= maxBlocks) return;
      if (childBlocks.length > 0) visit(childBlocks, `${path}.children`);
      for (const [slotId, value] of slotEntries) {
        if (result.length >= maxBlocks) break;
        if (Array.isArray(value)) visit(value as Block[], `${path}.slots.${slotId}`);
      }
    });
  };

  visit(blocks, "");
  return result;
};

const normalizeBindings = (bindings: CustomScreenBinding[]) =>
  bindings
    .map((binding) => ({
      widgetId: binding.widgetId,
      field: binding.field,
      propPath: binding.propPath,
      mode: binding.mode,
    }))
    .sort((left, right) =>
      `${left.widgetId}:${left.field}:${left.propPath}`.localeCompare(
        `${right.widgetId}:${right.field}:${right.propPath}`
      )
    );

export const buildCustomScreenAssistantSurface = (input: {
  screen: CustomScreenRecord;
  blocks?: Block[];
  bindings?: CustomScreenBinding[];
  capabilities?: CustomScreenCapabilities;
  selectedBlockId?: string | null;
  selectedEntryId?: string | null;
  warnings?: string[];
}): AssistantActiveCustomScreenSurfaceContext => {
  const blocks = input.blocks ?? (input.screen.blocks as Block[]);
  const bindings = input.bindings ?? input.screen.bindings;
  const capabilities =
    input.capabilities ??
    input.screen.capabilities ??
    resolveCustomScreenCapabilities({ blocks, bindings });
  const writableBindingFields = [
    ...new Set(
      bindings
        .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
        .map((binding) => binding.field)
    ),
  ];

  return {
    kind: "custom-screen",
    screen: {
      id: input.screen.id,
      name: input.screen.name,
      status: input.screen.status,
      contentTypeId: input.screen.contentTypeId,
      showInSidebar: input.screen.showInSidebar,
      sidebarLabel: input.screen.sidebarLabel,
      mode: capabilities.mode,
    },
    selectedEntryId: input.selectedEntryId ?? null,
    selectedBlockId: input.selectedBlockId ?? null,
    blocks: summarizeBlocks(blocks),
    bindings: normalizeBindings(bindings),
    writableBindingFields: writableBindingFields.sort((left, right) =>
      left.localeCompare(right)
    ),
    warnings: input.warnings ?? [],
  };
};
