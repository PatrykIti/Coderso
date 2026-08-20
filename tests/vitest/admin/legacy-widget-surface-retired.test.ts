// tests/vitest/admin/legacy-widget-surface-retired.test.ts
// Guard: TASK-580 deleted the v1 widget kernel (`core/widgets/**`),
// `core/admin/ui/widgets/**`, `core/admin/ui/pages/builder/**`, and the v1
// public page runtime (`pageRuntime.tsx`, `renderPublicPageHtml`,
// `renderPublicPageRuntimeHtml`). These pure filesystem/route assertions pin
// the absence so no future task re-introduces the surface.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

const gitFiles = (args: readonly string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);

const sourcePaths = [
  ...gitFiles(["ls-files", "--", "core", "tests", "scripts"]),
  ...gitFiles(["ls-files", "--others", "--exclude-standard", "--", "core", "tests", "scripts"]),
]
  .filter((path) => /\.(?:ts|tsx)$/u.test(path))
  .filter((path) => existsSync(path));

const sourceLines: ReadonlyMap<string, readonly string[]> = new Map(
  sourcePaths.map((path) => [path, readFileSync(path, "utf8").split(/\r?\n/u)])
);

const anySourceLineMatches = (pattern: RegExp): string[] => {
  const hits: string[] = [];
  for (const [path, lines] of sourceLines) {
    if (path === "tests/vitest/admin/legacy-widget-surface-retired.test.ts") continue;
    lines.forEach((line, index) => {
      if (pattern.test(line)) hits.push(`${path}:${index + 1}:${line}`);
    });
  }
  return hits;
};

describe("TASK-580 v1 widget kernel removal", () => {
  it("core/widgets and core/admin/ui/widgets directories are absent", () => {
    expect(existsSync(join(REPO_ROOT, "core/widgets"))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "core/admin/ui/widgets"))).toBe(false);
    expect(existsSync(join(REPO_ROOT, "core/admin/ui/pages/builder"))).toBe(false);
  });

  it("no tracked source imports a core/widgets or admin/ui/widgets path", () => {
    const hits = anySourceLineMatches(
      /from\s+["'][^"']*(?:core\/widgets|admin\/ui\/widgets|pages\/builder)[^"']*["']|require\(["'][^"']*(?:core\/widgets|admin\/ui\/widgets)[^"']*["']\)/u
    );
    expect(hits).toEqual([]);
  });

  it("v1 public page runtime exports are absent from renderPublicPage.tsx", () => {
    const source = readFileSync(join(REPO_ROOT, "core/site/renderPublicPage.tsx"), "utf8");
    expect(source).not.toContain("renderPublicPageHtml");
    expect(source).not.toContain("renderPublicPageRuntimeHtml");
    expect(/DefaultRuntimePageShell(?!V2)/u.test(source)).toBe(false);
  });

  it("v1 hydration kernel and runtime registration calls are gone", () => {
    const hits = anySourceLineMatches(
      /hydrateRuntimeBlocks|hydrateRuntimeBlock\b|ensureRuntimeWidgetsRegistered|normalizeWidgetBlock|listWidgetsForSurface/u
    ).filter((hit) => !/^\s*(?:\/\/|\*)/u.test(hit.split(":").slice(2).join(":")));
    expect(hits).toEqual([]);
  });

  it("no source still imports the deleted v1 runtime modules", () => {
    const hits = anySourceLineMatches(
      /from\s+["'][^"']*(?:\/pageRuntime["']|widgetPreviewRoutes|entryTeaserPreviewRoutes|productComparePreviewRoutes|productGalleryPreviewRoutes|productTablePreviewRoutes)[^"']*["']|require\("["']*[^"']*(?:widgetPreviewRoutes|entryTeaserPreviewRoutes|productComparePreviewRoutes|productGalleryPreviewRoutes|productTablePreviewRoutes)[^"']*["']\)/u
    );
    expect(hits).toEqual([]);
  });

  it("admin route files no longer register Widget Library or preview routes", () => {
    const routeIndex = readFileSync(join(REPO_ROOT, "core/server/routes/index.ts"), "utf8");
    expect(routeIndex).not.toContain("widgetPreviewRoutes");
    expect(routeIndex).not.toContain("PreviewRoutes");
    const adminRoutes = readFileSync(join(REPO_ROOT, "core/admin/app/adminRoutes.tsx"), "utf8");
    expect(adminRoutes).not.toContain("advanced/widgets");
    expect(adminRoutes).not.toContain("WidgetLibrary");
  });

  it("the retired widgets:read permission is gone from the catalog", () => {
    const catalog = readFileSync(
      join(REPO_ROOT, "core/services/admin/permissionsCatalog.ts"),
      "utf8"
    );
    expect(catalog).not.toContain('"widgets:read"');
    expect(catalog).not.toContain("widgets:read");
  });
});
