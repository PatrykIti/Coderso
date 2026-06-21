import type { AssistantActiveCustomScreenSurfaceContext } from "../../../services/assistant/actionPlanTypes";
import type { CustomScreenRecord } from "@/services/customScreensClient";
import {
  resolveCustomScreenCapabilities,
  type CustomScreenCapabilities,
} from "../../../services/customScreens/capabilities";
import type {
  CustomScreenBinding,
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  collectWritableBindingFields,
  resolveCustomScreenBindingContracts,
} from "../../../services/customScreens/bindingResolver";
import type { Block } from "@/ui/pages/builder/types";

type AssistantSurfaceBlock = Block | ScreenBlockV1;
type AssistantSurfaceBinding = CustomScreenBinding | ScreenFieldBinding;

const readBlockDataText = (block: AssistantSurfaceBlock, key: string) => {
  const data = block.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const summarizeBlocks = (blocks: AssistantSurfaceBlock[], options: { maxBlocks?: number } = {}) => {
  const maxBlocks = options.maxBlocks ?? 80;
  const result: AssistantActiveCustomScreenSurfaceContext["blocks"] = [];

  const visit = (items: AssistantSurfaceBlock[], pathPrefix: string) => {
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
        templateId:
          block.type === "template-section" ? readBlockDataText(block, "templateId") : null,
        templateName:
          block.type === "template-section" ? readBlockDataText(block, "templateName") : null,
      });

      if (result.length >= maxBlocks) return;
      if (childBlocks.length > 0) visit(childBlocks, `${path}.children`);
      for (const [slotId, value] of slotEntries) {
        if (result.length >= maxBlocks) break;
        if (Array.isArray(value))
          visit(value as AssistantSurfaceBlock[], `${path}.slots.${slotId}`);
      }
    });
  };

  visit(blocks, "");
  return result;
};

const bindingBlockId = (binding: AssistantSurfaceBinding) =>
  "blockId" in binding ? binding.blockId : binding.widgetId;

const normalizeBindings = (bindings: AssistantSurfaceBinding[]) =>
  bindings
    .map((binding) => ({
      widgetId: bindingBlockId(binding),
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
  blocks?: AssistantSurfaceBlock[];
  bindings?: AssistantSurfaceBinding[];
  capabilities?: CustomScreenCapabilities;
  selectedBlockId?: string | null;
  selectedEntryId?: string | null;
  warnings?: string[];
}): AssistantActiveCustomScreenSurfaceContext => {
  const blocks =
    input.blocks ??
    input.screen.definition?.editorView.document.sections.flatMap((section) => section.blocks) ??
    (input.screen.blocks as Block[]);
  const bindings =
    input.bindings ?? input.screen.definition?.editorView.bindings ?? input.screen.bindings;
  const capabilities =
    input.capabilities ??
    input.screen.capabilities ??
    resolveCustomScreenCapabilities({
      definition: input.screen.definition ?? undefined,
      blocks: input.screen.definition ? undefined : (blocks as Block[]),
      bindings: input.screen.definition ? undefined : (bindings as CustomScreenBinding[]),
    });
  const writableBindingFields =
    bindings.length > 0 && "blockId" in bindings[0]!
      ? Array.from(
          new Set(
            (bindings as ScreenFieldBinding[])
              .filter((binding) => binding.mode === "write" || binding.mode === "readwrite")
              .map((binding) => binding.field)
          )
        )
      : collectWritableBindingFields(bindings as CustomScreenBinding[], {
          contracts: resolveCustomScreenBindingContracts(blocks as Block[]),
          fallbackToModeOnly: false,
        });

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
    writableBindingFields: writableBindingFields.sort((left, right) => left.localeCompare(right)),
    warnings: input.warnings ?? [],
  };
};
