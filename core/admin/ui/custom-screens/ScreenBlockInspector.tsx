import { Copy, MoveDown, MoveUp, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  sanitizeScreenAuthoringUrl,
  screenBlockAligns,
  screenBlockWidths,
  screenImageRatios,
  screenSectionColumnPresets,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  SCREEN_TAB_LABEL_MAX,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  type CustomScreenBindingMode,
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenFieldBinding,
  type ScreenSectionStyleV1,
  type ScreenSectionV1,
  type ScreenTabItem,
} from "../../../services/customScreens/customScreenSchemas";
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../../../services/pages/pageDocumentV2";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenBlockInspectorProps = {
  selectedBlock: ScreenBlockV1 | null;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  // TASK-498-01 A4: the inspector renders ONE flat body. The historical
  // `content|binding|layout|style|visibility` sub-values collapse to a single
  // shape; the prop is retained (type-stable) but its sub-value no longer routes.
  panel?: "all" | "content" | "binding" | "layout" | "style" | "visibility";
  showBlockActions?: boolean;
  // TASK-500-02 (optional): "Insert into" slot picker for a selected container.
  // Arms a slot-end insert point on the host (keyboard-first parity with the
  // canvas drop zones — those remain the primary surface). The inspector stays
  // dumb: the canvas builds the full ScreenInsertTarget from (parentId, slotId).
  onArmSlotInsert?: (parentId: string, slotId: string) => void;
  armedInsertSlotId?: string | null;
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

type FieldOption = {
  value: string;
  label: string;
  type: string;
};

const systemFieldOptions: FieldOption[] = [
  { value: "title", label: "Title", type: "system" },
  { value: "slug", label: "Slug", type: "system" },
  { value: "status", label: "Status", type: "system" },
  { value: "createdAt", label: "Created", type: "system" },
  { value: "updatedAt", label: "Updated", type: "system" },
  { value: "publishedAt", label: "Published", type: "system" },
];

