import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

export function isPickerRepresentableColorValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return false;
  if (isHexColorValue(normalized)) return true;

  const rgbMatch = normalized.match(rgbColorPattern);
  if (!rgbMatch) return false;
  const [, , , , alpha] = rgbMatch;
  return !(typeof alpha === "string" && alpha.length > 0);
}

export function applySharedColorPickerChange({
  currentValue,
  nextValue,
  onChange,
  onPickerChange,
}: {
  currentValue: string | undefined;
  nextValue: string;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
}) {
  if (onPickerChange) {
    onPickerChange(nextValue);
    return;
  }

  if (!currentValue || isPickerRepresentableColorValue(currentValue)) {
    onChange(nextValue);
  }
}

export type ColorContrastAdvisory = {
  status: "ok" | "unknown" | "warning";
  message?: string;
};

const cssVariablePattern = /var\(/i;
const colorMixPattern = /color-mix\(/i;

const parseHexChannel = (value: string) => Number.parseInt(value, 16);

const expandHex = (value: string) =>
  value.length === 3
    ? value
        .split("")
        .map((part) => part + part)
        .join("")
    : value;

const parseColor = (value: string | undefined) => {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (
    normalized === "transparent" ||
    cssVariablePattern.test(normalized) ||
    colorMixPattern.test(normalized)
  ) {
    return null;
  }

  if (hexColorPattern.test(normalized)) {
    const hex = expandHex(normalized.startsWith("#") ? normalized.slice(1) : normalized);
    return {
      red: parseHexChannel(hex.slice(0, 2)),
      green: parseHexChannel(hex.slice(2, 4)),
      blue: parseHexChannel(hex.slice(4, 6)),
      alpha: 1,
    };
  }

  const rgbMatch = normalized.match(rgbColorPattern);
  if (!rgbMatch) return null;
  const [, red, green, blue, alpha] = rgbMatch;
  return {
    red: Number.parseInt(red, 10),
    green: Number.parseInt(green, 10),
    blue: Number.parseInt(blue, 10),
    alpha: typeof alpha === "string" && alpha.length > 0 ? Number.parseFloat(alpha) : 1,
  };
};

const toLuminanceChannel = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const toRelativeLuminance = (color: { red: number; green: number; blue: number }) =>
  0.2126 * toLuminanceChannel(color.red) +
  0.7152 * toLuminanceChannel(color.green) +
  0.0722 * toLuminanceChannel(color.blue);

const toContrastRatio = (
  foreground: { red: number; green: number; blue: number },
  background: { red: number; green: number; blue: number }
) => {
  const foregroundLuminance = toRelativeLuminance(foreground);
  const backgroundLuminance = toRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export function resolveColorContrastAdvisory(input: {
  foreground?: string;
  background?: string;
  fallbackBackground?: string;
  threshold?: number;
}): ColorContrastAdvisory {
  const foreground = parseColor(input.foreground);
  const background = parseColor(input.background) ?? parseColor(input.fallbackBackground);
  if (!foreground || !background) {
    return {
      status: "unknown",
      message: "Contrast depends on inherited theme or transparent colors.",
    };
  }

  if (foreground.alpha === 0 || background.alpha === 0) {
    return {
      status: "unknown",
      message: "Contrast depends on transparency or inherited background.",
    };
  }

  const threshold = input.threshold ?? 4.5;
  const ratio = toContrastRatio(foreground, background);
  if (ratio < threshold) {
    return {
      status: "warning",
      message: "Configured colors may be hard to read together.",
    };
  }

  return {
    status: "ok",
    message: "Configured colors look readable.",
  };
}

export function ClearableFieldHeader({
  label,
  value,
  onClear,
  onRestore,
  onRestoreValue,
  clearFeedbackLabel,
}: {
  label: string;
  value: unknown;
  onClear?: () => void;
  onRestore?: () => void;
  onRestoreValue?: (next: string) => void;
  clearFeedbackLabel?: string;
}) {
  const emitClearFeedback = () => {
    const derivedRestore =
      onRestore ??
      (typeof value === "string" && onRestoreValue && hasClearableFieldValue(value)
        ? () => onRestoreValue(value)
        : undefined);
    const feedbackLabel = (clearFeedbackLabel ?? label).trim() || label;
    if (derivedRestore) {
      toast.info(`${feedbackLabel} cleared.`, {
        action: {
          label: "Undo",
          onClick: derivedRestore,
        },
      });
      return;
    }
    toast.info(`${feedbackLabel} cleared.`);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">{label}</p>
      {onClear ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onClear?.();
            emitClearFeedback();
          }}
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
      <ClearableFieldHeader
        label={label}
        value={value}
        onClear={onClear}
        onRestore={
          hasClearableFieldValue(value)
            ? () => onChange(typeof value === "string" ? value : "")
            : undefined
        }
        clearFeedbackLabel={label}
      />
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

export function ColorContrastNotice({
  advisory,
  label,
}: {
  advisory: ColorContrastAdvisory;
  label: string;
}) {
  if (advisory.status === "ok" || !advisory.message) {
    return null;
  }

  return (
    <p
      className={
        advisory.status === "warning" ? "text-xs text-amber-700" : "text-xs text-muted-foreground"
      }
    >
      {label}: {advisory.message}
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
          onChange={(event) =>
            applySharedColorPickerChange({
              currentValue: value,
              nextValue: event.target.value,
              onChange,
              onPickerChange,
            })
          }
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
