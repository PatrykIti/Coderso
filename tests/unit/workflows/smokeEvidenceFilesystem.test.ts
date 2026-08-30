import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import {
  SmokeEvidenceError,
  auditSmokeEvidenceDirectory,
  computeWorkingTreeRevision,
  enumerateRegularFilesNoSymlinks,
  projectSmokeEvidenceManifest,
  publicRevision,
  readCanonicalSmokeEvidenceReport,
  readPorcelainRecords,
  resolveCanonicalEvidenceDirectory,
  sha256,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type { SmokeEvidenceAuditOptions } from "../../../_docs/_workflows/lib/smoke-evidence.mjs";

const TASK = "TASK-105";
const SESSION = "task105-evidence-r1";
const SUITE = "task-105-l05";
const PROFILE = "fast";
const EVIDENCE_SCENARIOS = Object.freeze([
  ["evidence-admin-light", "admin", "light"],
  ["evidence-admin-dark", "admin", "dark"],
  ["evidence-menu-save", "admin", "light"],
  ["evidence-dashboard-save", "admin", "light"],
  ["evidence-public-parity", "public", "light"],
] as const);
const roots: string[] = [];

function git(root: string, args: string[]): void {
  execFileSync("git", args, {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  });
}

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "smoke-evidence-filesystem-"));
  roots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "tracked.txt"), "tracked\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

