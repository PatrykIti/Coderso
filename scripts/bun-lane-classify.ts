/**
 * Static lane-file classifier for the Bun test lane (TASK-557-01-L01).
 *
 * Walks the exact `test:bun` lane set from package.json (`tests/unit`,
 * `tests/integration/{routes,runtime,server,store,plugins,analytics}`,
 * `tests/perf`, `tests/security`) and classifies every `*.test.{ts,tsx}` file
 * into `perf` / A / B / C using only static signals (no DB access):
 *
 * - `perf`: path override, checked FIRST. Any file under `tests/perf/` is
 *   `perf` regardless of DB usage; the perf-lane policy routes by bucket.
 * - `A`: DB-free. No `core/db/{client,schema}` import (DIRECT or reached
 *   through the static value-import closure) and no `await db.` reference.
 * - `C`: DB-backed and touches shared mutable state (global settings keys via
 *   `setSetting`/`setSettings` in hooks, the singleton `backup_schedules`
 *   table, or the fixed `4dd7f4d4` detailPageId literal).
 * - `B`: DB-backed but self-scoped (own-row `randomUUID()` keys plus
 *   delete-only cleanup) or not obviously shared.
 *
 * DB-coupling is TRANSITIVE (TASK-557 pure-lane fix): the pure A lane strips
 * `DATABASE_URL` and runs with `--env-file=/dev/null`, so any lane file whose
 * module-load graph reaches `core/db/client` throws `DATABASE_URL is not set`
 * at import time and fails the whole lane. Direct-import scanning alone
 * misclassifies files like `tokenService -> settingsService -> db/client` as
 * DB-free, so the classifier follows the static VALUE import closure (bounded
 * depth, memoized per module, cycle-safe). Type-only imports are erased at
 * compile time and never load the module, so they are not followed. Bare
 * specifiers are external and not followed. Dynamic `import()` is lazy except
 * for MODULE-SCOPE top-level awaits (`await import("spec")` at brace depth 0),
 * which execute during module evaluation and ARE followed; lazy forms
 * (`() => import(...)`, function-body awaits) and type positions
 * (`typeof import(...)`, `import(...).Type`) are excluded. Lane files may also
 * stub modules with module-scope `mock.module`/`vi.mock` registrations before a
 * top-level await: a stubbed module's real graph is not loaded, so it does not
 * count as DB-coupled.
 *
 * Emits `tests/bun-lane-manifest.json` with `{generatedAt, rows}`; the rows are
 * the single source of truth for the TASK-557-05 partitioner. An unreadable
 * file rejects with a named error (`manifest_read_failed:<path>`) and aborts
 * the whole run so the manifest can never silently drift.
 *
 * Manifest v2 (TASK-559): each row carries `conflictKeys: string[]` (ALL
 * matched C signals in deterministic C_SETTING_KEYS -> C_TABLES -> C_LITERALS
 * order, so multi-signal files like `detail-page-runtime-lite.test.ts` are no
 * longer lossy) and `cWriteGlobal: boolean` (true when any write-global signal
 * matched: a `set\w*Setting` call inside a before-hook, `backup_schedules`
 * DML presence, or the fixed `4dd7f4d4` fixture literal). The old single
 * `conflictKey?: string` field is gone.
 *
 * Run from the repo root: `bun scripts/bun-lane-classify.ts`.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const LANE_DIRS = [
  "tests/unit",
  "tests/integration/routes",
  "tests/integration/runtime",
  "tests/integration/server",
  "tests/integration/store",
  "tests/integration/plugins",
  "tests/integration/analytics",
  "tests/integration/toolchain",
  "tests/perf",
  "tests/security",
] as const;

const PERF_DIR = "tests/perf/";
const EXT = /\.test\.(ts|tsx)$/;
const MANIFEST_PATH = "tests/bun-lane-manifest.json";

type Bucket = "perf" | "A" | "B" | "C";
type BucketRowV2 = {
  file: string;
  bucket: Bucket;
  weightMs?: number;
  conflictKeys: string[];
  cWriteGlobal: boolean;
};

// C signals: shared settings keys, singleton tables, first-admin, fixed literal
const C_SETTING_KEYS = [
  "site.contentRoutes",
  "site.cacheTtlSeconds",
  "site.previewEnabled",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.homepageId",
  "site.adminBaseUrl",
  "auth.sessionTtlDays",
  "auth.resetTtlMinutes",
] as const;
const C_TABLES = ["backup_schedules"] as const;
const C_LITERALS = ["4dd7f4d4"] as const;

// ---------------------------------------------------------------------------
// Transitive DB-coupling analysis (TASK-557 pure-lane fix).
//
// The pure A lane runs with `--env-file=/dev/null` and no DATABASE_* vars, so
// a lane file whose MODULE-LOAD graph reaches `core/db/client` throws
// `DATABASE_URL is not set` at import time and fails the whole lane. The
// classifier therefore follows the static VALUE import closure of every module
// in the lane file's graph (not just the lane file's direct imports) and asks
// whether any reached module directly imports `core/db/client` or
// `core/db/schema`.
//
// Rules:
// - Only STATIC imports are followed: `import ... from`, `export ... from`,
//   `export * from`, and side-effect `import "..."`. Type-only imports
//   (`import type`, `export type`, and `{ type X }` bindings) are erased at
//   compile time and never load the module, so they are NOT followed.
// - Dynamic `import("...")` and bare specifiers (node_modules, `bun:test`,
//   `node:*`, `drizzle-orm`, `postgres`) are lazy/external and never reach
//   repo DB modules, so they are not followed. Two exceptions:
//   - A MODULE-SCOPE top-level await, `await import("literal")` at brace
//     depth 0, executes during module evaluation and is followed. Lazy
//     function-body awaits, `() => import(...)` loaders, and type positions
//     (`typeof import(...)`, `import(...).Type`) are not followed.
//   - A module that loads repo files through
//     `await import(pathToFileURL(<literal>).href)` (for example the
//     runtime-smoke registry's ADAPTER_PATHS map) declares its load targets as
//     static path literals, so those resolved files are added to the module's
//     closure; the literals are static signals even though the
//   specifier is computed at runtime.
// - Resolution mirrors Bun: relative specifiers resolve against the importing
//   file's directory with `.ts`/`.tsx`/`.js`/`.jsx` probing plus `index.*`
//   fallback; the `@/*` tsconfig alias maps to `core/admin/*`.
// - The walk is bounded (MAX_TRANSITIVE_DEPTH), cycle-safe (a visited set per
//   top-level call), and memoized per module so shared graphs
//   (`settingsService -> db/client` is imported by dozens of tests) are walked
//   once, not once per lane file.
// ---------------------------------------------------------------------------

const MAX_TRANSITIVE_DEPTH = 64;
const TRANSITIVE_CODE_EXTS = [".ts", ".tsx", ".js", ".jsx"] as const;
const TRANSITIVE_INDEX_FILES = ["index.ts", "index.tsx", "index.js"] as const;

/** Repo root derived from this module's location (`scripts/..`). */
const REPO_ROOT = path.resolve(import.meta.dir, "..");

