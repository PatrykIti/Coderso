import { Input } from "@/components/ui/input";

import type { CssColorProfile } from "../../../services/theme/cssColorContract";
import {
  colorAlpha,
  normalizeAdminColorValue,
  parseColorValue,
  pickerHexFor,
  type ParsedColor,
} from "./colorValue";
import {
  applySharedColorAlphaChange,
  applySharedColorPickerChange,
  ClearableFieldHeader,
} from "./ClearableFields";

export type SharedColorStateKind =
  | "cleared"
  | "theme_token"
  | "theme_default_token"
  | "transparent"
  | "inherited"
  | "selected_swatch"
  | "saved_custom";

export type SharedColorState = Readonly<{
  kind: SharedColorStateKind;
  label: string;
  description: string;
  clearResultLabel: string;
}>;

const defaultClearResultLabel = "removes the saved color value";

const parseSharedColorValue = (
  value: string | undefined,
  colorProfile: CssColorProfile,
  allowInheritKeyword: boolean
): ParsedColor => {
  const parsed = parseColorValue(value, colorProfile);
  if (parsed.kind === "keyword" && parsed.normalized === "inherit" && !allowInheritKeyword) {
    return { kind: "unknown", raw: parsed.raw };
  }
  return parsed;
};

export function describeSharedColorControlState({
  value,
  treatAsThemeDefaultValues,
  clearedState,
  colorProfile = "authoring",
  allowInheritKeyword = true,
}: {
  value: string | undefined;
  treatAsThemeDefaultValues?: string[];
  clearedState?: {
    label?: string;
    description?: string;
    clearResultLabel?: string;
  };
  colorProfile?: CssColorProfile;
  allowInheritKeyword?: boolean;
}): SharedColorState {
  if (value === undefined || value === "") {
    return {
      kind: "cleared",
      label: clearedState?.label ?? "Theme default",
      description:
        clearedState?.description ??
        "No color override is saved. The swatch is only a fallback preview.",
      clearResultLabel: clearedState?.clearResultLabel ?? defaultClearResultLabel,
    };
  }

  const parsed = parseSharedColorValue(value, colorProfile, allowInheritKeyword);
  const themeDefaultValues = new Set(
    (treatAsThemeDefaultValues ?? [])
      .map((entry) => parseSharedColorValue(entry, colorProfile, allowInheritKeyword))
      .filter((entry) => entry.kind === "token")
      .map((entry) => entry.normalized)
  );

  if (parsed.kind === "keyword" && parsed.normalized === "transparent") {
    return {
      kind: "transparent",
      label: "Transparent",
      description: "A transparent value is saved.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (parsed.kind === "token" && themeDefaultValues.has(parsed.normalized)) {
    return {
      kind: "theme_default_token",
      label: "Theme default",
      description: "This saved theme token matches the widget default.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (parsed.kind === "token") {
    return {
      kind: "theme_token",
      label: "Theme token",
      description: "A theme token is saved. The swatch is only a fallback preview.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (
    parsed.kind === "keyword" &&
    (parsed.normalized === "currentColor" || parsed.normalized === "inherit")
  ) {
    return {
      kind: "inherited",
      label: "Inherited color",
      description:
        "An inherited color is preserved for retained rendering. The swatch is only a fallback preview.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl") {
    return {
      kind: "selected_swatch",
      label: "Selected color",
      description: "A picker color is saved.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  return {
    kind: "saved_custom",
    label: "Saved custom color",
    description: "A custom color value is saved. The swatch is only a fallback preview.",
    clearResultLabel: defaultClearResultLabel,
  };
}

type SharedColorControlProps = {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  controlId?: string;
  controlPath?: string;
  onSwatchChange?: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  pickerFallback?: string;
  showValueInput?: boolean;
  allowTransparent?: boolean;
  treatAsThemeDefaultValues?: string[];
  clearedLabel?: string;
  clearedDescription?: string;
  clearResultLabel?: string;
  swatchAriaLabel?: string;
  colorProfile?: CssColorProfile;
  allowInheritKeyword?: boolean;
};

export function SharedColorControl({
  label,
  value,
  onChange,
  controlId,
  controlPath,
  onSwatchChange,
  onClear,
  placeholder,
  pickerFallback,
  showValueInput = true,
  allowTransparent = false,
  treatAsThemeDefaultValues,
  clearedLabel,
  clearedDescription,
  clearResultLabel,
  swatchAriaLabel,
  colorProfile = "authoring",
  allowInheritKeyword = true,
}: SharedColorControlProps) {
  const clearedState =
    clearedLabel !== undefined || clearedDescription !== undefined || clearResultLabel !== undefined
      ? {
          ...(clearedLabel !== undefined ? { label: clearedLabel } : {}),
          ...(clearedDescription !== undefined ? { description: clearedDescription } : {}),
          ...(clearResultLabel !== undefined ? { clearResultLabel } : {}),
        }
      : undefined;
  const colorState = describeSharedColorControlState({
    value,
    treatAsThemeDefaultValues,
    clearedState,
    colorProfile,
    allowInheritKeyword,
  });
  const hasCustomValue = colorState.kind === "saved_custom";
  // Parse once: the native picker + preview show the BASE hex (HTML pickers cannot
  // render alpha) while the opacity slider owns the alpha channel.
  const parsed = parseSharedColorValue(value, colorProfile, allowInheritKeyword);
  const representable = parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl";
  const pickerBaseHex = pickerHexFor(parsed, pickerFallback);
  // Standalone preview chip shows the REAL color (incl. alpha) for representable
  // values so the applied opacity is visible; token/keyword fall back to the base.
  const previewColor = representable ? parsed.normalized : pickerBaseHex;
  const opacityPct = Math.round(colorAlpha(parsed) * 100);

  // Free-text commits pass the original bytes to the canonical normalizer. Invalid or
  // context-rejected input is not emitted, so the uncontrolled field keeps its draft.
  // Commit on blur/Enter only: per-keystroke commits would remount the `key={value}`
  // field and prevent incremental entry of otherwise valid longer color values.
  const commitText = (draft: string) => {
    if (draft === (value ?? "")) return;
    const safe = normalizeAdminColorValue(draft, colorProfile);
    if (safe === undefined || (safe === "inherit" && !allowInheritKeyword)) return;
    onChange(safe);
  };

  return (
    <div
      data-widget-control={controlId}
      data-widget-control-path={controlPath}
      data-widget-control-ownership={controlPath ? "writable" : undefined}
      data-shared-color-state={colorState.kind}
      className="space-y-2"
    >
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestoreValue={onChange}
        clearResultLabel={clearResultLabel ?? colorState.clearResultLabel}
      />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          aria-label={swatchAriaLabel ?? `${label} swatch`}
          type="color"
          value={pickerBaseHex}
          onChange={(event) =>
            applySharedColorPickerChange({
              currentValue: value,
              nextValue: event.target.value,
              onChange,
              onPickerChange: onSwatchChange,
              colorProfile,
            })
          }
          className="h-9 w-10 p-1"
        />
        {showValueInput ? (
          <Input
            key={value}
            aria-label={`${label} value`}
            defaultValue={value ?? ""}
            onBlur={(event) => commitText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitText(event.currentTarget.value);
            }}
            placeholder={placeholder}
          />
        ) : (
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-md border border-border/70 shadow-inner"
              style={{ backgroundColor: previewColor }}
            />
            <span className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
              {colorState.label}
            </span>
            {allowTransparent ? (
              <button
                type="button"
                className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted/50"
                onClick={() => onChange("transparent")}
              >
                Use transparent
              </button>
            ) : null}
          </div>
        )}
      </div>
      {showValueInput && representable ? (
        <div className="space-y-1" data-shared-color-opacity>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Opacity</span>
            <span>{opacityPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacityPct}
            aria-label={`${label} opacity`}
            onChange={(event) =>
              applySharedColorAlphaChange({
                currentValue: value,
                alphaPct: Number(event.target.value),
                onChange,
                colorProfile,
              })
            }
            className="w-full accent-primary"
          />
        </div>
      ) : null}
      {!showValueInput && hasCustomValue ? (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/40 p-2 text-xs text-muted-foreground">
          {colorState.description}
        </p>
      ) : !showValueInput ? (
        <p className="text-xs text-muted-foreground">{colorState.description}</p>
      ) : null}
    </div>
  );
}
