import { constants as fsConstants } from "node:fs";
import { open } from "node:fs/promises";

import { normalizeFullSitePackageForWrite } from "../../core/services/kits/fullSitePackage/normalize";
import { buildReferencePlan } from "../../core/services/kits/fullSitePackage/referenceGraph";
import type { FullSitePackageV1 } from "../../core/services/kits/fullSitePackage/types";
import { toSafeFullSiteErrorCode } from "../../core/services/kits/fullSiteInstallTypes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_FORMA_DOM_PACKAGE_PATH = "_docs/_DEMO/projekty-domow.site.json";
export const FULL_SITE_PACKAGE_RAW_SOURCE_BYTES = 8 * 1024 * 1024;
export const FULL_SITE_PACKAGE_RAW_OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NONBLOCK;

export type FullSiteCliArgs =
  | {
      mode: "dry-run" | "apply";
      actorId: string;
      file: string;
      allowSettingTakeover: boolean;
    }
  | { mode: "rollback"; actorId: string; sourceRunId: string };

export type FullSiteCliDeps = {
  readPackage(path: string): Promise<FullSitePackageV1>;
  apply(input: {
    package: FullSitePackageV1;
    actorId: string;
    dryRun: boolean;
    allowSettingTakeover: boolean;
  }): Promise<{ runId: string; resources: readonly unknown[] }>;
  rollback(input: { sourceRunId: string; actorId: string }): Promise<{ runId: string }>;
  writeOutput(value: string): void;
};

export interface FullSitePackageFileStat {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  isFile(): boolean;
}

export interface FullSitePackageFileHandle {
  stat(options: { readonly bigint: true }): Promise<FullSitePackageFileStat>;
  read(
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number
  ): Promise<Readonly<{ bytesRead: number }>>;
  close(): Promise<void>;
}

export interface FullSitePackageFileDeps {
  open(path: string, flags: number): Promise<FullSitePackageFileHandle>;
}

const DEFAULT_FILE_DEPS: FullSitePackageFileDeps = Object.freeze({
  open: (path: string, flags: number) => open(path, flags) as Promise<FullSitePackageFileHandle>,
});

const fileInvalid = (): Error => new Error("site_package_file_invalid");

const requireUuid = (value: string | undefined, code: string): string => {
  if (!value || !UUID_PATTERN.test(value)) throw new Error(code);
  return value.toLowerCase();
};

