import {
  Copy,
  Layers,
  LayoutPanelTop,
  ListPlus,
  MoveDown,
  MoveUp,
  Paintbrush,
  PanelTop,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Type,
} from "lucide-react";
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  AuthoringCommandPalette,
  AuthoringLayersPanel,
  type AuthoringCommandGroup,
  type AuthoringLayerNode,
  type AuthoringSelectionTarget,
} from "@/ui/authoring";
import { CanvasEditor } from "@/ui/shared/CanvasEditor";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  findScreenBlockById,
  screenBlockLabels,
  type ScreenBlockKind,
} from "../../../services/customScreens/screenDocumentOps";
import type { ContentField } from "../content-types/SchemaBuilder";
import { ScreenBlockInspector } from "./ScreenBlockInspector";
import { ScreenBlockLibrary } from "./ScreenBlockLibrary";
import { ScreenPanelToggleRail } from "./ScreenPanelToggleRail";
import { ScreenRuntimeRenderer } from "./ScreenRuntimeRenderer";

type ScreenAuthoringPanel =
  | "settings"
  | "insert"
  | "layers"
  | "content"
  | "binding"
  | "layout"
  | "style"
  | "visibility";

type ScreenAuthoringCanvasProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  values: Record<string, unknown>;
  previewNotice?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  // TASK-496-02: shared editor-chrome slots forwarded from CustomScreenEditorPage
  // so the Editor view routes through the same `CanvasEditor` shell as the List
  // view. `header` is the shared in-content PageHeader (this component authors
  // none of its own); `panelToggle` is the Hide/Show panel button (the real
  // setPanelOpen consumer); `reopenAffordance` is the host "Show panel" chip.
  header?: React.ReactNode;
  panelToggle?: React.ReactNode;
  reopenAffordance?: React.ReactNode;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  onSelectBlock: (blockId: string | null) => void;
  onAddBlock: (type: ScreenBlockKind, field?: ContentField) => void;
  onPatchBlock: (blockId: string, patch: Partial<ScreenBlockV1>) => void;
  onPatchBlockData: (blockId: string, patch: Record<string, unknown>) => void;
  onPatchBinding: (
    blockId: string,
    propPath: string,
    patch: Partial<Pick<ScreenFieldBinding, "field" | "mode">>
  ) => void;
  onMove: (blockId: string, direction: "up" | "down") => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
};

const blockLabel = (block: ScreenBlockV1) => {
  if (typeof block.data.label === "string" && block.data.label.trim()) {
    return block.data.label.trim();
  }
  if (typeof block.data.title === "string" && block.data.title.trim()) {
    return block.data.title.trim();
  }
  return screenBlockLabels[block.type as keyof typeof screenBlockLabels] ?? block.type;
};

const buildBlockLayerNodes = (
  blocks: readonly ScreenBlockV1[],
  sectionId: string
): AuthoringLayerNode[] =>
  blocks.map((block) => {
    const slotChildren =
      block.slots && typeof block.slots === "object"
        ? Object.entries(block.slots).flatMap(([slotId, items]) =>
            buildBlockLayerNodes(items, sectionId).map((node) => ({
              ...node,
              label: `${slotId}: ${node.label}`,
            }))
          )
        : [];
    const children = block.children ? buildBlockLayerNodes(block.children, sectionId) : [];
    return {
      id: block.id,
      label: blockLabel(block),
      kind: "block" as const,
      type: block.type,
      target: { kind: "block" as const, sectionId, id: block.id },
      children: [...children, ...slotChildren],
    };
  });

const buildLayerNodes = (document: ScreenDocumentV1): AuthoringLayerNode[] =>
  document.sections.map((section) => ({
    id: section.id,
    label:
      (typeof section.data.title === "string" && section.data.title.trim()) ||
      section.label ||
      "Section",
    kind: "section" as const,
    type: section.type,
    target: { kind: "section" as const, id: section.id },
    children: buildBlockLayerNodes(section.blocks, section.id),
  }));

const filterGroups = (groups: AuthoringCommandGroup[], query: string): AuthoringCommandGroup[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;
  return groups
    .map((group) => ({
      ...group,
      commands: group.commands.filter((command) =>
        `${command.label} ${command.description ?? ""}`.toLowerCase().includes(normalized)
      ),
    }))
    .filter((group) => group.commands.length > 0);
};

