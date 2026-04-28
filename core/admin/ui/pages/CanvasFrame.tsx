import { BlockToolbar } from "./BlockToolbar";

export function CanvasFrame() {
  return (
    <div className="relative flex h-full flex-1 flex-col items-center overflow-hidden bg-muted/30 p-6">
      <div className="absolute left-6 top-4 rounded border bg-background/80 px-2 py-1 text-xs text-muted-foreground">
        100% • 1024px
      </div>
      <div className="h-full w-full max-w-[1024px] overflow-hidden rounded-md border bg-background shadow-xl">
        <div className="h-full overflow-y-auto">
          <section className="relative border-2 border-primary/60">
            <div className="absolute -top-6 left-0 rounded-t bg-primary px-2 py-1 text-[10px] font-semibold uppercase text-primary-foreground">
              Hero section
            </div>
            <div className="absolute -top-6 right-0">
              <BlockToolbar />
            </div>
            <div className="bg-muted/40 px-8 py-16 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                v2.4 released
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">
                Build your system with Coderso
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The headless CMS that treats your content like code.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                  Get started
                </button>
                <button className="rounded-md border px-4 py-2 text-xs font-semibold">
                  View demo
                </button>
              </div>
            </div>
          </section>
          <section className="border-b px-8 py-14">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Features</h3>
                <p className="text-sm text-muted-foreground">
                  Showcase the strongest value props.
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                Hover to edit
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Versioned content",
                "Instant previews",
                "Runtime plugins",
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-lg border bg-muted/20 p-4"
                >
                  <h4 className="text-sm font-semibold">{feature}</h4>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Flexible blocks with clean schemas.
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="px-8 py-12">
            <div className="rounded-xl border bg-muted/20 p-6 text-center">
              <h3 className="text-lg font-semibold">Newsletter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep visitors updated with product news.
              </p>
              <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <input
                  className="h-9 w-full max-w-xs rounded-md border px-3 text-sm"
                  placeholder="Email address"
                />
                <button className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground">
                  Subscribe
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
