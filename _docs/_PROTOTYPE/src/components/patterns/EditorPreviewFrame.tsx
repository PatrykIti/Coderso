import { Eye, Monitor, Redo2, Smartphone, Undo2 } from "lucide-react";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Static "editor chrome" frame used by all editor previews (Page, Post, Form, Menu, …).
 * It shows the real layout (left rail / canvas / inspector) but is intentionally
 * non-functional — a "Preview only" pill makes that explicit.
 */
export function EditorPreviewFrame({
  left,
  canvas,
  right,
  title = "Editor preview",
  toolbar,
  device = true,
  className,
}: {
  left?: ReactNode;
  canvas: ReactNode;
  right?: ReactNode;
  title?: ReactNode;
  toolbar?: ReactNode;
  device?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="soft">
            <Eye className="size-3" /> Preview only
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {toolbar}
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button variant="ghost" size="icon-sm" aria-label="Undo">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Redo">
            <Redo2 className="size-4" />
          </Button>
          {device ? (
            <div className="ml-1 hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex">
              <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
                <Monitor className="size-3.5" />
              </span>
              <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground">
                <Smartphone className="size-3.5" />
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {left ? (
          <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3 lg:block">
            {left}
          </aside>
        ) : null}
        <div className="min-w-0 flex-1 overflow-y-auto bg-dotted p-6">{canvas}</div>
        {right ? (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-card p-4 xl:block">
            {right}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function EditorRailGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
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
}: {
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors [&_svg]:size-4 [&_svg]:text-muted-foreground",
        active ? "bg-primary-soft text-primary-soft-foreground [&_svg]:text-primary" : "hover:bg-accent",
      )}
    >
      {icon}
      {children}
    </div>
  );
}
