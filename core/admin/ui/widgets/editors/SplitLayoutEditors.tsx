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
  normalizeSplitLayoutData,
  resolveSplitLayoutVariant,
  splitLayoutDefaults,
  splitLayoutGapTokens,
  type SplitLayoutCollapseMobile,
  type SplitLayoutData,
  type SplitLayoutGap,
  type SplitLayoutRatio,
  type SplitLayoutVariantId,
  type SplitLayoutVerticalAlign,
} from "../../../../widgets/core/splitLayout";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: SplitLayoutVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "50-50",
    label: "50 / 50",
    description: "Balanced left/right panes for neutral compositions.",
  },
  {
    id: "40-60",
    label: "40 / 60",
    description: "Supportive left pane and dominant right pane.",
  },
  {
    id: "60-40",
    label: "60 / 40",
    description: "Dominant left pane with supportive right pane.",
  },
];

const ratioOptions = variantOptions.map((option) => ({
  id: option.id,
  label: option.label,
}));

const collapseOptions: Array<{ id: SplitLayoutCollapseMobile; label: string }> = [
  { id: "stack", label: "Stack" },
  { id: "keep", label: "Keep split" },
];

const gapOptions = splitLayoutGapTokens.map((value) => ({
  id: value,
  label: `Gap ${value}`,
}));

const verticalAlignOptions: Array<{
  id: SplitLayoutVerticalAlign;
  label: string;
}> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

function normalizeValue(value: SplitLayoutData, variant: string): SplitLayoutData {
  return normalizeSplitLayoutData(value, variant);
}

function updateValue(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  updater: (current: SplitLayoutData) => SplitLayoutData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

function updateRatio(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  patch: Partial<NonNullable<SplitLayoutData["ratio"]>>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ratio: {
      ...current.ratio,
      ...patch,
    },
  }));
}

function updateMeta(
  value: SplitLayoutData,
  variant: string,
  onChange: (next: SplitLayoutData) => void,
  patch: Partial<
    Pick<
      SplitLayoutData,
      "collapseMobile" | "reverseOnMobile" | "gap" | "verticalAlign"
    >
  >
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
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
  value: SplitLayoutVariantId;
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

function DiagnosticsSnapshot({ value }: { value: SplitLayoutData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function SplitLayoutWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Split preset</p>
        <Select
          value={resolveSplitLayoutVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select split preset" />
          </SelectTrigger>
          <SelectContent>
            {ratioOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Mobile behavior</p>
        <Select
          value={normalized.collapseMobile ?? "stack"}
          onValueChange={(next) =>
            updateMeta(value, variant, onChange, {
              collapseMobile: next as SplitLayoutCollapseMobile,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Mobile behavior" />
          </SelectTrigger>
          <SelectContent>
            {collapseOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Base gap</p>
        <Select
          value={normalized.gap ?? splitLayoutDefaults.gap ?? "6"}
          onValueChange={(next) =>
            updateMeta(value, variant, onChange, { gap: next as SplitLayoutGap })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        Fill `left` and `right` slots via the insert dialog.
      </div>
    </div>
  );
}

export function SplitLayoutVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and pane ratio"
        description="Pick split preset and override desktop/tablet pane ratios."
      >
        <VariantCards value={resolveSplitLayoutVariant(variant)} onChange={onVariantChange} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Desktop ratio</p>
            <Select
              value={normalized.ratio?.desktop ?? "50-50"}
              onValueChange={(next) =>
                updateRatio(value, variant, onChange, {
                  desktop: next as SplitLayoutRatio,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Desktop ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={`desktop-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Tablet ratio</p>
            <Select
              value={normalized.ratio?.tablet ?? "50-50"}
              onValueChange={(next) =>
                updateRatio(value, variant, onChange, {
                  tablet: next as SplitLayoutRatio,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tablet ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={`tablet-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Mobile collapse behavior"
        description="Define stacking behavior and optional pane order reversal on mobile."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Collapse mode</p>
          <Select
            value={normalized.collapseMobile ?? "stack"}
            onValueChange={(next) =>
              updateMeta(value, variant, onChange, {
                collapseMobile: next as SplitLayoutCollapseMobile,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Collapse mode" />
            </SelectTrigger>
            <SelectContent>
              {collapseOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reverse on mobile</p>
              <p className="text-xs text-muted-foreground">
                Swap left/right pane order only on mobile.
              </p>
            </div>
            <Switch
              checked={Boolean(normalized.reverseOnMobile)}
              onCheckedChange={(checked) =>
                updateMeta(value, variant, onChange, { reverseOnMobile: checked })
              }
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Spacing and vertical alignment"
        description="Control pane spacing and vertical alignment across the split row."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Gap</p>
            <Select
              value={normalized.gap ?? "6"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { gap: next as SplitLayoutGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical align</p>
            <Select
              value={normalized.verticalAlign ?? "stretch"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, {
                  verticalAlign: next as SplitLayoutVerticalAlign,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vertical align" />
              </SelectTrigger>
              <SelectContent>
                {verticalAlignOptions.map((option) => (
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
        title="Pane slots"
        description="This widget has two fixed slots: `left` and `right`."
      >
        <p className="text-xs text-muted-foreground">
          Use insert dialog targeting to place widgets into each side.
        </p>
      </EditorSection>
    </div>
  );
}

export function SplitLayoutAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Technical split tokens"
        description="Direct access to ratio, collapse mode, gap and alignment tokens."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Desktop ratio</p>
            <Select
              value={normalized.ratio?.desktop ?? "50-50"}
              onValueChange={(next) =>
                updateRatio(value, variant, onChange, {
                  desktop: next as SplitLayoutRatio,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Desktop ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={`advanced-desktop-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Tablet ratio</p>
            <Select
              value={normalized.ratio?.tablet ?? "50-50"}
              onValueChange={(next) =>
                updateRatio(value, variant, onChange, {
                  tablet: next as SplitLayoutRatio,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tablet ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={`advanced-tablet-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Collapse mode</p>
            <Select
              value={normalized.collapseMobile ?? "stack"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, {
                  collapseMobile: next as SplitLayoutCollapseMobile,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Collapse mode" />
              </SelectTrigger>
              <SelectContent>
                {collapseOptions.map((option) => (
                  <SelectItem key={`advanced-collapse-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Gap</p>
            <Select
              value={normalized.gap ?? "6"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { gap: next as SplitLayoutGap })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`advanced-gap-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Vertical align</p>
            <Select
              value={normalized.verticalAlign ?? "stretch"}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, {
                  verticalAlign: next as SplitLayoutVerticalAlign,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Vertical align" />
              </SelectTrigger>
              <SelectContent>
                {verticalAlignOptions.map((option) => (
                  <SelectItem key={`advanced-align-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reverse on mobile</p>
                <p className="text-xs text-muted-foreground">
                  Technical toggle for mobile pane ordering.
                </p>
              </div>
              <Switch
                checked={Boolean(normalized.reverseOnMobile)}
                onCheckedChange={(checked) =>
                  updateMeta(value, variant, onChange, { reverseOnMobile: checked })
                }
              />
            </div>
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
