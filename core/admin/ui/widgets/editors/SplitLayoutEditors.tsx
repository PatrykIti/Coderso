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
  formatSplitLayoutRatioLabel,
  getSplitLayoutDiagnostics,
  getSplitLayoutGapControlValue,
  getSplitLayoutGapOptions,
  getSplitLayoutRatioDisclosure,
  getSplitLayoutRatioSpans,
  normalizeSplitLayoutData,
  resolveSplitLayoutVariant,
  splitLayoutDefaults,
  type SplitLayoutCollapseMobile,
  type SplitLayoutData,
  type SplitLayoutGapControlValue,
  type SplitLayoutRatio,
  type SplitLayoutVariantId,
  type SplitLayoutVerticalAlign,
} from "../../../../widgets/core/splitLayout";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SplitLayoutVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "50-50",
    label: formatSplitLayoutRatioLabel("50-50"),
    description: "Balanced left/right panes for neutral compositions.",
  },
  {
    id: "40-60",
    label: formatSplitLayoutRatioLabel("40-60"),
    description: "Supportive left pane and dominant right pane.",
  },
  {
    id: "60-40",
    label: formatSplitLayoutRatioLabel("60-40"),
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

const gapOptions = getSplitLayoutGapOptions();

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
    Pick<SplitLayoutData, "collapseMobile" | "reverseOnMobile" | "gap" | "verticalAlign">
  >
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function applyVariantDataPatch(
  nextVariant: SplitLayoutVariantId,
  nextData: SplitLayoutData,
  onChange: (next: SplitLayoutData) => void,
  onVariantChange?: (next: string) => void,
  onBlockPatch?: WidgetEditorProps<SplitLayoutData>["onBlockPatch"]
) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  if (!onVariantChange) {
    return;
  }

  onChange(nextData);
  onVariantChange(nextVariant);
}

function buildVariantSyncedSplitLayoutData(
  value: SplitLayoutData,
  nextVariant: SplitLayoutVariantId
): SplitLayoutData {
  const current = normalizeValue(value, nextVariant);
  return normalizeValue(
    {
      ...current,
      ratio: {
        ...current.ratio,
        desktop: nextVariant,
        tablet: nextVariant,
        mobile: nextVariant,
      },
    },
    nextVariant
  );
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

function SplitRatioMiniature({ ratio }: { ratio: SplitLayoutRatio }) {
  const spans = getSplitLayoutRatioSpans(ratio);

  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-full grid-cols-12 gap-1 rounded-md border bg-muted/30 p-1"
      data-split-variant-preview={ratio}
    >
      <span
        className="rounded bg-foreground/15"
        style={{ gridColumn: `span ${spans.left} / span ${spans.left}` }}
      />
      <span
        className="rounded bg-foreground/35"
        style={{ gridColumn: `span ${spans.right} / span ${spans.right}` }}
      />
    </span>
  );
}

function VariantCards({
  value,
  disclosure,
  onChange,
}: {
  value: SplitLayoutVariantId;
  disclosure: ReturnType<typeof getSplitLayoutRatioDisclosure>;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-3">
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
            data-split-variant-card={option.id}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
                {value === option.id ? "Selected" : "Pick"}
              </Badge>
            </div>
            <div className="mt-3">
              <SplitRatioMiniature ratio={option.id} />
            </div>
          </button>
        ))}
      </div>

      <div
        className="rounded-md border border-dashed border-border/80 bg-muted/20 p-3"
        data-split-ratio-summary
        data-split-ratio-override={disclosure.hasOverride ? "true" : "false"}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Current ratios</p>
          <Badge variant={disclosure.hasOverride ? "outline" : "default"}>
            {disclosure.hasOverride ? "Preset override active" : "Preset aligned"}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Desktop {formatSplitLayoutRatioLabel(disclosure.desktop)}, tablet{" "}
          {formatSplitLayoutRatioLabel(disclosure.tablet)}, mobile{" "}
          {formatSplitLayoutRatioLabel(disclosure.mobile)}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {disclosure.hasExplicitMobile
            ? "Mobile ratio is set explicitly for Keep split mode."
            : "Mobile ratio currently follows the tablet ratio until you add a mobile override."}
        </p>
      </div>
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

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2" data-split-diagnostic-row={label}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function getCollapseModeCopy(
  collapseMobile: SplitLayoutCollapseMobile,
  mobileRatio: SplitLayoutRatio
): string {
  if (collapseMobile === "keep") {
    return `Keep split preserves a ${formatSplitLayoutRatioLabel(mobileRatio)} mobile ratio on phones.`;
  }

  return "Stack makes both panes full width on phones and ignores the mobile ratio override.";
}

