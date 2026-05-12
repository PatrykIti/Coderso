import type { ReactNode } from "react";

import { InfoTip } from "@/ui/shared/InfoTip";
import { cn } from "@/lib/utils";

import type { EditorMode } from "../../../../widgets/types";

export type WidgetEditorModeRootProps = {
  widgetType: string;
  mode: EditorMode;
  children: ReactNode;
  className?: string;
};

export type WidgetEditorSectionProps = {
  id: string;
  title: string;
  description?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export type WidgetControlFieldProps = {
  id: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
};

export type WidgetControlRowProps = {
  id: string;
  label: string;
  help?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: (props: WidgetControlFieldProps) => ReactNode;
};

function normalizeEditorDomId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function WidgetEditorModeRoot({
  widgetType,
  mode,
  children,
  className,
}: WidgetEditorModeRootProps) {
  return (
    <div
      data-widget-editor={widgetType}
      data-widget-editor-mode={mode}
      className={cn("space-y-4", className)}
    >
      {children}
    </div>
  );
}

export function WidgetEditorSection({
  id,
  title,
  description,
  info,
  children,
  className,
  contentClassName,
}: WidgetEditorSectionProps) {
  return (
    <section
      data-widget-editor-section={id}
      className={cn("space-y-3 rounded-lg border border-border/70 bg-background/50 p-3", className)}
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {info ? <InfoTip content={info} label={`${title} info`} /> : null}
        </div>
        {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      </div>
      <div className={cn("space-y-3", contentClassName)}>{children}</div>
    </section>
  );
}

export function WidgetControlRow({
  id,
  label,
  help,
  actions,
  className,
  children,
}: WidgetControlRowProps) {
  const normalizedId = normalizeEditorDomId(id);
  const labelId = `${normalizedId}-label`;
  const helpId = help ? `${normalizedId}-help` : undefined;

  return (
    <div data-widget-control={id} className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span id={labelId} className="text-sm font-medium leading-5">
            {label}
          </span>
          {help ? <InfoTip content={help} label={`${label} info`} className="mt-0.5" /> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children({
        id: `${normalizedId}-field`,
        "aria-labelledby": labelId,
        "aria-describedby": helpId,
      })}
      {help ? (
        <div id={helpId} className="sr-only">
          {help}
        </div>
      ) : null}
    </div>
  );
}
