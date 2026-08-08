import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { FullSitePackageV1 } from "../../../core/services/kits/fullSitePackage/types";
import {
  DEFAULT_FORMA_DOM_PACKAGE_PATH,
  FULL_SITE_PACKAGE_RAW_OPEN_FLAGS,
  FULL_SITE_PACKAGE_RAW_SOURCE_BYTES,
  parseFullSiteCliArgs,
  readBoundedFullSitePackage,
  runFullSiteCli,
  safeCliError,
  type FullSiteCliDeps,
  type FullSitePackageFileDeps,
  type FullSitePackageFileStat,
} from "../../../scripts/projekty-domow/fullSiteCli";
import {
  createFullSiteLoaderDeps,
  runLoadProjektyDomowMain,
  type FullSiteLoaderImporter,
  type FullSiteLoaderSinks,
} from "../../../scripts/load-projekty-domow";

const ACTOR = "123e4567-e89b-42d3-a456-426614174000";
const RUN = "123e4567-e89b-42d3-a456-426614174001";
const encoder = new TextEncoder();

const pkg: FullSitePackageV1 = {
  schemaVersion: 1,
  key: "cli-test",
  metadata: { name: "CLI", locale: "pl" },
  resources: {
    contentTypes: [],
    forms: [],
    pageTemplates: [],
    listingTemplates: [],
    entries: [],
    listingQueries: [],
    detailPages: [],
    pages: [],
    menus: [],
    settings: [],
  },
};

const packageSource = (): Uint8Array => encoder.encode(JSON.stringify(pkg));

const statFor = (
  size: number,
  overrides: Partial<Omit<FullSitePackageFileStat, "isFile">> &
    Readonly<{ isFile?: () => boolean }> = {}
): FullSitePackageFileStat => ({
  dev: 1n,
  ino: 2n,
  size: BigInt(size),
  mtimeNs: 3n,
  ctimeNs: 4n,
  isFile: () => true,
  ...overrides,
});

interface FakeFileOptions {
  readonly before?: FullSitePackageFileStat;
  readonly after?: FullSitePackageFileStat;
  readonly chunkBytes?: number;
  readonly openError?: boolean;
  readonly statErrorAt?: 1 | 2;
  readonly readError?: boolean;
  readonly invalidBytesRead?: number;
  readonly closeError?: boolean;
}

function fakeFile(
  source: Uint8Array,
  options: FakeFileOptions = {}
): Readonly<{ deps: FullSitePackageFileDeps; calls: string[] }> {
  const calls: string[] = [];
  let statCalls = 0;
  const before = options.before ?? statFor(source.byteLength);
  const after = options.after ?? before;
  const deps: FullSitePackageFileDeps = {
    async open(filePath, flags) {
      calls.push(`open:${filePath}:${flags}`);
      if (options.openError) throw new Error("private open detail");
      return {
        async stat(statOptions) {
          statCalls += 1;
          calls.push(`stat:${statCalls}:${String(statOptions.bigint)}`);
          if (options.statErrorAt === statCalls) throw new Error("private stat detail");
          return statCalls === 1 ? before : after;
        },
        async read(buffer, offset, length, position) {
          calls.push(`read:${offset}:${length}:${position}`);
          if (options.readError) throw new Error("private read detail");
          if (options.invalidBytesRead !== undefined) {
            return { bytesRead: options.invalidBytesRead };
          }
          const available = Math.max(0, source.byteLength - position);
          const bytesRead = Math.min(
            length,
            available,
            options.chunkBytes ?? Number.POSITIVE_INFINITY
          );
          if (bytesRead > 0) {
            buffer.set(source.subarray(position, position + bytesRead), offset);
          }
          return { bytesRead };
        },
        async close() {
          calls.push("close");
          if (options.closeError) throw new Error("private close detail");
        },
      };
    },
  };
  return { deps, calls };
}

