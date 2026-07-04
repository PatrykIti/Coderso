import { Check, Minus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";

type CheckboxProps = {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const state = checked ?? internal;
  const isOn = state === true;
  const isIndeterminate = state === "indeterminate";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isOn}
      disabled={disabled}
      onClick={() => {
        if (checked === undefined) setInternal((v) => !v);
        onCheckedChange?.(!isOn);
      }}
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
        isOn || isIndeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card",
        className,
      )}
      {...rest}
    >
      {isIndeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : isOn ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
}