const createBindingId = (blockId: string, propPath: string) =>
  `${blockId}-${propPath}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const createScreenFieldBinding = (input: {
  blockId: string;
  propPath: string;
  field: string;
  mode?: CustomScreenBindingMode;
}): ScreenFieldBinding => ({
  id: createBindingId(input.blockId, input.propPath),
  blockId: input.blockId,
  propPath: input.propPath,
  source: "entry",
  field: input.field,
  mode: input.mode ?? "readwrite",
});

const readString = (value: unknown) => (typeof value === "string" ? value : "");

const buildFieldOptions = (fields: ContentField[]): FieldOption[] => {
  const schemaFieldNames = new Set(fields.map((field) => field.name));
  return [
    ...systemFieldOptions.filter((field) => !schemaFieldNames.has(field.value)),
    ...fields.map((field) => ({
      value: field.name,
      label: field.label,
      type: field.type,
    })),
  ];
};

/**
 * TASK-498-01 A4: prototype flat inspector row — a label above a single control,
 * no bordered card (CustomScreenEditorPreview.tsx:72-79, :250-296).
 */
function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

type BoundFieldClearAffordance = Readonly<{
  label: string;
  onClear: () => void;
}>;

/**
 * First-class flat "Bound field" row (prototype :258-266). The binding MODE
 * ("Interaction" read/readwrite) is no longer a user-visible control — it is set
 * per-kind by the insert wiring (TASK-498-02 B4), so only the field Select ships.
 *
 * TASK-498-02 B4:
 *  - `filterTypes` restricts the option list per kind (stat → number, image → media,
 *    related-list → relation). Omitted = all fields (field / record-header / heading).
 *  - `bindMode` is passed EXPLICITLY into onPatchBinding: display kinds bind `read`,
 *    `field` + editable header bind `readwrite`. This is the single kind-based mode
 *    convention (NOT a propPath-keyed default, which cannot disambiguate `field`
 *    readwrite `value` from `stat` read `value`).
 *  - `onFieldSelected` is a side-effect fired on change (related-list uses it to sync
 *    `data.target` from the selected relation field — `handlePatchBinding` only
 *    auto-syncs `data` for propPath `value`, never for `items`).
 */
function BoundFieldRow({
  block,
  propPath,
  bindings,
  fields,
  onPatchBinding,
  filterTypes,
  bindMode,
  onFieldSelected,
  clearAffordance,
}: {
  block: ScreenBlockV1;
  propPath: string;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
  onPatchBinding: ScreenBlockInspectorProps["onPatchBinding"];
  filterTypes?: readonly string[];
  bindMode?: CustomScreenBindingMode;
  onFieldSelected?: (fieldName: string) => void;
  clearAffordance?: BoundFieldClearAffordance;
}) {
  const binding = bindings.find((item) => item.blockId === block.id && item.propPath === propPath);
  const allOptions = buildFieldOptions(fields);
  const fieldOptions = filterTypes
    ? allOptions.filter((option) => filterTypes.includes(option.type))
    : allOptions;
  const selectedField =
    binding?.field ?? readString(block.data.field) ?? fieldOptions[0]?.value ?? "title";

  return (
    <InspectorRow label="Bound field">
      {fieldOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matching fields on this content type.</p>
      ) : (
        <Select
          value={selectedField}
          onValueChange={(field) => {
            onPatchBinding(block.id, propPath, bindMode ? { field, mode: bindMode } : { field });
            onFieldSelected?.(field);
          }}
        >
          <SelectTrigger data-screen-bound-field="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label} ({field.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {binding && clearAffordance ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            clearAffordance.onClear();
          }}
        >
          {clearAffordance.label}
        </Button>
      ) : null}
    </InspectorRow>
  );
}

/** Flat enum Select row shared by the per-kind inspector controls (TASK-498-02 B4). */
function EnumRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <InspectorRow label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </InspectorRow>
  );
}

const readEnum = (value: unknown, fallback: string) =>
  typeof value === "string" && value ? value : fallback;

// TASK-503-03: block-level Layout (ScreenBlockStyleV1) authoring. onPatchBlock/
// updateScreenBlock REPLACES the `style` key wholesale (screenDocumentOps.ts:627),
// so buildStylePatch reads the CURRENT style, returns the FULL merged object, and
// prunes empty/default records to keep an absent-style document byte-stable.
type ScreenBoxSide = "top" | "right" | "bottom" | "left";

/** Sentinel for "no align key" — align "start" (mr-auto) is NOT a no-op, so it
 *  persists explicitly; only the sentinel prunes. Width "auto" IS the no-op
 *  default (empty class in the 503-02 map), so "auto" prunes. */
export const SCREEN_ALIGN_DEFAULT_OPTION = "__default__";

export type ScreenBlockStyleEdit =
  | { kind: "width"; value: string } // "auto" or unknown → prune key
  | { kind: "align"; value: string } // sentinel or unknown → prune key
  | { kind: "minHeight"; value: string } // "" / non-finite → prune; else floor+clamp 0..640
  | { kind: "box"; box: "margin" | "padding"; side: ScreenBoxSide; value: string };
// "" / non-finite → prune side; else floor+clamp 0..240

const clampTo = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(value)));

export const buildStylePatch = (
  current: ScreenBlockStyleV1 | undefined,
  edit: ScreenBlockStyleEdit
): ScreenBlockStyleV1 | undefined => {
  const next: ScreenBlockStyleV1 = { ...(current ?? {}) };
  switch (edit.kind) {
    case "width": {
      if (edit.value === "auto" || !(screenBlockWidths as readonly string[]).includes(edit.value)) {
        delete next.width;
      } else {
        next.width = edit.value as ScreenBlockStyleV1["width"];
      }
      break;
    }
    case "align": {
      if (
        edit.value === SCREEN_ALIGN_DEFAULT_OPTION ||
        !(screenBlockAligns as readonly string[]).includes(edit.value)
      ) {
        delete next.align;
      } else {
        next.align = edit.value as ScreenBlockStyleV1["align"];
      }
      break;
    }
    case "minHeight": {
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete next.minHeight;
      } else {
        next.minHeight = clampTo(
          parsed,
          SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
          SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max
        );
      }
      break;
    }
    case "box": {
      const record = { ...(next[edit.box] ?? {}) };
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete record[edit.side];
      } else {
        record[edit.side] = clampTo(
          parsed,
          PAGE_BLOCK_BOX_SPACING_CLAMP.min,
          PAGE_BLOCK_BOX_SPACING_CLAMP.max
        );
      }
      if (Object.keys(record).length === 0) delete next[edit.box];
      else next[edit.box] = record;
      break;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

// TASK-505-03 (Item A): SECTION-layout authoring (`ScreenSectionStyleV1`, a NEW
// channel shipped by 505-01 — NOT the dead `section.layout` field). Mirrors
// buildStylePatch: updateScreenSection REPLACES the `style` key wholesale
// (screenDocumentOps.ts:631 spreads the patch), so we read the CURRENT
// section.style, apply ONE edit, hand back the FULL merged object, and prune
// empty → undefined so an UNSET section stays byte-identical through save
// (absent style === today's vertical `space-y-4` stack).

// Sentinel for "no columns" — absent columns === today's vertical stack. Picking
// it PRUNES the key (mirrors SCREEN_ALIGN_DEFAULT_OPTION @:227).
export const SCREEN_SECTION_COLUMNS_DEFAULT_OPTION = "__stack__";

export type ScreenSectionStyleEdit =
  | { kind: "columns"; value: string } // sentinel / unknown preset → prune key
  | { kind: "columnGap"; value: string }; // "" / non-finite → prune; else floor+clamp 0..64

export const buildSectionLayoutPatch = (
  current: ScreenSectionStyleV1 | undefined,
  edit: ScreenSectionStyleEdit
): ScreenSectionStyleV1 | undefined => {
  const next: ScreenSectionStyleV1 = { ...(current ?? {}) };
  switch (edit.kind) {
    case "columns": {
      if (
        edit.value === SCREEN_SECTION_COLUMNS_DEFAULT_OPTION ||
        !(screenSectionColumnPresets as readonly string[]).includes(edit.value)
      ) {
        delete next.columns;
      } else {
        next.columns = edit.value as ScreenSectionStyleV1["columns"];
      }
      break;
    }
    case "columnGap": {
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete next.columnGap;
      } else {
        next.columnGap = clampTo(
          parsed,
          SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
          SCREEN_SECTION_COLUMN_GAP_CLAMP.max
        );
      }
      break;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

// Human-labelled Columns options. `value` stays the raw preset (loss-free
// round-trip); the label maps the fr intent for the author.
const screenSectionColumnOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: SCREEN_SECTION_COLUMNS_DEFAULT_OPTION, label: "Stacked (default)" },
  { value: "1", label: "1 column" },
  { value: "2", label: "2 equal" },
  { value: "3", label: "3 equal" },
  { value: "4", label: "4 equal" },
  { value: "1-1", label: "2 · equal (1:1)" },
  { value: "1-2", label: "2 · 1:2" },
  { value: "2-1", label: "2 · 2:1" },
  { value: "1-3", label: "2 · 1:3 (¼ · ¾)" },
  { value: "3-1", label: "2 · 3:1 (¾ · ¼)" },
  { value: "2-3", label: "2 · 2:3" },
  { value: "3-2", label: "2 · 3:2" },
  { value: "1-1-1", label: "3 · equal" },
  { value: "1-1-1-1", label: "4 · equal" },
];

/**
 * TASK-505-03 (Item A): the SECTION inspector, a distinct co-located component
 * shown when `selectedSectionId && !selectedBlockId` (the block inspector's
 * `!selectedBlock` early-return stays untouched — no section/block branch
 * tangling). Renders ONLY the section-layout group (Columns + gap). Reads
 * default to the sentinel/blank so an unset section shows "Stacked" + empty gap
 * and writes NOTHING until the user changes a control (byte-stable).
 */
export function ScreenSectionInspector({
  section,
  onPatchSection,
}: {
  section: ScreenSectionV1 | null;
  onPatchSection: (patch: { style?: ScreenSectionStyleV1 | undefined }) => void;
}) {
  if (!section) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a section on the canvas to edit its column layout.
      </div>
    );
  }
  const commitLayout = (edit: ScreenSectionStyleEdit) =>
    onPatchSection({ style: buildSectionLayoutPatch(section.style, edit) });

  return (
    <div className="flex flex-col gap-4" data-screen-section-layout-group="true">
      <EnumRow
        label="Columns"
        value={section.style?.columns ?? SCREEN_SECTION_COLUMNS_DEFAULT_OPTION}
        options={screenSectionColumnOptions}
        onChange={(value) => commitLayout({ kind: "columns", value })}
      />
      <InspectorRow label="Column gap (px)">
        <Input
          type="number"
          inputMode="numeric"
          min={SCREEN_SECTION_COLUMN_GAP_CLAMP.min}
          max={SCREEN_SECTION_COLUMN_GAP_CLAMP.max}
          value={section.style?.columnGap ?? ""}
          placeholder="16"
          data-screen-section-gap="true"
          // Gap only takes visible effect once columns is set (renderer default
          // 16 @505-02); authoring it while stacked is harmless (pruned/ignored)
          // — do NOT disable it.
          onChange={(event) => commitLayout({ kind: "columnGap", value: event.target.value })}
        />
      </InspectorRow>
      <p className="text-xs text-muted-foreground">
        Blocks flow left-to-right into the columns in canvas order. Pick “Stacked” to return to a
        single vertical column.
      </p>
    </div>
  );
}

const boxSideLabels: ReadonlyArray<[ScreenBoxSide, string]> = [
  ["top", "Top"],
  ["right", "Right"],
  ["bottom", "Bottom"],
  ["left", "Left"],
];

function BoxSpacingRow({
  box,
  label,
  style,
  onEdit,
}: {
  box: "margin" | "padding";
  label: string;
  style: ScreenBlockStyleV1 | undefined;
  onEdit: (edit: ScreenBlockStyleEdit) => void;
}) {
  return (
    <InspectorRow label={`${label} (px)`}>
      <div className="grid grid-cols-4 gap-2">
        {boxSideLabels.map(([side, sideLabel]) => (
          <Input
            key={side}
            type="number"
            inputMode="numeric"
            min={PAGE_BLOCK_BOX_SPACING_CLAMP.min}
            max={PAGE_BLOCK_BOX_SPACING_CLAMP.max}
            aria-label={`${label} ${sideLabel.toLowerCase()}`}
            value={style?.[box]?.[side] ?? ""}
            placeholder={sideLabel}
            onChange={(event) => onEdit({ kind: "box", box, side, value: event.target.value })}
          />
        ))}
      </div>
    </InspectorRow>
  );
}

// TASK-503-03: image src draft. The raw text lives in local state so typing
// "https://…" character-by-character is not destroyed, while data.src only ever
// receives the value accepted by the Screen-owned media authoring policy (the
// same policy the save path runs). Unsafe/incomplete → ""; safe → verbatim.
function ImageSrcRow({
  block,
  onPatchBlockData,
}: {
  block: ScreenBlockV1;
  onPatchBlockData: ScreenBlockInspectorProps["onPatchBlockData"];
}) {
  const committed = readString(block.data.src);
  const [draft, setDraft] = useState<{ blockId: string; value: string } | null>(null);
  const value = draft && draft.blockId === block.id ? draft.value : committed;
  return (
    <InspectorRow label="Image URL">
      <Input
        value={value}
        placeholder="https://… or /media/… — used when no field is bound"
        onChange={(event) => {
          const raw = event.target.value;
          setDraft({ blockId: block.id, value: raw });
          onPatchBlockData(block.id, { src: sanitizeScreenAuthoringUrl(raw, "media") ?? "" });
        }}
      />
    </InspectorRow>
  );
}

const nextTabId = (tabs: readonly ScreenTabItem[]) => {
  let suffix = tabs.length + 1;
  while (tabs.some((tab) => tab.id === `tab-${suffix}`)) suffix += 1;
  return `tab-${suffix}`;
};

const screenLabelLength = (value: string) => Array.from(value).length;

type ScreenTabLabelDraft = Readonly<{
  baseLabel: string;
  value: string;
}>;

function TabLabelInput({
  tab,
  index,
  onCommit,
}: {
  tab: ScreenTabItem;
  index: number;
  onCommit: (label: string) => void;
}) {
  const [draft, setDraft] = useState<ScreenTabLabelDraft>(() => ({
    baseLabel: tab.label,
    value: tab.label,
  }));
  const restoreCommitted = () => setDraft({ baseLabel: tab.label, value: tab.label });
  const commitDraft = (raw: string) => {
    const label = raw.trim();
    if (!label || screenLabelLength(label) > SCREEN_TAB_LABEL_MAX) return;
    if (label === tab.label) {
      restoreCommitted();
      return;
    }
    setDraft({ baseLabel: tab.label, value: label });
    onCommit(label);
  };

  return (
    <Input
      value={draft.value}
      data-screen-tab-label={tab.id}
      aria-label={`Label for ${tab.label}`}
      onChange={(event) => {
        setDraft({ baseLabel: tab.label, value: event.target.value });
      }}
      onBlur={(event) => commitDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          restoreCommitted();
        }
      }}
      placeholder={`Tab ${index + 1}`}
    />
  );
}

/** Tabs authoring keeps labels buffered and `data.tabs` / `slots` in lockstep. */
function TabsEditor({
  block,
  onPatchBlock,
  onArmSlotInsert,
  armedInsertSlotId,
}: {
  block: ScreenBlockV1;
  onPatchBlock: ScreenBlockInspectorProps["onPatchBlock"];
  onArmSlotInsert?: ScreenBlockInspectorProps["onArmSlotInsert"];
  armedInsertSlotId: string | null;
}) {
  const tabs = Array.isArray(block.data.tabs) ? (block.data.tabs as ScreenTabItem[]) : [];
  const slots = block.slots ?? {};

  const commit = (nextTabs: ScreenTabItem[], nextSlots: Record<string, ScreenBlockV1[]>) => {
    if (nextTabs.length < SCREEN_TABS_MIN || nextTabs.length > SCREEN_TABS_MAX) return;
    onPatchBlock(block.id, {
      data: { ...block.data, tabs: nextTabs },
      slots: nextSlots,
    });
  };

  const commitLabel = (tab: ScreenTabItem, label: string) => {
    commit(
      tabs.map((item) => (item.id === tab.id ? { ...item, label } : item)),
      slots
    );
  };

  return (
    <InspectorRow label="Tabs">
      <div className="flex flex-col gap-2">
        {tabs.map((tab, index) => {
          return (
            <div key={tab.id} className="flex flex-wrap items-center gap-2">
              <TabLabelInput
                key={`${block.id}:${tab.id}:${tab.label}`}
                tab={tab}
                index={index}
                onCommit={(label) => commitLabel(tab, label)}
              />
              <Button
                type="button"
                variant={armedInsertSlotId === tab.id ? "secondary" : "outline"}
                size="sm"
                aria-label={`Edit content for ${tab.label}`}
                aria-pressed={armedInsertSlotId === tab.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onArmSlotInsert?.(block.id, tab.id);
                }}
              >
                Edit content
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Remove ${tab.label || `tab ${index + 1}`}`}
                disabled={tabs.length <= SCREEN_TABS_MIN}
                onClick={(event) => {
                  event.stopPropagation();
                  if (tabs.length <= SCREEN_TABS_MIN) return;
                  const nextTabs = tabs.filter((_, itemIndex) => itemIndex !== index);
                  const nextSlots = Object.fromEntries(
                    Object.entries(slots).filter(([slotId]) => slotId !== tab.id)
                  );
                  commit(nextTabs, nextSlots);
                  const nearestTab = nextTabs[Math.min(index, nextTabs.length - 1)];
                  if (nearestTab) onArmSlotInsert?.(block.id, nearestTab.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={tabs.length >= SCREEN_TABS_MAX}
          onClick={(event) => {
            event.stopPropagation();
            if (tabs.length >= SCREEN_TABS_MAX) return;
            const nextId = nextTabId(tabs);
            const nextTabs = [...tabs, { id: nextId, label: `Tab ${tabs.length + 1}` }];
            commit(nextTabs, { ...slots, [nextId]: [] });
            onArmSlotInsert?.(block.id, nextId);
          }}
        >
          Add tab
        </Button>
      </div>
    </InspectorRow>
  );
}

export function ScreenBlockInspector({
  selectedBlock,
  bindings,
  fields,
  showBlockActions = true,
  onArmSlotInsert,
  armedInsertSlotId = null,
  onPatchBlock,
  onPatchBlockData,
  onPatchBinding,
  onMove,
  onDuplicate,
  onDelete,
}: ScreenBlockInspectorProps) {
  if (!selectedBlock) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a block on the canvas to edit its shared layout and field binding.
      </div>
    );
  }

  const patchData = (patch: Record<string, unknown>) => {
    onPatchBlockData(selectedBlock.id, patch);
  };

  const commitStyle = (edit: ScreenBlockStyleEdit) => {
    onPatchBlock(selectedBlock.id, {
      style: buildStylePatch(selectedBlock.style, edit),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {showBlockActions ? (
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Move selected block up"
            onClick={() => onMove(selectedBlock.id, "up")}
          >
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Move selected block down"
            onClick={() => onMove(selectedBlock.id, "down")}
          >
            <MoveDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Duplicate selected block"
            onClick={() => onDuplicate(selectedBlock.id)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Delete selected block"
            onClick={() => onDelete(selectedBlock.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {selectedBlock.type === "record-header" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="title"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
          />
          <InspectorRow label="Header text">
            <Input
              value={readString(selectedBlock.data.eyebrow)}
              onChange={(event) => patchData({ eyebrow: event.target.value })}
              placeholder="Eyebrow"
            />
            <Input
              value={readString(selectedBlock.data.subtitle)}
              onChange={(event) => patchData({ subtitle: event.target.value })}
              placeholder="Subtitle"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "field" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="value"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
          />
          <InspectorRow label="Field presentation">
            <Input
              value={readString(selectedBlock.data.label)}
              onChange={(event) => patchData({ label: event.target.value })}
              placeholder="Label"
            />
            <Input
              value={readString(selectedBlock.data.helper)}
              onChange={(event) => patchData({ helper: event.target.value })}
              placeholder="Helper text"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "field-group" ? (
        <InspectorRow label="Group presentation">
          <Input
            value={readString(selectedBlock.data.title)}
            onChange={(event) => patchData({ title: event.target.value })}
            placeholder="Group title"
          />
          <Input
            value={readString(selectedBlock.data.description)}
            onChange={(event) => patchData({ description: event.target.value })}
            placeholder="Description"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "columns" ? (
        <InspectorRow label="Columns">
          <Input
            value={readString(selectedBlock.data.label)}
            onChange={(event) => patchData({ label: event.target.value })}
            placeholder="Internal label"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "rich-text" ? (
        <InspectorRow label="Shared text">
          <Textarea
            value={readString(selectedBlock.data.content)}
            onChange={(event) => patchData({ content: event.target.value })}
            placeholder="Supporting text"
          />
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "heading" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="text"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            bindMode="read"
          />
          <InspectorRow label="Heading text">
            <Input
              value={readString(selectedBlock.data.text)}
              onChange={(event) => patchData({ text: event.target.value })}
              placeholder="Static heading text"
            />
          </InspectorRow>
          <EnumRow
            label="Level"
            value={String(
              typeof selectedBlock.data.level === "number" ? selectedBlock.data.level : 2
            )}
            options={[
              { value: "1", label: "Heading 1" },
              { value: "2", label: "Heading 2" },
              { value: "3", label: "Heading 3" },
            ]}
            onChange={(value) => patchData({ level: Number(value) })}
          />
          <EnumRow
            label="Align"
            value={readEnum(selectedBlock.data.align, "left")}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(value) => patchData({ align: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "text" ? (
        <>
          <InspectorRow label="Text">
            <Textarea
              value={readString(selectedBlock.data.content)}
              onChange={(event) => patchData({ content: event.target.value })}
              placeholder="Paragraph text"
            />
          </InspectorRow>
          <EnumRow
            label="Tone"
            value={readEnum(selectedBlock.data.tone, "default")}
            options={[
              { value: "default", label: "Default" },
              { value: "muted", label: "Muted" },
            ]}
            onChange={(value) => patchData({ tone: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "stat" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="value"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["number"]}
            bindMode="read"
          />
          <EnumRow
            label="Format"
            value={readEnum(selectedBlock.data.format, "number")}
            options={[
              { value: "number", label: "Number" },
              { value: "percent", label: "Percent" },
              { value: "money", label: "Money" },
            ]}
            onChange={(value) => patchData({ format: value })}
          />
          <EnumRow
            label="Trend"
            value={readEnum(selectedBlock.data.trend, "auto")}
            options={[
              { value: "auto", label: "Auto" },
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
              { value: "flat", label: "Flat" },
            ]}
            onChange={(value) => patchData({ trend: value })}
          />
          <InspectorRow label="Delta field">
            <Input
              value={readString(selectedBlock.data.deltaField)}
              onChange={(event) => patchData({ deltaField: event.target.value })}
              placeholder="Optional field name"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "divider" ? (
        <>
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "line")}
            options={[
              { value: "line", label: "Line" },
              { value: "space", label: "Space" },
              { value: "label", label: "Label" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          {readEnum(selectedBlock.data.variant, "line") === "label" ? (
            <InspectorRow label="Label">
              <Input
                value={readString(selectedBlock.data.label)}
                onChange={(event) => patchData({ label: event.target.value })}
                placeholder="Divider label"
              />
            </InspectorRow>
          ) : null}
        </>
      ) : null}

      {selectedBlock.type === "image" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="src"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["media"]}
            bindMode="read"
          />
          <ImageSrcRow block={selectedBlock} onPatchBlockData={onPatchBlockData} />
          <EnumRow
            label="Fit"
            value={readEnum(selectedBlock.data.fit, "cover")}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
            ]}
            onChange={(value) => patchData({ fit: value })}
          />
          <EnumRow
            label="Ratio"
            value={
              (screenImageRatios as readonly string[]).includes(
                readString(selectedBlock.data.ratio)
              )
                ? readString(selectedBlock.data.ratio)
                : "auto" // legacy free text (e.g. "16:9") DISPLAYS as Auto; the
              // stored value is only rewritten when the user changes the control
            }
            options={[
              { value: "auto", label: "Auto" },
              { value: "1/1", label: "Square (1:1)" },
              { value: "4/3", label: "4:3" },
              { value: "16/9", label: "16:9" },
              { value: "3/2", label: "3:2" },
            ]}
            onChange={(value) => patchData({ ratio: value })}
          />
        </>
      ) : null}

      {selectedBlock.type === "related-list" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="items"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            filterTypes={["relation"]}
            bindMode="read"
            onFieldSelected={(fieldName) => {
              const target = fields.find((item) => item.name === fieldName)?.relation?.target;
              patchData({ target: target ?? "" });
            }}
          />
          <InspectorRow label="Target">
            <Input value={readString(selectedBlock.data.target)} readOnly placeholder="Derived" />
          </InspectorRow>
          <InspectorRow label="Display field">
            <Input
              value={readString(selectedBlock.data.displayField)}
              onChange={(event) => patchData({ displayField: event.target.value })}
              placeholder="title"
            />
          </InspectorRow>
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "checklist")}
            options={[
              { value: "checklist", label: "Checklist" },
              { value: "activity", label: "Activity" },
              { value: "cards", label: "Cards" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          <InspectorRow label="Limit">
            <Input
              type="number"
              value={String(
                typeof selectedBlock.data.limit === "number" ? selectedBlock.data.limit : 5
              )}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                patchData({ limit: Number.isFinite(parsed) ? parsed : 5 });
              }}
              placeholder="5"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.type === "tabs" ? (
        <TabsEditor
          block={selectedBlock}
          onPatchBlock={onPatchBlock}
          onArmSlotInsert={onArmSlotInsert}
          armedInsertSlotId={armedInsertSlotId}
        />
      ) : null}

      {selectedBlock.type === "button" ? (
        <>
          <BoundFieldRow
            block={selectedBlock}
            propPath="href"
            bindings={bindings}
            fields={fields}
            onPatchBinding={onPatchBinding}
            bindMode="read"
            clearAffordance={{
              label: "Use static link",
              onClear: () => onPatchBinding(selectedBlock.id, "href", { field: "" }),
            }}
          />
          <EnumRow
            label="Action"
            value="link"
            options={[{ value: "link", label: "Link" }]}
            onChange={() => patchData({ action: "link" })}
          />
          <EnumRow
            label="Variant"
            value={readEnum(selectedBlock.data.variant, "primary")}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "ghost", label: "Ghost" },
            ]}
            onChange={(value) => patchData({ variant: value })}
          />
          <InspectorRow label="Link">
            <Input
              value={readString(selectedBlock.data.href)}
              onChange={(event) => patchData({ href: event.target.value })}
              placeholder="https://…"
            />
          </InspectorRow>
        </>
      ) : null}

      {selectedBlock.slots && Object.keys(selectedBlock.slots).length > 0 && onArmSlotInsert ? (
        // TASK-500-02: optional convenience — pick which slot of the selected
        // container the NEXT insert targets (slot-end). The canvas drop zones
        // and gaps stay the primary insertion surface.
        <InspectorRow label="Insert into">
          <Select
            value={armedInsertSlotId ?? undefined}
            onValueChange={(slotId) => onArmSlotInsert(selectedBlock.id, slotId)}
          >
            <SelectTrigger data-screen-insert-into="true">
              <SelectValue placeholder="Choose a slot" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(selectedBlock.slots).map((slotId) => (
                <SelectItem key={slotId} value={slotId}>
                  {slotId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspectorRow>
      ) : null}

      {selectedBlock.type === "legacy-widget" ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Legacy widget content is preserved as a read-only placeholder until it is rebuilt with
          native screen blocks.
        </div>
      ) : null}

      {/* TASK-503-03: block-level Layout (ScreenBlockStyleV1). Replaces the dead
          free-text "Background" row (block.variant — never read by the renderer;
          parent decision 1: removed, key still accepted by the schema). */}
      <div className="flex flex-col gap-4" data-screen-layout-group="true">
        <EnumRow
          label="Width"
          value={selectedBlock.style?.width ?? "auto"}
          options={[
            { value: "auto", label: "Auto" },
            { value: "full", label: "Full" },
            { value: "half", label: "Half" },
            { value: "third", label: "Third" },
            { value: "two-thirds", label: "Two thirds" },
          ]}
          onChange={(value) => commitStyle({ kind: "width", value })}
        />
        <EnumRow
          label="Align"
          value={selectedBlock.style?.align ?? SCREEN_ALIGN_DEFAULT_OPTION}
          options={[
            { value: SCREEN_ALIGN_DEFAULT_OPTION, label: "Default" },
            { value: "start", label: "Start" },
            { value: "center", label: "Center" },
            { value: "end", label: "End" },
            { value: "stretch", label: "Stretch" },
          ]}
          onChange={(value) => commitStyle({ kind: "align", value })}
        />
        <InspectorRow label="Min height (px)">
          <Input
            type="number"
            inputMode="numeric"
            min={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min}
            max={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max}
            value={selectedBlock.style?.minHeight ?? ""}
            placeholder="Auto"
            onChange={(event) => commitStyle({ kind: "minHeight", value: event.target.value })}
          />
        </InspectorRow>
        <BoxSpacingRow
          box="margin"
          label="Margin"
          style={selectedBlock.style}
          onEdit={commitStyle}
        />
        <BoxSpacingRow
          box="padding"
          label="Padding"
          style={selectedBlock.style}
          onEdit={commitStyle}
        />
      </div>
    </div>
  );
}
