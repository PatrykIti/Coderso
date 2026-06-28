import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  brand?: ReactNode;
  mobileBrand?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AuthShell({
  brand,
  mobileBrand,
  children,
  footer,
  className,
  contentClassName,
}: AuthShellProps) {
  return (
    <div className={cn("min-h-screen bg-[var(--admin-base-bg)]", className)}>
      <div className="flex min-h-screen w-full">
        {brand ? <aside className="hidden w-[40%] lg:flex xl:w-[45%]">{brand}</aside> : null}
        <main className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden p-6">
          {/* TASK-479-06-L05: soft "warm canvas" backdrop ported from the
              prototype AuthShell — decorative only (pointer-events-none) so the
              centered card/form stays fully interactive. */}
          <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" aria-hidden />
          <div
            className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          {mobileBrand ? (
            <div className="relative z-10 mb-8 w-full max-w-md">{mobileBrand}</div>
          ) : null}
          <div className={cn("relative z-10 w-full max-w-md", contentClassName)}>{children}</div>
          {footer ? <div className="relative z-10 mt-8">{footer}</div> : null}
        </main>
      </div>
    </div>
  );
}
