import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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
  normalizeStackData,
  resolveStackVariant,
  stackDefaults,
  stackGapTokens,
  type StackAlign,
  type StackData,
  type StackDirection,
  type StackGap,
  type StackJustify,
  type StackVariantId,
} from "../../../../widgets/core/stack";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: StackVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "vertical",
    label: "Vertical",
    description: "Column-oriented flow for long-form page structure.",
  },
  {
    id: "horizontal",
    label: "Horizontal",
    description: "Row-oriented flow for compact grouped widgets.",
  },
  {
    id: "responsive",
    label: "Responsive",
    description: "Column on mobile and row from tablet upward.",
  },
];

const directionOptions: Array<{ id: StackDirection; label: string }> = [
  { id: "column", label: "Column" },
  { id: "row", label: "Row" },
];

const gapOptions = stackGapTokens.map((value) => ({
  id: value,
  label: value === "none" ? "None" : `Gap ${value}`,
}));

const alignOptions: Array<{ id: StackAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

const justifyOptions: Array<{ id: StackJustify; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "between", label: "Space between" },
];

function normalizeValue(value: StackData, variant: string): StackData {
  return normalizeStackData(value, variant);
}

function updateValue(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  updater: (current: StackData) => StackData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

type DirectionData = NonNullable<StackData["direction"]>;
type GapData = NonNullable<StackData["gap"]>;

function updateDirection(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  patch: Partial<DirectionData>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    direction: {
      ...current.direction,
      ...patch,
    },
  }));
}

function updateGap(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  patch: Partial<GapData>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    gap: {
      ...current.gap,
      ...patch,
    },
  }));
}

function updateMeta(
  value: StackData,
  variant: string,
  onChange: (next: StackData) => void,
  patch: Partial<Pick<StackData, "align" | "justify" | "wrap">>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection id={resolvedId} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: StackVariantId;
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

function DiagnosticsSnapshot({ value }: { value: StackData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function DirectionAndGapGrid({
  value,
  variant,
  onChange,
}: {
  value: StackData;
  variant: string;
  onChange: (next: StackData) => void;
}) {
  const normalized = normalizeValue(value, variant);
  const direction = normalized.direction ?? stackDefaults.direction!;
  const gap = normalized.gap ?? stackDefaults.gap!;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Desktop
        </p>
        <Select
          value={direction.desktop ?? "column"}
          onValueChange={(next) =>
            updateDirection(value, variant, onChange, { desktop: next as StackDirection })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            {directionOptions.map((option) => (
              <SelectItem key={`desktop-dir-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={gap.desktop ?? "6"}
          onValueChange={(next) =>
            updateGap(value, variant, onChange, { desktop: next as StackGap })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={`desktop-gap-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tablet
        </p>
        <Select
          value={direction.tablet ?? "column"}
          onValueChange={(next) =>
            updateDirection(value, variant, onChange, { tablet: next as StackDirection })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            {directionOptions.map((option) => (
              <SelectItem key={`tablet-dir-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={gap.tablet ?? "6"}
          onValueChange={(next) =>
            updateGap(value, variant, onChange, { tablet: next as StackGap })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={`tablet-gap-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mobile
        </p>
        <Select
          value={direction.mobile ?? "column"}
          onValueChange={(next) =>
            updateDirection(value, variant, onChange, { mobile: next as StackDirection })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            {directionOptions.map((option) => (
              <SelectItem key={`mobile-dir-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={gap.mobile ?? "4"}
          onValueChange={(next) =>
            updateGap(value, variant, onChange, { mobile: next as StackGap })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={`mobile-gap-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function StackWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<StackData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Stack style</p>
        <Select
          value={resolveStackVariant(variant)}
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Mobile direction</p>
        <Select
          value={normalized.direction?.mobile ?? "column"}
          onValueChange={(next) =>
            updateDirection(value, variant, onChange, { mobile: next as StackDirection })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Mobile direction" />
          </SelectTrigger>
          <SelectContent>
            {directionOptions.map((option) => (
              <SelectItem key={`wizard-mobile-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Base gap</p>
        <Select
          value={normalized.gap?.mobile ?? "4"}
          onValueChange={(next) => {
            const gap = next as StackGap;
            updateGap(value, variant, onChange, {
              mobile: gap,
              tablet: gap,
              desktop: gap,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Base gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={`wizard-gap-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Add widgets into the `content` slot from the insert dialog.
      </div>
    </div>
  );
}

export function StackVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<StackData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and flow"
        description="Choose stack behavior and overall flow preset."
      >
        <VariantCards value={resolveStackVariant(variant)} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection
        title="Responsive direction"
        description="Control flow direction independently per breakpoint."
      >
        <DirectionAndGapGrid value={value} variant={variant} onChange={onChange} />
      </EditorSection>

      <EditorSection
        title="Spacing and distribution"
        description="Configure cross-axis alignment and item distribution."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Align</p>
            <Select
              value={normalized.align ?? "stretch"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { align: next as StackAlign })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Align" />
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

          <div className="space-y-2">
            <p className="text-sm font-medium">Justify</p>
            <Select
              value={normalized.justify ?? "start"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { justify: next as StackJustify })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Justify" />
              </SelectTrigger>
              <SelectContent>
                {justifyOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Wrapping and slot behavior"
        description="Allow item wrapping when row direction is active."
      >
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Wrap items</p>
              <p className="text-xs text-muted-foreground">
                When enabled, row stacks can flow items onto a new line.
              </p>
            </div>
            <Switch
              checked={Boolean(normalized.wrap)}
              onCheckedChange={(checked) => updateMeta(value, variant, onChange, { wrap: checked })}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Stack uses a single fixed slot: `content`.</p>
      </EditorSection>
    </div>
  );
}

export function StackAdvancedEditor({ value, onChange, variant }: WidgetEditorProps<StackData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical flow tokens"
        description="Direct token-level control for direction, spacing, and flex behavior."
      >
        <DirectionAndGapGrid value={value} variant={variant} onChange={onChange} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Align</p>
            <Select
              value={normalized.align ?? "stretch"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { align: next as StackAlign })
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
            <p className="text-sm font-medium">Justify</p>
            <Select
              value={normalized.justify ?? "start"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { justify: next as StackJustify })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Justify" />
              </SelectTrigger>
              <SelectContent>
                {justifyOptions.map((option) => (
                  <SelectItem key={`advanced-justify-${option.id}`} value={option.id}>
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
              <p className="text-sm font-medium">Wrap</p>
              <p className="text-xs text-muted-foreground">Technical toggle for flex-wrap.</p>
            </div>
            <Switch
              checked={Boolean(normalized.wrap)}
              onCheckedChange={(checked) => updateMeta(value, variant, onChange, { wrap: checked })}
            />
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
