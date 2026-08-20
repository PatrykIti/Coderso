import { expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { lstat, mkdtemp, mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import adapter, {
  assertExactTask493Invocation,
  assertTask493AdminAuthOutcome,
  assertTask493SafeProjection,
  awaitTask493AdminAuthentication,
  createTask493PrivateWorkspace,
  projectTask493AdapterResult,
} from "../../../scripts/runtime-smoke/adapters/task-493";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import {
  assertExactTask493ScreenshotManifest,
  buildExactTask493ScreenshotManifest,
  decodeTask493Png,
  validateTask493ScreenshotOutputs,
} from "../../../scripts/runtime-smoke/adapters/task-493/output-manifest";
import {
  TASK493_SCENARIOS,
  TASK493_VARIANTS,
  assertTask493BrowserReceipt,
  materializeTask493BrowserAction,
  type Task493Variant,
} from "../../../scripts/runtime-smoke/adapters/task-493/browser-actions";
import type {
  Task493CleanupOutput,
  Task493ProofOutput,
} from "../../../scripts/runtime-smoke/adapters/task-493/worker-operations";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";
import {
  RuntimeLifecycle,
  type RuntimeSmokeContext,
} from "../../../scripts/runtime-smoke/lifecycle";

const hash = "a".repeat(64);
const input = Object.freeze({
  command: "run" as const,
  suite: "task-493" as const,
  profile: "fast" as const,
  session: "task-493-fast",
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

const cleanup: Task493CleanupOutput = {
  schemaVersion: 1,
  seoIndexedPagesRemoved: 7,
  seoSearchMetricsRemoved: 7,
  seoSearchQueriesRemoved: 7,
  seoSitemapSubmissionsRemoved: 7,
  preIdentityAbsenceProved: true,
  identityAbsenceProved: true,
  settingsRestored: true,
  statements: 20,
  rows: 28,
};

const proof: Task493ProofOutput = {
  schemaVersion: 1,
  fixturesAbsent: true,
  identitiesAbsent: true,
  settingsRestored: true,
  statements: 3,
  rows: 0,
};

const fixtureUrl = (scenarioId: string, variantId: string) =>
  `http://127.0.0.1:3000/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${scenarioId}-${variantId}.xml`;

test("TASK-493 adapter registers only the two exact profiles and rejects invocation drift", () => {
  expect(adapter.suiteId).toBe("task-493");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  const root = join(import.meta.dir, "../../..");
  expect(adapter.evidenceDirectory?.(input, root)).toBe(
    join(root, "_docs/_workflows/_smoke/task-493/task-493-fast")
  );
  expect(() => assertExactTask493Invocation(input)).not.toThrow();
  for (const candidate of [
    { ...input, suite: "task-554" },
    { ...input, session: "task-493-certification" },
    { ...input, profile: "certification", session: "task-493-fast" },
    { ...input, unknown: true },
  ]) {
    expect(() => assertExactTask493Invocation(candidate)).toThrow();
  }
});

test("TASK-493 maps only bounded expected admin-auth false outcomes without exposing input", () => {
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
      assertTask493AdminAuthOutcome({ attempted: true, authenticated: false, error })
    ).toThrow(expect.objectContaining({ code: "smoke_authentication_failed" }));
  }
  expect(() =>
    assertTask493AdminAuthOutcome({
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
      assertTask493AdminAuthOutcome(outcome);
      throw new Error("expected TASK-493 auth outcome rejection");
    } catch (error) {
      expect(error).toEqual(expect.objectContaining({ code: "smoke_output_invalid" }));
      expect(error instanceof Error ? error.message : "").not.toContain(secret);
    }
  }
});

test("TASK-493 authentication propagates a post-readiness server exit before pending auth", async () => {
  let rejectServerExit!: (reason: unknown) => void;
  const authentication = new Promise<never>(() => undefined);
  const serverExit = new Promise<never>((_resolve, reject) => {
    rejectServerExit = reject;
  });
  const result = awaitTask493AdminAuthentication(authentication, serverExit);
  rejectServerExit(
    new SmokeError("smoke_server_unexpected_exit", "bounded post-readiness server exit")
  );
  await expect(result).rejects.toMatchObject({ code: "smoke_server_unexpected_exit" });
});

test("TASK-493 workspace rejects a redirected .tmp ancestor before private files are created", async () => {
  const root = await mkdtemp(join(tmpdir(), "task493-workspace-root-"));
  const outside = await mkdtemp(join(tmpdir(), "task493-workspace-outside-"));
  const context = {
    input,
    root,
    lifecycle: new RuntimeLifecycle(),
  } as RuntimeSmokeContext;
  try {
    await symlink(outside, join(root, ".tmp"));
    await expect(createTask493PrivateWorkspace(context)).rejects.toThrow("workspace parent");
    expect(await readdir(outside)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("TASK-493 workspace removes only the empty parent directories it created", async () => {
  const root = await mkdtemp(join(tmpdir(), "task493-workspace-cleanup-"));
  const context = {
    input,
    root,
    lifecycle: new RuntimeLifecycle(),
  } as RuntimeSmokeContext;
  const parent = join(root, ".tmp", "runtime-smoke");
  try {
    const created = await createTask493PrivateWorkspace(context);
    await created.close();
    expect(await created.proveAbsent()).toBe(true);
    await expect(lstat(parent)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(join(root, ".tmp"))).rejects.toMatchObject({ code: "ENOENT" });

    await mkdir(parent, { recursive: true, mode: 0o700 });
    const [tmpBefore, parentBefore] = await Promise.all([lstat(join(root, ".tmp")), lstat(parent)]);
    const retained = await createTask493PrivateWorkspace({
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

test("TASK-493 projects seven terminal scenarios and fixed cleanup receipts without private values", () => {
  const workers = {
    counters: () => ({
      starts: 1,
      requests: 10,
      reconnects: 0,
      databaseBatches: 10,
      statements: 34,
      rows: 46,
    }),
  } as unknown as WorkerPool;
  const result = projectTask493AdapterResult({
    scenarios: Array.from({ length: 7 }, (_value, index) => ({
      id: `scenario-${index + 1}`,
      pass: true,
      elapsedMs: index + 1,
    })),
    screenshots: Array.from({ length: 7 }, (_value, index) => ({
      path: `_docs/_workflows/_smoke/task-493/task-493-fast/${index + 1}.png`,
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
    seoIndexedPagesRemoved: 7,
    seoSearchMetricsRemoved: 7,
    seoSearchQueriesRemoved: 7,
    seoSitemapSubmissionsRemoved: 7,
    workerStarts: 1,
    workerRequests: 10,
    databaseBatches: 10,
    statements: 34,
    rows: 46,
    fixturesAbsent: true,
    identitiesAbsent: true,
  });
  assertTask493SafeProjection(result, [
    "synthetic-password",
    "admin@example.test",
    "task493-private-recovery-key",
  ]);
  expect(() =>
    projectTask493AdapterResult({
      scenarios: [],
      screenshots: [],
      cleanup: { ...cleanup, settingsRestored: false } as never,
      proof,
      workers,
      repositorySnapshots: 2,
    })
  ).toThrow("admin path restoration proof");
  expect(() =>
    projectTask493AdapterResult({
      scenarios: [],
      screenshots: [],
      cleanup,
      proof: { ...proof, settingsRestored: false } as never,
      workers,
      repositorySnapshots: 2,
    })
  ).toThrow("admin path restoration proof");
  expect(() =>
    assertTask493SafeProjection({ ...result, leaked: "synthetic-password" } as never, [
      "synthetic-password",
    ])
  ).toThrow("private material");
});

function validReceipt(
  descriptorId: string,
  variant: Task493Variant,
  overrides: Record<string, unknown> = {}
) {
  return {
    scenarioId: descriptorId,
    fixtureUrl: fixtureUrl(descriptorId, variant.id),
    variantId: variant.id,
    responseStatus: 200,
    requestMethod: "GET",
    contentType: "application/xml",
    bodyPrefix: '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlCount: 7,
    bodyIncludes: true,
    outcome: "read",
    cardVisible: true,
    cardValue: "7",
    cardLabel: "Indexed pages",
    cardMatchesOverview: true,
    statusRowRendered: true,
    colorScheme: variant.colorScheme,
    consoleErrors: [],
    pageErrors: [],
    ...overrides,
  };
}

test("TASK-493 browser actions materialize self-contained real flows with visible card proof", () => {
  const sitemapDescriptor = TASK493_SCENARIOS[0]!;
  const robotsDescriptor = TASK493_SCENARIOS[1]!;
  const overviewDescriptor = TASK493_SCENARIOS[2]!;
  const submitDescriptor = TASK493_SCENARIOS[3]!;
  const syncDescriptor = TASK493_SCENARIOS[4]!;
  const performanceDescriptor = TASK493_SCENARIOS[5]!;
  const cardDescriptor = TASK493_SCENARIOS[6]!;
  const variant = TASK493_VARIANTS[0]!;
  const url = fixtureUrl(sitemapDescriptor.id, variant.id);

  const source = materializeTask493BrowserAction({
    scenarioId: sitemapDescriptor.id,
    fixtureUrl: url,
    variant,
    fixtureSitemapPath: `/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${sitemapDescriptor.id}-${variant.id}.xml`,
    minIndexedPages: 7,
    minImpressions: 350,
    screenshotPath: null,
  });
  expect(source).toContain("http://127.0.0.1:3000/sitemap.xml");
  expect(source).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  expect(source).toContain("http://127.0.0.1:3000/task493-");
  expect(source).not.toContain("apiFetch(");

  const robots = materializeTask493BrowserAction({
    scenarioId: robotsDescriptor.id,
    fixtureUrl: fixtureUrl(robotsDescriptor.id, variant.id),
    variant,
    fixtureSitemapPath: `/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${robotsDescriptor.id}-${variant.id}.xml`,
    minIndexedPages: 7,
    minImpressions: 350,
    screenshotPath: null,
  });
  expect(robots).toContain("http://127.0.0.1:3000/robots.txt");
  expect(robots).toContain("Sitemap: http://127.0.0.1:3000/sitemap.xml");

  const admin = materializeTask493BrowserAction({
    scenarioId: overviewDescriptor.id,
    fixtureUrl: fixtureUrl(overviewDescriptor.id, variant.id),
    variant,
    fixtureSitemapPath: `/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${overviewDescriptor.id}-${variant.id}.xml`,
    minIndexedPages: 7,
    minImpressions: 350,
    screenshotPath: null,
  });
  expect(admin).toContain("/admin/api/seo/overview");
  expect(admin).toContain("Indexed pages");

  const write = materializeTask493BrowserAction({
    scenarioId: submitDescriptor.id,
    fixtureUrl: fixtureUrl(submitDescriptor.id, variant.id),
    variant,
    fixtureSitemapPath: `/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${submitDescriptor.id}-${variant.id}.xml`,
    minIndexedPages: 7,
    minImpressions: 350,
    screenshotPath: null,
  });
  expect(write).toContain("X-CSRF-Token");
  expect(write).toContain("gsc_not_configured");
  expect(write).toContain("server responded with a status of 409");

  const card = materializeTask493BrowserAction({
    scenarioId: cardDescriptor.id,
    fixtureUrl: fixtureUrl(cardDescriptor.id, variant.id),
    variant,
    fixtureSitemapPath: `/task493-aaaaaaaaaaaaaaaaaaaaaaaa-${cardDescriptor.id}-${variant.id}.xml`,
    minIndexedPages: 7,
    minImpressions: 350,
    screenshotPath: null,
  });
  expect(card).toContain('localStorage.removeItem("seo:overview")');
  expect(card).toContain(".font-display");
  expect(card).toContain("prefers-color-scheme: dark");
  expect(card).toContain("task493_fifth_card_value");

  expect(() =>
    materializeTask493BrowserAction({
      scenarioId: cardDescriptor.id,
      fixtureUrl: "https://evil.example/x",
      variant,
      fixtureSitemapPath: "/ok.xml",
      minIndexedPages: 7,
      minImpressions: 350,
      screenshotPath: null,
    })
  ).toThrow("materialization drifted");
  expect(() =>
    materializeTask493BrowserAction({
      scenarioId: cardDescriptor.id,
      fixtureUrl: url,
      variant,
      fixtureSitemapPath: "../escape.xml",
      minIndexedPages: 7,
      minImpressions: 350,
      screenshotPath: null,
    })
  ).toThrow("materialization drifted");
  const expectations = { minIndexedPages: 7, minImpressions: 350 };
  for (const [descriptor, overrides] of [
    [sitemapDescriptor, {}],
    [robotsDescriptor, { contentType: "text/plain" }],
    [overviewDescriptor, {}],
    [
      submitDescriptor,
      {
        responseStatus: 409,
        requestMethod: "POST",
        outcome: "unconfigured",
        contentType: "application/json",
        bodyPrefix: '{"message":"gsc_not_configured"',
      },
    ],
    [
      syncDescriptor,
      {
        responseStatus: 409,
        requestMethod: "POST",
        outcome: "unconfigured",
        contentType: "application/json",
        bodyPrefix: '{"message":"gsc_not_configured"',
      },
    ],
    [performanceDescriptor, { urlCount: 350 }],
    [cardDescriptor, { urlCount: 7, cardValue: "7" }],
  ] as const) {
    const receipt = validReceipt(descriptor!.id, variant, { ...overrides });
    expect(() =>
      assertTask493BrowserReceipt(
        receipt,
        descriptor!,
        {
          scenarioId: descriptor!.id,
          variantId: variant.id,
          url: fixtureUrl(descriptor!.id, variant.id),
        },
        variant,
        expectations
      )
    ).not.toThrow();
  }
  const submitReceipt = validReceipt(submitDescriptor.id, variant, {
    responseStatus: 409,
    requestMethod: "POST",
    outcome: "unconfigured",
    contentType: "application/json",
    bodyPrefix: '{"message":"gsc_not_configured"',
  });
  const submitDrift = [
    { ...submitReceipt, responseStatus: 500, message: "server error" },
    { ...submitReceipt, statusRowRendered: false, message: "status row" },
    { ...submitReceipt, outcome: "read", message: "browser receipt" },
    { ...submitReceipt, consoleErrors: ["unexpected"], message: "browser receipt" },
    { ...submitReceipt, pageErrors: ["unexpected"], message: "browser receipt" },
    { ...submitReceipt, colorScheme: "dark", message: "browser receipt" },
  ];
  for (const { message, ...drift } of submitDrift) {
    expect(() =>
      assertTask493BrowserReceipt(
        drift,
        submitDescriptor,
        {
          scenarioId: submitDescriptor.id,
          variantId: variant.id,
          url: fixtureUrl(submitDescriptor.id, variant.id),
        },
        variant,
        expectations
      )
    ).toThrow(message);
  }
  const cardReceipt = validReceipt(cardDescriptor.id, variant, { urlCount: 7, cardValue: "7" });
  for (const drift of [
    { ...cardReceipt, cardValue: "" },
    { ...cardReceipt, cardLabel: "Issues" },
    { ...cardReceipt, cardMatchesOverview: false },
    { ...cardReceipt, urlCount: 1 },
  ]) {
    expect(() =>
      assertTask493BrowserReceipt(
        drift,
        cardDescriptor,
        {
          scenarioId: cardDescriptor.id,
          variantId: variant.id,
          url: fixtureUrl(cardDescriptor.id, variant.id),
        },
        variant,
        expectations
      )
    ).toThrow("indexed pages card");
  }
  const { cardVisible: _omitted, ...receiptWithoutVisibleProof } = cardReceipt;
  expect(() =>
    assertTask493BrowserReceipt(
      receiptWithoutVisibleProof,
      cardDescriptor,
      {
        scenarioId: cardDescriptor.id,
        variantId: variant.id,
        url: fixtureUrl(cardDescriptor.id, variant.id),
      },
      variant,
      expectations
    )
  ).toThrow("browser receipt");
});

test("TASK-493 manifest binds profile and session to seven ordered PNG paths", () => {
  const manifest = buildExactTask493ScreenshotManifest(input);
  assertExactTask493ScreenshotManifest(input, manifest);
  expect(manifest.entries.map(({ scenarioId }) => scenarioId)).toEqual([
    "sitemap-xml-served",
    "robots-txt-sitemap-directive",
    "seo-overview-real-data",
    "sitemap-submit-status",
    "indexed-pages-sync",
    "search-performance-read",
    "seo-manager-fifth-card",
  ]);
  expect(manifest.paths[0]).toBe(
    "_docs/_workflows/_smoke/task-493/task-493-fast/01-sitemap-xml-served.png"
  );
  expect(() =>
    assertExactTask493ScreenshotManifest(
      input,
      Object.freeze({
        entries: manifest.entries,
        paths: Object.freeze([...manifest.paths].reverse()),
      })
    )
  ).toThrow("row drifted");
});

test("TASK-493 PNG decoder rejects truncated, invalid-CRC, and malformed chunks", () => {
  const valid = png();
  expect(decodeTask493Png(valid)).toEqual({ width: 2, height: 2 });
  expect(() => decodeTask493Png(valid.subarray(0, 20))).toThrow();
  const badCrc = Buffer.from(valid);
  badCrc[badCrc.length - 5] ^= 1;
  expect(() => decodeTask493Png(badCrc)).toThrow("checksum");
  const malformed = Buffer.from(valid);
  malformed.writeUInt32BE(0xffff_ffff, 8);
  expect(() => decodeTask493Png(malformed)).toThrow();
});

test("TASK-493 evidence accepts equal hashes at distinct files and rejects extra or symlinked files", async () => {
  const root = await mkdtemp(join(tmpdir(), "task493-evidence-"));
  const manifest = buildExactTask493ScreenshotManifest(input);
  const directory = join(root, "_docs/_workflows/_smoke/task-493/task-493-fast");
  try {
    await mkdir(directory, { recursive: true });
    const bytes = png();
    await writeFile(join(directory, "report.json"), '{"private":"not-read"}\n');
    await Promise.all(manifest.paths.map((path) => writeFile(join(root, path), bytes)));
    const accepted = await validateTask493ScreenshotOutputs(root, input, manifest);
    expect(accepted).toHaveLength(7);
    expect(new Set(accepted.map(({ sha256 }) => sha256)).size).toBe(1);
    await writeFile(join(directory, "extra.png"), bytes);
    await expect(validateTask493ScreenshotOutputs(root, input, manifest)).rejects.toThrow(
      "evidence set"
    );
    await rm(join(directory, "extra.png"));
    await rm(join(root, manifest.paths[0]!));
    await symlink(join(root, manifest.paths[1]!), join(root, manifest.paths[0]!));
    await expect(validateTask493ScreenshotOutputs(root, input, manifest)).rejects.toThrow();
    await rm(join(root, manifest.paths[0]!));
    await writeFile(join(root, manifest.paths[0]!), bytes);
    await rm(join(directory, "report.json"));
    await symlink(join(root, manifest.paths[0]!), join(directory, "report.json"));
    await expect(validateTask493ScreenshotOutputs(root, input, manifest)).rejects.toThrow(
      "report receipt"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
