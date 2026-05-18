import { type ReactNode, useEffect, useRef, useState } from "react";

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
import { cn } from "@/lib/utils";

import {
  DividerBlock,
  dividerContainerWidthCssValueMap,
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
  dividerSpaceCssValueMap,
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
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableInputField } from "./ClearableFields";
import { buildVisibleOffTokenOptions, TokenOrPixelField } from "./TokenOrPixelField";
import { WidgetEditorSection } from "./WidgetEditorControls";

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

const containerWidthOptions = dividerContainerWidthTokens.map((token) => ({
  id: token,
  label: `${token.toUpperCase()} (${dividerContainerWidthCssValueMap[token]})`,
}));

const alignmentOptions: Array<{ id: DividerAlignment; label: string }> = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

const labelSizeOptions = dividerLabelSizeTokens.map((token) => ({
  id: token,
  label: token === "base" ? "Base" : token.toUpperCase(),
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
  label: `${token} (${dividerSpaceCssValueMap[token]})`,
}));

const lineStyleOptions = dividerLineStyleTokens.map((token) => ({
  id: token,
  label: token[0].toUpperCase() + token.slice(1),
}));

const opacityOptions = dividerOpacityTokens.map((token) => ({
  id: token,
  label: `${token}%`,
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
  return { id: value, label: `${value}px` };
});

const marginTokenOptions = buildVisibleOffTokenOptions(
  dividerSpaceTokens.map((token) => ({
    id: token,
    label: token === "none" ? "None" : `${token} (${dividerSpaceCssValueMap[token]})`,
  }))
);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const cssLengthPattern = /^\d+(?:\.\d+)?(?:px|rem|em|%)$/i;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

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
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => {
            const currentValue = value?.trim();
            onChange(currentValue?.startsWith("var(") ? currentValue : event.target.value);
          }}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      {typeof value === "string" && value.trim().startsWith("var(") ? (
        <p className="text-xs text-muted-foreground">
          CSS token preserved in data; edit the text field to replace it with a fixed color.
        </p>
      ) : null}
    </div>
  );
}

function DiagnosticsSnapshot({ value }: { value: DividerData }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
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
  const lastCommittedValueRef = useRef(value);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (value === lastCommittedValueRef.current) return;
    lastCommittedValueRef.current = value;
    setDraft(value);
  }, [value]);

  const trimmed = draft.trim();
  const isEmpty = trimmed.length === 0;
  const isValid = cssLengthPattern.test(trimmed);
  const needsUnit = /^\d+(?:\.\d+)?$/.test(trimmed);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Custom width</p>
      <Input
        value={draft}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const nextTrimmed = nextDraft.trim();
          if (cssLengthPattern.test(nextTrimmed)) {
            onChange(nextTrimmed.toLowerCase());
          }
        }}
        placeholder="e.g. 320px or 60%"
      />
      <p
        role={!isEmpty && !isValid ? "alert" : undefined}
        className="text-xs text-muted-foreground"
      >
        {isEmpty
          ? `Enter a CSS length. Saved width stays ${value}.`
          : isValid
            ? `Resolved width: ${trimmed.toLowerCase()}`
            : needsUnit
              ? `Add a unit such as px, rem, em, or %. Saved width stays ${value}.`
              : `Invalid width. Saved width stays ${value}.`}
      </p>
    </div>
  );
}

function LabelStyleFields({
  value,
  onChange,
  variant,
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: DividerVariantId;
}) {
  if (variant !== "label-center") return null;

  const normalized = normalizeValue(value, variant);
  const visibility = normalized.visibility ?? "line";

  return (
    <div className="space-y-3">
      <ClearableInputField
        label="Center label"
        value={normalized.label}
        onChange={(next) => updateData(value, variant, onChange, { label: next })}
        onClear={() => updateData(value, variant, onChange, { label: dividerDefaults.label ?? "" })}
        placeholder="Optional label"
      />
      <ColorField
        label="Label color"
        value={normalized.labelColor}
        onChange={(next) => updateData(value, variant, onChange, { labelColor: next })}
        placeholder="var(--color-text)"
        pickerFallback="#0f172a"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Label size</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Label weight</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Text transform</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Letter spacing</p>
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
        </div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium">Label gap</p>
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
        </div>
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
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: DividerVariantId;
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Line thickness</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Width mode</p>
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
        </div>
      </div>

      {widthMode === "container" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Container width</p>
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
        </div>
      ) : null}

      {widthMode === "custom" ? (
        <CustomWidthField
          value={normalized.customWidth ?? (dividerDefaults.customWidth as string)}
          onChange={(next) => updateData(value, variant, onChange, { customWidth: next })}
        />
      ) : null}

      {widthMode !== "full" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Horizontal alignment</p>
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
        </div>
      ) : null}

      <ColorField
        label="Line color"
        value={normalized.color}
        onChange={(next) => updateData(value, variant, onChange, { color: next })}
        placeholder="var(--color-border)"
        pickerFallback="#e2e8f0"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Line style</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Transparency</p>
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
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Visibility</p>
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
        </div>
        {visibility === "line" && lineStyle === "dashed" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Dash pattern</p>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpacingFields({
  value,
  onChange,
  variant,
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: string;
}) {
  const normalized = normalizeValue(value, variant);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TokenOrPixelField
        label="Margin top"
        value={normalized.marginTop ?? "6"}
        onChange={(next) => updateData(value, variant, onChange, { marginTop: next })}
        tokenOptions={marginTokenOptions}
        isToken={(candidate) =>
          dividerSpaceTokens.includes(candidate as (typeof dividerSpaceTokens)[number])
        }
        resolveCss={resolveDividerSpaceCss}
        selectPlaceholder="Spacing token"
        inputPlaceholder="e.g. 32px"
      />
      <TokenOrPixelField
        label="Margin bottom"
        value={normalized.marginBottom ?? "6"}
        onChange={(next) => updateData(value, variant, onChange, { marginBottom: next })}
        tokenOptions={marginTokenOptions}
        isToken={(candidate) =>
          dividerSpaceTokens.includes(candidate as (typeof dividerSpaceTokens)[number])
        }
        resolveCss={resolveDividerSpaceCss}
        selectPlaceholder="Spacing token"
        inputPlaceholder="e.g. 32px"
      />
    </div>
  );
}