export const parseFullSiteCliArgs = (argv: readonly string[]): FullSiteCliArgs => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const valueOptions = new Set(["--actor", "--file", "--rollback"]);
  const flagOptions = new Set(["--dry-run", "--apply", "--allow-setting-takeover"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (flagOptions.has(token)) {
      if (flags.has(token)) throw new Error("site_package_cli_args_invalid");
      flags.add(token);
      continue;
    }
    if (!valueOptions.has(token) || values.has(token)) {
      throw new Error("site_package_cli_args_invalid");
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error("site_package_cli_args_invalid");
    values.set(token, value);
    index += 1;
  }
  const actorId = requireUuid(values.get("--actor"), "site_package_actor_invalid");
  const modes =
    Number(flags.has("--dry-run")) +
    Number(flags.has("--apply")) +
    Number(values.has("--rollback"));
  if (modes !== 1) throw new Error("site_package_cli_mode_invalid");
  if (values.has("--rollback")) {
    if (values.has("--file") || flags.has("--allow-setting-takeover")) {
      throw new Error("site_package_cli_args_invalid");
    }
    return {
      mode: "rollback",
      actorId,
      sourceRunId: requireUuid(values.get("--rollback"), "site_package_source_run_invalid"),
    };
  }
  return {
    mode: flags.has("--dry-run") ? "dry-run" : "apply",
    actorId,
    file: values.get("--file") ?? DEFAULT_FORMA_DOM_PACKAGE_PATH,
    allowSettingTakeover: flags.has("--allow-setting-takeover"),
  };
};

async function openPackageFile(
  filePath: string,
  deps: FullSitePackageFileDeps
): Promise<FullSitePackageFileHandle> {
  try {
    return await deps.open(filePath, FULL_SITE_PACKAGE_RAW_OPEN_FLAGS);
  } catch {
    throw fileInvalid();
  }
}

async function readPackageStat(
  handle: FullSitePackageFileHandle
): Promise<FullSitePackageFileStat> {
  try {
    const stat = await handle.stat({ bigint: true });
    if (
      typeof stat?.isFile !== "function" ||
      ![stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].every(
        (value) => typeof value === "bigint"
      )
    ) {
      throw fileInvalid();
    }
    return stat;
  } catch {
    throw fileInvalid();
  }
}

function assertInitialStat(stat: FullSitePackageFileStat): void {
  let regular = false;
  try {
    regular = stat.isFile() === true;
  } catch {
    throw fileInvalid();
  }
  if (!regular || stat.size < 0n || stat.size > BigInt(FULL_SITE_PACKAGE_RAW_SOURCE_BYTES)) {
    throw fileInvalid();
  }
}

async function readPackageBytes(
  handle: FullSitePackageFileHandle,
  expectedSize: bigint
): Promise<Uint8Array> {
  const limit = Math.min(FULL_SITE_PACKAGE_RAW_SOURCE_BYTES + 1, Number(expectedSize) + 1);
  const buffer = new Uint8Array(limit);
  let offset = 0;
  while (offset < limit) {
    const requested = limit - offset;
    let result: Readonly<{ bytesRead: number }>;
    try {
      result = await handle.read(buffer, offset, requested, offset);
    } catch {
      throw fileInvalid();
    }
    let bytesRead: number;
    try {
      bytesRead = result.bytesRead;
    } catch {
      throw fileInvalid();
    }
    if (!Number.isSafeInteger(bytesRead) || bytesRead < 0 || bytesRead > requested) {
      throw fileInvalid();
    }
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > FULL_SITE_PACKAGE_RAW_SOURCE_BYTES) throw fileInvalid();
  return buffer.subarray(0, offset);
}

function assertStableStat(
  before: FullSitePackageFileStat,
  after: FullSitePackageFileStat,
  bytesRead: number
): void {
  let regular = false;
  try {
    regular = after.isFile() === true;
  } catch {
    throw fileInvalid();
  }
  if (
    !regular ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs ||
    before.ctimeNs !== after.ctimeNs ||
    after.size !== BigInt(bytesRead)
  ) {
    throw fileInvalid();
  }
}

function decodePackageSource(bytes: Uint8Array): string {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (source.includes("\uFFFD")) throw fileInvalid();
    return source;
  } catch {
    throw fileInvalid();
  }
}

function parsePackageSource(source: string): unknown {
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error("site_package_json_invalid");
  }
}

export async function readBoundedFullSitePackage(
  filePath: string,
  deps: FullSitePackageFileDeps = DEFAULT_FILE_DEPS
): Promise<FullSitePackageV1> {
  const handle = await openPackageFile(filePath, deps);
  let outcome:
    Readonly<{ ok: true; value: FullSitePackageV1 }> | Readonly<{ ok: false; error: unknown }>;
  try {
    const before = await readPackageStat(handle);
    assertInitialStat(before);
    const bytes = await readPackageBytes(handle, before.size);
    const after = await readPackageStat(handle);
    assertStableStat(before, after, bytes.byteLength);
    const source = decodePackageSource(bytes);
    outcome = Object.freeze({
      ok: true,
      value: normalizeFullSitePackageForWrite(parsePackageSource(source)),
    });
  } catch (error) {
    outcome = Object.freeze({ ok: false, error });
  }

  let closeFailed = false;
  try {
    await handle.close();
  } catch {
    closeFailed = true;
  }
  if (!outcome.ok) throw outcome.error;
  if (closeFailed) throw fileInvalid();
  return outcome.value;
}

export const runFullSiteCli = async (
  argv: readonly string[],
  deps: FullSiteCliDeps
): Promise<void> => {
  const args = parseFullSiteCliArgs(argv);
  if (args.mode === "rollback") {
    const result = await deps.rollback({
      sourceRunId: args.sourceRunId,
      actorId: args.actorId,
    });
    deps.writeOutput(JSON.stringify({ ok: true, mode: "rollback", runId: result.runId }));
    return;
  }
  const pkg = await deps.readPackage(args.file);
  buildReferencePlan(pkg);
  const result = await deps.apply({
    package: pkg,
    actorId: args.actorId,
    dryRun: args.mode === "dry-run",
    allowSettingTakeover: args.allowSettingTakeover,
  });
  deps.writeOutput(
    JSON.stringify({
      ok: true,
      mode: args.mode,
      runId: result.runId,
      resourceCount: result.resources.length,
    })
  );
};

export const safeCliError = (error: unknown): string =>
  JSON.stringify({
    ok: false,
    error: toSafeFullSiteErrorCode(error, "site_package_cli_failed"),
  });
