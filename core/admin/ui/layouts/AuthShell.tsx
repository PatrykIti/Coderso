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
    <div className={cn("min-h-screen bg-muted/30", className)}>
      <div className="flex min-h-screen w-full">
        {brand ? (
          <aside className="hidden lg:flex w-[40%] xl:w-[45%]">
            {brand}
          </aside>
        ) : null}
        <main className="flex w-full flex-1 flex-col items-center justify-center p-6">
          {mobileBrand ? (
            <div className="mb-8 w-full max-w-md">{mobileBrand}</div>
          ) : null}
          <div className={cn("w-full max-w-md", contentClassName)}>
            {children}
          </div>
          {footer ? <div className="mt-8">{footer}</div> : null}
        </main>
      </div>
    </div>
  );
}
