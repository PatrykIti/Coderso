// TASK-545-03-L01 smoke evidence directory and driver tests (Bun lane). Owns
// canonical evidence-directory resolution, working-tree revision digests, the
// validateSmokeEvidence driver, auditSmokeEvidenceDirectory, and the manifest
// writer. Uses temporary synthetic image bytes only; never a real product
// screenshot.
//
// TASK-576 split: the manifest validation core (validate/project/grammar)
// lives in smokeEvidence.test.ts.
// TASK-545-03-L01 smoke evidence manifest tests (Bun lane). Owns the
// temporary Git-repository corpus for the manifest validator, the canonical
// evidence driver, revision digests, canonical evidence-directory resolution,
// the pure projection/writer, and file-set parity. Uses temporary synthetic
// image bytes only; never a real product screenshot.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  MAX_SCREENSHOT_BYTES,
  SmokeEvidenceError,
  auditSmokeEvidenceDirectory,
  canonicalJson,
  computeWorkingTreeRevision,
  isStrictDescendant,
  projectSmokeEvidenceManifest,
  publicRevision,
  requireRepoTaskId,
  requireRuntimeSmokeSessionName,
  requireSafeRepoRelativePath,
  resolveCanonicalEvidenceDirectory,
  sha256,
  validateSmokeEvidence,
  validateSmokeEvidenceManifest,
  writeSmokeEvidenceManifest,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  SmokeEvidenceAssertionV1,
  SmokeEvidenceManifestV1,
  SmokeEvidenceScenarioV1,
  SmokeEvidenceScreenshotV1,
  SmokeEvidenceVariantV1,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";

const FIXTURES = resolve(import.meta.dir, "../../fixtures/workflows/smoke-evidence");
const TASK = "TASK-545";
const SUITE = "task-545";
const PROFILE = "certification";
const SESSION = "task-545-certification";

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

async function errorCodeAsync(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
    },
  }).trim();
}

const tempRoots: string[] = [];

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "smoke-evidence-test-"));
  tempRoots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "source.txt"), "v1\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
function assertion(overrides: Record<string, unknown> = {}): MutableAssertion {
  return {
    kind: "computed-style",
    target: "sidebar",
    property: "display",
    expected: "flex",
    actual: "flex",
    pass: true,
    ...overrides,
  } as MutableAssertion;
}

function variant(id: string, overrides: Record<string, unknown> = {}): MutableVariant {
  return {
    id,
    surface: "admin",
    theme: "light",
    viewport: { width: 1280, height: 800 },
    assertions: [assertion()],
    consoleErrors: [],
    ...overrides,
  } as MutableVariant;
}

function scenario(id: string, overrides: Record<string, unknown> = {}): MutableScenario {
  return {
    id,
    title: `Title for ${id}`,
    variants: [variant(`${id}-v`)],
    screenshots: [{ path: `${id}.png`, sha256: sha(`${id}.png`) }],
    ...overrides,
  } as MutableScenario;
}

function revision(overrides: Record<string, unknown> = {}) {
  return {
    gitHead: "a".repeat(40),
    workingTreeDirty: false,
    workingTreeSha256: "b".repeat(64),
    ...overrides,
  };
}

function baseScenarios(): Record<string, unknown>[] {
  // Five distinct scenarios covering Admin light, Admin dark, and public.
  return [
    scenario("admin-light-wide"),
    scenario("admin-dark-narrow", { variants: [variant("dark-narrow", { theme: "dark" })] }),
    scenario("admin-form-focus"),
    scenario("admin-menu-open"),
    scenario("public-mobile-nav", { variants: [variant("mobile-nav", { surface: "public" })] }),
  ];
}

function validManifest(overrides: Record<string, unknown> = {}): SmokeEvidenceManifestV1 {
  return {
    schemaVersion: 1,
    taskId: TASK,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    report: { path: "report.json", sha256: "0".repeat(64) },
    revision: revision(),
    generatedAt: "2026-08-13T18:00:00.000Z",
    serverUp: true,
    scenarios: baseScenarios() as unknown as SmokeEvidenceManifestV1["scenarios"],
    ...overrides,
  };
}

function validReport(overrides: Record<string, unknown> = {}) {
  const manifest = validManifest();
  const scenarios = manifest.scenarios.map((scenario) => ({
    id: scenario.id,
    pass: true,
    elapsedMs: 10,
    title: scenario.title,
    variants: scenario.variants,
    screenshots: scenario.screenshots,
  }));
  const screenshots = manifest.scenarios.flatMap((scenario) => scenario.screenshots);
  return {
    schemaVersion: 1,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    pass: true,
    serverUp: true,
    scenarios,
    screenshots,
    ...overrides,
  };
}

