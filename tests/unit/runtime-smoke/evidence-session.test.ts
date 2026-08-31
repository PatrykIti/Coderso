// TASK-105-08-05-L04 exclusive evidence-session claim tests (Bun lane). Owns
// the runner's central no-follow session bootstrap/claim contract: missing
// task-105 parent bootstrap, existing session/report refusal, symlink and
// identity-swap refusal, and 0600 report ownership.

import { mkdir, mkdtemp, rm, symlink, stat, writeFile } from "node:fs/promises";
import { mkdirSync, renameSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import { claimExclusiveEvidenceSession } from "../../../scripts/runtime-smoke/evidence-session";

const tempRoots: string[] = [];

function input(session: string) {
  return { command: "run", suite: "task-105-l05", profile: "fast", session } as const;
}

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "evidence-session-test-"));
  tempRoots.push(root);
  await mkdir(resolve(root, "_docs/_workflows/_smoke"), { recursive: true });
  await mkdir(resolve(root, "_docs/_workflows/_smoke/evidence"), { mode: 0o700 });
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("exclusive evidence-session claim", () => {
  test("bootstraps the absent task-105 parent and claims the absent session with a 0600 report", async () => {
    const root = await makeRepo();
    const session = claimExclusiveEvidenceSession(input("task105l05-fast-r1"), root);
    const report = resolve(session, "report.json");
    expect(session).toBe(
      resolve(root, "_docs/_workflows/_smoke/evidence/task-105/task105l05-fast-r1")
    );
    const st = await stat(report);
    expect(st.isFile()).toBe(true);
    expect(st.mode & 0o777).toBe(0o600);
  });

  test("requires the evidence root to exist before bootstrapping task-105", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidence-session-missing-root-"));
    tempRoots.push(root);
    await mkdir(resolve(root, "_docs/_workflows/_smoke"), { recursive: true });
    expect(() => claimExclusiveEvidenceSession(input("task105l05-missing-root"), root)).toThrow(
      SmokeError
    );
  });

  test("refuses reuse when the exact session already exists", async () => {
    const root = await makeRepo();
    claimExclusiveEvidenceSession(input("task105l05-fast-r2"), root);
    let code = "";
    try {
      claimExclusiveEvidenceSession(input("task105l05-fast-r2"), root);
    } catch (error) {
      if (error instanceof SmokeError) code = error.code;
      else throw error;
    }
    expect(code).toBe("smoke_output_invalid");
  });

  test("refuses a pre-existing report.json in an absent session", async () => {
    const root = await makeRepo();
    const sessionDir = resolve(root, "_docs/_workflows/_smoke/evidence/task-105/task105l05-r3");
    await mkdir(sessionDir, { recursive: true, mode: 0o700 });
    await writeFile(resolve(sessionDir, "report.json"), "{}\n", { mode: 0o600 });
    expect(() => claimExclusiveEvidenceSession(input("task105l05-r3"), root)).toThrow(SmokeError);
  });

  test("refuses symlinked or non-directory ancestry", async () => {
    const root = await makeRepo();
    const evidenceRoot = resolve(root, "_docs/_workflows/_smoke/evidence");
    await rm(evidenceRoot, { recursive: true, force: true });
    await symlink(join(root, "_docs", "_workflows", "_smoke"), evidenceRoot);
    expect(() => claimExclusiveEvidenceSession(input("task105l05-r4"), root)).toThrow(SmokeError);
  });

  test("refuses a symlinked task-105 parent", async () => {
    const root = await makeRepo();
    const evidenceRoot = resolve(root, "_docs/_workflows/_smoke/evidence");
    await mkdir(resolve(root, "elsewhere"), { recursive: true });
    await rm(evidenceRoot, { recursive: true, force: true });
    await symlink(resolve(root, "elsewhere"), evidenceRoot);
    expect(() => claimExclusiveEvidenceSession(input("task105l05-r5"), root)).toThrow(SmokeError);
  });

  test("rejects a non-L05 invocation or non-component session before claiming paths", async () => {
    const root = await makeRepo();
    expect(() =>
      claimExclusiveEvidenceSession({ ...input("task105l05-r6"), suite: "task-547" } as never, root)
    ).toThrow(SmokeError);
    expect(() =>
      claimExclusiveEvidenceSession({ ...input("task105l05-r6"), session: "../escape" }, root)
    ).toThrow(SmokeError);
  });

  test("refuses a deterministic session identity swap before the report claim", async () => {
    const root = await makeRepo();
    const replacement = resolve(root, "replacement-session");
    mkdirSync(replacement, { mode: 0o700 });
    expect(() =>
      claimExclusiveEvidenceSession(input("task105l05-r6"), root, {
        afterSessionClaimed(session) {
          rmdirSync(session);
          renameSync(replacement, session);
        },
      })
    ).toThrow(SmokeError);
  });
});
