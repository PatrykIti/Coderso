import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  DividerBlock,
  describeDividerContainerWidth,
  describeDividerCustomWidth,
  describeDividerOpacity,
  describeDividerSpace,
  describeDividerThickness,
  dividerContainerWidthDisplayLabelMap,
  dividerContainerWidthTokens,
  dividerDashPatternTokens,
  dividerDefaults,
  dividerLabelGapTokens,
  dividerLabelLetterSpacingTokens,
  dividerLabelSizeTokens,
  dividerLabelTransformTokens,
  dividerLabelWeightTokens,
  dividerLineStyleTokens,
  dividerOpacityTokens,
  dividerSpaceDisplayLabelMap,
  dividerSpaceTokens,
  dividerVisibilityTokens,
  normalizeDividerData,
  resolveDividerDefaultLineStyle,
  resolveDividerSpaceCss,
  resolveDividerVariant,
  type DividerAlignment,
  type DividerData,
  type DividerLineStyle,
  type DividerVariantId,
  type DividerWidthMode,
} from "../../../../widgets/core/divider";
import type {
  EditorMode,
  WidgetEditorProps,
  WidgetEditorSectionRole,
} from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
import { buildVisibleOffTokenOptions, TokenOrPixelField } from "./TokenOrPixelField";
import { SharedColorControl } from "./SharedColorControl";
import {
  ReadonlyWidgetSummaryRow,
  WidgetControlRow,
  WidgetEditorSection,
} from "./WidgetEditorControls";

const variantOptions: Array<{
  id: DividerVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "line",
    label: "Line",
    description: "Clean horizontal separator for clear section boundaries.",
  },
  {
    id: "dashed",
    label: "Dashed",
    description: "Starts with a dashed separator style for lighter grouping.",
  },
  {
    id: "label-center",
    label: "Label center",
    description: "Line with an optional centered label for contextual grouping.",
  },
];

const widthModeOptions: Array<{ id: DividerWidthMode; label: string }> = [
  { id: "full", label: "Full width" },
  { id: "container", label: "Container width" },
  { id: "custom", label: "Custom width" },
];

const customWidthOptions = [
  { id: "240px", label: "Small fixed width" },
  { id: "320px", label: "Default fixed width" },
  { id: "480px", label: "Medium fixed width" },
  { id: "640px", label: "Wide fixed width" },
  { id: "75%", label: "Three-quarter width" },
] as const;

const containerWidthOptions = dividerContainerWidthTokens.map((token) => ({
  id: token,
  label: dividerContainerWidthDisplayLabelMap[token],
}));

const alignmentOptions: Array<{ id: DividerAlignment; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const labelSizeOptions = dividerLabelSizeTokens.map((token) => ({
  id: token,
  label: token === "xs" ? "Small" : token === "sm" ? "Medium" : "Large",
}));

const labelWeightOptions = dividerLabelWeightTokens.map((token) => ({
  id: token,
  label: token === "semibold" ? "Semi-bold" : token[0].toUpperCase() + token.slice(1),
}));

const labelTransformOptions = dividerLabelTransformTokens.map((token) => ({
  id: token,
  label: token === "none" ? "Normal case" : "Uppercase",
}));

const labelLetterSpacingOptions = dividerLabelLetterSpacingTokens.map((token) => ({
  id: token,
  label: token === "normal" ? "Normal" : "Wide",
}));

const labelGapOptions = dividerLabelGapTokens.map((token) => ({
  id: token,
  label:
    token === "2"
      ? "Tight label gap"
      : token === "3"
        ? "Standard label gap"
        : token === "4"
          ? "Comfortable label gap"
          : "Loose label gap",
}));

const lineStyleOptions = dividerLineStyleTokens.map((token) => ({
  id: token,
  label: token[0].toUpperCase() + token.slice(1),
}));

const opacityOptions = dividerOpacityTokens.map((token) => ({
  id: token,
  label: describeDividerOpacity(token),
}));

const dashPatternOptions = dividerDashPatternTokens.map((token) => ({
  id: token,
  label: token === "browser" ? "Default dash" : token === "short" ? "Short dash" : "Wide dash",
}));

const visibilityOptions = dividerVisibilityTokens.map((token) => ({
  id: token,
  label: token === "line" ? "Visible line" : "Spacer only",
}));

const thicknessOptions = Array.from({ length: 8 }, (_, index) => {
  const value = String(index + 1);
  return { id: value, label: describeDividerThickness(index + 1) };
});

const marginTokenOptions = buildVisibleOffTokenOptions(
  dividerSpaceTokens.map((token) => ({
    id: token,
    label: dividerSpaceDisplayLabelMap[token],
  }))
);

const cssLengthPattern = /^\d+(?:\.\d+)?(?:px|rem|em|%)$/i;

function normalizeValue(value: DividerData, variant: string = "line"): DividerData {
  return normalizeDividerData(value, variant);
}

function updateValue(
  value: DividerData,
  variant: string,
  onChange: (next: DividerData) => void,
  updater: (current: DividerData) => DividerData
) {
  const current = normalizeValue(value, variant);
  const next = updater(current);
  onChange(normalizeValue(next, variant));
}

function updateData(
  value: DividerData,
  variant: string,
  onChange: (next: DividerData) => void,
  patch: Partial<DividerData>
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    ...patch,
  }));
}