type DeepMutable<T> = { -readonly [K in keyof T]: DeepMutable<T[K]> };
type MutableAssertion = {
  kind: string;
  target: string;
  property: string;
  expected: string;
  actual: string;
  pass: boolean;
  [key: string]: unknown;
};
type MutableVariant = {
  id: string;
  surface: string;
  theme: string;
  viewport: { width: number; height: number };
  assertions: MutableAssertion[];
  consoleErrors: string[];
  [key: string]: unknown;
};
type MutableScreenshot = DeepMutable<SmokeEvidenceScreenshotV1> & { [key: string]: unknown };
type MutableScenario = {
  id: string;
  title: string;
  variants: MutableVariant[];
  screenshots: MutableScreenshot[];
  [key: string]: unknown;
};
type MutableManifest = {
  schemaVersion: number;
  taskId: string;
  suiteId: string;
  profile: string;
  session: string;
  report: { path: string; sha256: string };
  revision: { gitHead: string; workingTreeDirty: boolean; workingTreeSha256: string };
  generatedAt: string;
  serverUp: boolean;
  scenarios: MutableScenario[];
  [key: string]: unknown;
};

function clone(value: SmokeEvidenceManifestV1): MutableManifest {
  return JSON.parse(JSON.stringify(value)) as MutableManifest;
}
describe("canonical evidence directory", () => {
  test("derives the canonical path from the real git root", async () => {
    const root = await makeRepo();
    const dir = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    expect(dir).toBe(join(root, "_docs/_workflows/_smoke/evidence", TASK.toLowerCase(), SESSION));
  });

  test("rejects invalid task ids, sessions, and non-repo roots", async () => {
    const root = await makeRepo();
    await expect(
      errorCodeAsync(() => resolveCanonicalEvidenceDirectory(root, "TASK-1", SESSION))
    ).resolves.toBe("smoke_task_id_invalid");
    await expect(
      errorCodeAsync(() => resolveCanonicalEvidenceDirectory(root, TASK, "bad/session"))
    ).resolves.toBe("smoke_session_invalid");
    await expect(
      errorCodeAsync(() =>
        resolveCanonicalEvidenceDirectory(join(tmpdir(), "missing-root-xyz"), TASK, SESSION)
      )
    ).rejects.toThrow();
  });

  test("rejects a symlinked evidence component", async () => {
    const root = await makeRepo();
    const parent = join(root, "_docs/_workflows/_smoke");
    await mkdir(parent, { recursive: true });
    await symlink(parent, join(root, "_docs/_workflows/_smoke-link"), "dir");
    // Replace the real path with a symlink at the evidence parent.
    await rm(join(root, "_docs/_workflows/_smoke"), { recursive: true, force: true });
    await symlink(parent, join(root, "_docs/_workflows/_smoke"), "dir");
    await expect(
      errorCodeAsync(() => resolveCanonicalEvidenceDirectory(root, TASK, SESSION))
    ).resolves.toBe("smoke_path_symlink");
  });

  test("rejects a same-basename evidence root under a different repository root", async () => {
    const root = await makeRepo();
    const alternate = await makeRepo();
    const alternateEvidence = await resolveCanonicalEvidenceDirectory(alternate, TASK, SESSION);
    await mkdir(alternateEvidence, { recursive: true });
    // The same-basename directory under the alternate root carries a valid
    // manifest; it must never become the owned evidence root of `root`.
    await writeFile(join(alternateEvidence, "manifest.json"), JSON.stringify(validManifest()));
    const canonical = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    const realRoot = await realpath(root);
    expect(canonical.startsWith(realRoot + sep)).toBe(true);
    expect(canonical).not.toBe(alternateEvidence);
    // The driver resolves only inside the owned repository, so the alternate
    // root's same-basename manifest is never consulted.
    const revision = await computeWorkingTreeRevision(root, TASK, SESSION);
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_evidence_file_missing");
  });

  test("prefix-lookalike sibling directories are never the owned evidence root", async () => {
    const root = await makeRepo();
    const canonical = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    const taskLookalike = join(dirname(dirname(canonical)), `${TASK.toLowerCase()}-extra`);
    const sessionLookalike = join(dirname(canonical), `${SESSION}-extra`);
    await mkdir(taskLookalike, { recursive: true });
    await mkdir(sessionLookalike, { recursive: true });
    await writeFile(join(taskLookalike, "manifest.json"), JSON.stringify(validManifest()));
    await writeFile(join(sessionLookalike, "manifest.json"), JSON.stringify(validManifest()));
    // Neither prefix lookalike can be the resolved owned root.
    expect(canonical).not.toBe(taskLookalike);
    expect(canonical).not.toBe(sessionLookalike);
    // The revision-exclusion boundary is the exact canonical directory: files
    // under either lookalike are never strict descendants of the owned root,
    // while a file inside the canonical directory is.
    expect(isStrictDescendant(canonical, join(taskLookalike, "manifest.json"))).toBe(false);
    expect(isStrictDescendant(canonical, join(sessionLookalike, "manifest.json"))).toBe(false);
    expect(isStrictDescendant(canonical, join(canonical, "manifest.json"))).toBe(true);
    // Validation never reads a lookalike manifest as the owned evidence.
    const revision = await computeWorkingTreeRevision(root, TASK, SESSION);
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_evidence_file_missing");
  });
});
describe("computeWorkingTreeRevision", () => {
  test("clean revision is deterministic and dirty changes the digest", async () => {
    const root = await makeRepo();
    const clean = await computeWorkingTreeRevision(root, TASK, SESSION);
    expect(clean.gitHead).toMatch(/^[0-9a-f]{40}$/);
    expect(clean.workingTreeDirty).toBe(false);
    const cleanAgain = await computeWorkingTreeRevision(root, TASK, SESSION);
    expect(cleanAgain.workingTreeSha256).toBe(clean.workingTreeSha256);

    await writeFile(join(root, "dirty.txt"), "dirty\n");
    const dirty = await computeWorkingTreeRevision(root, TASK, SESSION);
    expect(dirty.workingTreeDirty).toBe(true);
    expect(dirty.workingTreeSha256).not.toBe(clean.workingTreeSha256);
  });

  test("evidence directory files are self-excluded from the revision", async () => {
    const root = await makeRepo();
    const clean = await computeWorkingTreeRevision(root, TASK, SESSION);
    const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    await mkdir(evidence, { recursive: true });
    await writeFile(join(evidence, "manifest.json"), "{}");
    const withEvidence = await computeWorkingTreeRevision(root, TASK, SESSION);
    expect(withEvidence.workingTreeDirty).toBe(false);
    expect(withEvidence.workingTreeSha256).toBe(clean.workingTreeSha256);
    expect(withEvidence.records).toHaveLength(0);
  });

  test("deleted files produce a deterministic deletion marker", async () => {
    const root = await makeRepo();
    await rm(join(root, "source.txt"));
    const dirty = await computeWorkingTreeRevision(root, TASK, SESSION);
    expect(dirty.workingTreeDirty).toBe(true);
    const record = dirty.records.find((entry) => entry.path === "source.txt");
    if (record === undefined) throw new Error("expected deleted source.txt record");
    expect(record.contentHash).toBe("DELETED");
  });
});
describe("validateSmokeEvidence driver", () => {
  async function buildEvidence(
    overrides: {
      manifest?: Record<string, unknown>;
      report?: Record<string, unknown>;
      screenshots?: Record<string, string>;
      manifestReportSha256?: string;
    } = {}
  ) {
    const root = await makeRepo();
    const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    await mkdir(evidence, { recursive: true });
    const shots = overrides.screenshots ?? {};
    for (const id of [
      "admin-light-wide",
      "admin-dark-narrow",
      "admin-form-focus",
      "admin-menu-open",
      "public-mobile-nav",
    ]) {
      const bytes = shots[id] ?? `${id}.png`;
      await writeFile(join(evidence, `${id}.png`), bytes);
    }
    const report = overrides.report ?? validReport();
    const reportBytes = `${JSON.stringify(report)}\n`;
    await writeFile(join(evidence, "report.json"), reportBytes);
    const current = await computeWorkingTreeRevision(root, TASK, SESSION);
    const manifest = clone((overrides.manifest ?? validManifest()) as SmokeEvidenceManifestV1);
    manifest.revision = publicRevision(current);
    manifest.report = {
      path: "report.json",
      sha256: overrides.manifestReportSha256 ?? sha256(reportBytes),
    };
    await writeFile(join(evidence, "manifest.json"), JSON.stringify(manifest));
    return { root, evidence, revision: current, reportBytes };
  }

  test("valid evidence passes the full driver", async () => {
    const { root, revision } = await buildEvidence();
    const result = await validateSmokeEvidence({
      repoRoot: root,
      expectedTask: TASK,
      expectedSuite: SUITE,
      expectedProfile: PROFILE,
      expectedSession: SESSION,
      expectedRevision: publicRevision(revision),
    });
    expect(result.pass).toBe(true);
    expect(result.scenarios).toBe(5);
    expect(result.referencedFiles).toEqual(
      [
        "admin-dark-narrow.png",
        "admin-form-focus.png",
        "admin-light-wide.png",
        "admin-menu-open.png",
        "manifest.json",
        "public-mobile-nav.png",
        "report.json",
      ].sort()
    );
  });

  test("task, suite, and session mismatches fail", async () => {
    const { root, revision } = await buildEvidence();
    const expectedRevision = publicRevision(revision);
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: "TASK-540",
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision,
        })
      )
    ).resolves.toBe("smoke_evidence_file_missing");
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: "task-540",
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision,
        })
      )
    ).resolves.toBe("smoke_suite_mismatch");
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: "other-session",
          expectedRevision,
        })
      )
    ).resolves.toBe("smoke_evidence_file_missing");

    // A manifest present in the expected directory that names the wrong task
    // or session fails with the exact identity codes.
    const wrongTask = await buildEvidence({ manifest: { ...validManifest(), taskId: "TASK-540" } });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: wrongTask.root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(wrongTask.revision),
        })
      )
    ).resolves.toBe("smoke_task_manifest_mismatch");
    const wrongSession = await buildEvidence({
      manifest: { ...validManifest(), session: "other-session" },
    });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: wrongSession.root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(wrongSession.revision),
        })
      )
    ).resolves.toBe("smoke_session_mismatch");
  });

  test("revision mismatch fails", async () => {
    const { root } = await buildEvidence();
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: revision(),
        })
      )
    ).resolves.toBe("smoke_revision_mismatch");
  });

  test("report hash mismatch fails", async () => {
    const { root, revision } = await buildEvidence({ manifestReportSha256: "1".repeat(64) });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_hash_mismatch");
  });

  test("report evidence mismatch fails when a scenario title drifts", async () => {
    const report = validReport();
    report.scenarios[0].title = "Drifted title";
    const { root, revision } = await buildEvidence({ report });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_manifest_report_evidence_mismatch");
  });

  test("screenshot byte hash mismatch and missing files fail", async () => {
    const wrongBytes = await buildEvidence({ screenshots: { "admin-light-wide": "tampered" } });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: wrongBytes.root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(wrongBytes.revision),
        })
      )
    ).resolves.toBe("smoke_hash_mismatch");

    const { root, revision } = await buildEvidence();
    await rm(
      join(
        root,
        "_docs/_workflows/_smoke/evidence",
        TASK.toLowerCase(),
        SESSION,
        "public-mobile-nav.png"
      )
    );
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_evidence_file_missing");
  });

  test("screenshot bytes above MAX_SCREENSHOT_BYTES fail before hashing", async () => {
    // The cap is enforced on the file bytes before any screenshot hashing, so
    // the stale manifest hash is irrelevant to this rejection.
    const oversized = await buildEvidence({
      screenshots: { "admin-light-wide": "x".repeat(MAX_SCREENSHOT_BYTES + 1) },
    });
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: oversized.root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(oversized.revision),
        })
      )
    ).resolves.toBe("smoke_screenshot_too_large");
  });

  test("screenshots at exactly MAX_SCREENSHOT_BYTES pass", async () => {
    const bytes = "x".repeat(MAX_SCREENSHOT_BYTES);
    const manifest = clone(validManifest());
    manifest.scenarios[0].screenshots[0].sha256 = sha256(bytes);
    const report = validReport() as unknown as {
      scenarios: { screenshots: MutableScreenshot[] }[];
      screenshots: MutableScreenshot[];
    };
    report.scenarios[0].screenshots[0].sha256 = sha256(bytes);
    report.screenshots[0].sha256 = sha256(bytes);
    const { root, revision } = await buildEvidence({
      manifest,
      report,
      screenshots: { "admin-light-wide": bytes },
    });
    const result = await validateSmokeEvidence({
      repoRoot: root,
      expectedTask: TASK,
      expectedSuite: SUITE,
      expectedProfile: PROFILE,
      expectedSession: SESSION,
      expectedRevision: publicRevision(revision),
    });
    expect(result.pass).toBe(true);
  });

  test("oversized manifest fails before parsing", async () => {
    const { root, evidence, revision } = await buildEvidence();
    await writeFile(
      join(evidence, "manifest.json"),
      JSON.stringify({ pad: "x".repeat(1_100_000) })
    );
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_manifest_too_large");
  });

  test("malformed manifest JSON fails closed", async () => {
    const { root, evidence, revision } = await buildEvidence();
    await writeFile(join(evidence, "manifest.json"), "{ not json");
    await expect(
      errorCodeAsync(() =>
        validateSmokeEvidence({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
        })
      )
    ).resolves.toBe("smoke_json_invalid");
  });
});
describe("auditSmokeEvidenceDirectory", () => {
  test("exact file set passes and unreferenced files fail", async () => {
    const { root, revision } = await buildEvidenceHelper();
    const expectedRevision = publicRevision(revision);
    const pass = await auditSmokeEvidenceDirectory({
      repoRoot: root,
      expectedTask: TASK,
      expectedSuite: SUITE,
      expectedProfile: PROFILE,
      expectedSession: SESSION,
      expectedRevision,
      requireCheckpoint: false,
      requireTracked: false,
    });
    expect(pass.pass).toBe(true);

    const evidence = join(root, "_docs/_workflows/_smoke/evidence", TASK.toLowerCase(), SESSION);
    await writeFile(join(evidence, "unreferenced.txt"), "extra");
    await expect(
      errorCodeAsync(() =>
        auditSmokeEvidenceDirectory({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision,
          requireCheckpoint: false,
          requireTracked: false,
        })
      )
    ).resolves.toBe("smoke_evidence_file_set_mismatch");
  });

  test("requireTracked passes only after staging the exact set", async () => {
    const { root, revision, evidence } = await buildEvidenceHelper();
    const expectedRevision = publicRevision(revision);
    await expect(
      errorCodeAsync(() =>
        auditSmokeEvidenceDirectory({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision,
          requireCheckpoint: false,
          requireTracked: true,
        })
      )
    ).resolves.toBe("smoke_evidence_untracked");
    git(root, ["add", evidence]);
    const pass = await auditSmokeEvidenceDirectory({
      repoRoot: root,
      expectedTask: TASK,
      expectedSuite: SUITE,
      expectedProfile: PROFILE,
      expectedSession: SESSION,
      expectedRevision,
      requireCheckpoint: false,
      requireTracked: true,
    });
    expect(pass.pass).toBe(true);
  });

  test("requireCheckpoint expects the checkpoint control file", async () => {
    const { root, revision } = await buildEvidenceHelper();
    await expect(
      errorCodeAsync(() =>
        auditSmokeEvidenceDirectory({
          repoRoot: root,
          expectedTask: TASK,
          expectedSuite: SUITE,
          expectedProfile: PROFILE,
          expectedSession: SESSION,
          expectedRevision: publicRevision(revision),
          requireCheckpoint: true,
          requireTracked: false,
        })
      )
    ).resolves.toBe("smoke_evidence_file_set_mismatch");
  });
});

