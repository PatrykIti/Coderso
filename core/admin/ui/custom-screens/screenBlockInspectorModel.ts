import {
  buildScreenFieldBindingId,
  screenBlockAligns,
  screenBlockWidths,
  screenSectionColumnPresets,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  SCREEN_SECTION_COLUMN_GAP_CLAMP,
  type CustomScreenBindingMode,
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenFieldBinding,
  type ScreenSectionStyleV1,
} from "../../../services/customScreens/customScreenSchemas";
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../../../services/pages/pageDocumentV2";
import type { ContentField } from "../content-types/SchemaBuilder";

export type ScreenBlockInspectorProps = {
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

export type ScreenInspectorFieldOption = {
  value: string;
  label: string;
  type: string;
};

const systemFieldOptions: ScreenInspectorFieldOption[] = [
  { value: "title", label: "Title", type: "system" },
  { value: "slug", label: "Slug", type: "system" },
  { value: "status", label: "Status", type: "system" },
  { value: "createdAt", label: "Created", type: "system" },
  { value: "updatedAt", label: "Updated", type: "system" },
  { value: "publishedAt", label: "Published", type: "system" },
];

export const createScreenFieldBinding = (input: {
  blockId: string;
  propPath: string;
  field: string;
  mode?: CustomScreenBindingMode;
}): ScreenFieldBinding => ({
  id: buildScreenFieldBindingId(input.blockId, input.propPath),
  blockId: input.blockId,
  propPath: input.propPath,
  source: "entry",
  field: input.field,
  mode: input.mode ?? "readwrite",
});

export const readScreenInspectorString = (value: unknown) =>
  typeof value === "string" ? value : "";

export const readScreenInspectorEnum = (value: unknown, fallback: string) =>
  typeof value === "string" && value ? value : fallback;

export const buildScreenInspectorFieldOptions = (
  fields: ContentField[]
): ScreenInspectorFieldOption[] => {
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

// TASK-503-03: block-level Layout (ScreenBlockStyleV1) authoring. onPatchBlock/
// updateScreenBlock REPLACES the `style` key wholesale, so buildStylePatch reads
// the current style, returns the full merged object, and prunes empty/default
// records to keep an absent-style document byte-stable.
export type ScreenBoxSide = "top" | "right" | "bottom" | "left";

/** Sentinel for "no align key". Align "start" persists explicitly; only the
 * sentinel prunes. Width "auto" is the no-op default and also prunes. */
export const SCREEN_ALIGN_DEFAULT_OPTION = "__default__";

export type ScreenBlockStyleEdit =
  | { kind: "width"; value: string }
  | { kind: "align"; value: string }
  | { kind: "minHeight"; value: string }
  | { kind: "box"; box: "margin" | "padding"; side: ScreenBoxSide; value: string };

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

/** Sentinel for absent columns, which render as the existing vertical stack. */
export const SCREEN_SECTION_COLUMNS_DEFAULT_OPTION = "__stack__";

export type ScreenSectionStyleEdit =
  | { kind: "columns"; value: string }
  | { kind: "columnGap"; value: string };

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