// Module-load import targets cache: `${awaits|static}:<repo-relative path>` ->
// resolved repo-relative paths of its load imports (or [] when unreadable).
// Keyed by the includeModuleScopeAwaits flag because module-scope top-level
// awaits load their targets and static-only closure must stay distinct.
const moduleImportTargetsCache = new Map<string, string[]>();

// Memoized per-module DB reachability: `${awaits|static}:<path>` -> reaches
// core/db. Mock-aware walks are keyed additionally by the sorted mocked set
// (a lane file's module-scope mocks), so each lane file's walk is computed once
// and shared subgraphs are not re-walked.
const moduleDbReachCache = new Map<string, boolean>();

function normalizeRepoPath(abs: string): string {
  return path.relative(REPO_ROOT, abs).split(path.sep).join("/");
}

function existsAsFile(abs: string): boolean {
  try {
    return statSync(abs).isFile();
  } catch {
    return false;
  }
}

/**
 * Remove `//` line comments and `/* ... *​/` block comments from TypeScript
 * source while preserving string and template literals. Used only to decide
 * whether a module performs a file-URL dynamic load and to collect its static
 * path literals, so prose in comments (which never executes) can never create
 * a false import edge.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (inSingle) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }
    if (inDouble) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === '"') inDouble = false;
      i += 1;
      continue;
    }
    if (inTemplate) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === "`") inTemplate = false;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

type ModuleScopeAwaitedImport = { spec: string; offset: number };
type ModuleScopeMock = { spec: string; offset: number };

/**
 * Scan a module's source for the two module-load signals that a plain static
 * import scan cannot see:
 *
 * 1. Module-scope top-level-await dynamic imports: `await import("spec")` at
 *    brace depth 0. These EXECUTE during module evaluation, so their targets
 *    belong in the module's load closure. Function-body `await import(...)`
 *    (lazy), `() => import(...)` lazy loaders, and type positions such as
 *    `typeof import(...)` / `import(...).Type` are all excluded because they
 *    never load the module at evaluation time.
 * 2. Module-scope Bun mock registrations: `mock.module("spec", factory)`,
 *    `vi.mock("spec", factory)`, and receiver-qualified forms used in the lane
 *    today (`bunMock?.module(...)`, `bunVi!.mock(...)`). A mock registered at
 *    module scope BEFORE a later top-level await-import stubs that module, so
 *    its real DB graph must not count as loaded.
 *
 * The scan is brace-depth-aware and string/comment-aware, so prose in comments
 * or template literals can never create a false signal.
 */
