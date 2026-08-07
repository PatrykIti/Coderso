import { expect, test } from "bun:test";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import adapter, {
  createTask540SafeEvidenceAssertion,
  projectTask540RepositorySnapshot,
  validateTask540Evidence,
} from "../../../scripts/runtime-smoke/adapters/task-540";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js"]);

async function resolveGraphEdge(importer: string, edge: string): Promise<string | null> {
  if (!edge.startsWith(".")) return null;
  const base = resolve(dirname(importer), edge);
  const candidates = extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, resolve(base, "index.ts")];
  for (const candidate of candidates) {
    const metadata = await lstat(candidate).catch(() => null);
    if (metadata?.isFile()) return candidate;
  }
  throw new Error(`registered TASK-540 import is missing: ${edge}`);
}

async function traceRegisteredTask540Graph(): Promise<readonly string[]> {
  const root = await realpath(repositoryRoot);
  const queue = [resolve(root, "scripts/runtime-smoke/adapters/task-540.ts")];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const input = queue.shift();
    if (input === undefined) break;
    const metadata = await lstat(input);
    expect(metadata.isSymbolicLink()).toBe(false);
    const file = await realpath(input);
    const rel = relative(root, file);
    expect(rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))).toBe(true);
    expect(CODE_EXTENSIONS.has(extname(file))).toBe(true);
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await readFile(file, "utf8");
    expect(source).not.toContain("_docs/_workflows/task-540");
    const edges = [
      ...source.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/gu),
      ...source.matchAll(/import\s*["']([^"']+)["']/gu),
    ].map((match) => match[1] as string);
    for (const fixed of source.matchAll(
      /["'](scripts\/runtime-smoke\/[a-z0-9_./-]+\.(?:ts|mjs))["']/gu
    )) {
      const target = fixed[1];
      if (target !== undefined) queue.push(resolve(root, target));
    }
    for (const edge of edges) {
      if (edge.includes("...")) continue;
      const target = await resolveGraphEdge(file, edge);
      if (target !== null) queue.push(target);
    }
  }
  return Object.freeze([...seen].map((file) => relative(root, file)).sort());
}

function canonicalEvidence(): unknown {
  return {
    pass: true,
    serverUp: true,
    browserReceipts: Array.from({ length: 420 }, () => ({})),
    runtimeReceipts: Array.from({ length: 76 }, () => ({})),
    cleanupReceipts: Array.from({ length: 72 }, () => ({})),
    scenarios: Array.from({ length: 7 }, (_value, index) => ({ id: `scenario-${index}` })),
    screenshots: Array.from({ length: 13 }, (_value, index) => ({
      path: `_docs/_workflows/_smoke/task-540-${index}.png`,
      sha256: index.toString(16).padStart(64, "0"),
    })),
    consoleErrors: [],
    pageErrors: [],
  };
}

test("TASK-540 adapter validates exact native evidence totals", () => {
  expect(adapter.suiteId).toBe("task-540");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  expect(validateTask540Evidence(canonicalEvidence())).toMatchObject({ pass: true });
  const drifted = canonicalEvidence() as {
    screenshots: unknown[];
  };
  drifted.screenshots = [];
  expect(() => validateTask540Evidence(drifted)).toThrow("projection drifted");
});

test("TASK-540 adapter projects shared repository identities with their file kinds", () => {
  const projected = projectTask540RepositorySnapshot({
    files: Object.freeze([
      Object.freeze({ path: "a.txt", kind: "file" as const, sha256: "a".repeat(64) }),
      Object.freeze({ path: "shot.png", kind: "absent" as const, sha256: "absent" }),
    ]),
    sha256: "b".repeat(64),
  });
  expect(projected).toEqual({
    paths: ["a.txt", "shot.png"],
    hashes: { "a.txt": `file:${"a".repeat(64)}`, "shot.png": "absent:absent" },
  });
});

test("TASK-540 safe evidence assertion fails closed on configured secrets", () => {
  const assertSafe = createTask540SafeEvidenceAssertion({
    DATABASE_URL: "postgres://smoke:private-pass@localhost/smoke",
    PUBLIC_KEY: "safe-public-value",
  });
  expect(() =>
    assertSafe(
      { output: "postgres://smoke:private-pass@localhost/smoke" },
      "TASK-540 test evidence"
    )
  ).toThrow("configured secret");
  expect(assertSafe({ output: "safe-public-value" }, "TASK-540 test evidence")).toEqual({
    output: "safe-public-value",
  });
});

test("TASK-540 registered graph is native, canonical, present, and symlink-free", async () => {
  const graph = await traceRegisteredTask540Graph();
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540.ts");
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540/suite/composition/suite.ts");
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540/worker-entry.ts");
  expect(graph.some((path) => path.startsWith("_docs/"))).toBe(false);
  expect(graph.length).toBeGreaterThan(50);
});
