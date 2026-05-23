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
  applySpacerPreset,
  deriveSpacerPresetId,
  normalizeSpacerCustomHeightInput,
  normalizeSpacerData,
  resolveSpacerCssHeight,
  resolveSpacerVariant,
  spacerDefaults,
  spacerHeightCssValueMap,
  spacerHeightTokens,
  spacerPresetDefinitions,
  type SpacerData,
  type SpacerVariantId,
} from "../../../../widgets/core/spacer";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { buildVisibleOffTokenOptions, TokenOrPixelField } from "./TokenOrPixelField";
import { ReadonlyWidgetSummaryRow, WidgetEditorSection } from "./WidgetEditorControls";

const variantOptions: Array<{
  id: SpacerVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "responsive",
    label: "Responsive",
    description: "Independent height per breakpoint for precise rhythm tuning.",
  },
  {
    id: "fixed",
    label: "Fixed",
    description: "Single height shared across desktop, tablet and mobile.",
  },
];

const heightTokenOptions = buildVisibleOffTokenOptions(
  spacerHeightTokens.map((token) => ({
    id: token,
    label: token === "none" ? "None" : `${token} (${spacerHeightCssValueMap[token]})`,
  }))
);

const spacerCustomHeightPlaceholder = "48, 10vh, or clamp(...)";
const spacerCustomHeightHelp =
  "Custom values accept 48 (saved as 48px), 48px, 10vh, 5dvh, 5svh, 12vw, or clamp(2rem, 5vw, 8rem).";

const spacerHeightBreakpointHelp = {
  desktop: "Applies at 1024px and wider (Tailwind lg:).",
  tablet: "Applies from 768px up until desktop takes over at 1024px (Tailwind md:).",
  mobile: "Applies below 768px before the tablet breakpoint.",
} as const;

function normalizeValue(value: SpacerData, variant: string): SpacerData {
  return normalizeSpacerData(value, variant);
}

function updateValue(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  updater: (current: SpacerData) => SpacerData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

function updateHeight(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  patch: Partial<NonNullable<SpacerData["height"]>>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    height: {
      ...current.height,
      ...patch,
    },
  }));
}