function scanModuleScopeLoads(src: string): {
  awaitedImports: ModuleScopeAwaitedImport[];
  mocks: ModuleScopeMock[];
} {
  const awaitedImports: ModuleScopeAwaitedImport[] = [];
  const mocks: ModuleScopeMock[] = [];
  let depth = 0;
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
      } else i += 1;
      continue;
    }
    if (inSingle) {
      if (ch === "\\") i += 2;
      else if (ch === "'") {
        inSingle = false;
        i += 1;
      } else i += 1;
      continue;
    }
    if (inDouble) {
      if (ch === "\\") i += 2;
      else if (ch === '"') {
        inDouble = false;
        i += 1;
      } else i += 1;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") i += 2;
      else if (ch === "`") {
        inTemplate = false;
        i += 1;
      } else i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      i += 1;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      i += 1;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0) {
      const rest = src.slice(i);
      const awaitRe = /^await\s+import\s*\(\s*["']([^"']+)["']/;
      const awaitMatch = awaitRe.exec(rest);
      if (awaitMatch) {
        awaitedImports.push({ spec: awaitMatch[1], offset: i });
        i += awaitMatch[0].length;
        continue;
      }
      // Bun module mocks: mock.module("id", ...), vi.mock("id", ...), and the
      // receiver-qualified forms in use in the lane (bunMock?.module, bunVi!.mock).
      const mockRe =
        /^(?:mock\.module|vi\.mock|[\w$]+(?:!|\?)?\.(?:module|mock))\s*\(\s*["']([^"']+)["']/;
      const mockMatch = mockRe.exec(rest);
      if (mockMatch) {
        mocks.push({ spec: mockMatch[1], offset: i });
        i += mockMatch[0].length;
        continue;
      }
    }
    i += 1;
  }
  return { awaitedImports, mocks };
}

/**
 * Resolve one static import specifier to a repo-relative module path, or null
 * when it is bare/external, dynamic, or unresolvable on disk. Mirrors Bun's
 * extension probing (`./x` -> `./x.ts`, `./x.tsx`, ... `./x/index.ts`).
 */
function resolveImportTarget(importingRepoPath: string, spec: string): string | null {
  const importingDir = path.dirname(path.join(REPO_ROOT, importingRepoPath));
  let base: string;
  if (spec.startsWith(".")) {
    base = path.resolve(importingDir, spec);
  } else if (spec.startsWith("@/")) {
    base = path.resolve(REPO_ROOT, "core/admin", spec.slice(2));
  } else {
    return null; // bare specifier: node_modules / bun:test / node:* / packages
  }

  const candidates: string[] = [];
  if (path.extname(base)) {
    candidates.push(base);
  } else {
    for (const ext of TRANSITIVE_CODE_EXTS) candidates.push(`${base}${ext}`);
  }
  for (const indexFile of TRANSITIVE_INDEX_FILES) candidates.push(path.join(base, indexFile));

  for (const candidate of candidates) {
    if (!candidate.startsWith(REPO_ROOT + path.sep) && candidate !== REPO_ROOT) continue;
    if (existsAsFile(candidate)) return normalizeRepoPath(candidate);
  }
  return null;
}

/**
 * Extract the repo-relative paths of all STATIC VALUE imports from a module's
 * source. Type-only imports and dynamic `import()` are skipped because they do
 * not execute the target module at load time. When `includeModuleScopeAwaits`
 * is true, module-scope `await import("spec")` targets are added too: they run
 * during module evaluation, so they load the module.
 */
