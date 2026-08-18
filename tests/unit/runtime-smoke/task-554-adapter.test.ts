import { expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { lstat, mkdtemp, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import adapter, {
  assertExactTask554Invocation,
  assertTask554AdminAuthOutcome,
  assertTask554SafeProjection,
  awaitTask554AdminAuthentication,
  createTask554PrivateWorkspace,
  projectTask554AdapterResult,
} from "../../../scripts/runtime-smoke/adapters/task-554";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import {
  assertExactTask554ScreenshotManifest,
  buildExactTask554ScreenshotManifest,
  decodeTask554Png,
  validateTask554ScreenshotOutputs,
} from "../../../scripts/runtime-smoke/adapters/task-554/output-manifest";
import {
  TASK554_SCENARIOS,
  TASK554_VARIANTS,
  assertTask554BrowserReceipt,
  materializeTask554BrowserAction,
} from "../../../scripts/runtime-smoke/adapters/task-554/browser-actions";
import type {
  Task554CleanupOutput,
  Task554ProofOutput,
} from "../../../scripts/runtime-smoke/adapters/task-554/worker-operations";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";
import {
  RuntimeLifecycle,
  type RuntimeSmokeContext,
} from "../../../scripts/runtime-smoke/lifecycle";

const hash = "a".repeat(64);
const input = Object.freeze({
  command: "run" as const,
  suite: "task-554" as const,
  profile: "fast" as const,
  session: "task-554-fast",
});

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function png(width = 2, height = 2): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((width * 4 + 1) * height))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const cleanup: Task554CleanupOutput = {
  schemaVersion: 1,
  postChildrenRemoved: 3,
  accessLogsRemoved: 4,
  loginAuditRowsRemoved: 2,
  sessionsRemoved: 2,
  userRolesRemoved: 2,
  postsRemoved: 7,
  usersRemoved: 2,
  rolesRemoved: 2,
  preIdentityAbsenceProved: true,
  identityAbsenceProved: true,
  settingsRestored: true,
  statements: 17,
  rows: 24,
};

const proof: Task554ProofOutput = {
  schemaVersion: 1,
  fixturesAbsent: true,
  identitiesAbsent: true,
  settingsRestored: true,
  statements: 3,
  rows: 0,
};

test("TASK-554 adapter registers only the two exact profiles and rejects invocation drift", () => {
  expect(adapter.suiteId).toBe("task-554");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  const root = join(import.meta.dir, "../../..");
  expect(adapter.evidenceDirectory?.(input, root)).toBe(
    join(root, "_docs/_workflows/_smoke/evidence/task-554/task-554-fast")
  );
  expect(() => assertExactTask554Invocation(input)).not.toThrow();
  for (const candidate of [
    { ...input, suite: "task-547" },
    { ...input, session: "task-554-certification" },
    { ...input, profile: "certification", session: "task-554-fast" },
    { ...input, unknown: true },
  ]) {
    expect(() => assertExactTask554Invocation(candidate)).toThrow();
  }
});

test("TASK-554 maps only bounded expected admin-auth false outcomes without exposing input", () => {
  const secret = "private-auth-session-or-status";
  for (const error of [
    "credentials_missing",
    "login_network_failed",
    "login_failed:401",
    "login_failed:599",
    "session_cookie_missing",
    "session_cookie_invalid",
  ]) {
    expect(() =>
      assertTask554AdminAuthOutcome({ attempted: true, authenticated: false, error })
    ).toThrow(expect.objectContaining({ code: "smoke_authentication_failed" }));
  }
  expect(() =>
    assertTask554AdminAuthOutcome({
      attempted: true,
      authenticated: true,
      sessionValue: secret,
    })
  ).not.toThrow();
  for (const outcome of [
    { attempted: true, authenticated: false, error: `login_failed:401:${secret}` },
    { attempted: true, authenticated: false, error: "login_failed:200" },
    { attempted: true, authenticated: false, error: "login_failed:99" },
    { attempted: true, authenticated: false, error: secret },
    { attempted: false, authenticated: false, error: "credentials_missing" },
    { attempted: true, authenticated: false, error: "credentials_missing", secret },
    { attempted: true, authenticated: true, sessionValue: "" },
    null,
  ]) {
    try {
      assertTask554AdminAuthOutcome(outcome);
      throw new Error("expected TASK-554 auth outcome rejection");
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({ code: "smoke_output_invalid" }));
      expect(error instanceof Error ? error.message : "").not.toContain(secret);
    }
  }
});

