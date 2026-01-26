import type { ReactNode } from "react";
import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthBrandPanelProps = {
  title?: string;
  headline?: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
};

export function AuthBrandPanel({
  title = "Nextless",
  headline = "The future of content management.",
  subtitle =
    "Experience the power of headless flexibility combined with intuitive design.",
  footer,
  className,
}: AuthBrandPanelProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-primary px-12 py-10 text-white",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_60%)]" />
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10">
          <Layers className="h-5 w-5" />
        </span>
        <span className="text-2xl font-semibold tracking-tight">{title}</span>
      </div>
      <div className="relative z-10 max-w-md space-y-4">
        <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
          {headline}
        </h1>
        <p className="text-lg text-white/70">{subtitle}</p>
      </div>
      <div className="relative z-10 text-sm text-white/60">
        {footer ?? "© 2024 Nextless Inc."}
      </div>
    </div>
  );
}
