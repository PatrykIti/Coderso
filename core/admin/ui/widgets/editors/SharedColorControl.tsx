import { Input } from "@/components/ui/input";

import { ClearableFieldHeader, resolveColorSwatchValue } from "./ClearableFields";

type SharedColorControlProps = {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  onSwatchChange?: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  pickerFallback?: string;
};

export function SharedColorControl({
  label,
  value,
  onChange,
  onSwatchChange,
  onClear,
  placeholder,
  pickerFallback,
}: SharedColorControlProps) {
  const handleSwatchChange = onSwatchChange ?? onChange;

  return (
    <div className="space-y-2">
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
        <Input
          aria-label={`${label} value`}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
