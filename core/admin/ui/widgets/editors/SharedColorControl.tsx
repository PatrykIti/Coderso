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
}: SharedColorControlProps) {
  const handleSwatchChange = onSwatchChange ?? onChange;
  const hasValue = hasClearableFieldValue(value);
  const hasCustomValue = hasValue && !isPickerRepresentableColorValue(value);

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
          value={resolveColorSwatchValue(value, pickerFallback)}
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
            <span className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
              {hasCustomValue
                ? "Saved custom color"
                : hasValue
                  ? "Selected color"
                  : "Theme default"}
            </span>
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
