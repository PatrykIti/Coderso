import { ChevronRight } from "lucide-react";
import { type ReactNode } from "react";

import { Link } from "@/lib/router";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 opacity-60" /> : null}
              {crumb.to ? (
                <Link to={crumb.to} className="rounded px-1 hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="px-1 text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground [&_svg]:size-5.5">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