function updateMeta(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  patch: Partial<Pick<SpacerData, "showGuideInEditor">>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function applyPreset(
  value: SpacerData,
  variant: string,
  onChange: (next: SpacerData) => void,
  presetId: (typeof spacerPresetDefinitions)[number]["id"]
) {
  const preset = spacerPresetDefinitions.find((option) => option.id === presetId);
  if (!preset) return;

  if (resolveSpacerVariant(variant) === "fixed") {
    updateHeight(value, variant, onChange, { desktop: preset.height.desktop });
    return;
  }

  updateValue(value, variant, onChange, (current) => applySpacerPreset(current, presetId));
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id: string;
  mode: EditorMode;
  role: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <WidgetEditorSection id={id} mode={mode} role={role} title={title} description={description}>
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: SpacerVariantId;
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

function DiagnosticsSnapshot({ value }: { value: SpacerData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SpacerPresetChooser({
  value,
  variant,
  onChange,
}: {
  value: SpacerData;
  variant: string;
  onChange: (next: SpacerData) => void;
}) {
  const normalized = normalizeValue(value, variant);
  const currentPresetId = deriveSpacerPresetId(normalized.height);
  const currentPreset =
    spacerPresetDefinitions.find((preset) => preset.id === currentPresetId) ?? null;
  const resolvedVariant = resolveSpacerVariant(variant);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {currentPreset
            ? `Current preset: ${currentPreset.label}.`
            : "Manual heights are active. Presets stay available as shortcuts."}
        </p>
        {resolvedVariant === "fixed" ? (
          <p className="text-xs text-muted-foreground">
            Fixed mode preserves the saved tablet and mobile heights. Presets update the desktop
            height only while fixed is active, so switch to responsive to apply a full preset
            triplet.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {spacerPresetDefinitions.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(value, variant, onChange, preset.id)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition",
              currentPresetId === preset.id
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-tight">{preset.label}</p>
              <Badge
                className="shrink-0"
                variant={currentPresetId === preset.id ? "default" : "outline"}
              >
                {currentPresetId === preset.id ? "Selected" : "Apply"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Desktop {preset.height.desktop} / Tablet {preset.height.tablet} / Mobile{" "}
              {preset.height.mobile}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeightField({
  label,
  breakpoint,
  value,
  onChange,
}: {
  label: string;
  breakpoint: keyof typeof spacerHeightBreakpointHelp;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <TokenOrPixelField
      label={label}
      fieldDescription={spacerHeightBreakpointHelp[breakpoint]}
      value={value}
      onChange={onChange}
      tokenOptions={heightTokenOptions}
      isToken={(candidate) =>
        spacerHeightTokens.includes(candidate as (typeof spacerHeightTokens)[number])
      }
      resolveCss={resolveSpacerCssHeight}
      selectPlaceholder="Quick token"
      inputPlaceholder={spacerCustomHeightPlaceholder}
      customOptionLabel="Custom length"
      customValueLabel="custom length"
      normalizeCustomValue={normalizeSpacerCustomHeightInput}
      customInputLabel={`${label} custom height`}
      customInputHelp={spacerCustomHeightHelp}
    />
  );
}

function ResponsiveHeights({
  value,
  variant,
  onChange,
}: {
  value: SpacerData;
  variant: string;
  onChange: (next: SpacerData) => void;
}) {
  const normalized = normalizeValue(value, variant);
  const height = normalized.height ?? spacerDefaults.height!;
  const resolvedVariant = resolveSpacerVariant(variant);

  return (
    <div className="space-y-3">
      <HeightField
        label="Desktop height"
        breakpoint="desktop"
        value={height.desktop ?? "16"}
        onChange={(next) => updateHeight(value, variant, onChange, { desktop: next })}
      />
      {resolvedVariant === "responsive" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HeightField
            label="Tablet height"
            breakpoint="tablet"
            value={height.tablet ?? "12"}
            onChange={(next) => updateHeight(value, variant, onChange, { tablet: next })}
          />
          <HeightField
            label="Mobile height"
            breakpoint="mobile"
            value={height.mobile ?? "8"}
            onChange={(next) => updateHeight(value, variant, onChange, { mobile: next })}
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Fixed mode uses desktop height for tablet and mobile.
        </p>
      )}
    </div>
  );
}

export function SpacerWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SpacerData>) {
  const normalized = normalizeValue(value, variant);
  const height = normalized.height ?? spacerDefaults.height!;
  const resolvedVariant = resolveSpacerVariant(variant);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Spacer mode</p>
        <Select
          value={resolveSpacerVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
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

      <div className="rounded-md border p-3 space-y-3">
        <div>
          <p className="text-sm font-medium">Rhythm presets</p>
          <p className="text-xs text-muted-foreground">
            Apply a named vertical rhythm preset. Manual height editing stays available below.
          </p>
        </div>
        <SpacerPresetChooser value={value} variant={variant} onChange={onChange} />
      </div>

      <HeightField
        label="Desktop height"
        breakpoint="desktop"
        value={height.desktop ?? "16"}
        onChange={(next) => updateHeight(value, variant, onChange, { desktop: next })}
      />
      {resolvedVariant === "fixed" ? (
        <p className="text-xs text-muted-foreground">
          Fixed mode reuses the desktop height for tablet and mobile.
        </p>
      ) : null}

      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Show guide in editor</p>
            <p className="text-xs text-muted-foreground">
              Displays spacer label overlay in runtime preview only.
            </p>
          </div>
          <Switch
            checked={Boolean(normalized.showGuideInEditor)}
            onCheckedChange={(checked) =>
              updateMeta(value, variant, onChange, { showGuideInEditor: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function SpacerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<SpacerData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="spacer.visual-variant-behavior"
        mode="visual"
        role="visual"
        title="Variant and responsive behavior"
        description="Choose fixed or responsive spacer mode."
      >
        <VariantCards value={resolveSpacerVariant(variant)} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection
        id="spacer.visual-responsive-heights"
        mode="visual"
        role="layout"
        title="Responsive heights"
        description="Control spacer height per breakpoint with token, viewport, clamp, or px values."
      >
        <div className="space-y-4">
          <SpacerPresetChooser value={value} variant={variant} onChange={onChange} />
          <ResponsiveHeights value={value} variant={variant} onChange={onChange} />
        </div>
      </EditorSection>

      <EditorSection
        id="spacer.visual-editor-guide"
        mode="visual"
        role="visual"
        title="Editor guide"
        description="Optional helper label visible in preview environments."
      >
        <div className="rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Show guide in editor</p>
              <p className="text-xs text-muted-foreground">
                Helps identify spacer size while composing templates.
              </p>
            </div>
            <Switch
              checked={Boolean(normalized.showGuideInEditor)}
              onCheckedChange={(checked) =>
                updateMeta(value, variant, onChange, { showGuideInEditor: checked })
              }
            />
          </div>
        </div>
      </EditorSection>
    </div>
  );
}

export function SpacerAdvancedEditor({ value, onChange, variant }: WidgetEditorProps<SpacerData>) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="spacer.advanced-height-tokens"
        mode="advanced"
        role="technical"
        title="Technical height tokens"
        description="Direct token, viewport, clamp, or px editing for desktop, tablet and mobile heights."
      >
        <ResponsiveHeights value={value} variant={variant} onChange={onChange} />
      </EditorSection>

      <EditorSection
        id="spacer.advanced-payload-snapshot"
        mode="advanced"
        role="diagnostics"
        title="Raw payload snapshot"
        description="Runtime-oriented JSON view of normalized data."
      >
        <ReadonlyWidgetSummaryRow
          id="spacer.advanced.normalized-payload"
          label="Normalized payload"
          value={<DiagnosticsSnapshot value={normalized} />}
        />
      </EditorSection>
    </div>
  );
}
