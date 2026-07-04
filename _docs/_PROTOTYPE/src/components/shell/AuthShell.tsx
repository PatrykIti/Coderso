import { Hexagon } from "lucide-react";
import { type ReactNode } from "react";

import { ThemeToggle } from "@/components/shell/ThemeToggle";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* soft violet glow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Hexagon className="size-6 fill-current" />
          </span>
          <h1 className="font-display text-xl font-semibold">Coderso</h1>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © Coderso CMS · Prototype preview
        </p>
      </div>
    </div>
  );
}