function EditorSection({
  id,
  mode,
  role,
  title,
  description,
  children,
}: {
  id?: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const resolvedId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <WidgetEditorSection
      id={resolvedId}
      mode={mode}
      role={role}
      title={title}
      description={description}
    >
      {children}
    </WidgetEditorSection>
  );
}

function VariantCards({
  value,
  onChange,
}: {
  value: DividerVariantId;
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
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <SharedColorControl
      label={label}
      value={value}
      onChange={onChange}
      onSwatchChange={onChange}
      placeholder={placeholder}
      pickerFallback={pickerFallback}
      showValueInput={false}
    />
  );
}

function DividerPreview({ value, variant }: { value: DividerData; variant: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Live divider preview
      </p>
      <DividerBlock data={normalizeValue(value, variant)} variant={variant} />
    </div>
  );
}

function CustomWidthField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const normalizedValue = cssLengthPattern.test(value) ? value.toLowerCase() : "320px";
  const hasLegacyCustomValue =
    value.trim().length > 0 && !customWidthOptions.some((option) => option.id === normalizedValue);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Custom width</p>
      <Select
        value={hasLegacyCustomValue ? "legacy-custom" : normalizedValue}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select custom width" />
        </SelectTrigger>
        <SelectContent>
          {customWidthOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          {hasLegacyCustomValue ? (
            <SelectItem value="legacy-custom" disabled>
              Saved custom width
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {hasLegacyCustomValue
          ? "Saved custom width is active. Pick a width preset to replace it."
          : `Selected width: ${describeDividerCustomWidth(normalizedValue)}.`}
      </p>
    </div>
  );
}

function LabelStyleFields({
  value,
  onChange,
  variant,
  idPrefix = "divider.visual.label",
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: DividerVariantId;
  idPrefix?: string;
}) {
  if (variant !== "label-center") return null;

  const normalized = normalizeValue(value, variant);
  const visibility = normalized.visibility ?? "line";

  return (
    <div className="space-y-3">
      <WidgetControlRow id={`${idPrefix}.text`} label="Center label" path="label" hideLabel>
        {() => (
          <ClearableInputField
            label="Center label"
            value={normalized.label}
            onChange={(next) => updateData(value, variant, onChange, { label: next })}
            onClear={() =>
              updateData(value, variant, onChange, { label: dividerDefaults.label ?? "" })
            }
            placeholder="Optional label"
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow id={`${idPrefix}.color`} label="Label color" path="labelColor" hideLabel>
        {() => (
          <ColorField
            label="Label color"
            value={normalized.labelColor}
            onChange={(next) => updateData(value, variant, onChange, { labelColor: next })}
            placeholder="var(--color-text)"
            pickerFallback="#0f172a"
          />
        )}
      </WidgetControlRow>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow id={`${idPrefix}.size`} label="Label size" path="labelSize">
          {() => (
            <Select
              value={normalized.labelSize ?? "xs"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  labelSize: next as DividerData["labelSize"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {labelSizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow id={`${idPrefix}.weight`} label="Label weight" path="labelWeight">
          {() => (
            <Select
              value={normalized.labelWeight ?? "medium"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  labelWeight: next as DividerData["labelWeight"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select label weight" />
              </SelectTrigger>
              <SelectContent>
                {labelWeightOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow id={`${idPrefix}.transform`} label="Text transform" path="labelTransform">
          {() => (
            <Select
              value={normalized.labelTransform ?? "uppercase"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  labelTransform: next as DividerData["labelTransform"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transform" />
              </SelectTrigger>
              <SelectContent>
                {labelTransformOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id={`${idPrefix}.letter-spacing`}
          label="Letter spacing"
          path="labelLetterSpacing"
        >
          {() => (
            <Select
              value={normalized.labelLetterSpacing ?? "wide"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  labelLetterSpacing: next as DividerData["labelLetterSpacing"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tracking" />
              </SelectTrigger>
              <SelectContent>
                {labelLetterSpacingOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id={`${idPrefix}.gap`}
          label="Label gap"
          path="labelGap"
          className="sm:col-span-2"
        >
          {() => (
            <Select
              value={normalized.labelGap ?? "3"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  labelGap: next as DividerData["labelGap"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select label gap" />
              </SelectTrigger>
              <SelectContent>
                {labelGapOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>
      {visibility === "spacer-only" ? (
        <p className="text-xs text-muted-foreground">
          Spacer-only hides the label in runtime output while keeping your saved label settings.
        </p>
      ) : null}
    </div>
  );
}

function LineAndWidthFields({
  value,
  onChange,
  variant,
  idPrefix = "divider.visual.line",
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: DividerVariantId;
  idPrefix?: string;
}) {
  const normalized = normalizeValue(value, variant);
  const widthMode = normalized.width ?? "full";
  const visibility = normalized.visibility ?? "line";
  const lineStyle = dividerLineStyleTokens.includes((value.lineStyle ?? "") as DividerLineStyle)
    ? (value.lineStyle as DividerLineStyle)
    : resolveDividerDefaultLineStyle(variant);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow id={`${idPrefix}.thickness`} label="Line thickness" path="thickness">
          {() => (
            <Select
              value={String(normalized.thickness ?? 1)}
              onValueChange={(next) =>
                updateData(value, variant, onChange, { thickness: Number(next) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select thickness" />
              </SelectTrigger>
              <SelectContent>
                {thicknessOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow id={`${idPrefix}.width`} label="Width mode" path="width">
          {() => (
            <Select
              value={widthMode}
              onValueChange={(next) =>
                updateData(value, variant, onChange, { width: next as DividerWidthMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select width mode" />
              </SelectTrigger>
              <SelectContent>
                {widthModeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>

      {widthMode === "container" ? (
        <WidgetControlRow
          id={`${idPrefix}.container-width`}
          label="Container width"
          path="containerWidth"
        >
          {() => (
            <Select
              value={normalized.containerWidth ?? "md"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  containerWidth: next as DividerData["containerWidth"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select container width" />
              </SelectTrigger>
              <SelectContent>
                {containerWidthOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      ) : null}

      {widthMode === "custom" ? (
        <WidgetControlRow
          id={`${idPrefix}.custom-width`}
          label="Custom width"
          path="customWidth"
          hideLabel
        >
          {() => (
            <CustomWidthField
              value={normalized.customWidth ?? (dividerDefaults.customWidth as string)}
              onChange={(next) => updateData(value, variant, onChange, { customWidth: next })}
            />
          )}
        </WidgetControlRow>
      ) : null}

      {widthMode !== "full" ? (
        <WidgetControlRow id={`${idPrefix}.alignment`} label="Horizontal alignment" path="align">
          {() => (
            <Select
              value={normalized.align ?? "center"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, { align: next as DividerAlignment })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                {alignmentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      ) : null}

      <WidgetControlRow id={`${idPrefix}.color`} label="Line color" path="color" hideLabel>
        {() => (
          <ColorField
            label="Line color"
            value={normalized.color}
            onChange={(next) => updateData(value, variant, onChange, { color: next })}
            placeholder="var(--color-border)"
            pickerFallback="#e2e8f0"
          />
        )}
      </WidgetControlRow>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WidgetControlRow id={`${idPrefix}.style`} label="Line style" path="lineStyle">
          {() => (
            <Select
              value={lineStyle}
              onValueChange={(next) =>
                updateData(value, variant, onChange, { lineStyle: next as DividerLineStyle })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select line style" />
              </SelectTrigger>
              <SelectContent>
                {lineStyleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow id={`${idPrefix}.opacity`} label="Line emphasis" path="opacity">
          {() => (
            <Select
              value={normalized.opacity ?? "100"}
              onValueChange={(next) =>
                updateData(value, variant, onChange, { opacity: next as DividerData["opacity"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transparency" />
              </SelectTrigger>
              <SelectContent>
                {opacityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow id={`${idPrefix}.visibility`} label="Visibility" path="visibility">
          {() => (
            <Select
              value={visibility}
              onValueChange={(next) =>
                updateData(value, variant, onChange, {
                  visibility: next as DividerData["visibility"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        {visibility === "line" && lineStyle === "dashed" ? (
          <WidgetControlRow id={`${idPrefix}.dash-pattern`} label="Dash pattern" path="dashPattern">
            {() => (
              <Select
                value={normalized.dashPattern ?? "browser"}
                onValueChange={(next) =>
                  updateData(value, variant, onChange, {
                    dashPattern: next as DividerData["dashPattern"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dash pattern" />
                </SelectTrigger>
                <SelectContent>
                  {dashPatternOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </WidgetControlRow>
        ) : null}
      </div>
    </div>
  );
}

function SpacingFields({
  value,
  onChange,
  variant,
  idPrefix = "divider.visual.spacing",
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: string;
  idPrefix?: string;
}) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <WidgetControlRow id={`${idPrefix}.top`} label="Top spacing" path="marginTop" hideLabel>
        {() => (
          <TokenOrPixelField
            label="Top spacing"
            value={normalized.marginTop ?? "6"}
            onChange={(next) => updateData(value, variant, onChange, { marginTop: next })}
            tokenOptions={marginTokenOptions}
            isToken={(candidate) =>
              dividerSpaceTokens.includes(candidate as (typeof dividerSpaceTokens)[number])
            }
            resolveCss={resolveDividerSpaceCss}
            formatResolvedValue={describeDividerSpace}
            selectPlaceholder="Spacing preset"
            inputPlaceholder="Saved custom spacing"
            customOptionLabel="Saved custom spacing"
            customValueLabel="saved custom spacing"
            selectedValueLabel="spacing"
            replacementOptionLabel="a spacing option"
            allowCustom={false}
          />
        )}
      </WidgetControlRow>
      <WidgetControlRow
        id={`${idPrefix}.bottom`}
        label="Bottom spacing"
        path="marginBottom"
        hideLabel
      >
        {() => (
          <TokenOrPixelField
            label="Bottom spacing"
            value={normalized.marginBottom ?? "6"}
            onChange={(next) => updateData(value, variant, onChange, { marginBottom: next })}
            tokenOptions={marginTokenOptions}
            isToken={(candidate) =>
              dividerSpaceTokens.includes(candidate as (typeof dividerSpaceTokens)[number])
            }
            resolveCss={resolveDividerSpaceCss}
            formatResolvedValue={describeDividerSpace}
            selectPlaceholder="Spacing preset"
            inputPlaceholder="Saved custom spacing"
            customOptionLabel="Saved custom spacing"
            customValueLabel="saved custom spacing"
            selectedValueLabel="spacing"
            replacementOptionLabel="a spacing option"
            allowCustom={false}
          />
        )}
      </WidgetControlRow>
    </div>
  );
}

export function DividerWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value, variant);
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="divider.wizard.quick-start"
        mode="wizard"
        role="setup"
        title="Divider quick start"
        description="Choose a safe separator preset. Visual owns ongoing appearance and rhythm editing."
      >
        <DividerPreview value={value} variant={variant} />

        <WidgetControlRow id="divider.wizard.variant" label="Divider style" path="variant">
          {() => (
            <Select value={resolvedVariant} onValueChange={(next) => onVariantChange?.(next)}>
              <SelectTrigger>
                <SelectValue placeholder="Select divider style" />
              </SelectTrigger>
              <SelectContent>
                {variantOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>

        {resolvedVariant === "label-center" ? (
          <WidgetControlRow id="divider.wizard.label" label="Center label" path="label" hideLabel>
            {() => (
              <ClearableInputField
                label="Center label"
                value={normalized.label}
                onChange={(next) => updateData(value, variant, onChange, { label: next })}
                onClear={() =>
                  updateData(value, variant, onChange, { label: dividerDefaults.label ?? "" })
                }
                placeholder="Optional label"
              />
            )}
          </WidgetControlRow>
        ) : null}

        <p className="rounded-md border border-dashed border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
          Visual owns line weight, color, width, and spacing after setup.
        </p>
      </EditorSection>
    </div>
  );
}

export function DividerVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<DividerData>) {
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        id="divider.visual.preview"
        mode="visual"
        role="summary"
        title="Preview"
        description="Check the current Divider output without leaving the editor."
      >
        <DividerPreview value={value} variant={variant} />
      </EditorSection>

      <EditorSection
        id="divider.visual.variant-label"
        mode="visual"
        role="visual"
        title="Variant and label"
        description="Choose divider style and configure the centered label when needed."
      >
        <WidgetControlRow
          id="divider.visual.variant"
          label="Divider style"
          path="variant"
          hideLabel
        >
          {() => <VariantCards value={resolvedVariant} onChange={onVariantChange} />}
        </WidgetControlRow>
        <LabelStyleFields
          value={value}
          onChange={onChange}
          variant={resolvedVariant}
          idPrefix="divider.visual.label"
        />
      </EditorSection>

      <EditorSection
        id="divider.visual.line-width"
        mode="visual"
        role="visual"
        title="Line style and width"
        description="Adjust line style, width behavior, alignment, and visibility."
      >
        <LineAndWidthFields
          value={value}
          onChange={onChange}
          variant={resolvedVariant}
          idPrefix="divider.visual.line"
        />
      </EditorSection>

      <EditorSection
        id="divider.visual.spacing"
        mode="visual"
        role="layout"
        title="Spacing around divider"
        description="Control top and bottom spacing for predictable rhythm."
      >
        <SpacingFields
          value={value}
          onChange={onChange}
          variant={variant}
          idPrefix="divider.visual.spacing"
        />
      </EditorSection>
    </div>
  );
}

export function DividerAdvancedEditor({ value, variant }: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value, variant);
  const resolvedVariant = resolveDividerVariant(variant);
  const lineSummary = [
    normalized.lineStyle ?? resolveDividerDefaultLineStyle(resolvedVariant),
    describeDividerThickness(normalized.thickness),
    describeDividerOpacity(normalized.opacity),
    normalized.visibility === "spacer-only" ? "spacer-only output" : "visible line",
  ].join(", ");
  const widthSummary =
    normalized.width === "custom"
      ? describeDividerCustomWidth(normalized.customWidth)
      : normalized.width === "container"
        ? describeDividerContainerWidth(normalized.containerWidth)
        : "Full width";
  const spacingSummary = `Top ${describeDividerSpace(normalized.marginTop)}, bottom ${describeDividerSpace(normalized.marginBottom)}.`;
  const hasSavedCompatibility =
    normalized.width === "custom" ||
    !dividerSpaceTokens.includes(
      (normalized.marginTop ?? "") as (typeof dividerSpaceTokens)[number]
    ) ||
    !dividerSpaceTokens.includes(
      (normalized.marginBottom ?? "") as (typeof dividerSpaceTokens)[number]
    );

  return (
    <div className="space-y-4">
      <EditorSection
        id="divider.advanced.preview"
        mode="advanced"
        role="summary"
        title="Preview"
        description="Inspect the normalized Divider output without editing Visual-owned fields."
      >
        <DividerPreview value={value} variant={variant} />
      </EditorSection>

      <EditorSection
        id="divider.advanced.computed-summary"
        mode="advanced"
        role="diagnostics"
        title="Runtime divider summary"
        description="Visual owns divider editing. Advanced summarizes the resolved rendering contract."
      >
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.variant"
          label="Variant"
          path="variant"
          value={variantOptions.find((option) => option.id === resolvedVariant)?.label ?? "Line"}
        />
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.line"
          label="Line"
          path="lineStyle"
          value={lineSummary}
        />
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.width"
          label="Width"
          path="width"
          value={`${widthSummary}, aligned ${normalized.align ?? "center"}.`}
        />
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.spacing"
          label="Spacing"
          path="marginTop"
          value={spacingSummary}
        />
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.label"
          label="Label"
          path="label"
          value={
            normalized.label
              ? `${normalized.label} (${normalized.labelSize ?? "xs"}, ${normalized.labelWeight ?? "medium"})`
              : "No centered label."
          }
        />
      </EditorSection>
      <EditorSection
        id="divider.advanced.support-summary"
        mode="advanced"
        role="summary"
        title="Support summary"
        description="Read-only compatibility notes for saved Divider data."
      >
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.normalization-summary"
          label="Normalization"
          value="Variant, width, line, label, and spacing values are normalized before runtime rendering."
        />
        <ReadonlyWidgetSummaryRow
          id="divider.advanced.compatibility-summary"
          label="Saved compatibility"
          path="customWidth"
          value={
            hasSavedCompatibility
              ? "Saved custom width or spacing values remain compatible. Visual can replace them with presets."
              : "Preset-only width and spacing values are saved."
          }
        />
      </EditorSection>
    </div>
  );
}