function getReverseCopy(
  collapseMobile: SplitLayoutCollapseMobile,
  reverseOnMobile: boolean
): string {
  if (collapseMobile === "keep") {
    return reverseOnMobile
      ? "The split stays side by side on phones and the right pane currently appears first. Tablet and desktop keep the normal left/right order."
      : "Enable this to swap the left/right pane order on phones while keeping the split ratio. Tablet and desktop keep the normal order.";
  }

  return reverseOnMobile
    ? "The right pane currently stacks above the left pane on phones. Tablet and desktop keep the normal left/right order."
    : "Enable this to place the right pane above the left pane when the layout stacks on phones.";
}

export function SplitLayoutWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Split preset</p>
        <Select
          value={resolveSplitLayoutVariant(variant)}
          onValueChange={(next) =>
            applyVariantDataPatch(
              next as SplitLayoutVariantId,
              buildVariantSyncedSplitLayoutData(value, next as SplitLayoutVariantId),
              onChange,
              onVariantChange,
              onBlockPatch
            )
          }
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
          value={getSplitLayoutGapControlValue(normalized.gap)}
          onValueChange={(next) =>
            updateMeta(value, variant, onChange, { gap: next as SplitLayoutGapControlValue })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Gap" />
          </SelectTrigger>
          <SelectContent>
            {gapOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        After choosing the split, add widgets to the left and right panes from Structure or the
        insert controls.
      </div>
    </div>
  );
}

