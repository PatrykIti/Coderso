import { Input } from "@/components/ui/input";

import {
  colorAlpha,
  composeHexColor,
  isAlphaPickerRepresentable,
  normalizeAdminColorValue,
  parseColorValue,
} from "../../shared/colorValue";
import {
  applySharedColorAlphaChange,
  applySharedColorPickerChange,
  ClearableFieldHeader,
  isHexColorValue,
  isPickerRepresentableColorValue,
  resolveColorSwatchValue,
} from "./ClearableFields";

export type SharedColorState =
  | {
      kind: "cleared";
      label: string;
      description: string;
      clearResultLabel: string;
    }
  | {
      kind: "theme_token";
      label: string;
      description: string;
      clearResultLabel: string;
    }
  | {
      kind: "theme_default_token";
      label: string;
      description: string;
      clearResultLabel: string;
    }
  | {
      kind: "transparent";
      label: string;
      description: string;
      clearResultLabel: string;
    }
  | {
      kind: "selected_swatch";
      label: string;
      description: string;
      clearResultLabel: string;
    }
  | {
      kind: "saved_custom";
      label: string;
      description: string;
      clearResultLabel: string;
    };

const cssTokenPattern = /^(?:var|color-mix)\(/i;
const defaultClearResultLabel = "removes the saved color value";

export function describeSharedColorControlState({
  value,
  treatAsThemeDefaultValues,
  clearedState,
}: {
  value: string | undefined;
  treatAsThemeDefaultValues?: string[];
  clearedState?: {
    label?: string;
    description?: string;
    clearResultLabel?: string;
  };
}): SharedColorState {
  const normalizedValue = value?.trim();
  const themeDefaultValues = new Set(
    (treatAsThemeDefaultValues ?? [])
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );

  if (!normalizedValue) {
    return {
      kind: "cleared",
      label: clearedState?.label ?? "Theme default",
      description:
        clearedState?.description ??
        "No color override is saved. The swatch is only a fallback preview.",
      clearResultLabel: clearedState?.clearResultLabel ?? defaultClearResultLabel,
    };
  }

  if (normalizedValue === "transparent") {
    return {
      kind: "transparent",
      label: "Transparent",
      description: "A transparent value is saved.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (themeDefaultValues.has(normalizedValue)) {
    return {
      kind: "theme_default_token",
      label: "Theme default",
      description: "This saved theme token matches the widget default.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (cssTokenPattern.test(normalizedValue)) {
    return {
      kind: "theme_token",
      label: "Theme token",
      description: "A theme token is saved. The swatch is only a fallback preview.",
      clearResultLabel: defaultClearResultLabel,
    };
  }

  if (isHexColorValue(normalizedValue) || isPickerRepresentableColorValue(normalizedValue)) {
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
  });
  const hasCustomValue = colorState.kind === "saved_custom";
  // Parse once: the native picker + preview show the BASE hex (HTML pickers cannot
  // render alpha) while the opacity slider owns the alpha channel.
  const parsed = parseColorValue(value);
  const representable = isAlphaPickerRepresentable(value);
  const pickerBaseHex = resolveColorSwatchValue(value, pickerFallback);
  // Standalone preview chip shows the REAL color (incl. alpha) for representable
  // values so the applied opacity is visible; token/keyword fall back to the base.
  const previewColor = value && representable ? value : pickerBaseHex;
  const opacityPct = Math.round(colorAlpha(parsed) * 100);

  // Free-text commit: canonicalize through the shared boundary mirror so the EMITTED
  // value is render-safe (leading-dot alpha `.84` -> `0.84`, which the widget render
  // boundary `resolveClearableCssColorValue` requires). Emit ONLY when the normalizer
  // returns a whitelist-safe string; unknown/incomplete input is not emitted (the
  // uncontrolled field keeps the typed draft). A hex draft re-emits via the canonical
  // composer for a byte-identical lowercase `#rrggbb[aa]`. Committed on blur/Enter ONLY
  // (mirrors ColorSwatchControl): a per-keystroke commit would remount the `key={value}`
  // field mid-typing and canonicalize valid substrings (`#081` -> `#008811`), making a
  // hex8 alpha value like `#0812209e` un-typable character-by-character.
  const commitText = (draft: string) => {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) return;
    const safe = normalizeAdminColorValue(trimmed);
    if (!safe) return;
    const safeParsed = parseColorValue(safe);
    onChange(
      safeParsed.kind === "hex" ? composeHexColor(safeParsed.baseHex, safeParsed.alpha) : safe
    );
  };

  return (
    <div
      data-widget-control={controlId}
      data-widget-control-path={controlPath}
      data-widget-control-ownership={controlPath ? "writable" : undefined}
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
        <p className="text-xs text-muted-foreground" data-shared-color-state={colorState.kind}>
          {colorState.description}
        </p>
      ) : null}
    </div>
  );
}
