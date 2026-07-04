import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

/** Minimal click-to-open menu — enough for topbar user/notification menus in the prototype. */
export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="outline-none">
        {trigger}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-52 origin-top rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-pop animate-in-soft",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  children,
  icon,
  destructive,
  className,
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors [&_svg]:size-4 [&_svg]:text-muted-foreground",
        destructive
          ? "text-destructive hover:bg-destructive/10 [&_svg]:text-destructive"
          : "text-foreground hover:bg-accent",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
