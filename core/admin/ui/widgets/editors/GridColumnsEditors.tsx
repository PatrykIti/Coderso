import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  gridColumnsColumnMax,
  gridColumnsColumnMin,
  gridColumnsDefaults,
  gridColumnsGapTokens,
  gridColumnsSpanTokens,
  normalizeGridColumnsData,
  resolveGridColumnsVariant,
  type GridColumnsAlign,
  type GridColumnsBorderWidth,
  type GridColumnsData,
  type GridColumnsGap,
  type GridColumnsPadding,
  type GridColumnsRadius,
  type GridColumnsSpan,
  type GridColumnsVariantId,
} from "../../../../widgets/core/gridColumns";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";

const variantOptions: Array<{
  id: GridColumnsVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "equal",
    label: "Equal",
    description: "Balanced columns for predictable section structures.",
  },
  {
    id: "asymmetric",
    label: "Asymmetric",
    description: "Lead column is wider for mixed narrative and utility layouts.",
  },
  {
    id: "masonry-lite",
    label: "Masonry Lite",
    description: "Cardized column wrappers for dense compositions.",
  },
];

const spanOptions = gridColumnsSpanTokens.map((value) => ({
  id: value,
  label: `${value}/12`,
}));

const gapOptions = gridColumnsGapTokens.map((value) => ({
  id: value,
  label: value === "none" ? "None" : `Gap ${value}`,
}));

