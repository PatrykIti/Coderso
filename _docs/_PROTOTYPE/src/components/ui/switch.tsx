import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/** Lightweight, dependency-free switch (visual + toggles). Mirrors the shadcn API. */
export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = checked ?? internal;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => {
        if (checked === undefined) setInternal((v) => !v);
        onCheckedChange?.(!isOn);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
        isOn ? "bg-primary" : "bg-input",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-soft transition-transform",
          isOn ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SwitchRow({
  label,
  description,
  defaultChecked,
  checked,
}: {
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <Switch defaultChecked={defaultChecked} checked={checked} />
    </div>
  );
}
