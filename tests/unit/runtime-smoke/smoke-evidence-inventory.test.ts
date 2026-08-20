import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "../../..");
const SMOKE_ROOT = "_docs/_workflows/_smoke";
const ARCHIVE_FIXTURE = path.join(ROOT, "tests/fixtures/runtime-smoke/smoke-evidence-archive.json");

/**
 * Canonical smoke-evidence boundary (TASK-577, evidence-half).
 *
 * The shared runner writes `report.json` under
 * `_docs/_workflows/_smoke/evidence/task-###/<session>/` for every adapter that
 * exposes `evidenceDirectory`. Screenshot manifests stay adapter-owned: the
 * task-547 adapter writes screenshots under `task-547/screenshots/`, task-540
 * writes its 13 flat PNGs at the `_smoke` root, and the widget-contract suite
 * writes `task-552-*.png`. Everything else under `_smoke/` predates the
 * canonical boundary and is pinned in the archive fixture; the guard rejects
 * any NEW tracked addition that is neither canonical evidence, nor an
 * adapter-declared screenshot output, nor in the pinned archive (history is
 * preserved, never deleted).
 */

const CANONICAL_EVIDENCE_RE = /^_docs\/_workflows\/_smoke\/evidence\/task-\d+\/[^/]+\//u;
const ADAPTER_DECLARED_SCREENSHOT_GLOSS = Object.freeze([
  {
    adapter: "task-547",
    reason: "task-547 adapter screenshot manifest root",
    regex: /^_docs\/_workflows\/_smoke\/task-547\/screenshots\/.*\.png$/u,
  },
  {
    adapter: "task-540",
    reason: "task-540 REQUIRED_SCREENSHOT_PATHS flat root",
    regex: /^_docs\/_workflows\/_smoke\/task-540-[a-z0-9-]+\.png$/u,
  },
  {
    adapter: "widget-contract",
    reason: "widget-contract gallery-mosaic evidence path",
    regex: /^_docs\/_workflows\/_smoke\/task-552-[a-z0-9-]+\.png$/u,
  },
  {
    adapter: "detail-page-v2",
    reason: "TASK-580-03-L07 detail-page-v2 evidence root",
    regex: /^_docs\/_workflows\/_smoke\/detail-page-v2-[a-z0-9-]+\.png$/u,
  },
]);

type Disposition = "canonical" | "adapter-declared" | "archive" | "unreconciled";

interface ArchiveFixture {
  readonly schemaVersion: number;
  readonly root: string;
  readonly archive: readonly (readonly [string, string])[];
}

function loadArchiveFixture(): ArchiveFixture {
  const parsed = JSON.parse(readFileSync(ARCHIVE_FIXTURE, "utf8")) as Partial<ArchiveFixture>;
  if (
    parsed.schemaVersion !== 1 ||
    parsed.root !== SMOKE_ROOT ||
    !Array.isArray(parsed.archive) ||
    parsed.archive.some(
      (entry) =>
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        !/^[a-f0-9]{64}$/u.test(entry[1])
    )
  ) {
    throw new Error("smoke-evidence archive fixture is invalid");
  }
  return parsed as ArchiveFixture;
}

function trackedSmokePaths(): string[] {
  const bytes = execFileSync("git", ["ls-files", "-z", "--", "_docs/_workflows/_smoke"], {
    cwd: ROOT,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return bytes.toString("utf8").split("\0").filter(Boolean).sort();
}

function classifyPath(pathValue: string, archive: ReadonlyMap<string, string>): Disposition {
  if (CANONICAL_EVIDENCE_RE.test(pathValue)) return "canonical";
  for (const gloss of ADAPTER_DECLARED_SCREENSHOT_GLOSS) {
    if (gloss.regex.test(pathValue)) return "adapter-declared";
  }
  if (archive.has(pathValue)) return "archive";
  return "unreconciled";
}

function assertReconciledInventory(): {
  archive: Map<string, string>;
  counts: Map<Disposition, number>;
} {
  const fixture = loadArchiveFixture();
  const archive = new Map(fixture.archive);
  const counts = new Map<Disposition, number>([
    ["canonical", 0],
    ["adapter-declared", 0],
    ["archive", 0],
    ["unreconciled", 0],
  ]);
  const unreconciled: string[] = [];
  for (const tracked of trackedSmokePaths()) {
    const disposition = classifyPath(tracked, archive);
    counts.set(disposition, (counts.get(disposition) ?? 0) + 1);
    if (disposition === "unreconciled") unreconciled.push(tracked);
  }
  if (unreconciled.length > 0) {
    throw new Error(
      `un-reconciled tracked smoke evidence outside canonical paths:\n${unreconciled.join("\n")}`
    );
  }
  return { archive, counts };
}

describe("smoke evidence canonical boundary (TASK-577)", () => {
  test("every tracked smoke path is canonical evidence, adapter-declared output, or pinned archive", () => {
    const { counts } = assertReconciledInventory();
    expect(counts.get("canonical")).toBeGreaterThan(0);
    expect(counts.get("adapter-declared")).toBeGreaterThan(0);
    expect(counts.get("archive")).toBeGreaterThan(0);
    expect(counts.get("unreconciled")).toBe(0);
  });

  test("archive fixture pins path + sha256 and rejects tampered or removed history", () => {
    const fixture = loadArchiveFixture();
    const uniquePaths = new Set(fixture.archive.map(([p]) => p));
    expect(uniquePaths.size).toBe(fixture.archive.length);
    const archiveByPath = new Map(fixture.archive);
    for (const [entryPath, pinnedHash] of fixture.archive) {
      const absolute = path.join(ROOT, entryPath);
      const relative = path.relative(ROOT, absolute);
      expect(relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))).toBe(
        true
      );
      const bytes = readFileSync(absolute);
      const actualHash = createHash("sha256").update(bytes).digest("hex");
      expect(actualHash).toBe(pinnedHash);
      expect(archiveByPath.get(entryPath)).toBe(pinnedHash);
    }
  });

  test("adding an un-reconciled executable/evidence path fails the inventory check", () => {
    const fixture = loadArchiveFixture();
    const archive = new Map(fixture.archive);
    const unReconciled = [
      "_docs/_workflows/_smoke/report.json",
      "_docs/_workflows/_smoke/task-999/loose.png",
      "_docs/_workflows/_smoke/loose-new-evidence.png",
      "_docs/_workflows/_smoke/task-547/screenshots.json",
      "_docs/_workflows/_smoke/task-540-notes.json",
    ];
    for (const synthetic of unReconciled) {
      expect(classifyPath(synthetic, archive)).toBe("unreconciled");
    }
    expect(
      classifyPath("_docs/_workflows/_smoke/evidence/task-540/wf560-540/report.json", archive)
    ).toBe("canonical");
    expect(
      classifyPath("_docs/_workflows/_smoke/evidence/task-554/task-554-fast/report.json", archive)
    ).toBe("canonical");
    expect(
      classifyPath(
        "_docs/_workflows/_smoke/detail-page-v2-wf58003smoke-public-detail-converted.png",
        archive
      )
    ).toBe("adapter-declared");
  });
});