function ResetActions({
  value,
  onChange,
  variant,
}: {
  value: DividerData;
  onChange: (next: DividerData) => void;
  variant: string;
}) {
  const resetLabel = () =>
    updateData(value, variant, onChange, {
      label: dividerDefaults.label ?? "",
      labelColor: dividerDefaults.labelColor,
      labelSize: dividerDefaults.labelSize,
      labelWeight: dividerDefaults.labelWeight,
      labelTransform: dividerDefaults.labelTransform,
      labelLetterSpacing: dividerDefaults.labelLetterSpacing,
      labelGap: dividerDefaults.labelGap,
    });

  const resetStyle = () =>
    updateData(value, variant, onChange, {
      thickness: dividerDefaults.thickness,
      color: dividerDefaults.color,
      width: dividerDefaults.width,
      containerWidth: dividerDefaults.containerWidth,
      customWidth: dividerDefaults.customWidth,
      align: dividerDefaults.align,
      lineStyle: resolveDividerDefaultLineStyle(variant),
      opacity: dividerDefaults.opacity,
      dashPattern: dividerDefaults.dashPattern,
      visibility: dividerDefaults.visibility,
    });

  const resetSpacing = () =>
    updateData(value, variant, onChange, {
      marginTop: dividerDefaults.marginTop,
      marginBottom: dividerDefaults.marginBottom,
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={resetLabel}>
        Reset label
      </Button>
      <Button type="button" variant="outline" onClick={resetStyle}>
        Reset style
      </Button>
      <Button type="button" variant="outline" onClick={resetSpacing}>
        Reset spacing
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(normalizeValue(value, variant))}
      >
        Normalize now
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(normalizeValue(dividerDefaults, variant))}
      >
        Reset to defaults
      </Button>
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
  const widthMode = normalized.width ?? "full";

  return (
    <div className="space-y-4">
      <DividerPreview value={value} variant={variant} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Divider style</p>
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
      </div>

      {resolvedVariant === "label-center" ? (
        <ClearableInputField
          label="Center label"
          value={normalized.label}
          onChange={(next) => updateData(value, variant, onChange, { label: next })}
          onClear={() =>
            updateData(value, variant, onChange, { label: dividerDefaults.label ?? "" })
          }
          placeholder="Optional label"
        />
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Line thickness</p>
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
              <SelectItem key={`wizard-thickness-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ColorField
        label="Line color"
        value={normalized.color}
        onChange={(next) => updateData(value, variant, onChange, { color: next })}
        placeholder="var(--color-border)"
        pickerFallback="#e2e8f0"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Width mode</p>
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
              <SelectItem key={`wizard-width-${option.id}`} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {widthMode === "container" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Container width</p>
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
                <SelectItem key={`wizard-container-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {widthMode === "custom" ? (
        <CustomWidthField
          value={normalized.customWidth ?? (dividerDefaults.customWidth as string)}
          onChange={(next) => updateData(value, variant, onChange, { customWidth: next })}
        />
      ) : null}

      {widthMode !== "full" ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Horizontal alignment</p>
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
                <SelectItem key={`wizard-align-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <SpacingFields value={value} onChange={onChange} variant={variant} />
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
        title="Preview"
        description="Check the current Divider output without leaving the editor."
      >
        <DividerPreview value={value} variant={variant} />
      </EditorSection>

      <EditorSection
        title="Variant and label"
        description="Choose divider style and configure the centered label when needed."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
        <LabelStyleFields value={value} onChange={onChange} variant={resolvedVariant} />
      </EditorSection>

      <EditorSection
        title="Line style and width"
        description="Adjust line style, width behavior, alignment, and visibility."
      >
        <LineAndWidthFields value={value} onChange={onChange} variant={resolvedVariant} />
      </EditorSection>

      <EditorSection
        title="Spacing around divider"
        description="Control top and bottom spacing for predictable rhythm."
      >
        <SpacingFields value={value} onChange={onChange} variant={variant} />
      </EditorSection>
    </div>
  );
}

export function DividerAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<DividerData>) {
  const normalized = normalizeValue(value, variant);
  const resolvedVariant = resolveDividerVariant(variant);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Preview"
        description="Inspect the normalized Divider output while adjusting technical fields."
      >
        <DividerPreview value={value} variant={variant} />
      </EditorSection>

      <EditorSection
        title="Technical divider tokens"
        description="Direct access to Divider-owned rendering fields without changing variant ownership."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Variant</p>
          <Select value={resolvedVariant} disabled onValueChange={() => undefined}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variantOptions.map((option) => (
                <SelectItem key={`advanced-variant-${option.id}`} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Variant is controlled by visual variant cards.
          </p>
        </div>

        <LabelStyleFields value={value} onChange={onChange} variant={resolvedVariant} />
        <LineAndWidthFields value={value} onChange={onChange} variant={resolvedVariant} />
        <SpacingFields value={value} onChange={onChange} variant={variant} />
      </EditorSection>

      <EditorSection
        title="Normalization and safeguards"
        description="Apply deterministic defaults without changing the active variant."
      >
        <ResetActions value={value} onChange={onChange} variant={variant} />
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