const cliDeps = () => {
  const calls: string[] = [];
  const output: string[] = [];
  const value: FullSiteCliDeps = {
    readPackage: async (filePath) => {
      calls.push(`read:${filePath}`);
      return pkg;
    },
    apply: async (input) => {
      calls.push(`apply:${input.dryRun}:${input.allowSettingTakeover}`);
      return { runId: RUN, resources: [{ id: "safe" }] };
    },
    rollback: async (input) => {
      calls.push(`rollback:${input.sourceRunId}`);
      return { runId: RUN };
    },
    writeOutput: (line) => output.push(line),
  };
  return { value, calls, output };
};

describe("full-site CLI parser", () => {
  test("parses strict dry-run, apply and rollback modes", () => {
    expect(parseFullSiteCliArgs(["--dry-run", "--file", "site.json", "--actor", ACTOR])).toEqual({
      mode: "dry-run",
      file: "site.json",
      actorId: ACTOR,
      allowSettingTakeover: false,
    });
    expect(
      parseFullSiteCliArgs([
        "--apply",
        "--allow-setting-takeover",
        "--file",
        "site.json",
        "--actor",
        ACTOR,
      ])
    ).toEqual({
      mode: "apply",
      file: "site.json",
      actorId: ACTOR,
      allowSettingTakeover: true,
    });
    expect(parseFullSiteCliArgs(["--dry-run", "--actor", ACTOR])).toEqual({
      mode: "dry-run",
      file: DEFAULT_FORMA_DOM_PACKAGE_PATH,
      actorId: ACTOR,
      allowSettingTakeover: false,
    });
    expect(parseFullSiteCliArgs(["--rollback", RUN, "--actor", ACTOR])).toEqual({
      mode: "rollback",
      sourceRunId: RUN,
      actorId: ACTOR,
    });
  });

  test.each([
    ["--apply", "--dry-run", "--file", "site.json", "--actor", ACTOR],
    ["--rollback", RUN, "--file", "site.json", "--actor", ACTOR],
    ["--rollback", RUN, "--allow-setting-takeover", "--actor", ACTOR],
    ["--apply", "--file", "site.json"],
    ["--apply", "--file", "site.json", "--actor", "bad"],
    ["--rollback", "bad", "--actor", ACTOR],
    ["--unknown", "--actor", ACTOR],
  ])("rejects malformed or ambiguous args: %j", (...argv) => {
    expect(() => parseFullSiteCliArgs(argv)).toThrow();
  });

  test("validates the actor before mode-specific arguments", () => {
    expect(() => parseFullSiteCliArgs([])).toThrow("site_package_actor_invalid");
    expect(() => parseFullSiteCliArgs(["--rollback", "bad"])).toThrow("site_package_actor_invalid");
  });
});

