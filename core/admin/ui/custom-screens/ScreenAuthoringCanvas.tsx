import {
  Copy,
  Layers,
  ListPlus,
  MoveDown,
  MoveUp,
  PanelTop,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
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
  type ScreenInsertTarget,
} from "../../../services/customScreens/screenDocumentOps";
import type { ContentField } from "../content-types/SchemaBuilder";
import { ScreenBlockInspector } from "./ScreenBlockInspector";
import { SCREEN_CANONICAL_KINDS, ScreenBlockLibrary } from "./ScreenBlockLibrary";
import { ScreenPanelToggleRail } from "./ScreenPanelToggleRail";
import { ScreenRuntimeRenderer } from "./ScreenRuntimeRenderer";

// TASK-498-01 A4: the tab-switched Content/Binding/Style categories collapse to a
// single flat "inspect" category. The rail carries four doc/block categories —
// Settings (doc-level), Insert, Layers (doc-level) and Inspect (block-level).
type ScreenAuthoringPanel = "settings" | "insert" | "layers" | "inspect";

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
  // TASK-500-01: section CRUD flows from the canvas chrome to the host handlers.
  onAddSection: () => void;
  onRenameSection: (sectionId: string, label: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onDeleteSection: (sectionId: string) => void;
  onAddBlock: (type: ScreenBlockKind, field?: ContentField) => void;
  // TASK-500-02: insertion targeting + drag-to-position. The canvas does NOT
  // render the affordances itself — it threads these into the embedded
  // <ScreenRuntimeRenderer mode="builder"> (the sole card/section/slot render
  // site) and into the inspector's optional "Insert into" slot picker.
  insertPoint: ScreenInsertTarget | null;
  onSetInsertPoint: (target: ScreenInsertTarget | null) => void;
  onDragMove: (blockId: string, target: ScreenInsertTarget) => void;
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
  onAddSection,
  onRenameSection,
  onMoveSection,
  onDeleteSection,
  onAddBlock,
  insertPoint,
  onSetInsertPoint,
  onDragMove,
  onPatchBlock,
  onPatchBlockData,
  onPatchBinding,
  onMove,
  onDuplicate,
  onDelete,
}: ScreenAuthoringCanvasProps) {
  // The rail is NEVER empty on load (the prototype always shows the palette,
  // CustomScreenEditorPreview.tsx:234-246): seed to "insert" so the palette
  // renders on first paint; selecting a block forces "inspect" (selectTarget).
  const [activePanel, setActivePanel] = useState<ScreenAuthoringPanel>("insert");
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
  // TASK-500-01: the command palette mirrors the FULL canonical kind set
  // (SCREEN_CANONICAL_KINDS = the 9 grid chips + field-group/columns/
  // record-header/rich-text) + a Structure "Add section" command. ONLY the
  // redundant per-field FIELDS group was removed — a field is added by the
  // `Field` chip and its bound field chosen in the inspector; `fields` stays a
  // prop (still feeds ScreenBlockLibrary + the inspector).
  const commandGroups = useMemo<AuthoringCommandGroup[]>(
    () => [
      {
        id: "blocks",
        label: "Blocks",
        commands: SCREEN_CANONICAL_KINDS.map((chip) => ({
          id: chip.kind,
          label: chip.label,
          description: screenBlockLabels[chip.kind],
          icon: chip.icon,
          run: () => onAddBlock(chip.kind),
        })),
      },
      {
        id: "structure",
        label: "Structure",
        commands: [
          {
            id: "add-section",
            label: "Add section",
            description: "Create a new top-level section.",
            icon: Plus,
            run: () => onAddSection(),
          },
        ],
      },
    ],
    [onAddBlock, onAddSection]
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
    // Selecting a block forces the flat Inspect body over the seeded palette.
    setActivePanel("inspect");
  };

  // TASK-498-01 A4: the four in-panel category icons (Settings / Insert / Layers /
  // Inspect), mirroring the Pages panel-category row. Category selection is
  // idempotent (never toggles the body to empty) so the rail is never blank.
  // Settings is doc-level and stays always-enabled; Inspect is block-level and
  // disabled until a block is selected.
  const toolbarPanels = [
    ...(settingsPanel
      ? [
          {
            id: "settings",
            label: "Settings",
            description: "Edit screen-level settings.",
            icon: Settings2,
            active: activePanel === "settings",
            onSelect: () => setActivePanel("settings"),
          },
        ]
      : []),
    {
      id: "insert",
      label: "Insert",
      description: "Add screen-owned blocks or bound fields.",
      icon: ListPlus,
      active: activePanel === "insert",
      onSelect: () => setActivePanel("insert"),
    },
    {
      id: "layers",
      label: "Layers",
      description: "Navigate sections and blocks.",
      icon: Layers,
      active: activePanel === "layers",
      onSelect: () => setActivePanel("layers"),
    },
    {
      id: "inspect",
      label: "Inspect",
      description: "Edit the selected block's bound field, content, and background.",
      icon: SlidersHorizontal,
      active: activePanel === "inspect",
      disabled: !selectedBlock,
      onSelect: () => setActivePanel("inspect"),
    },
  ];

  // Single consolidated body (Pages `railBody` parity): the active category
  // decides the body — no per-category content/binding/style sub-routing.
  const railBodyContent =
    activePanel === "settings" ? (
      settingsPanel
    ) : activePanel === "insert" ? (
      <ScreenBlockLibrary fields={fields} onAddBlock={onAddBlock} />
    ) : activePanel === "layers" ? (
      <AuthoringLayersPanel nodes={layerNodes} selection={selection} onSelect={selectTarget} />
    ) : (
      <ScreenBlockInspector
        selectedBlock={selectedBlock}
        bindings={bindings}
        fields={fields}
        panel="all"
        showBlockActions={false}
        // TASK-500-02: optional "Insert into" slot picker — arms a slot-end
        // insert point on the selected container (keyboard-first parity with
        // the canvas drop zones). The canvas builds the full target so the
        // inspector stays dumb about sections.
        armedInsertSlotId={
          insertPoint &&
          (insertPoint.kind === "slot-end" || insertPoint.kind === "slot-index") &&
          selectedBlock &&
          insertPoint.parentId === selectedBlock.id
            ? insertPoint.slotId
            : null
        }
        onArmSlotInsert={(parentId, slotId) =>
          onSetInsertPoint({
            kind: "slot-end",
            sectionId: findBlockSectionId(document, parentId) ?? document.sections[0]?.id ?? "",
            parentId,
            slotId,
          })
        }
        onPatchBlock={onPatchBlock}
        onPatchBlockData={onPatchBlockData}
        onPatchBinding={onPatchBinding}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );

  // TASK-498-01 A4: the Pages shell right-rail body — an in-panel HEAD row
  // (hide-panel button + target label + selection chip + block-action cluster /
  // command Search) over the category icon row (the RELOCATED, restyled
  // ScreenPanelToggleRail) over the single scrollable consolidated body. The
  // markup/classes are RE-CREATED locally (never importing the Pages rail) to
  // stay inside the custom-screen authoring boundary.
  const railBody = (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-col gap-2" data-screen-rail-head="true">
        {/* TASK-500-03: the redundant in-panel PanelRight "Hide panel" closer was
            removed — the host-supplied top-toolbar toggle (`panelToggle`) and the
            `reopenAffordance` chip are the SOLE panel controls (single hide
            surface, Pages parity). */}
        <div className="flex items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <PanelTop className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold">
              {selectedBlock ? blockLabel(selectedBlock) : "Screen"}
            </span>
            <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {selectedBlock ? selectedBlock.type : "Entry view"}
            </span>
          </div>
          {selectedBlock ? (
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label="Open command palette"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScreenPanelToggleRail panels={toolbarPanels} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{railBodyContent}</div>
    </div>
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
        // A4: the sub-toolbar now carries ONLY the Hide/Show-panel toggle — the
        // category rail, block-action cluster, and command Search moved into the
        // in-panel HEAD row (Pages parity).
        panelToggle
      }
      panel={railBody}
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
            style={panelOpen ? { paddingRight: 300 } : undefined}
            onClick={() => selectTarget(null)}
          >
            <div className="mx-auto w-full max-w-2xl space-y-4" data-screen-authoring-canvas="true">
              {previewNotice}
              <ScreenRuntimeRenderer
                document={document}
                bindings={bindings}
                values={values}
                fields={fields}
                mode="builder"
                selectedSectionId={selectedSectionId}
                selectedBlockId={selectedBlockId}
                insertPoint={insertPoint}
                onSetInsertPoint={onSetInsertPoint}
                onDragMove={onDragMove}
                onSelectSection={(sectionId) => selectTarget({ kind: "section", id: sectionId })}
                onRenameSection={onRenameSection}
                onMoveSection={onMoveSection}
                onDeleteSection={onDeleteSection}
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
              {/* A6 → TASK-500-01: prototype dashed "Add section" affordance
                  (CustomScreenEditorPreview.tsx:223-228). It now CREATES a real,
                  empty, named top-level section via the host handler — it no
                  longer opens the command palette. */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAddSection();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
                data-screen-add-section="true"
              >
                <Plus className="h-4 w-4" /> Add section
              </button>
            </div>
          </div>
        </>
      }
    />
  );
}
