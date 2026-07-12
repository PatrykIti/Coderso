import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import type { CssColorProfile } from "../../../../services/theme/cssColorContract";
import {
  colorAlpha,
  composeHexColor,
  isAlphaPickerRepresentable,
  parseColorValue,
  pickerHexFor,
} from "../../shared/colorValue";

export function hasClearableFieldValue(value: unknown) {
  if (typeof value === "string") return value.length > 0;
  return value !== undefined && value !== null;
}

export function resolveColorPickerValue(
  value: string | undefined,
  fallback: string,
  colorProfile: CssColorProfile = "authoring"
) {
  return pickerHexFor(parseColorValue(value, colorProfile), fallback);
}

export function resolveColorSwatchValue(
  value: string | undefined,
  fallback?: string,
  colorProfile: CssColorProfile = "authoring"
) {
  return resolveColorPickerValue(value, fallback ?? "#000000", colorProfile);
}

export function isPickerRepresentableColorValue(
  value: string | undefined,
  colorProfile: CssColorProfile = "authoring"
) {
  return isAlphaPickerRepresentable(value, colorProfile);
}

export function applySharedColorPickerChange({
  currentValue,
  nextValue,
  onChange,
  onPickerChange,
  colorProfile = "authoring",
}: {
  currentValue: string | undefined;
  nextValue: string;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
  colorProfile?: CssColorProfile;
}) {
  const normalizedPickerValue = composeHexColor(nextValue, 1);
  if (normalizedPickerValue === undefined) return;

  if (onPickerChange) {
    onPickerChange(normalizedPickerValue);
    return;
  }

  const alpha = colorAlpha(parseColorValue(currentValue, colorProfile));
  const next = composeHexColor(normalizedPickerValue, alpha);
  if (next !== undefined) onChange(next);
}

// Opacity-slider edit: recompose the current base color with the new alpha (HI-2).
export function applySharedColorAlphaChange({
  currentValue,
  alphaPct,
  onChange,
  colorProfile = "authoring",
}: {
  currentValue: string | undefined;
  alphaPct: number;
  onChange: (next: string) => void;
  colorProfile?: CssColorProfile;
}) {
  if (!Number.isFinite(alphaPct) || alphaPct < 0 || alphaPct > 100) return;
  const parsed = parseColorValue(currentValue, colorProfile);
  if (parsed.kind !== "hex" && parsed.kind !== "rgb" && parsed.kind !== "hsl") return;
  const next = composeHexColor(parsed.baseHex, alphaPct / 100);
  if (next !== undefined) onChange(next);
}

export type ColorContrastAdvisory = {
  status: "ok" | "unknown" | "warning";
  message?: string;
};

const parseContrastColor = (value: string | undefined, colorProfile: CssColorProfile) => {
  const parsed = parseColorValue(value, colorProfile);
  if (parsed.kind !== "hex" && parsed.kind !== "rgb" && parsed.kind !== "hsl") return undefined;
  return { ...parsed.rgb, alpha: parsed.alpha };
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
  colorProfile?: CssColorProfile;
}): ColorContrastAdvisory {
  const colorProfile = input.colorProfile ?? "authoring";
  const foreground = parseContrastColor(input.foreground, colorProfile);
  const background =
    input.background === undefined || input.background === ""
      ? parseContrastColor(input.fallbackBackground, colorProfile)
      : parseContrastColor(input.background, colorProfile);
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
  clearResultLabel,
  clearButtonAriaLabel,
}: {
  label: string;
  value: unknown;
  onClear?: () => void;
  onRestore?: () => void;
  onRestoreValue?: (next: string) => void;
  clearFeedbackLabel?: string;
  clearResultLabel?: string;
  clearButtonAriaLabel?: string;
}) {
  const resolvedClearLabel = clearButtonAriaLabel
    ? clearButtonAriaLabel
    : `Clear ${label}${clearResultLabel ? `; ${clearResultLabel}` : ""}`;
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
          aria-label={resolvedClearLabel}
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

export function ColorTokenHint({
  value,
  colorProfile = "authoring",
}: {
  value: string | undefined;
  colorProfile?: CssColorProfile;
}) {
  if (parseColorValue(value, colorProfile).kind !== "token") return null;

  return (
    <p className="text-xs text-muted-foreground">
      Theme token active. Swatch preview uses the fallback until you replace it with a picker color.
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
  colorProfile = "authoring",
}: {
  value: string | undefined;
  onChange: (next: string) => void;
  onPickerChange?: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  inputId?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  colorProfile?: CssColorProfile;
}) {
  return (
    <>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolveColorPickerValue(value, pickerFallback, colorProfile)}
          onChange={(event) =>
            applySharedColorPickerChange({
              currentValue: value,
              nextValue: event.target.value,
              onChange,
              onPickerChange,
              colorProfile,
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
      <ColorTokenHint value={value} colorProfile={colorProfile} />
    </>
  );
}
