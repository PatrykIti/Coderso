import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import type { SmokeInput } from "../../../scripts/runtime-smoke/contracts";
import adapter, {
  createTask540SafeEvidenceAssertion,
  projectTask540RepositorySnapshot,
  validateTask540ArchivedEvidence,
  validateTask540Evidence,
} from "../../../scripts/runtime-smoke/adapters/task-540";
import {
  EVIDENCE_ROOT,
  TASK540_FLAT_SCREENSHOT_PATHS,
  assertExactTask540EvidenceDirectory,
  buildExactTask540ArchiveManifest,
  captureTask540FlatScreenshotBaseline,
  captureTask540GeneratedScreenshotObservations,
  restoreTask540FlatScreenshotBaseline,
} from "../../../scripts/runtime-smoke/adapters/task-540/output-manifest";
import { archiveAndRestoreTask540Screenshots } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/suite";

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

function canonicalEvidence(cleanupReceipts = 72): unknown {
  return {
    pass: true,
    serverUp: true,
    browserReceipts: Array.from({ length: 420 }, () => ({})),
    runtimeReceipts: Array.from({ length: 76 }, () => ({})),
    cleanupReceipts: Array.from({ length: cleanupReceipts }, () => ({})),
    scenarios: Array.from({ length: 7 }, (_value, index) => ({ id: `scenario-${index}` })),
    screenshots: Array.from({ length: 13 }, (_value, index) => ({
      path: `_docs/_workflows/_smoke/task-540-${index}.png`,
      sha256: index.toString(16).padStart(64, "0"),
    })),
    consoleErrors: [],
    pageErrors: [],
  };
}

const archiveInput: SmokeInput = Object.freeze({
  command: "run",
  suite: "task-540",
  profile: "fast",
  session: "task540-archive",
});
const pngPrefix = Buffer.from("89504e470d0a1a0a", "hex");

function screenshotHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function withArchiveRoot(operation: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "task540-archive-"));
  try {
    await operation(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function precreateArchiveReport(root: string): Promise<void> {
  const directory = join(root, EVIDENCE_ROOT, archiveInput.session);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const report = join(directory, "report.json");
  await writeFile(report, "", { mode: 0o600 });
  await chmod(report, 0o600);
}

async function writeGeneratedScreenshots(
  root: string,
  bytes: Buffer
): Promise<readonly { readonly path: string; readonly sha256: string }[]> {
  for (const path of TASK540_FLAT_SCREENSHOT_PATHS) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, bytes, { mode: 0o600 });
  }
  const sha256 = screenshotHash(bytes);
  return Object.freeze(
    TASK540_FLAT_SCREENSHOT_PATHS.map((path) => Object.freeze({ path, sha256 }))
  );
}

