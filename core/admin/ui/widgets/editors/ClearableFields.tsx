import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const colorSwatchPattern = /^#[0-9a-fA-F]{6}$/;
const defaultColorSwatchFallback = "#000000";

export function hasClearableFieldValue(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export function resolveColorSwatchValue(value: string | undefined, fallback?: string) {
  if (value && colorSwatchPattern.test(value)) return value;
  if (fallback && colorSwatchPattern.test(fallback)) return fallback;
  return defaultColorSwatchFallback;
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
