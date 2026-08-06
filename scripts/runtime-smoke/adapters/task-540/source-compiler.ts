import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SmokeError } from "../../contracts";
import {
  TASK540_BRIDGE_INPUT_READER as BRIDGE_INPUT_READER,
  TASK540_BRIDGE_OUTPUT_WRITER as BRIDGE_OUTPUT_WRITER,
  type Task540SourceEntry,
} from "./source-catalog";

export const TASK540_SOURCE_INPUT_SLOT_KEY =
  "coderso.runtime-smoke.task-540.bridge-input.v1" as const;

const ORIGINAL_INPUT_STATEMENT = "const raw = await new Response(Bun.stdin.stream()).text();";
const REPLACEMENT_INPUT_STATEMENT = `const raw = globalThis[Symbol.for(${JSON.stringify(
  TASK540_SOURCE_INPUT_SLOT_KEY
)})];`;
const REPLACEMENT_OUTPUT_STATEMENT = "export default canonical(output);";
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const IMPORT_LINE = /^import (.+) from "([^"]+)";$/u;
const NAMED_IMPORT_BINDING =
  /^\{\s*[A-Za-z_$][A-Za-z0-9_$]*(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?(?:\s*,\s*[A-Za-z_$][A-Za-z0-9_$]*(?:\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*)?)*\s*\}$/u;

const ALLOWED_CORE_IMPORTS = new Set([
  "./db/client.ts",
  "./db/schema.ts",
  "./server/validation/schemaValidator.ts",
  "./services/admin/rolesService.ts",
  "./services/admin/usersService.ts",
  "./services/auth/password.ts",
  "./services/auth/userService.ts",
  "./services/customScreens/customScreenSchemas.ts",
  "./services/media/storage/adapter.ts",
  "./services/security/piiEmail.ts",
  "./services/settings/securitySettings.ts",
  "./services/settings/storageSettings.ts",
  "./services/settings/userSettingsService.ts",
]);

export interface CompiledTask540Source {
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly moduleSource: string;
  readonly coreRoot: string;
  readonly databaseClientUrl: string;
  readonly rewrittenImports: readonly Readonly<{
    originalSpecifier: string;
    canonicalSpecifier: string;
  }>[];
}

function countOccurrences(value: string, needle: string): number {
  let count = 0;
  let offset = 0;
  while (offset <= value.length) {
    const found = value.indexOf(needle, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + needle.length;
  }
  return count;
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

async function canonicalCoreRoot(coreRoot: string): Promise<string> {
  if (!isAbsolute(coreRoot) || resolve(coreRoot) !== coreRoot || coreRoot.includes("\0")) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 core root is not canonical");
  }
  const canonical = await realpath(coreRoot);
  if (canonical !== coreRoot) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 core root contains a symlink");
  }
  return canonical;
}

async function resolveCoreImport(coreRoot: string, specifier: string): Promise<string> {
  if (!ALLOWED_CORE_IMPORTS.has(specifier)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source import is not allowlisted");
  }
  const target = await realpath(join(coreRoot, specifier.slice(2)));
  if (!isWithin(coreRoot, target)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source import escapes core");
  }
  return pathToFileURL(target).href;
}

async function resolveDrizzleImport(coreRoot: string): Promise<string> {
  const requireFromCore = createRequire(pathToFileURL(join(coreRoot, "package.json")));
  const target = await realpath(requireFromCore.resolve("drizzle-orm"));
  return pathToFileURL(target).href;
}

function assertSourceEnvelope(entry: Task540SourceEntry): void {
  const { source } = entry;
  if (
    typeof source !== "string" ||
    source.length === 0 ||
    Buffer.byteLength(source) > MAX_SOURCE_BYTES ||
    source.includes("\0") ||
    createHash("sha256").update(source).digest("hex") !== entry.sourceSha256 ||
    !source.startsWith(BRIDGE_INPUT_READER) ||
    !source.endsWith(BRIDGE_OUTPUT_WRITER) ||
    countOccurrences(source, ORIGINAL_INPUT_STATEMENT) !== 1 ||
    countOccurrences(source, BRIDGE_OUTPUT_WRITER) !== 1 ||
    countOccurrences(source, "Bun.stdin") !== 1 ||
    countOccurrences(source, "Bun.stdout") !== 1 ||
    countOccurrences(source, "process.exit(0)") !== 1 ||
    source.includes(TASK540_SOURCE_INPUT_SLOT_KEY) ||
    /\bexport\s/u.test(source) ||
    /\bimport\s*\(/u.test(source) ||
    /\brequire\s*\(/u.test(source)
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source shape drifted");
  }
}

export async function compileTask540BridgeSource(
  entry: Task540SourceEntry,
  coreRoot: string
): Promise<CompiledTask540Source> {
  assertSourceEnvelope(entry);
  const canonicalRoot = await canonicalCoreRoot(coreRoot);
  let moduleSource = entry.source;
  const rewrittenImports: Array<{
    readonly originalSpecifier: string;
    readonly canonicalSpecifier: string;
  }> = [];
  let importCount = 0;
  for (const line of entry.source.split("\n")) {
    if (!line.startsWith("import")) continue;
    importCount += 1;
    const match = line.match(IMPORT_LINE);
    if (match === null) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source import shape drifted");
    }
    const [, binding, originalSpecifier] = match;
    let canonicalSpecifier: string;
    if (originalSpecifier === "node:path") {
      if (binding !== "path") {
        throw new SmokeError("smoke_output_invalid", "TASK-540 builtin import shape drifted");
      }
      canonicalSpecifier = originalSpecifier;
    } else {
      if (!NAMED_IMPORT_BINDING.test(binding)) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 named import shape drifted");
      }
      canonicalSpecifier =
        originalSpecifier === "drizzle-orm"
          ? await resolveDrizzleImport(canonicalRoot)
          : await resolveCoreImport(canonicalRoot, originalSpecifier);
    }
    const replacement = `import ${binding} from ${JSON.stringify(canonicalSpecifier)};`;
    if (countOccurrences(moduleSource, line) !== 1) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 source import is ambiguous");
    }
    moduleSource = moduleSource.replace(line, replacement);
    rewrittenImports.push(Object.freeze({ originalSpecifier, canonicalSpecifier }));
  }
  if (importCount === 0 || countOccurrences(entry.source, "\nimport ") !== importCount) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source import boundary drifted");
  }
  moduleSource = moduleSource.replace(ORIGINAL_INPUT_STATEMENT, REPLACEMENT_INPUT_STATEMENT);
  moduleSource = moduleSource.slice(0, -BRIDGE_OUTPUT_WRITER.length) + REPLACEMENT_OUTPUT_STATEMENT;
  if (
    moduleSource.includes("Bun.stdin") ||
    moduleSource.includes("Bun.stdout") ||
    moduleSource.includes("process.exit(0)") ||
    countOccurrences(moduleSource, REPLACEMENT_INPUT_STATEMENT) !== 1 ||
    !moduleSource.endsWith(REPLACEMENT_OUTPUT_STATEMENT)
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 source compilation drifted");
  }
  const databaseClientUrl = await resolveCoreImport(canonicalRoot, "./db/client.ts");
  return Object.freeze({
    sourceId: entry.sourceId,
    sourceSha256: entry.sourceSha256,
    moduleSource,
    coreRoot: canonicalRoot,
    databaseClientUrl,
    rewrittenImports: Object.freeze(rewrittenImports),
  });
}
