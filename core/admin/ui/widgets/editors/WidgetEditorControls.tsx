import type { ReactNode } from "react";

import { InfoTip } from "@/ui/shared/InfoTip";
import { cn } from "@/lib/utils";

import type { EditorMode, WidgetEditorSectionRole } from "../../../../widgets/types";

export type WidgetEditorModeRootProps = {
  widgetType: string;
  mode: EditorMode;
  children: ReactNode;
  className?: string;
};

export type WidgetEditorSectionProps = {
  id: string;
  title: string;
  mode?: EditorMode;
  role?: WidgetEditorSectionRole;
  description?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export type WidgetControlOwnership = "writable" | "readonly" | "action" | "preview";

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
  path?: string;
  ownership?: WidgetControlOwnership;
  readOnly?: boolean;
  className?: string;
  hideLabel?: boolean;
  children: (props: WidgetControlFieldProps) => ReactNode;
};

export type ReadonlyWidgetSummaryRowProps = {
  id: string;
  label: string;
  value?: ReactNode;
  path?: string;
  help?: ReactNode;
  className?: string;
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
  mode,
  role,
  description,
  info,
  children,
  className,
  contentClassName,
}: WidgetEditorSectionProps) {
  const normalizedId = normalizeEditorDomId(id);
  const headingId = `${normalizedId}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      data-widget-editor-section={id}
      data-widget-editor-mode={mode}
      data-widget-editor-section-role={role}
      className={cn("space-y-3 rounded-lg border border-border/70 bg-background/50 p-3", className)}
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3
            id={headingId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {title}
          </h3>
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
  path,
  ownership,
  readOnly,
  className,
  hideLabel,
  children,
}: WidgetControlRowProps) {
  const normalizedId = normalizeEditorDomId(id);
  const labelId = `${normalizedId}-label`;
  const helpId = help ? `${normalizedId}-help` : undefined;
  const resolvedReadOnly = readOnly === true || ownership === "readonly";
  const resolvedOwnership =
    ownership ?? (resolvedReadOnly ? "readonly" : path ? "writable" : undefined);

  return (
    <div
      data-widget-control={id}
      data-widget-control-path={path}
      data-widget-control-ownership={resolvedOwnership}
      data-widget-control-readonly={resolvedReadOnly ? "true" : undefined}
      className={cn("space-y-2", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            id={labelId}
            className={cn("text-sm font-medium leading-5", hideLabel && "sr-only")}
          >
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

export function ReadonlyWidgetSummaryRow({
  id,
  label,
  value,
  path,
  help,
  className,
}: ReadonlyWidgetSummaryRowProps) {
  return (
    <WidgetControlRow
      id={id}
      label={label}
      help={help}
      path={path}
      ownership="readonly"
      readOnly
      className={className}
    >
      {(fieldProps) => (
        <div
          id={fieldProps.id}
          aria-labelledby={fieldProps["aria-labelledby"]}
          aria-describedby={fieldProps["aria-describedby"]}
          data-widget-control-summary="true"
          className="rounded-md border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {value ?? "Not configured"}
        </div>
      )}
    </WidgetControlRow>
  );
}
