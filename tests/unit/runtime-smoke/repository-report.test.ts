import { expect, test } from "bun:test";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import { RepositoryGuard, parsePorcelainV2 } from "../../../scripts/runtime-smoke/repository-guard";
import { createRuntimeSmokeReport, encodeReportJson } from "../../../scripts/runtime-smoke/report";

test("porcelain parser handles ordinary, rename, untracked, and rejects escapes", () => {
  const hash = "a".repeat(40);
  const bytes = new TextEncoder().encode(
    `1 .M N... 100644 100644 100644 ${hash} ${hash} tracked.txt\0` +
      `2 R. N... 100644 100644 100644 ${hash} ${hash} R100 renamed.txt\0old.txt\0` +
      "? new file.txt\0"
  );
  expect(parsePorcelainV2(bytes)).toEqual([
    "new file.txt",
    "old.txt",
    "renamed.txt",
    "tracked.txt",
  ]);
  expect(() => parsePorcelainV2(new TextEncoder().encode("? ../escape\0"))).toThrow(SmokeError);
  expect(() => parsePorcelainV2(new TextEncoder().encode("? truncated"))).toThrow(SmokeError);
});

test("repository guard hashes bounded candidates and detects mutation", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "coderso-runtime-smoke-"));
  try {
    const root = await realpath(temporary);
    await writeFile(join(root, "tracked.txt"), "before");
    const guard = new RepositoryGuard(root, async () =>
      new TextEncoder().encode("? tracked.txt\0")
    );
    const before = await guard.snapshot();
    await writeFile(join(root, "tracked.txt"), "after");
    const after = await guard.snapshot();
    expect(before.sha256).not.toBe(after.sha256);
    expect(() => guard.assertUnchanged(before, after)).toThrowError(
      expect.objectContaining({ code: "smoke_repository_changed" })
    );
    expect(() => guard.assertUnchanged(before, after, ["tracked.txt"])).not.toThrow();
    expect(guard.count()).toBe(2);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("known-path rehash avoids a full Git snapshot and keeps safe identity checks", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "coderso-runtime-smoke-known-"));
  try {
    const root = await realpath(temporary);
    await writeFile(join(root, "shot.png"), "before");
    let statusCalls = 0;
    const guard = new RepositoryGuard(root, async () => {
      statusCalls += 1;
      return new Uint8Array();
    });
    const before = await guard.snapshotKnown(["shot.png"]);
    await writeFile(join(root, "shot.png"), "after");
    const after = await guard.snapshotKnown(["shot.png"]);
    expect(before.sha256).not.toBe(after.sha256);
    expect(statusCalls).toBe(0);
    expect(guard.count()).toBe(0);
    expect(guard.knownRehashCount()).toBe(2);
    expect(() => guard.assertUnchanged(before, after, ["shot.png"])).not.toThrow();
    await expect(guard.snapshotKnown(["shot.png", "shot.png"])).rejects.toThrow();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("report is deterministic, bounded, and redacts known secret shapes", () => {
  const report = createRuntimeSmokeReport({
    request: { command: "run", suite: "task-540", profile: "fast", session: "wf552-fast" },
    adapter: {
      pass: true,
      serverUp: true,
      scenarios: [{ id: "scenario", pass: true, elapsedMs: 1 }],
      screenshots: [],
      consoleErrors: ["Bearer abcdefghijklmnopqrstuvwxyz"],
      cleanup: { password: "should-not-appear" },
    },
    primary: null,
    cleanup: { pass: true, failures: [] },
    timings: [],
    processCounters: { git: 2 },
    snapshots: 2,
  });
  const encoded = encodeReportJson(report);
  expect(encoded).toContain("[REDACTED]");
  expect(encoded).not.toContain("abcdefghijklmnopqrstuvwxyz");
  expect(encoded).not.toContain("should-not-appear");
  expect(report.suiteCleanup).toEqual({ password: "[REDACTED]" });
  expect(encoded.endsWith("\n")).toBe(true);
  expect(encodeReportJson(report)).toBe(encoded);
});

test("report serializes new smoke failure codes without error messages or causes", () => {
  const secret = "private-auth-cause-should-not-appear";
  for (const code of ["smoke_authentication_failed", "smoke_server_unexpected_exit"] as const) {
    const report = createRuntimeSmokeReport({
      request: { command: "run", suite: "task-554", profile: "fast", session: "task-554-fast" },
      adapter: null,
      primary: new SmokeError(code, secret, { cause: new Error(secret) }),
      cleanup: { pass: true, failures: [] },
      timings: [],
      processCounters: {},
      snapshots: 1,
    });
    const encoded = encodeReportJson(report);
    expect(report.failures).toEqual([{ code }]);
    expect(encoded).toContain(code);
    expect(encoded).not.toContain(secret);
  }
});
