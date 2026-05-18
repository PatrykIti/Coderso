import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function hasClearableFieldValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const rgbColorPattern =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*((?:0|1|0?\.\d+)))?\s*\)$/i;

export function isHexColorValue(value: string | undefined) {
  return typeof value === "string" && hexColorPattern.test(value);
}

export function resolveColorPickerValue(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (isHexColorValue(value)) return value;

  const rgbMatch = value.match(rgbColorPattern);
  if (!rgbMatch) return fallback;

  const [, red, green, blue, alpha] = rgbMatch;
  // Alpha-aware rgba values cannot round-trip through an HTML color input.
  if (typeof alpha === "string" && alpha.length > 0) return fallback;
  const toHex = (channel: string) => Number.parseInt(channel, 10).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function resolveColorSwatchValue(value: string | undefined, fallback?: string) {
  return resolveColorPickerValue(value, fallback ?? "#000000");
}

export function ClearableFieldHeader({
  label,
  value,
  onClear,
}: {
  label: string;
  value: unknown;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">{label}</p>
      {onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasClearableFieldValue(value)}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}

export function ClearableInputField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <div className="space-y-1.5">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ColorTokenHint({ value }: { value: string | undefined }) {
  if (!hasClearableFieldValue(value) || isHexColorValue(value)) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Custom token active. Swatch preview uses the fallback until you replace it with a hex color.
    </p>
  );
}

export function SharedColorFieldInputs({
  value,
  onChange,
  onPickerChange,
  placeholder,
  pickerFallback,
  inputId,
  ariaLabelledby,
  ariaDescribedby,
}: {
  value: string | undefined;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  inputId?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}) {
  return (
    <>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolveColorPickerValue(value, pickerFallback)}
          onChange={(event) => (onPickerChange ?? onChange)(event.target.value)}
          className="h-9 w-10 p-1"
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
        />
        <Input
          id={inputId}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
        />
      </div>
      <ColorTokenHint value={value} />
    </>
  );
}
