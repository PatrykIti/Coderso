import { Input } from "@/components/ui/input";

import {
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
  const handleSwatchChange = onSwatchChange ?? onChange;
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
  const swatchColor = resolveColorSwatchValue(value, pickerFallback);

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
          value={swatchColor}
          onChange={(event) => handleSwatchChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        {showValueInput ? (
          <Input
            aria-label={`${label} value`}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <div className="flex min-h-9 flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded-md border border-border/70 shadow-inner"
              style={{ backgroundColor: swatchColor }}
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
