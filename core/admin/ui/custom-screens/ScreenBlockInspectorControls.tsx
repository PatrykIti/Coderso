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
import {
  sanitizeScreenAuthoringUrl,
  type CustomScreenBindingMode,
  type ScreenBlockStyleV1,
  type ScreenBlockV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../../../services/pages/pageDocumentV2";
import type { ContentField } from "../content-types/SchemaBuilder";
import {
  buildScreenInspectorFieldOptions,
  readScreenInspectorString,
  type ScreenBlockInspectorProps,
  type ScreenBlockStyleEdit,
  type ScreenBoxSide,
} from "./screenBlockInspectorModel";

/** Flat inspector row: a label above one focused control group. */
export function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
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
 * First-class flat bound-field row. Binding mode stays kind-owned and the
 * optional clear affordance is rendered only for an existing exact binding.
 */
export function BoundFieldRow({
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
  const allOptions = buildScreenInspectorFieldOptions(fields);
  const fieldOptions = filterTypes
    ? allOptions.filter((option) => filterTypes.includes(option.type))
    : allOptions;
  const selectedField =
    binding?.field ??
    readScreenInspectorString(block.data.field) ??
    fieldOptions[0]?.value ??
    "title";

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

/** Flat enum Select row shared by the per-kind inspector controls. */
export function EnumRow({
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

const boxSideLabels: ReadonlyArray<[ScreenBoxSide, string]> = [
  ["top", "Top"],
  ["right", "Right"],
  ["bottom", "Bottom"],
  ["left", "Left"],
];

export function BoxSpacingRow({
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

// The raw text lives in local state so typing a URL is not destroyed, while
// data.src only receives a value accepted by the Screen-owned media policy.
export function ImageSrcRow({
  block,
  onPatchBlockData,
}: {
  block: ScreenBlockV1;
  onPatchBlockData: ScreenBlockInspectorProps["onPatchBlockData"];
}) {
  const committed = readScreenInspectorString(block.data.src);
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
