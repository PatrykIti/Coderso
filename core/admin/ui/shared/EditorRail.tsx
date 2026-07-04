import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * TASK-497-02 (B9): shared editor rail primitives ported from the prototype
 * (`patterns/EditorPreviewFrame.tsx`). Presentational grouping + item surface for
 * editor left rails (Posts block inserter today; reusable by other editors).
 * `EditorRailItem` is made wireable (click/active) for the real editor — unlike the
 * prototype's `cursor-default` decorative div.
 */
export function EditorRailGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4" data-editor-rail-group="true">
      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function EditorRailItem({
  icon,
  children,
  active,
  onClick,
  disabled,
  title,
  ...rest
}: {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  // ADAPT-NOT-COPY: two discriminated branches instead of the prototype's polymorphic
  // element. A `const Cmp = onClick ? "button" : "div"` infers the `"button" | "div"`
  // literal union, which narrows JSX-allowed props to the button∩div intersection and
  // hard-fails `lint:types` on the `type`/`{...rest}` (ButtonHTMLAttributes) spread. The
  // button-attribute spread therefore only ever lands on a real `<button>`.
  //
  // TASK-499-01: `disabled`/`title`-bearing items ALSO route to the real
  // `<button>` branch (not just clickable ones). Handler-less deferred items
  // (e.g. Posts/Categories "Coming soon") were previously dropped to the
  // presentational `<div>` branch, which silently discards `disabled`/`title`
  // and ships a live-looking, un-dimmed dead row. Rendering them as a real
  // dimmed, aria-disabled, title-tooltipped control closes that gap.
  const renderButton = Boolean(onClick) || Boolean(disabled) || title !== undefined;
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:text-muted-foreground",
    onClick && !disabled ? "cursor-pointer" : "cursor-default",
    active
      ? "bg-primary-soft text-primary-soft-foreground [&_svg]:text-primary"
      : "hover:bg-accent",
    "disabled:pointer-events-none disabled:opacity-50"
  );

  if (renderButton) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled ? true : undefined}
        title={title}
        data-active={active ? "true" : undefined}
        className={className}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  }

  return (
    <div data-active={active ? "true" : undefined} className={className}>
      {icon}
      {children}
    </div>
  );
}