function staticValueImportTargets(
  src: string,
  importingRepoPath: string,
  includeModuleScopeAwaits: boolean
): string[] {
  const targets: string[] = [];
  const seen = new Set<string>();

  // `import ... from "spec"` / `export ... from "spec"` (incl. `export * from`).
  // Anchored at a line start so comment text (`* does `import * as schema...``)
  // can never create a false edge.
  const fromRe = /(?:^|\n)\s*(?:import|export)\s+([^;]*?)\s+from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(src)) !== null) {
    const statement = match[0].trimStart();
    const clause = match[1].trim();
    const spec = match[2];
    // `import type ... from` / `export type ... from` are erased at runtime.
    if (/^(?:import|export)\s+type\b/.test(statement)) continue;
    // `export * from` and `export * as ns from` are value re-exports: the
    // star loads the target module even though the clause itself has no
    // identifier. `import * as ns` loads its module the same way.
    if (clause === "*" || clause.startsWith("* as ")) {
      const target = resolveImportTarget(importingRepoPath, spec);
      if (target && !seen.has(target)) {
        seen.add(target);
        targets.push(target);
      }
      continue;
    }
    // A clause with ONLY type bindings (`import { type X } from`) is erased.
    // Default imports keep word chars after stripping `type X` tokens, so they
    // count as values.
    const valueBinding = clause.replace(/\btype\s+\w+(?:\s+as\s+\w+)?/g, "").replace(/[{}]/g, "");
    if (!/\w/.test(valueBinding)) continue;

    const target = resolveImportTarget(importingRepoPath, spec);
    if (target && !seen.has(target)) {
      seen.add(target);
      targets.push(target);
    }
  }

  // Side-effect `import "spec"` loads the module with no bindings.
  const sideEffectRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  while ((match = sideEffectRe.exec(src)) !== null) {
    const target = resolveImportTarget(importingRepoPath, match[1]);
    if (target && !seen.has(target)) {
      seen.add(target);
      targets.push(target);
    }
  }

  // File-URL dynamic loads: `await import(pathToFileURL(...).href)` with a
  // statically declared repo-relative path literal (for example the runtime
  // smoke registry's ADAPTER_PATHS map). The specifier is computed at runtime
  // so it is invisible to the static `import(...)` scan above, but the path
  // strings themselves are static signals: the module WILL load those files
  // when the loader runs, so their module-load graphs belong in this module's
  // closure. Resolve bare literals against the repo root (the registry pattern)
  // and relative/alias literals through the normal resolver. Comments are
  // stripped first so prose about `import(pathToFileURL(...))` can never
  // create a false edge.
  const codeOnly = stripComments(src);
  const fileUrlLoadRe = /await\s+import\s*\(\s*pathToFileURL\s*\(/g;
  if (fileUrlLoadRe.test(codeOnly)) {
    const pathLiteralRe = /["']([^"']+\.(?:ts|tsx|js|jsx))["']/g;
    while ((match = pathLiteralRe.exec(codeOnly)) !== null) {
      const literal = match[1];
      let target: string | null = null;
      if (literal.startsWith(".") || literal.startsWith("@/")) {
        target = resolveImportTarget(importingRepoPath, literal);
      } else {
        const fromRoot = path.resolve(REPO_ROOT, literal);
        if (existsAsFile(fromRoot) && fromRoot.startsWith(REPO_ROOT + path.sep)) {
          target = normalizeRepoPath(fromRoot);
        }
      }
      if (target && !seen.has(target)) {
        seen.add(target);
        targets.push(target);
      }
    }
  }

  // Module-scope top-level-await imports: `await import("spec")` at brace depth
  // 0 executes during module evaluation (for example
  // `core/server/dockerStart.ts` and lane files that load the real public site
  // at module scope). Lazy forms (`() => import(...)`, function-body awaits)
  // and type positions (`typeof import(...)`, `import(...).Type`) never load at
  // evaluation time, so they are excluded.
  if (includeModuleScopeAwaits) {
    const { awaitedImports } = scanModuleScopeLoads(src);
    for (const awaited of awaitedImports) {
      const target = resolveImportTarget(importingRepoPath, awaited.spec);
      if (target && !seen.has(target)) {
        seen.add(target);
        targets.push(target);
      }
    }
  }

  return targets;
}

/**
 * Whether a module (by repo-relative path) transitively reaches
 * `core/db/client` or `core/db/schema` through its load closure: static value
 * imports plus, when `includeModuleScopeAwaits` is true, module-scope
 * top-level-await imports. Memoized per (module, includeAwaits) pair; cycle-safe
 * via the `visiting` set. When `mocked` is non-null, any module in that set is
 * treated as a stub (Bun `mock.module` interception). Mock-aware reachability
 * is memoized per (sorted mocked set, module) pair because mock sets are
 * lane-file-specific; the underlying load-target cache is shared.
 */
function moduleReachesDb(
  relPath: string,
  visiting: Set<string>,
  depth: number,
  includeModuleScopeAwaits: boolean,
  mocked: ReadonlySet<string> | null
): boolean {
  if (depth > MAX_TRANSITIVE_DEPTH) return false;
  if (mocked?.has(relPath)) return false; // stubbed module: real body never loads
  const reachKey =
    mocked === null
      ? `${includeModuleScopeAwaits ? "awaits" : "static"}:${relPath}`
      : `mock:${[...mocked].sort().join("|")}|${includeModuleScopeAwaits ? "awaits" : "static"}:${relPath}`;
  if (moduleDbReachCache.has(reachKey)) return moduleDbReachCache.get(reachKey) as boolean;
  if (visiting.has(relPath)) return false; // cycle: nothing new on this path

  const bare = relPath.replace(/\.(ts|tsx|js|jsx)$/, "");
  if (bare === "core/db/client" || bare === "core/db/schema") {
    moduleDbReachCache.set(reachKey, true);
    return true;
  }

  visiting.add(relPath);
  let reached = false;
  // The load targets of a module do not depend on the mocked set, so the
  // `{awaits|static}:<path>` target cache is shared by mock-aware walks too.
  const targetsCacheKey = `${includeModuleScopeAwaits ? "awaits" : "static"}:${relPath}`;
  const cached = moduleImportTargetsCache.get(targetsCacheKey);
  const targets =
    cached ??
    (() => {
      let src: string;
      try {
        src = readFileSync(path.join(REPO_ROOT, relPath), "utf8");
      } catch {
        moduleImportTargetsCache.set(targetsCacheKey, []);
        return [];
      }
      const resolved = staticValueImportTargets(src, relPath, includeModuleScopeAwaits);
      moduleImportTargetsCache.set(targetsCacheKey, resolved);
      return resolved;
    })();

  for (const target of targets) {
    if (moduleReachesDb(target, visiting, depth + 1, includeModuleScopeAwaits, mocked)) {
      reached = true;
      break;
    }
  }
  visiting.delete(relPath);
  moduleDbReachCache.set(reachKey, reached);
  return reached;
}

/**
 * Public seam for tests: whether a lane file's module-load graph reaches
 * `core/db/{client,schema}`. Bounded, memoized, cycle-safe.
 *
 * Module-evaluation order matters:
 * - The lane file's STATIC imports execute before its module body, so no
 *   module-scope mock registration can intercept them. They are walked with no
 *   mock set, and every dependency's own module-scope awaits count.
 * - The lane file's module-scope `await import("spec")` runs after any earlier
 *   `mock.module`/`vi.mock` registration in the body. A mock registered before
 *   the await stubs that module, so its real graph does not load; the subgraph
 *   reached through the await is walked mock-aware.
 */
export function reachesDbTransitively(laneFile: string): boolean {
  let src: string;
  try {
    src = readFileSync(path.join(REPO_ROOT, laneFile), "utf8");
  } catch {
    return false;
  }
  const { awaitedImports, mocks } = scanModuleScopeLoads(src);

  const resolvedMocks: (ModuleScopeMock & { target: string })[] = [];
  for (const mock of mocks) {
    const target = resolveImportTarget(laneFile, mock.spec);
    if (target) resolvedMocks.push({ ...mock, target });
  }

  // 1. Static closure (hoisted imports: mocks not yet registered).
  for (const target of staticValueImportTargets(src, laneFile, false)) {
    if (moduleReachesDb(target, new Set<string>(), 0, true, null)) return true;
  }

  // 2. Module-scope awaited imports (mock-aware).
  for (const awaited of awaitedImports) {
    const target = resolveImportTarget(laneFile, awaited.spec);
    if (!target) continue;
    const mockedBefore = new Set<string>();
    for (const mock of resolvedMocks) {
      if (mock.offset < awaited.offset) mockedBefore.add(mock.target);
    }
    // A module-scope mock of `core/db/client` is the canonical "this test does
    // not touch the DB" signal: it stubs the whole DB access surface. The pure
    // table-definitions module (`core/db/schema.ts`) does not import the client
    // and never trips the DATABASE_URL guard, so treat it as stubbed too when
    // the client is mocked (the classifier otherwise conservatively counts any
    // schema reach as DB-coupled).
    if (mockedBefore.has("core/db/client.ts") || mockedBefore.has("core/db/client")) {
      mockedBefore.add("core/db/schema.ts");
      mockedBefore.add("core/db/schema");
    }
    if (mockedBefore.has(target)) continue; // target itself is stubbed
    if (moduleReachesDb(target, new Set<string>(), 0, true, mockedBefore)) return true;
  }

  return false;
}

async function collectLaneFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of LANE_DIRS) {
    const entries = await readdir(dir, { recursive: true });
    for (const rel of entries) {
      if (EXT.test(rel)) files.push(path.join(dir, rel));
    }
  }
  return files.sort(); // deterministic order
}