const blockTreeContains = (blocks: readonly ScreenBlockV1[], blockId: string): boolean =>
  blocks.some(
    (block) =>
      block.id === blockId ||
      (block.children ? blockTreeContains(block.children, blockId) : false) ||
      (block.slots
        ? Object.values(block.slots).some((slotBlocks) => blockTreeContains(slotBlocks, blockId))
        : false)
  );

const findBlockSectionId = (document: ScreenDocumentV1, blockId: string | null) => {
  if (!blockId) return null;
  return (
    document.sections.find((section) => blockTreeContains(section.blocks, blockId))?.id ?? null
  );
};

export function ScreenAuthoringCanvas({
  document,
  bindings,
  fields,
  values,
  previewNotice,
  settingsPanel,
  header,
  panelToggle,
  reopenAffordance,
  panelOpen,
  onPanelOpenChange,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onAddBlock,
  onPatchBlock,
  onPatchBlockData,
  onPatchBinding,
  onMove,
  onDuplicate,
  onDelete,
}: ScreenAuthoringCanvasProps) {
  const [activePanel, setActivePanel] = useState<ScreenAuthoringPanel | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const selectedBlock = findScreenBlockById(document, selectedBlockId);
  const resolvedSelectedSectionId =
    findBlockSectionId(document, selectedBlockId) ?? selectedSectionId;
  const selection: AuthoringSelectionTarget | null = selectedBlockId
    ? {
        kind: "block",
        sectionId: resolvedSelectedSectionId ?? document.sections[0]?.id ?? "",
        id: selectedBlockId,
      }
    : selectedSectionId
      ? { kind: "section", id: selectedSectionId }
      : null;
  const layerNodes = useMemo(() => buildLayerNodes(document), [document]);
  const commandGroups = useMemo<AuthoringCommandGroup[]>(
    () => [
      {
        id: "layout",
        label: "Blocks",
        commands: [
          {
            id: "record-header",
            label: "Record header",
            description: "Title-focused header bound to the active record.",
            icon: PanelTop,
            run: () => onAddBlock("record-header"),
          },
          {
            id: "field-group",
            label: "Field group",
            description: "Group related fields in one section.",
            icon: Layers,
            run: () => onAddBlock("field-group"),
          },
          {
            id: "columns",
            label: "Two columns",
            description: "Split fields into primary and secondary columns.",
            icon: LayoutPanelTop,
            run: () => onAddBlock("columns"),
          },
          {
            id: "rich-text",
            label: "Help text",
            description: "Static guidance shared by every record.",
            icon: Type,
            run: () => onAddBlock("rich-text"),
          },
        ],
      },
      {
        id: "fields",
        label: "Fields",
        commands: fields.map((field) => ({
          id: `field:${field.name}`,
          label: field.label,
          description: `${field.name} · ${field.type}`,
          icon: ListPlus,
          run: () => onAddBlock("field", field),
        })),
      },
    ],
    [fields, onAddBlock]
  );
  const filteredGroups = useMemo(
    () => filterGroups(commandGroups, commandQuery),
    [commandGroups, commandQuery]
  );
  const firstCommand = filteredGroups.flatMap((group) => group.commands)[0] ?? null;

  const selectTarget = (target: AuthoringSelectionTarget | null) => {
    if (!target) {
      onSelectBlock(null);
      onSelectSection(null);
      return;
    }
    if (target.kind === "section") {
      onSelectBlock(null);
      onSelectSection(target.id);
      return;
    }
    onSelectSection(target.sectionId);
    onSelectBlock(target.id);
    setActivePanel((current) => current ?? "content");
  };

  const toolbarPanels = [
    ...(settingsPanel
      ? [
          {
            id: "settings",
            label: "Settings",
            description: "Edit screen-level settings.",
            icon: Settings2,
            active: activePanel === "settings",
            onSelect: () => setActivePanel(activePanel === "settings" ? null : "settings"),
          },
        ]
      : []),
    {
      id: "insert",
      label: "Insert",
      description: "Add screen-owned blocks or bound fields.",
      icon: ListPlus,
      active: activePanel === "insert",
      onSelect: () => setActivePanel(activePanel === "insert" ? null : "insert"),
    },
    {
      id: "layers",
      label: "Layers",
      description: "Navigate sections and blocks.",
      icon: Layers,
      active: activePanel === "layers",
      onSelect: () => setActivePanel(activePanel === "layers" ? null : "layers"),
    },
    {
      id: "content",
      label: "Content",
      description: "Edit labels and shared text.",
      icon: Type,
      active: activePanel === "content",
      disabled: !selectedBlock,
      onSelect: () => setActivePanel(activePanel === "content" ? null : "content"),
    },
    {
      id: "binding",
      label: "Binding",
      description: "Connect the selected block to entry fields.",
      icon: SlidersHorizontal,
      active: activePanel === "binding",
      disabled: !selectedBlock,
      onSelect: () => setActivePanel(activePanel === "binding" ? null : "binding"),
    },
    {
      id: "style",
      label: "Style",
      description: "Adjust presentation metadata.",
      icon: Paintbrush,
      active: activePanel === "style",
      disabled: !selectedBlock,
      onSelect: () => setActivePanel(activePanel === "style" ? null : "style"),
    },
  ];

  const inspectorPanel =
    activePanel === "content" ||
    activePanel === "binding" ||
    activePanel === "layout" ||
    activePanel === "style" ||
    activePanel === "visibility" ? (
      <ScreenBlockInspector
        selectedBlock={selectedBlock}
        bindings={bindings}
        fields={fields}
        panel={activePanel}
        showBlockActions={false}
        onPatchBlock={onPatchBlock}
        onPatchBlockData={onPatchBlockData}
        onPatchBinding={onPatchBinding}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    ) : null;

  const floatingPanel =
    activePanel === "settings" ? (
      settingsPanel
    ) : activePanel === "insert" ? (
      <ScreenBlockLibrary fields={fields} onAddBlock={onAddBlock} />
    ) : activePanel === "layers" ? (
      <AuthoringLayersPanel nodes={layerNodes} selection={selection} onSelect={selectTarget} />
    ) : (
      inspectorPanel
    );

  const onCommandKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setCommandOpen(false);
      return;
    }
    if (event.key === "Enter" && firstCommand) {
      event.preventDefault();
      void firstCommand.run();
      setCommandOpen(false);
      setCommandQuery("");
    }
  };

  return (
    <CanvasEditor
      header={header}
      title="Entry-view builder"
      panelPosition="right"
      panelOpen={panelOpen}
      onPanelOpenChange={onPanelOpenChange}
      panelAriaLabel={`${selectedBlock ? blockLabel(selectedBlock) : "Screen"} tools`}
      panelDataProps={{ "data-screen-editor-panel": "true" }}
      reopenAffordance={reopenAffordance}
      toolbar={
        <>
          <ScreenPanelToggleRail panels={toolbarPanels} />
          {selectedBlock ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move selected block up"
                onClick={() => onMove(selectedBlock.id, "up")}
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Move selected block down"
                onClick={() => onMove(selectedBlock.id, "down")}
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Duplicate selected block"
                onClick={() => onDuplicate(selectedBlock.id)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete selected block"
                onClick={() => onDelete(selectedBlock.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Open command palette"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          {panelToggle}
        </>
      }
      panel={floatingPanel}
      canvas={
        <>
          {commandOpen ? (
            <AuthoringCommandPalette
              groups={filteredGroups}
              query={commandQuery}
              activeIndex={0}
              placeholder="Search screen blocks and fields"
              onQueryChange={setCommandQuery}
              onKeyDown={onCommandKeyDown}
              onClose={() => setCommandOpen(false)}
            />
          ) : null}
          <div
            className="min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"
            data-screen-editor-canvas-scroller="true"
            style={panelOpen && floatingPanel ? { paddingRight: 300 } : undefined}
            onClick={() => selectTarget(null)}
          >
            <div className="mx-auto w-full max-w-4xl space-y-4" data-screen-authoring-canvas="true">
              {previewNotice}
              <ScreenRuntimeRenderer
                document={document}
                bindings={bindings}
                values={values}
                fields={fields}
                mode="builder"
                selectedSectionId={selectedSectionId}
                selectedBlockId={selectedBlockId}
                onSelectSection={(sectionId) => selectTarget({ kind: "section", id: sectionId })}
                onSelectBlock={(blockId) =>
                  selectTarget({
                    kind: "block",
                    sectionId:
                      findBlockSectionId(document, blockId) ?? document.sections[0]?.id ?? "",
                    id: blockId,
                  })
                }
                emptyMessage="Use Insert or the command palette to add screen blocks."
              />
            </div>
          </div>
        </>
      }
    />
  );
}
