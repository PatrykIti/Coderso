import { readFile, stat } from "node:fs/promises";

import { normalizeFullSitePackageForWrite } from "../../core/services/kits/fullSitePackage/normalize";
import {
  PACKAGE_LIMITS,
  type FullSitePackageV1,
} from "../../core/services/kits/fullSitePackage/types";
import { toSafeFullSiteErrorCode } from "../../core/services/kits/fullSiteInstallTypes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_FORMA_DOM_PACKAGE_PATH = "_docs/_DEMO/projekty-domow.site.json";

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
  }): Promise<{ runId: string; resources: unknown[] }>;
  rollback(input: { sourceRunId: string; actorId: string }): Promise<{ runId: string }>;
  writeOutput(value: string): void;
};

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

export const readBoundedFullSitePackage = async (filePath: string): Promise<FullSitePackageV1> => {
  const metadata = await stat(filePath);
  if (!metadata.isFile() || metadata.size > PACKAGE_LIMITS.fileBytes) {
    throw new Error("site_package_file_invalid");
  }
  const source = await readFile(filePath, "utf8");
  if (new TextEncoder().encode(source).byteLength > PACKAGE_LIMITS.fileBytes) {
    throw new Error("site_package_file_invalid");
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("site_package_json_invalid");
  }
  return normalizeFullSitePackageForWrite(value);
};

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