/**
 * All matched C contention signals in deterministic order: C_SETTING_KEYS,
 * then C_TABLES, then C_LITERALS (the same precedence the old single
 * `firstConflict` used, but keeping every match instead of only the first).
 */
export function collectConflictKeys(src: string): string[] {
  return [
    ...C_SETTING_KEYS.filter((k) => src.includes(k)),
    ...C_TABLES.filter((t) => src.includes(t)),
    ...C_LITERALS.filter((l) => src.includes(l)),
  ];
}

/**
 * Write-global C signal (TASK-559 M1 fix): any `set\w*Setting` helper call
 * (`setSetting`, `setSettings`, `setTestSetting`, ...) inside a before-hook
 * writes shared settings; `backup_schedules` is a singleton table; the fixed
 * `4dd7f4d4` literal is a fixture write marker. Presence-based and
 * conservative: the C1/C2 split is a load-balance heuristic, not a safety
 * invariant (per-worker schemas + unique fence offsets already make any
 * partition correct).
 */
export function hasCWriteGlobal(src: string): boolean {
  const writesSettings = /set\w*Setting/.test(src) && /beforeAll|beforeEach/.test(src);
  const writesBackupSchedule = /backup_schedules/.test(src);
  const writesFixedLiteral = /4dd7f4d4/.test(src);
  return writesSettings || writesBackupSchedule || writesFixedLiteral;
}