describe("bounded full-site package reader", () => {
  test("maps an open failure to the static file code without a close attempt", async () => {
    const fixture = fakeFile(packageSource(), { openError: true });
    await expect(readBoundedFullSitePackage("missing.json", fixture.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );
    expect(fixture.calls).toEqual([`open:missing.json:${FULL_SITE_PACKAGE_RAW_OPEN_FLAGS}`]);
  });

  test("uses one numeric nonblocking open, two handle stats, positional short reads and one close", async () => {
    const fixture = fakeFile(packageSource(), { chunkBytes: 7 });
    await expect(readBoundedFullSitePackage("site.json", fixture.deps)).resolves.toEqual(pkg);
    expect(fixture.calls[0]).toBe(`open:site.json:${FULL_SITE_PACKAGE_RAW_OPEN_FLAGS}`);
    expect(fixture.calls.filter((call) => call.startsWith("open:"))).toHaveLength(1);
    expect(fixture.calls.filter((call) => call.startsWith("stat:"))).toEqual([
      "stat:1:true",
      "stat:2:true",
    ]);
    expect(fixture.calls.filter((call) => call.startsWith("read:")).length).toBeGreaterThan(1);
    expect(fixture.calls.at(-1)).toBe("close");
  });

  test("accepts exactly 8 MiB of raw JSON and rejects 8 MiB plus one", async () => {
    const base = JSON.stringify(pkg);
    const exact = encoder.encode(
      base + " ".repeat(FULL_SITE_PACKAGE_RAW_SOURCE_BYTES - base.length)
    );
    expect(exact.byteLength).toBe(FULL_SITE_PACKAGE_RAW_SOURCE_BYTES);
    await expect(readBoundedFullSitePackage("exact.json", fakeFile(exact).deps)).resolves.toEqual(
      pkg
    );

    const oversized = new Uint8Array(FULL_SITE_PACKAGE_RAW_SOURCE_BYTES + 1);
    const fixture = fakeFile(oversized);
    await expect(readBoundedFullSitePackage("oversized.json", fixture.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );
    expect(fixture.calls.some((call) => call.startsWith("read:"))).toBe(false);
    expect(fixture.calls.at(-1)).toBe("close");
  });

  test.each([
    {
      label: "non-file",
      options: { before: statFor(packageSource().byteLength, { isFile: () => false }) },
    },
    {
      label: "malformed file mode",
      options: {
        before: statFor(packageSource().byteLength, {
          isFile: () => {
            throw new Error("private mode detail");
          },
        }),
      },
    },
    {
      label: "growth",
      options: { after: statFor(packageSource().byteLength + 1, { mtimeNs: 5n }) },
    },
    {
      label: "shrink",
      options: { after: statFor(packageSource().byteLength - 1, { mtimeNs: 5n }) },
    },
    {
      label: "same-size rewrite",
      options: { after: statFor(packageSource().byteLength, { ctimeNs: 5n }) },
    },
    { label: "first stat failure", options: { statErrorAt: 1 as const } },
    { label: "second stat failure", options: { statErrorAt: 2 as const } },
    { label: "read failure", options: { readError: true } },
    { label: "negative read metadata", options: { invalidBytesRead: -1 } },
    { label: "excess read metadata", options: { invalidBytesRead: Number.MAX_SAFE_INTEGER } },
  ])("rejects $label with one static error and one close", async ({ options }) => {
    const fixture = fakeFile(packageSource(), options);
    await expect(readBoundedFullSitePackage("site.json", fixture.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );
    expect(fixture.calls.filter((call) => call === "close")).toHaveLength(1);
    expect(fixture.calls.join(" ")).not.toContain("private");
  });

  test("keeps file, JSON and normalizer errors distinct and preserves body over close", async () => {
    const malformedUtf8 = fakeFile(Uint8Array.of(0xc3, 0x28), { closeError: true });
    await expect(readBoundedFullSitePackage("utf8.json", malformedUtf8.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );

    const replacement = fakeFile(encoder.encode(JSON.stringify({ ...pkg, key: "bad\uFFFDkey" })));
    await expect(readBoundedFullSitePackage("replacement.json", replacement.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );

    const json = fakeFile(encoder.encode("{"), { closeError: true });
    await expect(readBoundedFullSitePackage("syntax.json", json.deps)).rejects.toThrow(
      "site_package_json_invalid"
    );

    const normalizer = fakeFile(encoder.encode('{"unexpected":true}'), { closeError: true });
    await expect(readBoundedFullSitePackage("schema.json", normalizer.deps)).rejects.toThrow(
      "site_package_invalid"
    );

    const closeOnly = fakeFile(packageSource(), { closeError: true });
    await expect(readBoundedFullSitePackage("close.json", closeOnly.deps)).rejects.toThrow(
      "site_package_file_invalid"
    );
  });

  test("preserves forbidden-setting classification without disclosing the supplied value", async () => {
    const sentinel = "do-not-disclose-secret-value";
    const raw = {
      ...pkg,
      resources: {
        ...pkg.resources,
        settings: [{ key: "provider.privateKey", desired: { value: sentinel } }],
      },
    };
    let error: unknown;
    try {
      await readBoundedFullSitePackage(
        "forbidden.json",
        fakeFile(encoder.encode(JSON.stringify(raw))).deps
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("site_package_setting_forbidden");
    expect(JSON.stringify(error)).not.toContain(sentinel);
    expect(safeCliError(error)).toBe('{"ok":false,"error":"site_package_setting_forbidden"}');
  });

  test("rejects a real FIFO without a writer through the nonblocking handle boundary", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "coderso-full-site-cli-"));
    const fifo = path.join(directory, "fixture.fifo");
    try {
      const result = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
      expect(result.status).toBe(0);
      const started = performance.now();
      await expect(readBoundedFullSitePackage(fifo)).rejects.toThrow("site_package_file_invalid");
      expect(performance.now() - started).toBeLessThan(1_000);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("full-site CLI execution", () => {
  test("invalid actor and package failure happen before apply", async () => {
    const invalid = cliDeps();
    await expect(
      runFullSiteCli(["--apply", "--file", "site.json", "--actor", "bad"], invalid.value)
    ).rejects.toThrow("site_package_actor_invalid");
    expect(invalid.calls).toEqual([]);

    const fileFailure = cliDeps();
    fileFailure.value.readPackage = async () => {
      fileFailure.calls.push("read");
      throw new Error("site_package_file_invalid");
    };
    await expect(
      runFullSiteCli(["--apply", "--file", "site.json", "--actor", ACTOR], fileFailure.value)
    ).rejects.toThrow("site_package_file_invalid");
    expect(fileFailure.calls).toEqual(["read"]);
  });

  test("reference validation rejects before lazy apply acquisition", async () => {
    const state = cliDeps();
    state.value.readPackage = async () => ({
      ...pkg,
      resources: {
        ...pkg.resources,
        entries: [
          {
            key: "entry",
            desired: {
              contentTypeId: { ref: "content_type", key: "missing" },
            },
          },
        ],
      },
    });
    await expect(runFullSiteCli(["--dry-run", "--actor", ACTOR], state.value)).rejects.toThrow(
      "site_package_ref_missing"
    );
    expect(state.calls.some((call) => call.startsWith("apply:"))).toBe(false);
  });

  test("delegates dry-run/apply with exact takeover and writes safe summaries", async () => {
    for (const [argv, expected] of [
      [["--dry-run", "--file", "site.json", "--actor", ACTOR], "apply:true:false"],
      [
        ["--apply", "--allow-setting-takeover", "--file", "site.json", "--actor", ACTOR],
        "apply:false:true",
      ],
    ] as const) {
      const state = cliDeps();
      await runFullSiteCli(argv, state.value);
      expect(state.calls).toEqual(["read:site.json", expected]);
      expect(JSON.parse(state.output[0]!)).toMatchObject({ ok: true, runId: RUN });
    }
  });

  test("uses the default artifact and rollback never reads or builds a package", async () => {
    const dryRun = cliDeps();
    await runFullSiteCli(["--dry-run", "--actor", ACTOR], dryRun.value);
    expect(dryRun.calls[0]).toBe(`read:${DEFAULT_FORMA_DOM_PACKAGE_PATH}`);

    const rollback = cliDeps();
    await runFullSiteCli(["--rollback", RUN, "--actor", ACTOR], rollback.value);
    expect(rollback.calls).toEqual([`rollback:${RUN}`]);
    expect(JSON.parse(rollback.output[0]!)).toEqual({
      ok: true,
      mode: "rollback",
      runId: RUN,
    });
  });

  test("redacts unsafe service errors and preserves known safe codes", () => {
    expect(safeCliError(new Error("password=secret raw payload"))).toBe(
      '{"ok":false,"error":"site_package_cli_failed"}'
    );
    expect(safeCliError(new Error("site_package_conflict"))).toContain("site_package_conflict");
  });
});

interface LoaderHarnessOptions {
  readonly applyError?: Error;
  readonly rollbackError?: Error;
  readonly closeError?: Error;
  readonly importErrors?: Readonly<Record<string, Error>>;
  readonly delays?: Readonly<Record<string, number>>;
}

function loaderHarness(options: LoaderHarnessOptions = {}) {
  const calls: string[] = [];
  const modules: Readonly<Record<string, unknown>> = {
    database: {
      async closeDatabase() {
        calls.push("close");
        if (options.closeError) throw options.closeError;
      },
    },
    apply: {
      async applyFullSitePackage() {
        calls.push("apply-service");
        if (options.applyError) throw options.applyError;
        return { runId: RUN, resources: [] };
      },
    },
    ledger: { defaultLegacyInstallLedger: Object.freeze({}) },
    resolver: {
      createFullSiteCurrentResourceResolver() {
        calls.push("resolver-create");
        return async () => null;
      },
    },
    rollback: {
      async rollbackFullSiteInstall() {
        calls.push("rollback-service");
        if (options.rollbackError) throw options.rollbackError;
        return { runId: RUN };
      },
    },
  };
  const importer = (async (key: string): Promise<unknown> => {
    calls.push(`import:${key}:start`);
    const delay = options.delays?.[key] ?? 0;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    calls.push(`import:${key}:settled`);
    const importError = options.importErrors?.[key];
    if (importError) throw importError;
    return modules[key];
  }) as FullSiteLoaderImporter;
  const output: string[] = [];
  const errors: string[] = [];
  const sinks: FullSiteLoaderSinks = {
    readPackage: async () => pkg,
    writeOutput: (line) => output.push(line),
    writeError: (line) => errors.push(line),
  };
  return { importer, calls, output, errors, sinks };
}

describe("full-site loader lifecycle", () => {
  test("keeps the loader import-safe and the raw reader independent from package limits", async () => {
    const root = path.resolve(import.meta.dir, "../../..");
    const [loaderSource, cliSource] = await Promise.all([
      readFile(path.join(root, "scripts/load-projekty-domow.tsx"), "utf8"),
      readFile(path.join(root, "scripts/projekty-domow/fullSiteCli.ts"), "utf8"),
    ]);
    expect(loaderSource).toContain("if (import.meta.main)");
    expect(loaderSource).not.toMatch(/^await runFullSiteCli/m);
    expect(cliSource).not.toContain("PACKAGE_LIMITS.fileBytes");
    expect(cliSource).toContain('import { open } from "node:fs/promises";');
    expect(cliSource).not.toContain("readFile(");
    expect(cliSource).toContain("FULL_SITE_PACKAGE_RAW_SOURCE_BYTES");
  });

  test("imports the database first, awaits siblings, executes canonical apply and closes once", async () => {
    const harness = loaderHarness({ delays: { ledger: 10, resolver: 5 } });
    const deps = createFullSiteLoaderDeps(harness.importer, harness.sinks);
    await runFullSiteCli(["--apply", "--actor", ACTOR], deps);
    expect(harness.calls[0]).toBe("import:database:start");
    expect(harness.calls.indexOf("import:database:settled")).toBeLessThan(
      harness.calls.indexOf("import:apply:start")
    );
    expect(harness.calls.indexOf("import:ledger:settled")).toBeLessThan(
      harness.calls.indexOf("apply-service")
    );
    expect(harness.calls.indexOf("resolver-create")).toBeLessThan(
      harness.calls.indexOf("apply-service")
    );
    expect(harness.calls.at(-1)).toBe("close");
    expect(harness.calls.filter((call) => call === "close")).toHaveLength(1);
  });

  test("awaits all launched imports and chooses the first error in declared key order", async () => {
    const first = new Error("site_package_apply_import_failed");
    const second = new Error("site_package_ledger_import_failed");
    const harness = loaderHarness({
      importErrors: { apply: first, ledger: second },
      delays: { apply: 20, resolver: 10 },
    });
    const deps = createFullSiteLoaderDeps(harness.importer, harness.sinks);
    await expect(
      deps.apply({ package: pkg, actorId: ACTOR, dryRun: false, allowSettingTakeover: false })
    ).rejects.toBe(first);
    expect(harness.calls).toContain("import:resolver:settled");
    expect(harness.calls.at(-1)).toBe("close");
  });

  test.each([
    { executeFails: false, closeFails: false, expected: null },
    { executeFails: true, closeFails: false, expected: "site_package_conflict" },
    { executeFails: false, closeFails: true, expected: "site_package_cli_failed" },
    { executeFails: true, closeFails: true, expected: "site_package_conflict" },
  ])(
    "arbitrates execute=$executeFails and close=$closeFails without masking the primary",
    async ({ executeFails, closeFails, expected }) => {
      const primary = new Error("site_package_conflict");
      const harness = loaderHarness({
        applyError: executeFails ? primary : undefined,
        closeError: closeFails ? new Error("private close detail") : undefined,
      });
      const deps = createFullSiteLoaderDeps(harness.importer, harness.sinks);
      const operation = deps.apply({
        package: pkg,
        actorId: ACTOR,
        dryRun: false,
        allowSettingTakeover: false,
      });
      if (expected === null) await expect(operation).resolves.toMatchObject({ runId: RUN });
      else await expect(operation).rejects.toThrow(expected);
      expect(harness.calls.filter((call) => call === "close")).toHaveLength(1);
      if (executeFails) await expect(operation).rejects.toBe(primary);
    }
  );

  test("database import failure has no closer, rollback loads only its declared siblings", async () => {
    const databaseFailure = loaderHarness({
      importErrors: { database: new Error("site_package_database_import_failed") },
    });
    const failedDeps = createFullSiteLoaderDeps(databaseFailure.importer, databaseFailure.sinks);
    await expect(
      failedDeps.apply({
        package: pkg,
        actorId: ACTOR,
        dryRun: false,
        allowSettingTakeover: false,
      })
    ).rejects.toThrow("site_package_database_import_failed");
    expect(databaseFailure.calls).not.toContain("close");

    const rollback = loaderHarness();
    const rollbackDeps = createFullSiteLoaderDeps(rollback.importer, rollback.sinks);
    await rollbackDeps.rollback({ sourceRunId: RUN, actorId: ACTOR });
    expect(rollback.calls).toContain("rollback-service");
    expect(rollback.calls.some((call) => call.startsWith("import:apply"))).toBe(false);
    expect(rollback.calls.some((call) => call.startsWith("import:resolver"))).toBe(false);
    expect(rollback.calls.at(-1)).toBe("close");
  });

  test("main returns stable exit codes and writes only safe JSON", async () => {
    const success = loaderHarness();
    const successDeps = createFullSiteLoaderDeps(success.importer, success.sinks);
    await expect(
      runLoadProjektyDomowMain(["--dry-run", "--actor", ACTOR], successDeps)
    ).resolves.toBe(0);
    expect(JSON.parse(success.output[0]!)).toMatchObject({ ok: true, mode: "dry-run" });
    expect(success.errors).toEqual([]);

    const failure = loaderHarness({ applyError: new Error("password=private") });
    const failureDeps = createFullSiteLoaderDeps(failure.importer, failure.sinks);
    await expect(
      runLoadProjektyDomowMain(["--apply", "--actor", ACTOR], failureDeps)
    ).resolves.toBe(1);
    expect(failure.errors).toEqual(['{"ok":false,"error":"site_package_cli_failed"}']);
    expect(failure.errors.join(" ")).not.toContain("private");
  });
});