test("TASK-554 authentication propagates a post-readiness server exit before pending auth", async () => {
  let rejectServerExit!: (reason: unknown) => void;
  const authentication = new Promise<never>(() => undefined);
  const serverExit = new Promise<never>((_resolve, reject) => {
    rejectServerExit = reject;
  });
  const result = awaitTask554AdminAuthentication(authentication, serverExit);
  rejectServerExit(
    new SmokeError("smoke_server_unexpected_exit", "bounded post-readiness server exit")
  );
  await expect(result).rejects.toMatchObject({ code: "smoke_server_unexpected_exit" });
});

test("TASK-554 workspace rejects a redirected .tmp ancestor before private files are created", async () => {
  const root = await mkdtemp(join(tmpdir(), "task554-workspace-root-"));
  const outside = await mkdtemp(join(tmpdir(), "task554-workspace-outside-"));
  const context = {
    input,
    root,
    lifecycle: new RuntimeLifecycle(),
  } as RuntimeSmokeContext;
  try {
    await symlink(outside, join(root, ".tmp"));
    await expect(createTask554PrivateWorkspace(context)).rejects.toThrow("workspace parent");
    expect(await readdir(outside)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("TASK-554 workspace removes only the empty parent directories it created", async () => {
  const root = await mkdtemp(join(tmpdir(), "task554-workspace-cleanup-"));
  const context = {
    input,
    root,
    lifecycle: new RuntimeLifecycle(),
  } as RuntimeSmokeContext;
  const parent = join(root, ".tmp", "runtime-smoke");
  try {
    const created = await createTask554PrivateWorkspace(context);
    await created.close();
    expect(await created.proveAbsent()).toBe(true);
    await expect(lstat(parent)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(root, ".tmp"))).rejects.toMatchObject({ code: "ENOENT" });

    await mkdir(parent, { recursive: true, mode: 0o700 });
    const [tmpBefore, parentBefore] = await Promise.all([lstat(join(root, ".tmp")), lstat(parent)]);
    const retained = await createTask554PrivateWorkspace({
      ...context,
      lifecycle: new RuntimeLifecycle(),
    });
    await retained.close();
    const [tmpAfter, parentAfter] = await Promise.all([lstat(join(root, ".tmp")), lstat(parent)]);
    expect({ dev: tmpAfter.dev, ino: tmpAfter.ino }).toEqual({
      dev: tmpBefore.dev,
      ino: tmpBefore.ino,
    });
    expect({ dev: parentAfter.dev, ino: parentAfter.ino }).toEqual({
      dev: parentBefore.dev,
      ino: parentBefore.ino,
    });
    expect(await readdir(parent)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TASK-554 projects seven terminal scenarios and fixed cleanup receipts without private values", () => {
  const workers = {
    counters: () => ({
      starts: 1,
      requests: 18,
      reconnects: 0,
      databaseBatches: 18,
      statements: 29,
      rows: 31,
    }),
  } as unknown as WorkerPool;
  const result = projectTask554AdapterResult({
    scenarios: Array.from({ length: 7 }, (_value, index) => ({
      id: `scenario-${index + 1}`,
      pass: true,
      elapsedMs: index + 1,
    })),
    screenshots: Array.from({ length: 7 }, (_value, index) => ({
      path: `_docs/_workflows/_smoke/evidence/task-554/task-554-fast/${index + 1}.png`,
      sha256: hash,
    })),
    cleanup,
    proof,
    workers,
    repositorySnapshots: 2,
  });
  expect(result.cleanup).toMatchObject({
    pageErrors: 0,
    repositorySnapshots: 2,
    settingsRestored: true,
    postsRemoved: 7,
    workerStarts: 1,
  });
  assertTask554SafeProjection(result, [
    "synthetic-password",
    "synthetic@example.test",
    "task554-private-pepper",
  ]);
  expect(() =>
    projectTask554AdapterResult({
      scenarios: [],
      screenshots: [],
      cleanup: { ...cleanup, settingsRestored: false } as never,
      proof,
      workers,
      repositorySnapshots: 2,
    })
  ).toThrow("admin path restoration proof");
  expect(() =>
    projectTask554AdapterResult({
      scenarios: [],
      screenshots: [],
      cleanup,
      proof: { ...proof, settingsRestored: false } as never,
      workers,
      repositorySnapshots: 2,
    })
  ).toThrow("admin path restoration proof");
  expect(() =>
    assertTask554SafeProjection({ ...result, leaked: "synthetic-password" } as never, [
      "synthetic-password",
    ])
  ).toThrow("private material");
});

test("TASK-554 browser action opens the mobile Details sheet and requires one redacted metadata mutation", () => {
  const descriptor = TASK554_SCENARIOS[1]!;
  const variant = TASK554_VARIANTS[2]!;
  const fixture = {
    scenarioId: descriptor.id,
    variantId: variant.id,
    postId: "00000000-0000-4000-8000-000000000001",
  };
  const source = materializeTask554BrowserAction({
    descriptor,
    fixture,
    variant,
    screenshotPath: null,
  });
  expect(source).toContain('getByRole("button", { name: "Details", exact: true })');
  expect(source).toContain('[data-entry-metadata-panel="true"]:visible');
  expect(source).toContain('getByText("Status", { exact: true })');
  expect(source).toContain('getByText("Schedule date", { exact: true })');
  expect(source).toContain('getByText("Meta description", { exact: true })');
  expect(source).toContain("unexpectedPostMutationCount");
  expect(source).toContain('new BroadcastChannel("coderso.admin.cache")');
  expect(source).toContain("cacheEventKinds");
  const receipt = {
    scenarioId: descriptor.id,
    postId: fixture.postId,
    responseStatus: 403,
    requestMethod: "PATCH",
    requestKeys: ["scheduledAt", "status"],
    postMutationCount: 1,
    metadataPatchCount: 1,
    unexpectedPostMutationCount: 0,
    requestValuesValid: true,
    statusControlMatches: true,
    statusBadgeMatches: true,
    scheduleValueMatches: true,
    scheduleDisabledMatches: true,
    seoValueMatches: true,
    cacheEventKinds: [],
    unexpectedPostCacheEventCount: 0,
    panelVisible: true,
    saveButtonWidth: 100,
    saveButtonHeight: 32,
    colorScheme: variant.colorScheme,
    permissionDenied: true,
    consoleErrors: [],
    pageErrors: [],
  };
  expect(() => assertTask554BrowserReceipt(receipt, descriptor, fixture, variant)).not.toThrow();
  for (const drift of [
    { ...receipt, postMutationCount: 2 },
    { ...receipt, metadataPatchCount: 0 },
    { ...receipt, unexpectedPostMutationCount: 1 },
    { ...receipt, requestValuesValid: false },
    { ...receipt, statusBadgeMatches: false },
    { ...receipt, cacheEventKinds: ["posts:list:update"] },
    { ...receipt, unexpectedPostCacheEventCount: 1 },
  ]) {
    expect(() => assertTask554BrowserReceipt(drift, descriptor, fixture, variant)).toThrow(
      "browser receipt"
    );
  }
  const successDescriptor = TASK554_SCENARIOS[3]!;
  const successFixture = {
    scenarioId: successDescriptor.id,
    variantId: TASK554_VARIANTS[0]!.id,
    postId: "00000000-0000-4000-8000-000000000002",
  };
  const successReceipt = {
    ...receipt,
    scenarioId: successDescriptor.id,
    postId: successFixture.postId,
    responseStatus: 200,
    permissionDenied: false,
    cacheEventKinds: ["posts:list:update", "posts:detail:update"],
  };
  expect(() =>
    assertTask554BrowserReceipt(
      successReceipt,
      successDescriptor,
      successFixture,
      TASK554_VARIANTS[0]!
    )
  ).not.toThrow();
  expect(() =>
    assertTask554BrowserReceipt(
      { ...successReceipt, cacheEventKinds: [...successReceipt.cacheEventKinds].reverse() },
      successDescriptor,
      successFixture,
      TASK554_VARIANTS[0]!
    )
  ).toThrow("browser receipt");
  const { seoValueMatches: _omitted, ...receiptWithoutVisibleProof } = receipt;
  expect(() =>
    assertTask554BrowserReceipt(receiptWithoutVisibleProof, descriptor, fixture, variant)
  ).toThrow("browser receipt");
});

test("TASK-554 manifest binds profile and session to seven ordered PNG paths", () => {
  const manifest = buildExactTask554ScreenshotManifest(input);
  assertExactTask554ScreenshotManifest(input, manifest);
  expect(manifest.entries.map(({ scenarioId }) => scenarioId)).toEqual([
    "writer-metadata-save-preserves-schedule",
    "writer-status-publish-denied",
    "writer-schedule-denied",
    "publisher-schedule",
    "publisher-publish",
    "publisher-unpublish",
    "publisher-archive",
  ]);
  expect(manifest.paths[0]).toBe(
    "_docs/_workflows/_smoke/evidence/task-554/task-554-fast/01-writer-metadata-save-preserves-schedule.png"
  );
  expect(() =>
    assertExactTask554ScreenshotManifest(
      input,
      Object.freeze({
        entries: manifest.entries,
        paths: Object.freeze([...manifest.paths].reverse()),
      })
    )
  ).toThrow("row drifted");
});

test("TASK-554 PNG decoder rejects truncated, invalid-CRC, and malformed chunks", () => {
  const valid = png();
  expect(decodeTask554Png(valid)).toEqual({ width: 2, height: 2 });
  expect(() => decodeTask554Png(valid.subarray(0, 20))).toThrow();
  const badCrc = Buffer.from(valid);
  badCrc[badCrc.length - 5] ^= 1;
  expect(() => decodeTask554Png(badCrc)).toThrow("checksum");
  const malformed = Buffer.from(valid);
  malformed.writeUInt32BE(0xffff_ffff, 8);
  expect(() => decodeTask554Png(malformed)).toThrow();
});

test("TASK-554 evidence accepts equal hashes at distinct files and rejects extra or symlinked files", async () => {
  const root = await mkdtemp(join(tmpdir(), "task554-evidence-"));
  const manifest = buildExactTask554ScreenshotManifest(input);
  const directory = join(root, "_docs/_workflows/_smoke/evidence/task-554/task-554-fast");
  try {
    await mkdir(directory, { recursive: true });
    const bytes = png();
    await writeFile(join(directory, "report.json"), '{"private":"not-read"}\n');
    await Promise.all(manifest.paths.map((path) => writeFile(join(root, path), bytes)));
    const accepted = await validateTask554ScreenshotOutputs(root, input, manifest);
    expect(accepted).toHaveLength(7);
    expect(new Set(accepted.map(({ sha256 }) => sha256)).size).toBe(1);
    await writeFile(join(directory, "extra.png"), bytes);
    await expect(validateTask554ScreenshotOutputs(root, input, manifest)).rejects.toThrow(
      "evidence set"
    );
    await rm(join(directory, "extra.png"));
    await rm(join(root, manifest.paths[0]!));
    await symlink(join(root, manifest.paths[1]!), join(root, manifest.paths[0]!));
    await expect(validateTask554ScreenshotOutputs(root, input, manifest)).rejects.toThrow();
    await rm(join(root, manifest.paths[0]!));
    await writeFile(join(root, manifest.paths[0]!), bytes);
    await rm(join(directory, "report.json"));
    await symlink(join(root, manifest.paths[0]!), join(directory, "report.json"));
    await expect(validateTask554ScreenshotOutputs(root, input, manifest)).rejects.toThrow(
      "report receipt"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