async function classify(file: string): Promise<BucketRowV2> {
  let src: string;
  try {
    src = await readFile(file, "utf8");
  } catch (cause) {
    throw new Error(`manifest_read_failed:${file}`, { cause });
  }
  // perf path override FIRST: the perf-lane policy routes by bucket value, and
  // tests/perf/* must never be merged into A/B workers.
  if (file.startsWith(PERF_DIR)) {
    return { file, bucket: "perf", weightMs: 0, conflictKeys: [], cWriteGlobal: false };
  }
  const hasDb =
    /from\s+["'](?:\.\.\/)+core\/db\/(?:client|schema)["']/.test(src) ||
    /await\s+db\./.test(src) ||
    reachesDbTransitively(file);
  if (!hasDb) return { file, bucket: "A", weightMs: 0, conflictKeys: [], cWriteGlobal: false };

  const keys = collectConflictKeys(src);
  const hitsC = keys.length > 0 || (/set\w*Setting/.test(src) && /beforeAll|beforeEach/.test(src));
  const cleansOwnRows = /delete\(|\.delete\(/.test(src) && /randomUUID/.test(src);

  if (hitsC) {
    return {
      file,
      bucket: "C",
      weightMs: 0,
      conflictKeys: keys,
      cWriteGlobal: hasCWriteGlobal(src),
    };
  }
  if (cleansOwnRows)
    return { file, bucket: "B", weightMs: 0, conflictKeys: [], cWriteGlobal: false };
  return { file, bucket: "B", weightMs: 0, conflictKeys: [], cWriteGlobal: false }; // DB-backed but not obviously shared
}

async function main(): Promise<void> {
  const files = await collectLaneFiles();
  const rows = await Promise.all(files.map(classify));
  await writeFile(
    MANIFEST_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)
  );
  const counts: Record<Bucket, number> = { A: 0, B: 0, C: 0, perf: 0 };
  for (const row of rows) counts[row.bucket] += 1;
  console.log(`[bun-lane-classify] files=${rows.length} buckets=${JSON.stringify(counts)}`);
}

// export for tests; importing this module must never write the manifest
if (import.meta.main) {
  await main();
}
export { classify, collectLaneFiles, LANE_DIRS };
