import { Input } from "@/components/ui/input";

import {
  ClearableFieldHeader,
  hasClearableFieldValue,
  isPickerRepresentableColorValue,
  resolveColorSwatchValue,
} from "./ClearableFields";

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
}: SharedColorControlProps) {
  const handleSwatchChange = onSwatchChange ?? onChange;
  const normalizedValue = value?.trim();
  const hasValue = hasClearableFieldValue(value);
  const isTransparent = normalizedValue === "transparent";
  const themeDefaultValues = new Set(
    (treatAsThemeDefaultValues ?? [])
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
  const isThemeDefaultValue = normalizedValue ? themeDefaultValues.has(normalizedValue) : false;
  const hasCustomValue =
    hasValue && !isTransparent && !isThemeDefaultValue && !isPickerRepresentableColorValue(value);
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
      />
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          aria-label={`${label} swatch`}
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
              {isTransparent
                ? "Transparent"
                : hasCustomValue
                  ? "Saved custom color"
                  : hasValue && !isThemeDefaultValue
                    ? "Selected color"
                    : "Theme default"}
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
          A saved custom color is configured. Pick a swatch to replace it, or clear the field.
        </p>
      ) : null}
    </div>
  );
}
