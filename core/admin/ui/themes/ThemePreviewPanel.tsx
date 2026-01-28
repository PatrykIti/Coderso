import { AlertTriangle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function ThemePreviewPanel() {
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8 lg:p-12">
        <Card className="gap-10 border-border/60 p-10">
          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Typography &amp; Headings
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Empowering content creators with modern tools
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The quick brown fox jumps over the lazy dog. A minimalist headless
              CMS built for speed and developer experience.
            </p>
          </section>

          <Separator />

          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Buttons &amp; Actions
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" className="shadow-sm">
                Primary Action
              </Button>
              <Button size="sm" variant="outline">
                Secondary
              </Button>
              <Button size="sm" variant="ghost" className="text-primary">
                Ghost Button
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              UI Components
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Info Card</h4>
                  <p className="text-xs text-muted-foreground">
                    Standard informative surface
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/40 p-4">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Muted Surface</h4>
                  <p className="text-xs text-muted-foreground">
                    Background variations
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 p-4 text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Heads up!</p>
              <p className="text-xs text-amber-700">
                These changes will affect all production sites using this theme.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
