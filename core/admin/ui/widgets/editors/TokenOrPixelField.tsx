import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TokenOption = {
  id: string;
  label: string;
};

type TokenFieldValidation =
  | {
      status: "token";
      message: string;
    }
  | {
      status: "custom-empty";
      message: string;
    }
  | {
      status: "custom-valid";
      message: string;
    }
  | {
      status: "custom-invalid";
      message: string;
    };

const pxPattern = /^\d+(?:\.\d+)?px$/i;
const numberPattern = /^\d+(?:\.\d+)?$/;

const customOptionValue = "custom";

export function buildVisibleOffTokenOptions(options: TokenOption[]) {
  if (
    !options.some((option) => option.id === "none") ||
    !options.some((option) => option.id === "0")
  ) {
    return options;
  }

  return options.filter((option) => option.id !== "0");
}

function normalizeCustomPixelValue(rawValue: string) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return undefined;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  return undefined;
}

function buildValidation(
  draft: string | null,
  savedResolvedValue: string,
  resolveCss: (value: string) => string,
  normalizeCustomValue: (rawValue: string) => string | undefined,
  customValueLabel: string
): TokenFieldValidation {
  if (draft === null) {
    return {
      status: "token",
      message: `Resolved from token: ${savedResolvedValue}`,
    };
  }

  const trimmed = draft.trim();
  if (trimmed.length === 0) {
    return {
      status: "custom-empty",
      message: `Enter a ${customValueLabel}. Saved value stays ${savedResolvedValue}.`,
    };
  }

  const normalized = normalizeCustomValue(trimmed);
  if (normalized) {
    return {
      status: "custom-valid",
      message: `Resolved custom value: ${resolveCss(normalized)}`,
    };
  }

  return {
    status: "custom-invalid",
    message: `Invalid ${customValueLabel}. Saved value stays ${savedResolvedValue}.`,
  };
}

export function TokenOrPixelField({
  label,
  value,
  onChange,
  tokenOptions,
  isToken,
  resolveCss,
  selectPlaceholder,
  inputPlaceholder,
  customOptionLabel = "Custom px",
  customValueLabel = "custom px value",
  normalizeCustomValue = normalizeCustomPixelValue,
  fieldDescription,
  customInputLabel,
  customInputHelp,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  tokenOptions: TokenOption[];
  isToken: (value: string) => boolean;
  resolveCss: (value: string) => string;
  selectPlaceholder: string;
  inputPlaceholder: string;
  customOptionLabel?: string;
  customValueLabel?: string;
  normalizeCustomValue?: (rawValue: string) => string | undefined;
  fieldDescription?: string;
  customInputLabel?: string;
  customInputHelp?: string;
}) {
  const valueIsToken = isToken(value);
  const fieldId = useId();
  const lastCommittedValueRef = useRef(value);
  const [customDraft, setCustomDraft] = useState<string | null>(valueIsToken ? null : value);

  useEffect(() => {
    if (value === lastCommittedValueRef.current) return;
    lastCommittedValueRef.current = value;
    setCustomDraft(valueIsToken ? null : value);
  }, [value, valueIsToken]);

  const savedResolvedValue = resolveCss(value);
  const validation = buildValidation(
    customDraft,
    savedResolvedValue,
    resolveCss,
    normalizeCustomValue,
    customValueLabel
  );
  const fieldDescriptionId = fieldDescription ? `${fieldId}-description` : undefined;
  const customInputHelpId = customInputHelp ? `${fieldId}-custom-help` : undefined;
  const validationId = `${fieldId}-validation`;
  const customInputDescribedBy =
    [fieldDescriptionId, customInputHelpId, validationId].filter(Boolean).join(" ") || undefined;
  const selectValue =
    customDraft !== null
      ? customOptionValue
      : value === "0" && tokenOptions.some((option) => option.id === "none")
        ? "none"
        : value;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      {fieldDescription ? (
        <p id={fieldDescriptionId} className="text-xs text-muted-foreground">
          {fieldDescription}
        </p>
      ) : null}
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === customOptionValue) {
            setCustomDraft(valueIsToken ? "" : value);
            return;
          }
          setCustomDraft(null);
          onChange(next);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={selectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {tokenOptions.map((option) => (
            <SelectItem key={`${label}-${option.id}`} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value={customOptionValue}>{customOptionLabel}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={customDraft ?? ""}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setCustomDraft(nextDraft);
          const normalized = normalizeCustomValue(nextDraft);
          if (normalized) onChange(normalized);
        }}
        aria-label={customInputLabel ?? `${label} custom value`}
        aria-describedby={customInputDescribedBy}
        placeholder={inputPlaceholder}
      />
      {customInputHelp ? (
        <p id={customInputHelpId} className="text-xs text-muted-foreground">
          {customInputHelp}
        </p>
      ) : null}
      <p
        id={validationId}
        role={validation.status === "custom-invalid" ? "alert" : undefined}
        className="text-xs text-muted-foreground"
      >
        {validation.message}
      </p>
    </div>
  );
}
