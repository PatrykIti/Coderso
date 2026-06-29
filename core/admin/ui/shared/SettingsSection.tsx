import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * TASK-479-06-L02: two-column settings layout ported from the prototype
 * (`patterns/SettingsSection.tsx`). Sticky title/description on the left,
 * controls on the right — Notion/Stripe style. Pair with `SettingsField` for
 * individual labelled controls.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-5 py-7 md:grid-cols-[260px_1fr]", className)}>
      <div className="md:sticky md:top-2 md:self-start">
        <h3 className="font-display text-[15px] font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
