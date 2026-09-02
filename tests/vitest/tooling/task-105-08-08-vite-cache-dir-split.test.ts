// tests/vitest/tooling/task-105-08-08-vite-cache-dir-split.test.ts
// Guard: the TASK-105-08-08-L07 dep-cache race. The runtime-smoke dev host
// (scripts/runtime-smoke/server/fixed-dev-host.ts) boots the admin (:5173) and
// site (:5174) Vite servers from one process. With Vite's default
// `node_modules/.vite` both resolved the SAME dep cache, and because the two
// configs hash differently the second boot's re-optimization deleted the live
// server's cache mid-session: dep requests failed with `504 Outdated Optimize
// Dep`, `lazyNamedRoute`'s memoized import promise never retried, and the page
// editor rendered "Admin route failed to load" forever (r40/r41). Both configs
// must therefore declare an explicit, mutually distinct `cacheDir`.
import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();

const ADMIN_CONFIG = "core/vite.config.ts";
const SITE_CONFIG = "core/vite.site.config.ts";
const ADMIN_ROOT = "core/admin";
const SITE_ROOT = "core/site";

/** The single `cacheDir: "<value>"` declaration in a config, or null. */
function declaredCacheDir(relativePath: string): string | null {
  const source = readFileSync(resolve(REPO_ROOT, relativePath), "utf8");
  const matches = [...source.matchAll(/\bcacheDir\s*:\s*"([^"]+)"/gu)];
  if (matches.length !== 1) return null;
  return matches[0][1];
}

describe("admin and site vite configs declare distinct dep caches", () => {
  const adminCacheDir = declaredCacheDir(ADMIN_CONFIG);
  const siteCacheDir = declaredCacheDir(SITE_CONFIG);

  it("declares cacheDir in the admin config", () => {
    expect(adminCacheDir).not.toBeNull();
  });

  it("declares cacheDir in the site config", () => {
    expect(siteCacheDir).not.toBeNull();
  });

  it("declares two different cacheDir values", () => {
    expect(adminCacheDir).not.toBeNull();
    expect(siteCacheDir).not.toBeNull();
    // A literal equality guard: making both configs point at one directory
    // reinstates the 504 Outdated Optimize Dep race described in the header.
    expect(adminCacheDir).not.toBe(siteCacheDir);
  });

  it("resolves both cacheDir values to distinct absolute directories", () => {
    expect(adminCacheDir).not.toBeNull();
    expect(siteCacheDir).not.toBeNull();
    // Vite resolves cacheDir against the config's `root`, which is
    // core/admin here and core/site there.
    const adminResolved = resolve(REPO_ROOT, ADMIN_ROOT, adminCacheDir ?? "");
    const siteResolved = resolve(REPO_ROOT, SITE_ROOT, siteCacheDir ?? "");
    expect(adminResolved).not.toBe(siteResolved);
    expect(adminResolved).toMatch(/[/\\]node_modules[/\\]/u);
    expect(siteResolved).toMatch(/[/\\]node_modules[/\\]/u);
    // `.vite` sits inside the gitignored `core/node_modules`, so a future
    // cacheDir escaping that parent (the repo root, or a `core` sibling) would
    // strand dep caches outside the ignored tree. Keep both inside it.
    const sharedParent = `${resolve(REPO_ROOT, "core", "node_modules", ".vite")}${sep}`;
    expect(adminResolved.startsWith(sharedParent)).toBe(true);
    expect(siteResolved.startsWith(sharedParent)).toBe(true);
  });
});
