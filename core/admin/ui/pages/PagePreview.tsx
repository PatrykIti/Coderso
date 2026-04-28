import { useMemo } from "react";

import { Button } from "@/components/ui/button";

const parseParams = (search: string) => {
  const params = new URLSearchParams(search);
  return {
    type: params.get("type") ?? "page",
    path: params.get("path"),
    contentType: params.get("contentType"),
    slug: params.get("slug"),
    token: params.get("token"),
  };
};

export function PagePreview() {
  const params = useMemo(() => {
    if (typeof window === "undefined") {
      return { type: "page" } as ReturnType<typeof parseParams>;
    }
    return parseParams(window.location.search);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Preview Mode
            </p>
            <h1 className="text-lg font-semibold">Page preview</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.close()}>
            Close preview
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <h2 className="text-base font-semibold">Preview link details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Runtime rendering will be integrated in the next milestone.
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            <div>
              <span className="font-semibold">Type:</span> {params.type}
            </div>
            {params.path ? (
              <div>
                <span className="font-semibold">Path:</span> {params.path}
              </div>
            ) : null}
            {params.contentType ? (
              <div>
                <span className="font-semibold">Content type:</span> {params.contentType}
              </div>
            ) : null}
            {params.slug ? (
              <div>
                <span className="font-semibold">Slug:</span> {params.slug}
              </div>
            ) : null}
            {params.token ? (
              <div className="break-all">
                <span className="font-semibold">Token:</span> {params.token}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