export function SplitLayoutVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);
  const resolvedVariant = resolveSplitLayoutVariant(variant);
  const disclosure = getSplitLayoutRatioDisclosure(value, resolvedVariant);
  const diagnostics = getSplitLayoutDiagnostics(value, resolvedVariant);
  const mobileKeep = (normalized.collapseMobile ?? "stack") === "keep";

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and pane ratio"
        description="Pick the split preset, then confirm the effective ratios across breakpoints."
      >
        <VariantCards
          value={resolvedVariant}
          disclosure={disclosure}
          onChange={(next) =>
            applyVariantDataPatch(
              next as SplitLayoutVariantId,
              buildVariantSyncedSplitLayoutData(value, next as SplitLayoutVariantId),
              onChange,
              onVariantChange,
              onBlockPatch
            )
          }
        />

        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Desktop ratio</p>
            <Select
              value={normalized.ratio?.desktop ?? resolvedVariant}
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
              value={normalized.ratio?.tablet ?? splitLayoutDefaults.ratio?.tablet ?? "50-50"}
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
        description="Define how the split behaves on phones and how reverse ordering applies."
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
          <p className="text-xs text-muted-foreground">
            {getCollapseModeCopy(normalized.collapseMobile ?? "stack", disclosure.mobile)}
          </p>
        </div>

        {mobileKeep ? (
          <div className="space-y-2" data-split-mobile-ratio-control="visible">
            <p className="text-sm font-medium">Mobile ratio</p>
            <Select
              value={normalized.ratio?.mobile ?? normalized.ratio?.tablet ?? resolvedVariant}
              onValueChange={(next) =>
                updateRatio(value, variant, onChange, {
                  mobile: next as SplitLayoutRatio,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Mobile ratio" />
              </SelectTrigger>
              <SelectContent>
                {ratioOptions.map((option) => (
                  <SelectItem key={`mobile-${option.id}`} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use this only when phones should keep a different split than tablets.
            </p>
          </div>
        ) : (
          <div
            className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
            data-split-mobile-ratio-control="stack-note"
          >
            Stack mode always uses a single-column mobile layout, so the mobile ratio stays
            informational only.
          </div>
        )}

        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Reverse on mobile</p>
              <p className="text-xs text-muted-foreground" data-split-reverse-copy>
                {getReverseCopy(
                  normalized.collapseMobile ?? "stack",
                  Boolean(normalized.reverseOnMobile)
                )}
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
        description="Control the space between panes and how their content aligns in the row."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Gap</p>
            <Select
              value={diagnostics.gap.controlValue}
              onValueChange={(next) =>
                updateMeta(value, variant, onChange, { gap: next as SplitLayoutGapControlValue })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Gap" />
              </SelectTrigger>
              <SelectContent>
                {gapOptions.map((option) => (
                  <SelectItem key={`gap-${option.value}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground" data-split-gap-copy>
              {diagnostics.gap.description}
            </p>
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
        title="Pane content"
        description="Use Structure and the insert controls to place widgets into each pane."
      >
        <p className="text-xs text-muted-foreground">
          Target the left or right pane from Structure to add or move nested widgets without
          guessing slot ids.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Empty-pane guidance appears only in admin preview surfaces, never in the public runtime.
        </p>
      </EditorSection>
    </div>
  );
}

export function SplitLayoutAdvancedEditor({ value, variant }: WidgetEditorProps<SplitLayoutData>) {
  const normalized = normalizeValue(value, variant);
  const diagnostics = getSplitLayoutDiagnostics(value, variant);
  const mobileSummary =
    diagnostics.mobile.mode === "stack"
      ? `${diagnostics.mobile.reversed ? "Reversed stack" : "Normal stack"} with one column per pane.`
      : `${formatSplitLayoutRatioLabel(diagnostics.mobile.ratio ?? diagnostics.ratios.mobile)} split on phones with ${diagnostics.mobile.reversed ? "reversed" : "normal"} pane order.`;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Responsive diagnostics"
        description="Visual owns editing. Advanced stays read-only and explains the resolved breakpoint contract."
      >
        <div className="space-y-2" data-split-advanced-diagnostics>
          <DiagnosticRow
            label="Preset"
            value={
              diagnostics.ratios.desktop === diagnostics.variant &&
              diagnostics.ratios.tablet === diagnostics.variant &&
              diagnostics.ratios.mobile === diagnostics.variant
                ? `${formatSplitLayoutRatioLabel(diagnostics.variant)} preset aligned across all breakpoints.`
                : `${formatSplitLayoutRatioLabel(diagnostics.variant)} preset with breakpoint overrides.`
            }
          />
          <DiagnosticRow
            label="Desktop"
            value={`${formatSplitLayoutRatioLabel(diagnostics.ratios.desktop)} (${diagnostics.desktop.leftSpan}/${diagnostics.desktop.rightSpan} columns)`}
          />
          <DiagnosticRow
            label="Tablet"
            value={`${formatSplitLayoutRatioLabel(diagnostics.ratios.tablet)} (${diagnostics.tablet.leftSpan}/${diagnostics.tablet.rightSpan} columns)`}
          />
          <DiagnosticRow label="Mobile" value={mobileSummary} />
          <DiagnosticRow
            label="Gap"
            value={`${diagnostics.gap.label} using ${diagnostics.gap.className}. ${diagnostics.gap.description}`}
          />
          <DiagnosticRow
            label="Vertical align"
            value={`${diagnostics.verticalAlign.label} using ${diagnostics.verticalAlign.className}.`}
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Raw payload snapshot"
        description="Runtime-oriented JSON view of normalized Split Layout data."
      >
        <DiagnosticsSnapshot value={normalized} />
      </EditorSection>
    </div>
  );
}
