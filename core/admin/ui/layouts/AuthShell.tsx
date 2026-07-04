import type { ReactNode } from "react";
import { Hexagon } from "lucide-react";

import { AdminColorModeToggle } from "@/ui/shared/AdminColorModeToggle";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  brand?: ReactNode;
  mobileBrand?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
};

// TASK-479-29-L01: there is no client-side version constant today (only the
// server's `env.APP_VERSION`); render the owner's literal "Coderso 1.0" — the
// SAME static label 06-L03's SidebarNav footer adopted (no invented endpoint,
// no divergence). Follow-up: wire a Vite `define`/exported constant once one
// exists, mirroring whatever resolution SidebarNav adopts.
const AUTH_VERSION_LABEL = "Coderso 1.0";

/**
 * TASK-479-29-L01: ports the prototype's centered single-column auth chrome
 * (`_docs/_PROTOTYPE/src/components/shell/AuthShell.tsx`) — warm canvas, violet
 * glow backdrop, dotted texture, top-right color-mode toggle, a `rounded-2xl`
 * violet logo chip + product heading, and a quiet product/version footer.
 *
 * The legacy split-panel `brand` path is kept for backward compatibility (other
 * callers / the back-compat test), but the DEFAULT (no `brand`) now renders the
 * centered layout. The auth pages stop passing `brand`.
 */
export function AuthShell({
  brand,
  mobileBrand,
  children,
  footer,
  className,
  contentClassName,
}: AuthShellProps) {
  // Legacy split-panel path: kept only for back-compat callers.
  if (brand) {
    return (
      <div className={cn("min-h-screen bg-background", className)}>
        <div className="flex min-h-screen w-full">
          <aside className="hidden w-[40%] lg:flex xl:w-[45%]">{brand}</aside>
          <main className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden p-6">
            <div
              className="pointer-events-none absolute inset-0 bg-dotted opacity-60"
              aria-hidden
            />
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

  // New default = prototype centered layout.
  return (
    <div
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10",
        className
      )}
    >
      {/* soft warm-canvas backdrop — decorative only (pointer-events-none). */}
      <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="absolute right-5 top-5 z-10">
        <AdminColorModeToggle />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          {mobileBrand ?? (
            <>
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <Hexagon className="size-6 fill-current" />
              </span>
              <h1 className="font-display text-xl font-semibold">Coderso</h1>
            </>
          )}
        </div>
        <div className={cn("w-full", contentClassName)}>{children}</div>
        {footer ?? (
          <p className="mt-6 text-center text-xs text-muted-foreground">{AUTH_VERSION_LABEL}</p>
        )}
      </div>
    </div>
  );
}