const alignOptions: Array<{ id: GridColumnsAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

const borderWidthOptions: Array<{ id: GridColumnsBorderWidth; label: string }> = [
  { id: "0", label: "0px" },
  { id: "1", label: "1px" },
  { id: "2", label: "2px" },
  { id: "3", label: "3px" },
];

const radiusOptions: Array<{ id: GridColumnsRadius; label: string }> = [
  { id: "none", label: "None" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
  { id: "2xl", label: "2XL" },
];

const paddingOptions: Array<{ id: GridColumnsPadding; label: string }> = [
  { id: "none", label: "None" },
  { id: "2", label: "Compact" },
  { id: "3", label: "Small" },
  { id: "4", label: "Default" },
  { id: "5", label: "Large" },
  { id: "6", label: "XL" },
];

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type ColumnData = NonNullable<GridColumnsData["columns"]>[number];
type LayoutData = NonNullable<GridColumnsData["layout"]>;
type StyleData = NonNullable<GridColumnsData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

const clampColumnsCount = (value: number) =>
  Math.max(gridColumnsColumnMin, Math.min(gridColumnsColumnMax, Math.floor(value)));

function normalizeValue(value: GridColumnsData): GridColumnsData {
  return normalizeGridColumnsData(value);
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: GridColumnsVariantId;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function updateValue(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  updater: (current: GridColumnsData) => GridColumnsData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateLayout(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  patch: Partial<LayoutData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateStyle(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function clearStyleField(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  key: keyof StyleData
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function setColumnsCount(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  requestedCount: number
) {
  const count = clampColumnsCount(requestedCount);
  updateValue(value, onChange, (current) => {
    const source = Array.isArray(current.columns) ? current.columns : [];
    const next = source.slice(0, count);

    while (next.length < count) {
      const index = next.length;
      next.push({
        id: String(index + 1),
        label: `Column ${index + 1}`,
        desktopSpan: "6",
        tabletSpan: "6",
        mobileSpan: "12",
      });
    }

    return {
      ...current,
      columns: next,
    };
  });
}

function updateColumn(
  value: GridColumnsData,
  onChange: (next: GridColumnsData) => void,
  index: number,
  patch: Partial<ColumnData>
) {
  updateValue(value, onChange, (current) => {
    const columns = Array.isArray(current.columns) ? [...current.columns] : [];
    if (!columns[index]) return current;
    columns[index] = {
      ...columns[index],
      ...patch,
    };
    return {
      ...current,
      columns,
    };
  });
}

function DiagnosticsSnapshot({ value }: { value: GridColumnsData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ColumnSizingGrid({
  value,
  onChange,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
}) {
  const normalized = normalizeValue(value);
  const columns = normalized.columns ?? [];

  return (
    <div className="space-y-3">
      {columns.map((column, index) => (
        <div key={column.id ?? `column-${index + 1}`} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Column {index + 1}</p>
            <Badge variant="outline">slot: column:{column.id ?? index + 1}</Badge>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Label
            </p>
            <Input
              value={column.label ?? ""}
              onChange={(event) =>
                updateColumn(value, onChange, index, { label: event.target.value })
              }
              placeholder={`Column ${index + 1}`}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Desktop
              </p>
              <Select
                value={column.desktopSpan ?? "6"}
                onValueChange={(next) =>
                  updateColumn(value, onChange, index, {
                    desktopSpan: next as GridColumnsSpan,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Desktop span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`desktop-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tablet
              </p>
              <Select
                value={column.tabletSpan ?? "6"}
                onValueChange={(next) =>
                  updateColumn(value, onChange, index, {
                    tabletSpan: next as GridColumnsSpan,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tablet span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`tablet-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mobile
              </p>
              <Select
                value={column.mobileSpan ?? "12"}
                onValueChange={(next) =>
                  updateColumn(value, onChange, index, {
                    mobileSpan: next as GridColumnsSpan,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mobile span" />
                </SelectTrigger>
                <SelectContent>
                  {spanOptions.map((option) => (
                    <SelectItem key={`mobile-${option.id}`} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnsCountControl({
  value,
  onChange,
}: {
  value: GridColumnsData;
  onChange: (next: GridColumnsData) => void;
}) {
  const normalized = normalizeValue(value);
  const count = normalized.columns?.length ?? gridColumnsColumnMin;
  const countOptions = Array.from(
    { length: gridColumnsColumnMax - gridColumnsColumnMin + 1 },
    (_, index) => String(index + gridColumnsColumnMin)
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Column configs</p>
      <Select
        value={String(count)}
        onValueChange={(next) => setColumnsCount(value, onChange, Number(next))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select number of columns" />
        </SelectTrigger>
        <SelectContent>
          {countOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Slot count is controlled in the Slots panel. Keep this in sync with `column` slot instances
        for predictable sizing.
      </p>
    </div>
  );
}

export function GridColumnsWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const columns = normalized.columns ?? [];
  const first = columns[0];
  const second = columns[1];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Grid style</p>
        <Select
          value={resolveGridColumnsVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            {variantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ColumnsCountControl value={value} onChange={onChange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Column 1 label</p>
          <Input
            value={first?.label ?? ""}
            onChange={(event) => updateColumn(value, onChange, 0, { label: event.target.value })}
            placeholder="Column 1"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Column 2 label</p>
          <Input
            value={second?.label ?? ""}
            onChange={(event) => updateColumn(value, onChange, 1, { label: event.target.value })}
            placeholder="Column 2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Horizontal gap</p>
          <Select
            value={normalized.layout?.gapX ?? gridColumnsDefaults.layout?.gapX ?? "6"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { gapX: next as GridColumnsGap })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Horizontal gap" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={`wizard-gap-x-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Vertical gap</p>
          <Select
            value={normalized.layout?.gapY ?? gridColumnsDefaults.layout?.gapY ?? "6"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { gapY: next as GridColumnsGap })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Vertical gap" />
            </SelectTrigger>
            <SelectContent>
              {gapOptions.map((option) => (
                <SelectItem key={`wizard-gap-y-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function GridColumnsVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? gridColumnsDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and layout structure"
        description="Choose grid behavior, alignment, and configuration count."
      >
        <VariantCards value={resolveGridColumnsVariant(variant)} onChange={onVariantChange} />

        <ColumnsCountControl value={value} onChange={onChange} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Cross-axis alignment</p>
          <Select
            value={normalized.layout?.align ?? "start"}
            onValueChange={(next) =>
              updateLayout(value, onChange, { align: next as GridColumnsAlign })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditorSection>

      <EditorSection
        title="Column sizing and labels"
        description="Set responsive span tokens and labels for each configured column."
      >
        <ColumnSizingGrid value={value} onChange={onChange} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setColumnsCount(
                value,
                onChange,
                (normalized.columns?.length ?? gridColumnsColumnMin) + 1
              )
            }
            disabled={(normalized.columns?.length ?? 0) >= gridColumnsColumnMax}
          >
            Add column config
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setColumnsCount(
                value,
                onChange,
                (normalized.columns?.length ?? gridColumnsColumnMin) - 1
              )
            }
            disabled={(normalized.columns?.length ?? 0) <= gridColumnsColumnMin}
          >
            Remove last config
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        title="Gap and column surface"
        description="Control spacing between columns and optional cardized wrappers."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Horizontal gap</p>
            <Select
              value={normalized.layout?.gapX ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapX: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Horizontal gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-x-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical gap</p>
            <Select
              value={normalized.layout?.gapY ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapY: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vertical gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-y-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cardized columns</p>
              <p className="text-xs text-muted-foreground">
                Wrap each column with background, border, and radius tokens.
              </p>
            </div>
            <Switch
              checked={Boolean(style.cardizeColumns)}
              onCheckedChange={(checked) =>
                updateStyle(value, onChange, { cardizeColumns: checked })
              }
            />
          </div>
        </div>

        {style.cardizeColumns ? (
          <>
            <ColorField
              label="Column background"
              value={style.columnBackground}
              onChange={(next) => updateStyle(value, onChange, { columnBackground: next })}
              onClear={() => clearStyleField(value, onChange, "columnBackground")}
              placeholder="var(--color-surface)"
              pickerFallback="#f8fafc"
            />

            <ColorField
              label="Column border color"
              value={style.columnBorderColor}
              onChange={(next) => updateStyle(value, onChange, { columnBorderColor: next })}
              onClear={() => clearStyleField(value, onChange, "columnBorderColor")}
              placeholder="var(--color-border)"
              pickerFallback="#e2e8f0"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Border width</p>
                <Select
                  value={style.columnBorderWidth ?? "1"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, {
                      columnBorderWidth: next as GridColumnsBorderWidth,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Border width" />
                  </SelectTrigger>
                  <SelectContent>
                    {borderWidthOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Corner radius</p>
                <Select
                  value={style.columnRadius ?? "xl"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, { columnRadius: next as GridColumnsRadius })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Corner radius" />
                  </SelectTrigger>
                  <SelectContent>
                    {radiusOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Internal padding</p>
                <Select
                  value={style.columnPadding ?? "4"}
                  onValueChange={(next) =>
                    updateStyle(value, onChange, { columnPadding: next as GridColumnsPadding })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Padding" />
                  </SelectTrigger>
                  <SelectContent>
                    {paddingOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Slots and runtime behavior"
        description="`grid-columns` uses repeatable `column` slots (`column:1`, `column:2`, ...)."
      >
        <p className="text-xs text-muted-foreground">
          Add or remove column slots in the Slots panel above tabs. This section controls styling
          and sizing tokens used when those slot instances render.
        </p>
      </EditorSection>
    </div>
  );
}

export function GridColumnsAdvancedEditor({ value, onChange }: WidgetEditorProps<GridColumnsData>) {
  const normalized = normalizeValue(value);
  const style = normalized.style ?? gridColumnsDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical layout tokens"
        description="Direct control over alignment, gaps, and per-column span tokens."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Align</p>
            <Select
              value={normalized.layout?.align ?? "start"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { align: next as GridColumnsAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                {alignOptions.map((option) => (
                  <SelectItem key={`advanced-align-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Gap X</p>
            <Select
              value={normalized.layout?.gapX ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapX: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap X" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`advanced-gap-x-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Gap Y</p>
            <Select
              value={normalized.layout?.gapY ?? "6"}
              onValueChange={(next) =>
                updateLayout(value, onChange, { gapY: next as GridColumnsGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap Y" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`advanced-gap-y-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Cardized columns</p>
            <Switch
              checked={Boolean(style.cardizeColumns)}
              onCheckedChange={(checked) =>
                updateStyle(value, onChange, { cardizeColumns: checked })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Border width</p>
            <Select
              value={style.columnBorderWidth ?? "1"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columnBorderWidth: next as GridColumnsBorderWidth })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Border width" />
              </SelectTrigger>
              <SelectContent>
                {borderWidthOptions.map((option) => (
                  <SelectItem key={`advanced-border-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Column padding</p>
            <Select
              value={style.columnPadding ?? "4"}
              onValueChange={(next) =>
                updateStyle(value, onChange, { columnPadding: next as GridColumnsPadding })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Column padding" />
              </SelectTrigger>
              <SelectContent>
                {paddingOptions.map((option) => (
                  <SelectItem key={`advanced-padding-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Raw payload snapshot"
        description="Runtime-oriented JSON view of normalized data."
      >
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