test("TASK-540 adapter validates exact native evidence totals with bounded dynamic SEO cleanup", () => {
  expect(adapter.suiteId).toBe("task-540");
  const root = resolve(import.meta.dir, "../../..");
  expect(
    adapter.evidenceDirectory?.(
      { command: "run", suite: "task-540", profile: "fast", session: "wf540-adapter" },
      root
    )
  ).toBe(`${root}/_docs/_workflows/_smoke/evidence/task-540/wf540-adapter`);
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  for (const cleanupReceipts of [54, 60, 72]) {
    expect(validateTask540Evidence(canonicalEvidence(cleanupReceipts))).toMatchObject({
      pass: true,
    });
  }
  expect(() => validateTask540Evidence(canonicalEvidence(55))).toThrow("projection drifted");
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

test("TASK-540 archive orchestration preserves ordered evidence and restores flat outputs", async () => {
  await withArchiveRoot(async (root) => {
    const manifest = buildExactTask540ArchiveManifest(archiveInput, TASK540_FLAT_SCREENSHOT_PATHS);
    expect(manifest.sourcePaths).toEqual(TASK540_FLAT_SCREENSHOT_PATHS);
    expect(manifest.archivePaths).toEqual(
      TASK540_FLAT_SCREENSHOT_PATHS.map(
        (path) => `${EVIDENCE_ROOT}/${archiveInput.session}/screenshots/${path.split("/").at(-1)}`
      )
    );
    expect(new Set(manifest.archivePaths).size).toBe(13);

    await precreateArchiveReport(root);
    const priorBytes = Buffer.concat([pngPrefix, Buffer.from("prior-flat-output")]);
    await mkdir(dirname(join(root, manifest.entries[0]!.sourcePath)), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(join(root, manifest.entries[0]!.sourcePath), priorBytes, { mode: 0o644 });
    const baseline = await captureTask540FlatScreenshotBaseline(root, manifest);
    const nativeScreenshots = await writeGeneratedScreenshots(
      root,
      Buffer.concat([pngPrefix, Buffer.from("same-image-bytes")])
    );
    const observations = await captureTask540GeneratedScreenshotObservations(
      root,
      manifest,
      nativeScreenshots
    );
    const phases: string[] = [];
    const archived = await archiveAndRestoreTask540Screenshots({
      root,
      smokeInput: archiveInput,
      manifest,
      baseline,
      nativeScreenshots,
      observations,
      measure: async (phase, operation) => {
        phases.push(phase);
        return operation();
      },
    });
    const generatedSha256 = screenshotHash(
      Buffer.concat([pngPrefix, Buffer.from("same-image-bytes")])
    );
    expect(archived.archivedScreenshots).toEqual(
      manifest.entries.map(({ archivePath }) => ({ path: archivePath, sha256: generatedSha256 }))
    );
    expect(phases).toEqual(["archive-screenshots", "archive-screenshots-restore-flat"]);
    expect(new Set(archived.archivedScreenshots.map(({ sha256 }) => sha256)).size).toBe(1);
    expect(validateTask540ArchivedEvidence(archiveInput, archived.archivedScreenshots)).toEqual(
      archived.archivedScreenshots
    );
    await assertExactTask540EvidenceDirectory(
      root,
      archiveInput,
      manifest,
      archived.archivedScreenshots
    );
    for (const path of archived.archivedScreenshots.map(({ path }) => path)) {
      expect((await lstat(join(root, path))).mode & 0o777).toBe(0o600);
    }

    expect(await readFile(join(root, manifest.entries[0]!.sourcePath))).toEqual(priorBytes);
    expect((await lstat(join(root, manifest.entries[0]!.sourcePath))).mode & 0o777).toBe(0o644);
    for (const path of manifest.sourcePaths.slice(1)) {
      await expect(lstat(join(root, path))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });
}, 15_000);

test("TASK-540 archive orchestration restores generated outputs and preserves an archive collision", async () => {
  await withArchiveRoot(async (root) => {
    const manifest = buildExactTask540ArchiveManifest(archiveInput);
    await precreateArchiveReport(root);
    const priorBytes = Buffer.concat([pngPrefix, Buffer.from("prior-flat-output")]);
    await mkdir(dirname(join(root, manifest.entries[0]!.sourcePath)), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(join(root, manifest.entries[0]!.sourcePath), priorBytes, { mode: 0o644 });
    const baseline = await captureTask540FlatScreenshotBaseline(root, manifest);
    const nativeScreenshots = await writeGeneratedScreenshots(
      root,
      Buffer.concat([pngPrefix, Buffer.from("archive-error")])
    );
    const observations = await captureTask540GeneratedScreenshotObservations(
      root,
      manifest,
      nativeScreenshots
    );
    const screenshotDirectory = join(root, EVIDENCE_ROOT, archiveInput.session, "screenshots");
    await mkdir(screenshotDirectory, { mode: 0o700 });
    const preexisting = join(screenshotDirectory, manifest.entries[0]!.filename);
    await writeFile(preexisting, Buffer.from("do-not-overwrite"), { mode: 0o600 });

    let archiveFailure: unknown;
    try {
      await archiveAndRestoreTask540Screenshots({
        root,
        smokeInput: archiveInput,
        manifest,
        baseline,
        nativeScreenshots,
        observations,
        measure: async (_phase, operation) => operation(),
      });
    } catch (error) {
      archiveFailure = error;
    }
    expect(archiveFailure).toMatchObject({
      code: "smoke_output_invalid",
      message: "TASK-540 evidence directory already contains archive output",
    });
    expect((archiveFailure as Error).cause).toBeUndefined();
    expect(await readFile(preexisting, "utf8")).toBe("do-not-overwrite");

    expect(await readFile(join(root, manifest.entries[0]!.sourcePath))).toEqual(priorBytes);
    expect((await lstat(join(root, manifest.entries[0]!.sourcePath))).mode & 0o777).toBe(0o644);
    for (const path of manifest.sourcePaths.slice(1)) {
      await expect(lstat(join(root, path))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });
});

test("TASK-540 public baseline capture rejects a FIFO without waiting for a writer", async () => {
  await withArchiveRoot(async (root) => {
    const manifest = buildExactTask540ArchiveManifest(archiveInput);
    const fifo = join(root, manifest.entries[0]!.sourcePath);
    await mkdir(dirname(fifo), { recursive: true, mode: 0o700 });
    const created = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
    expect(created.status).toBe(0);

    const started = performance.now();
    await expect(captureTask540FlatScreenshotBaseline(root, manifest)).rejects.toMatchObject({
      code: "smoke_output_invalid",
      message: "TASK-540 flat screenshot baseline ownership is invalid",
    });
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

test("TASK-540 restoration refuses observed identity drift without overwriting the external file", async () => {
  await withArchiveRoot(async (root) => {
    const manifest = buildExactTask540ArchiveManifest(archiveInput);
    const first = manifest.entries[0]!;
    const baselineBytes = Buffer.concat([pngPrefix, Buffer.from("baseline")]);
    await mkdir(dirname(join(root, first.sourcePath)), { recursive: true, mode: 0o700 });
    await writeFile(join(root, first.sourcePath), baselineBytes, { mode: 0o644 });
    const baseline = await captureTask540FlatScreenshotBaseline(root, manifest);
    const nativeScreenshots = await writeGeneratedScreenshots(
      root,
      Buffer.concat([pngPrefix, Buffer.from("generated")])
    );
    const observations = await captureTask540GeneratedScreenshotObservations(
      root,
      manifest,
      nativeScreenshots
    );
    const externalBytes = Buffer.concat([pngPrefix, Buffer.from("external-writer")]);
    await writeFile(join(root, first.sourcePath), externalBytes, { mode: 0o600 });

    await expect(
      restoreTask540FlatScreenshotBaseline(root, manifest, baseline, observations)
    ).rejects.toThrow("flat screenshot restoration failed");
    expect(await readFile(join(root, first.sourcePath))).toEqual(externalBytes);
    for (const path of manifest.sourcePaths.slice(1)) {
      await expect(lstat(join(root, path))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });
});

test("TASK-540 registered graph is native, canonical, present, and symlink-free", async () => {
  const graph = await traceRegisteredTask540Graph();
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540.ts");
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540/suite/composition/suite.ts");
  expect(graph).toContain("scripts/runtime-smoke/adapters/task-540/worker-entry.ts");
  expect(graph.some((path) => path.startsWith("_docs/"))).toBe(false);
  expect(graph.length).toBeGreaterThan(50);
}, 15_000);