async function buildEvidenceHelper() {
  const root = await makeRepo();
  const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
  await mkdir(evidence, { recursive: true });
  for (const id of [
    "admin-light-wide",
    "admin-dark-narrow",
    "admin-form-focus",
    "admin-menu-open",
    "public-mobile-nav",
  ]) {
    await writeFile(join(evidence, `${id}.png`), `${id}.png`);
  }
  const report = validReport();
  const reportBytes = `${JSON.stringify(report)}\n`;
  await writeFile(join(evidence, "report.json"), reportBytes);
  const revision = await computeWorkingTreeRevision(root, TASK, SESSION);
  const manifest = clone(validManifest());
  manifest.revision = publicRevision(revision);
  manifest.report = { path: "report.json", sha256: sha256(reportBytes) };
  await writeFile(join(evidence, "manifest.json"), JSON.stringify(manifest));
  return { root, evidence, revision };
}

describe("writeSmokeEvidenceManifest", () => {
  test("writes canonical bytes and refuses overwrite", async () => {
    const root = await makeRepo();
    const result = await writeSmokeEvidenceManifest({
      repoRoot: root,
      expectedTask: TASK,
      expectedSession: SESSION,
      manifest: validManifest(),
    });
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    const bytes = await readFile(join(result.path), "utf8");
    expect(bytes.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(bytes);
    expect(parsed.schemaVersion).toBe(1);
    await expect(
      errorCodeAsync(() =>
        writeSmokeEvidenceManifest({
          repoRoot: root,
          expectedTask: TASK,
          expectedSession: SESSION,
          manifest: validManifest(),
        })
      )
    ).resolves.toBe("smoke_manifest_conflict");
  });
});