async function errorCode(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

type PrivateEnumerateWithReadHook = (
  directory: string,
  options: {
    readonly afterDirectoryRead: (directory: string) => void | Promise<void>;
  }
) => Promise<readonly string[]>;

// The operation hook is deliberately private: the public facade preserves its
// existing one-argument declaration, while this extraction test drives the
// internal identity-swap boundary through an explicit local cast.
const enumerateWithPrivateReadHook =
  enumerateRegularFilesNoSymlinks as unknown as PrivateEnumerateWithReadHook;

async function withGitWrapper<T>(
  source: string,
  environment: Readonly<Record<string, string>>,
  run: () => Promise<T>
): Promise<T> {
  const bin = await mkdtemp(join(tmpdir(), "smoke-evidence-git-wrapper-"));
  roots.push(bin);
  const script = join(bin, "git");
  await writeFile(script, source, { mode: 0o700 });
  await chmod(script, 0o700);

  const previousPath = process.env.PATH;
  const scopedEnvironment = {
    ...environment,
    SMOKE_EVIDENCE_TEST_ORIGINAL_PATH: previousPath ?? "",
  };
  const previousValues = new Map(
    Object.keys(scopedEnvironment).map((key) => [key, process.env[key]])
  );
  process.env.PATH = `${bin}${previousPath === undefined ? "" : `:${previousPath}`}`;
  for (const [key, value] of Object.entries(scopedEnvironment)) process.env[key] = value;

  try {
    return await run();
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    for (const [key, value] of previousValues) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function privateAuditReport(): Record<string, unknown> {
  const scenarios = EVIDENCE_SCENARIOS.map(([id, surface, theme]) => ({
    id,
    pass: true,
    elapsedMs: 0,
    title: `Evidence ${id}`,
    variants: [
      {
        id: `${id}-view`,
        surface,
        theme,
        viewport: { width: 1280, height: 800 },
        assertions: [
          {
            kind: "dom-state",
            target: "fixture",
            property: "visible",
            expected: "true",
            actual: "true",
            pass: true,
          },
        ],
        consoleErrors: [],
      },
    ],
    screenshots: [{ path: `screenshots/${id}.png`, sha256: sha256(`${id}.png`) }],
  }));
  return {
    schemaVersion: 1,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: scenarios.flatMap((scenario) => scenario.screenshots),
  };
}

async function writePrivateAuditEvidence(root: string): Promise<{
  readonly evidence: string;
  readonly manifestPath: string;
  readonly reportPath: string;
  readonly firstScreenshotPath: string;
  readonly report: Record<string, unknown>;
  readonly auditOptions: SmokeEvidenceAuditOptions;
}> {
  const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
  const screenshots = join(evidence, "screenshots");
  await mkdir(screenshots, { recursive: true, mode: 0o700 });
  await chmod(evidence, 0o700);
  await chmod(screenshots, 0o700);

  const report = privateAuditReport();
  const reportBytes = `${JSON.stringify(report)}\n`;
  for (const [id] of EVIDENCE_SCENARIOS) {
    await writeFile(join(screenshots, `${id}.png`), `${id}.png`, { mode: 0o600 });
  }
  const reportPath = join(evidence, "report.json");
  await writeFile(reportPath, reportBytes, { mode: 0o600 });
  await chmod(reportPath, 0o600);

  const revision = publicRevision(await computeWorkingTreeRevision(root, TASK, SESSION));
  const manifest = projectSmokeEvidenceManifest({
    taskId: TASK,
    suiteId: SUITE,
    profile: PROFILE,
    session: SESSION,
    reportPath: "report.json",
    reportSha256: sha256(reportBytes),
    revision,
    generatedAt: "2026-08-30T00:00:00.000Z",
    report,
  });
  const manifestPath = join(evidence, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, { mode: 0o600 });
  await chmod(manifestPath, 0o600);

  return {
    evidence,
    manifestPath,
    reportPath,
    firstScreenshotPath: join(screenshots, `${EVIDENCE_SCENARIOS[0][0]}.png`),
    report,
    auditOptions: Object.freeze({
      repoRoot: root,
      expectedTask: TASK,
      expectedSuite: SUITE,
      expectedProfile: PROFILE,
      expectedSession: SESSION,
      expectedRevision: revision,
      requireCheckpoint: false,
      requireTracked: false,
      requirePrivateEvidenceFiles: true,
    }),
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("L04 smoke evidence filesystem boundaries", () => {
  test("reads only the canonical private 0600 report through the real Git root", async () => {
    const root = await makeRepo();
    const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    await mkdir(evidence, { recursive: true, mode: 0o700 });
    await chmod(evidence, 0o700);
    const reportPath = join(evidence, "report.json");
    const report = { schemaVersion: 1, status: "private" };
    await writeFile(reportPath, `${JSON.stringify(report)}\n`, { mode: 0o600 });
    await chmod(reportPath, 0o600);

    await expect(
      readCanonicalSmokeEvidenceReport({
        repoRoot: root,
        expectedTask: TASK,
        expectedSession: SESSION,
      })
    ).resolves.toMatchObject({ report });

    await chmod(reportPath, 0o644);
    await expect(
      errorCode(() =>
        readCanonicalSmokeEvidenceReport({
          repoRoot: root,
          expectedTask: TASK,
          expectedSession: SESSION,
        })
      )
    ).resolves.toBe("smoke_evidence_mode_unsafe");
  });

  test("refuses symlinked evidence ancestry and report objects", async () => {
    const root = await makeRepo();
    await mkdir(join(root, "outside"), { recursive: true });
    await mkdir(join(root, "_docs"), { recursive: true });
    await symlink(join(root, "outside"), join(root, "_docs", "_workflows"));
    await expect(
      errorCode(() =>
        readCanonicalSmokeEvidenceReport({
          repoRoot: root,
          expectedTask: TASK,
          expectedSession: SESSION,
        })
      )
    ).resolves.toBe("smoke_path_symlink");

    const cleanRoot = await makeRepo();
    const evidence = await resolveCanonicalEvidenceDirectory(cleanRoot, TASK, SESSION);
    await mkdir(evidence, { recursive: true, mode: 0o700 });
    await chmod(evidence, 0o700);
    await symlink(join(cleanRoot, "missing-report.json"), join(evidence, "report.json"));
    await expect(
      errorCode(() =>
        readCanonicalSmokeEvidenceReport({
          repoRoot: cleanRoot,
          expectedTask: TASK,
          expectedSession: SESSION,
        })
      )
    ).resolves.toBe("smoke_evidence_file_invalid");
  });

  test("refuses a swapped or symlinked screenshots component before walking descendants", async () => {
    const root = await makeRepo();
    const evidence = await resolveCanonicalEvidenceDirectory(root, TASK, SESSION);
    const screenshots = join(evidence, "screenshots");
    await mkdir(screenshots, { recursive: true, mode: 0o700 });
    await writeFile(join(screenshots, "one.png"), "png", { mode: 0o600 });

    const screenshotsBackup = join(evidence, "screenshots-backup");
    await rename(screenshots, screenshotsBackup);
    await symlink(screenshotsBackup, screenshots);
    await expect(errorCode(() => enumerateRegularFilesNoSymlinks(evidence))).resolves.toBe(
      "smoke_path_symlink"
    );
    await rm(screenshots);
    await rename(screenshotsBackup, screenshots);

    const replacement = join(evidence, "screenshots-replacement");
    const original = join(evidence, "screenshots-original");
    await mkdir(replacement, { mode: 0o700 });
    await expect(
      errorCode(() =>
        enumerateWithPrivateReadHook(evidence, {
          afterDirectoryRead: async (directory: string) => {
            if (directory === evidence) {
              await rename(screenshots, original);
              await rename(replacement, screenshots);
            }
          },
        })
      )
    ).resolves.toBe("smoke_path_identity_changed");
  });

  test("preserves porcelain rename/copy targets and consumes origins in both index states", async () => {
    const root = await makeRepo();
    await withGitWrapper(
      `#!/bin/sh
if [ "$1" = "status" ]; then
  printf '%b' 'R  staged-rename-target\\000staged-rename-origin\\000 C unstaged-copy-target\\000unstaged-copy-origin\\000C  staged-copy-target\\000staged-copy-origin\\000 R unstaged-rename-target\\000unstaged-rename-origin\\000?? next.txt\\000'
  exit 0
fi
PATH="$SMOKE_EVIDENCE_TEST_ORIGINAL_PATH"
export PATH
exec git "$@"
`,
      {},
      async () => {
        await expect(readPorcelainRecords(root)).resolves.toEqual([
          { status: "R ", path: "staged-rename-target" },
          { status: " C", path: "unstaged-copy-target" },
          { status: "C ", path: "staged-copy-target" },
          { status: " R", path: "unstaged-rename-target" },
          { status: "??", path: "next.txt" },
        ]);
      }
    );
  });

  test("enforces private 0600 report, manifest, and screenshot evidence in audit mode", async () => {
    const fixture = await writePrivateAuditEvidence(await makeRepo());
    await expect(auditSmokeEvidenceDirectory(fixture.auditOptions)).resolves.toMatchObject({
      pass: true,
      scenarios: EVIDENCE_SCENARIOS.length,
    });

    await chmod(fixture.reportPath, 0o644);
    await expect(errorCode(() => auditSmokeEvidenceDirectory(fixture.auditOptions))).resolves.toBe(
      "smoke_evidence_mode_unsafe"
    );
    await chmod(fixture.reportPath, 0o600);

    await chmod(fixture.manifestPath, 0o644);
    await expect(errorCode(() => auditSmokeEvidenceDirectory(fixture.auditOptions))).resolves.toBe(
      "smoke_evidence_mode_unsafe"
    );
    await chmod(fixture.manifestPath, 0o600);

    await chmod(fixture.firstScreenshotPath, 0o644);
    await expect(errorCode(() => auditSmokeEvidenceDirectory(fixture.auditOptions))).resolves.toBe(
      "smoke_evidence_mode_unsafe"
    );
    await chmod(fixture.firstScreenshotPath, 0o600);

    await writeFile(fixture.firstScreenshotPath, "tampered");
    await expect(errorCode(() => auditSmokeEvidenceDirectory(fixture.auditOptions))).resolves.toBe(
      "smoke_hash_mismatch"
    );
  });

  test("revalidates evidence after file-set parity and rejects a mid-audit report swap", async () => {
    const fixture = await writePrivateAuditEvidence(await makeRepo());
    const replacementRoot = await mkdtemp(join(tmpdir(), "smoke-evidence-replacement-"));
    roots.push(replacementRoot);
    const replacementPath = join(replacementRoot, "report.json");
    const statePath = join(replacementRoot, "state");
    await writeFile(replacementPath, `${JSON.stringify({ ...fixture.report, pass: false })}\n`, {
      mode: 0o600,
    });

    await withGitWrapper(
      `#!/bin/sh
PATH="$SMOKE_EVIDENCE_TEST_ORIGINAL_PATH"
export PATH
git "$@"
status=$?
if [ "$1" = "rev-parse" ] && [ "$2" = "--show-toplevel" ] && [ "$status" -eq 0 ]; then
  count=0
  if [ -f "$SMOKE_EVIDENCE_TEST_STATE" ]; then count=$(cat "$SMOKE_EVIDENCE_TEST_STATE"); fi
  count=$((count + 1))
  printf '%s' "$count" > "$SMOKE_EVIDENCE_TEST_STATE"
  if [ "$count" -eq 2 ]; then
    cat "$SMOKE_EVIDENCE_TEST_REPLACEMENT" > "$SMOKE_EVIDENCE_TEST_REPORT"
  fi
fi
exit "$status"
`,
      {
        SMOKE_EVIDENCE_TEST_STATE: statePath,
        SMOKE_EVIDENCE_TEST_REPLACEMENT: replacementPath,
        SMOKE_EVIDENCE_TEST_REPORT: fixture.reportPath,
      },
      async () => {
        await expect(
          errorCode(() => auditSmokeEvidenceDirectory(fixture.auditOptions))
        ).resolves.toBe("smoke_hash_mismatch");
      }
    );

    expect(Number(await readFile(statePath, "utf8"))).toBeGreaterThanOrEqual(2);
  });
});
