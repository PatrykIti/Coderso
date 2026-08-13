// TASK-545 smoke evidence manifest: strict versioned envelope schema, bounded
// fail-closed validation, canonical Git-bound working-tree revision, pure
// manifest projection, and the read-only evidence audit driver. Environment-
// neutral ESM (no repo/runtime/server/DB dependency) so Node and Bun unit tests
// import it directly; the nested manifest/scenario/variant/assertion/screenshot
// validators here are the single schema owner for every manifest-bearing suite.
// `_docs/_workflows/` is globally ignored; this file lands through the owner's
// explicit force-track/review handoff with `git ls-files`/`git show HEAD` byte
// parity proof before dependents import it. Errors are machine-readable and
// never carry manifest raw content, file bodies, or environment values.

import { execFileSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const SMOKE_MANIFEST_SCHEMA_VERSION = 1;
export const SMOKE_CHECKPOINT_SCHEMA_VERSION = 1;
// Bounded evidence ingestion caps: manifest/report bytes before JSON parsing,
// then string/array counts and each screenshot byte size before hashing.
export const MAX_MANIFEST_BYTES = 1_048_576; // 1 MiB, mirrors the runner report cap
export const MAX_REPORT_BYTES = 1_048_576;
export const MAX_SCREENSHOT_BYTES = 8_388_608; // 8 MiB
export const MAX_STRING_CHARS = 10_000;
export const MAX_PATH_CHARS = 2_048;
export const MIN_MANIFEST_SCENARIOS = 5;
export const MAX_SCENARIOS = 512;
export const MAX_VARIANTS_PER_SCENARIO = 64;
export const MAX_ASSERTIONS_PER_VARIANT = 256;
export const MAX_CONSOLE_ERRORS_PER_VARIANT = 64;
export const MAX_SCREENSHOTS_PER_SCENARIO = 128;

const PROFILE_IDS = new Set(["fast", "certification"]);
const SURFACES = new Set(["admin", "public"]);
const THEMES = new Set(["light", "dark"]);
const ASSERTION_KINDS = new Set(["computed-style", "geometry", "dom-state", "aria"]);
const SESSION_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const GENERATED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u;

export class SmokeEvidenceError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "SmokeEvidenceError";
    this.code = code;
    this.label = label;
    this.detail = detail;
  }
}

function fail(code, label, detail) {
  throw new SmokeEvidenceError(code, label, detail);
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortCanonical(value[key]);
    return out;
  }
  return value;
}

// Canonical JSON (sorted keys, no insignificant whitespace): the authoritative
// byte form for manifest/report equality and persisted manifest files.
export function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function isLowercaseHex(value, length) {
  return typeof value === "string" && value.length === length && /^[0-9a-f]+$/u.test(value);
}

export function timingSafeEqualHex(actual, expected) {
  if (!isLowercaseHex(actual, 64) || !isLowercaseHex(expected, 64)) fail("smoke_hash_invalid", "hash", "grammar");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

// Task IDs are exactly TASK-[0-9]{3} plus the sole reserved TASK-9999 sentinel.
export function requireRepoTaskId(taskId) {
  if (typeof taskId !== "string" || (!/^TASK-[0-9]{3}$/u.test(taskId) && taskId !== "TASK-9999")) {
    fail("smoke_task_id_invalid", "task", "grammar");
  }
  return taskId;
}

export function requireRuntimeSmokeSessionName(session) {
  if (
    typeof session !== "string" ||
    !SESSION_PATTERN.test(session) ||
    /[./\\]/u.test(session) ||
    /[\u0000-\u001f\u007f]/u.test(session)
  ) {
    fail("smoke_session_invalid", "session", "grammar");
  }
  return session;
}

export function requireExactKeys(value, expected, label) {
  if (!isPlainRecord(value)) fail("smoke_schema_invalid", label, "not_record");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("smoke_schema_invalid", label, "unknown_or_missing_fields");
  }
  return value;
}

function requireBoundedString(value, label, max = MAX_STRING_CHARS) {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    fail("smoke_schema_invalid", label, "string");
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) fail("smoke_schema_invalid", label, "control");
  return value;
}

function requireBoundedArray(value, label, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail("smoke_schema_invalid", label, "array_bounds");
  }
  return value;
}

function requireUniqueIds(items, kind) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      fail(kind === "scenario" ? "smoke_scenario_duplicate" : "smoke_variant_duplicate", `${kind}s`, item.id);
    }
    seen.add(item.id);
  }
}

// Repository-relative evidence paths: normalized, no traversal, no absolute
// path, no backslashes, no control characters, no empty segments.
export function requireSafeRepoRelativePath(value, label) {
  if (
    value.length === 0 ||
    value.charCodeAt(0) === 47 ||
    value.includes("\\") ||
    value.includes("\0") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    fail("smoke_path_invalid", label, "unsafe");
  }
  for (const segment of value.split("/")) {
    if (segment.length === 0 || segment === "." || segment === "..") fail("smoke_path_invalid", label, "unsafe");
  }
  return value;
}

function validateViewport(value) {
  requireExactKeys(value, ["width", "height"], "viewport");
  if (
    !Number.isSafeInteger(value.width) || value.width < 1 || value.width > 16_384 ||
    !Number.isSafeInteger(value.height) || value.height < 1 || value.height > 16_384
  ) {
    fail("smoke_variant_invalid", "viewport", "dimensions");
  }
  return Object.freeze({ width: value.width, height: value.height });
}

export function validateStrictAssertion(value) {
  requireExactKeys(value, ["kind", "target", "property", "expected", "actual", "pass"], "assertion");
  if (!ASSERTION_KINDS.has(value.kind)) fail("smoke_assertion_invalid", "assertion.kind", "enum");
  requireBoundedString(value.target, "assertion.target");
  requireBoundedString(value.property, "assertion.property");
  requireBoundedString(value.expected, "assertion.expected");
  requireBoundedString(value.actual, "assertion.actual");
  if (typeof value.pass !== "boolean") fail("smoke_assertion_invalid", "assertion.pass", "boolean");
  return Object.freeze({
    kind: value.kind,
    target: value.target,
    property: value.property,
    expected: value.expected,
    actual: value.actual,
    pass: value.pass,
  });
}

export function validateStrictVariant(value) {
  requireExactKeys(value, ["id", "surface", "theme", "viewport", "assertions", "consoleErrors"], "variant");
  const id = requireBoundedString(value.id, "variant.id", 256);
  if (!KEBAB_PATTERN.test(id)) fail("smoke_variant_invalid", "variant.id", "grammar");
  if (!SURFACES.has(value.surface)) fail("smoke_variant_invalid", "variant.surface", "enum");
  if (!THEMES.has(value.theme)) fail("smoke_variant_invalid", "variant.theme", "enum");
  const viewport = validateViewport(value.viewport);
  const assertions = requireBoundedArray(value.assertions, "variant.assertions", 1, MAX_ASSERTIONS_PER_VARIANT).map(
    validateStrictAssertion
  );
  if (!assertions.every((assertion) => assertion.pass === true)) {
    fail("smoke_assertion_failed", "variant.assertions", "pass");
  }
  const consoleErrors = requireBoundedArray(value.consoleErrors, "variant.consoleErrors", 0, MAX_CONSOLE_ERRORS_PER_VARIANT);
  if (consoleErrors.length !== 0) fail("smoke_console_errors", "variant.consoleErrors", "nonempty");
  return Object.freeze({ id, surface: value.surface, theme: value.theme, viewport, assertions, consoleErrors });
}

export function validateStrictScreenshot(value) {
  requireExactKeys(value, ["path", "sha256"], "screenshot");
  const path = requireBoundedString(value.path, "screenshot.path", MAX_PATH_CHARS);
  requireSafeRepoRelativePath(path, "screenshot.path");
  if (!isLowercaseHex(value.sha256, 64)) fail("smoke_hash_invalid", "screenshot.sha256", "grammar");
  return Object.freeze({ path, sha256: value.sha256 });
}

function requireScenarioId(value) {
  const id = requireBoundedString(value, "scenario.id", 256);
  if (!KEBAB_PATTERN.test(id)) fail("smoke_scenario_invalid", "scenario.id", "grammar");
  return id;
}

// Report-side strict manifestable scenario: the generic SmokeScenarioResult
// gains optional strict title/variants/screenshots; manifest-bearing suites
// must provide all three and `pass` must be exactly true.
export function validateStrictManifestableScenario(value) {
  requireExactKeys(value, ["id", "pass", "elapsedMs", "title", "variants", "screenshots"], "scenario");
  const id = requireScenarioId(value.id);
  if (value.pass !== true) fail("smoke_scenario_not_passed", "scenario.pass", "not_true");
  if (!Number.isSafeInteger(value.elapsedMs) || value.elapsedMs < 0) {
    fail("smoke_schema_invalid", "scenario.elapsedMs", "number");
  }
  const title = requireBoundedString(value.title, "scenario.title");
  const variants = requireBoundedArray(value.variants, "scenario.variants", 1, MAX_VARIANTS_PER_SCENARIO).map(
    validateStrictVariant
  );
  requireUniqueIds(variants, "variant");
  const screenshots = requireBoundedArray(value.screenshots, "scenario.screenshots", 1, MAX_SCREENSHOTS_PER_SCENARIO).map(
    validateStrictScreenshot
  );
  return Object.freeze({ id, pass: true, elapsedMs: value.elapsedMs, title, variants, screenshots });
}

// Manifest-side scenario: the persisted manifest omits runtime-only
// `elapsedMs` and the scenario-level `pass` bit (pass is enforced separately
// by requireEveryScenarioPassed against the runner report).
export function validateManifestScenario(value) {
  requireExactKeys(value, ["id", "title", "variants", "screenshots"], "scenario");
  const id = requireScenarioId(value.id);
  const title = requireBoundedString(value.title, "scenario.title");
  const variants = requireBoundedArray(value.variants, "scenario.variants", 1, MAX_VARIANTS_PER_SCENARIO).map(
    validateStrictVariant
  );
  requireUniqueIds(variants, "variant");
  const screenshots = requireBoundedArray(value.screenshots, "scenario.screenshots", 1, MAX_SCREENSHOTS_PER_SCENARIO).map(
    validateStrictScreenshot
  );
  return Object.freeze({ id, title, variants, screenshots });
}

export function validateReportRef(value) {
  requireExactKeys(value, ["path", "sha256"], "report");
  const path = requireBoundedString(value.path, "report.path", MAX_PATH_CHARS);
  requireSafeRepoRelativePath(path, "report.path");
  if (!isLowercaseHex(value.sha256, 64)) fail("smoke_hash_invalid", "report.sha256", "grammar");
  return Object.freeze({ path, sha256: value.sha256 });
}

export function validateRevision(value) {
  requireExactKeys(value, ["gitHead", "workingTreeDirty", "workingTreeSha256"], "revision");
  if (!isLowercaseHex(value.gitHead, 40)) fail("smoke_revision_invalid", "revision.gitHead", "grammar");
  if (typeof value.workingTreeDirty !== "boolean") {
    fail("smoke_revision_invalid", "revision.workingTreeDirty", "boolean");
  }
  if (!isLowercaseHex(value.workingTreeSha256, 64)) {
    fail("smoke_revision_invalid", "revision.workingTreeSha256", "grammar");
  }
  return Object.freeze({
    gitHead: value.gitHead,
    workingTreeDirty: value.workingTreeDirty,
    workingTreeSha256: value.workingTreeSha256,
  });
}

export function validateGeneratedAt(value) {
  if (typeof value !== "string" || !GENERATED_AT_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    fail("smoke_schema_invalid", "generatedAt", "iso_utc");
  }
  return value;
}

function requireAdminThemeCoverage(scenarios) {
  const adminThemes = new Set();
  for (const scenario of scenarios) {
    for (const variant of scenario.variants) {
      if (variant.surface === "admin") adminThemes.add(variant.theme);
    }
  }
  if (adminThemes.size > 0 && !(adminThemes.has("light") && adminThemes.has("dark"))) {
    fail("smoke_admin_theme_coverage_missing", "manifest.scenarios", "admin_light_dark");
  }
}

// Full manifest envelope validation: exact keys, version, required fields,
// bounded caps, nested scenario/variant/assertion/screenshot validation, unique
// ids, hash grammar, all assertions passing, zero console errors, server up,
// and Admin light+dark coverage. Returns a deep-frozen normalized manifest or
// throws a machine-readable SmokeEvidenceError; unknown-version, malformed, and
// corrupt manifests fail closed here.
export function validateSmokeEvidenceManifest(value) {
  requireExactKeys(
    value,
    ["schemaVersion", "taskId", "suiteId", "profile", "session", "report", "revision", "generatedAt", "serverUp", "scenarios"],
    "manifest"
  );
  if (value.schemaVersion !== SMOKE_MANIFEST_SCHEMA_VERSION) {
    fail("smoke_manifest_version_unknown", "manifest.schemaVersion", `version=${String(value.schemaVersion)}`);
  }
  const taskId = requireRepoTaskId(value.taskId);
  const suiteId = requireBoundedString(value.suiteId, "manifest.suiteId", 128);
  if (!KEBAB_PATTERN.test(suiteId)) fail("smoke_schema_invalid", "manifest.suiteId", "grammar");
  if (!PROFILE_IDS.has(value.profile)) fail("smoke_schema_invalid", "manifest.profile", "enum");
  const session = requireRuntimeSmokeSessionName(value.session);
  const report = validateReportRef(value.report);
  const revision = validateRevision(value.revision);
  const generatedAt = validateGeneratedAt(value.generatedAt);
  if (value.serverUp !== true) fail("smoke_server_down", "manifest.serverUp", "not_true");
  const scenarios = requireBoundedArray(value.scenarios, "manifest.scenarios", MIN_MANIFEST_SCENARIOS, MAX_SCENARIOS).map(
    validateManifestScenario
  );
  requireUniqueIds(scenarios, "scenario");
  requireAdminThemeCoverage(scenarios);
  return Object.freeze({
    schemaVersion: SMOKE_MANIFEST_SCHEMA_VERSION,
    taskId,
    suiteId,
    profile: value.profile,
    session,
    report,
    revision,
    generatedAt,
    serverUp: true,
    scenarios,
  });
}

// Pure projection of a strict report scenario into the manifest shape: drops
// only `elapsedMs` and the scenario-level `pass` bit (enforced separately by
// requireEveryScenarioPassed against the report).
export function projectManifestableScenarioWithoutElapsedMs(scenario) {
  const strict = validateStrictManifestableScenario(scenario);
  return Object.freeze({
    id: strict.id,
    title: strict.title,
    variants: strict.variants,
    screenshots: strict.screenshots,
  });
}

// Ordered union of scenario-owned screenshots; a screenshot belongs to exactly
// one scenario, so any repeated path is duplicate ownership.
export function uniqueScenarioScreenshotUnion(scenarios) {
  const seen = new Set();
  const out = [];
  for (const scenario of scenarios) {
    for (const shot of scenario.screenshots) {
      if (seen.has(shot.path)) fail("smoke_screenshot_duplicate_ownership", "scenario.screenshots", shot.path);
      seen.add(shot.path);
      out.push(shot);
    }
  }
  return out;
}

export function requireCanonicalByteEquality(actual, expected, code, label) {
  if (canonicalJson(actual) !== canonicalJson(expected)) fail(code, label, "bytes");
}

export function requireEveryScenarioPassed(scenarios) {
  for (const scenario of scenarios) {
    if (scenario.pass !== true) fail("smoke_scenario_not_passed", "report.scenarios", String(scenario.id));
  }
}

export function requireExactOrderedIds(actual, expected, label) {
  if (actual.length !== expected.length) fail("smoke_manifest_report_evidence_mismatch", label, "count");
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index].id !== expected[index].id) fail("smoke_manifest_report_evidence_mismatch", label, `index=${index}`);
  }
}

// Byte-exact manifest/report equality: exact ordered scenario ids, every report
// scenario passing, deep byte-equivalent projected scenarios (title, variants,
// assertions, console arrays, scenario screenshots), and the exact global
// screenshot union. Missing report evidence, manifest-only evidence, duplicate
// ownership, or any difference fails before filesystem screenshot hashing.
export function requireManifestEqualsRunnerReport(manifest, report) {
  if (!isPlainRecord(report) || !Array.isArray(report.scenarios) || !Array.isArray(report.screenshots)) {
    fail("smoke_report_invalid", "report", "shape");
  }
  const scenarios = report.scenarios.map(validateStrictManifestableScenario);
  requireEveryScenarioPassed(scenarios);
  requireExactOrderedIds(manifest.scenarios, scenarios, "scenarios");
  requireCanonicalByteEquality(
    manifest.scenarios,
    scenarios.map(projectManifestableScenarioWithoutElapsedMs),
    "smoke_manifest_report_evidence_mismatch",
    "scenarios"
  );
  requireCanonicalByteEquality(
    uniqueScenarioScreenshotUnion(manifest.scenarios),
    report.screenshots.map(validateStrictScreenshot),
    "smoke_manifest_report_screenshot_mismatch",
    "screenshots"
  );
}

export function requireRegisteredRuntimeSmokeIdentity({ suiteId, profile, session, expectedSuite, expectedProfile, expectedSession }) {
  if (suiteId !== expectedSuite) fail("smoke_suite_mismatch", "identity", "suite");
  if (profile !== expectedProfile) fail("smoke_profile_mismatch", "identity", "profile");
  if (session !== expectedSession) fail("smoke_session_mismatch", "identity", "session");
  if (!PROFILE_IDS.has(profile)) fail("smoke_profile_invalid", "identity", "enum");
  requireRuntimeSmokeSessionName(session);
}

export function publicRevision(revision) {
  return Object.freeze({
    gitHead: revision.gitHead,
    workingTreeDirty: revision.workingTreeDirty,
    workingTreeSha256: revision.workingTreeSha256,
  });
}

export function revisionEquals(left, right) {
  return canonicalJson(publicRevision(left)) === canonicalJson(publicRevision(right));
}

export function isStrictDescendant(root, candidate) {
  const rel = relative(root, candidate);
  if (rel === "" || rel === "." || rel.startsWith("..") || isAbsolute(rel)) return false;
  if (rel.split(sep).includes("..")) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Git-bound helpers
// ---------------------------------------------------------------------------

function git(repoRoot, args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch (error) {
    fail("smoke_git_failed", "git", args[0] ?? "run");
  }
}

export async function requireRealGitTopLevel(repoRoot) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) fail("smoke_repository_invalid", "repoRoot", "missing");
  const realRoot = await realpath(repoRoot);
  const top = git(realRoot, ["rev-parse", "--show-toplevel"]).trim();
  if (top.length === 0) fail("smoke_repository_invalid", "repoRoot", "top_level");
  return realpath(top);
}

async function rejectSymlinkedExistingComponents(root, expected) {
  const rel = relative(root, expected);
  const parts = rel.split(sep).filter((part) => part.length > 0);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) fail("smoke_path_symlink", "evidence", relative(root, current));
    } catch (error) {
      if (error.code === "ENOENT") return; // remaining components do not exist yet
      throw error;
    }
  }
}

// Derives the canonical evidence directory from the real Git top level, the
// task ID, and the report-bound session. Callers cannot supply an evidence
// root; traversal, symlinked components, and alternate same-basename roots are
// rejected by construction.
export async function resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession) {
  requireRepoTaskId(expectedTask);
  requireRuntimeSmokeSessionName(expectedSession);
  const realRepoRoot = await requireRealGitTopLevel(repoRoot);
  const expected = join(realRepoRoot, "_docs", "_workflows", "_smoke", "evidence", expectedTask.toLowerCase(), expectedSession);
  await rejectSymlinkedExistingComponents(realRepoRoot, expected);
  return expected;
}

export async function readExactGitHead(repoRoot) {
  const head = git(repoRoot, ["rev-parse", "HEAD"]).trim();
  if (!isLowercaseHex(head, 40)) fail("smoke_revision_invalid", "gitHead", "grammar");
  return head;
}

// `git status --porcelain=v1 -z` records. Rename/copy entries emit the source
// path as a separate NUL token followed by the destination; only the
// destination participates in the canonical revision stream.
export async function readPorcelainRecords(repoRoot, { includeUntracked = false } = {}) {
  const args = ["status", "--porcelain=v1", "-z"];
  if (includeUntracked) args.push("--untracked-files=all");
  const raw = git(repoRoot, args);
  const tokens = raw.split("\0").filter((token) => token.length > 0);
  const records = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.length < 4) fail("smoke_repository_invalid", "porcelain", "record");
    const status = token.slice(0, 2);
    const path = token.slice(3);
    if (status[0] === "R" || status[0] === "C") {
      index += 1;
      const destination = tokens[index];
      if (destination === undefined) fail("smoke_repository_invalid", "porcelain", "rename_destination");
      records.push({ status: status[0], path: destination });
    } else {
      records.push({ status: status[0], path });
    }
    index += 1;
  }
  return records;
}

// Bounded canonical status records: status, normalized repository-relative
// path, mode, and content hash (or deletion marker). Symlinks hash their target
// text; the manifest's own evidence directory is excluded from the revision.
export async function canonicalStatusRecords(records, { repoRoot, excludeStrictDescendant } = {}) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    fail("smoke_repository_invalid", "repoRoot", "missing");
  }
  const out = [];
  for (const record of records) {
    const abs = resolve(repoRoot, record.path);
    if (excludeStrictDescendant !== undefined && isStrictDescendant(excludeStrictDescendant, abs)) {
      continue;
    }
    let mode;
    let contentHash;
    try {
      const entry = await lstat(abs);
      mode = (entry.mode & 0o7777).toString(8).padStart(6, "0");
      if (entry.isSymbolicLink()) {
        contentHash = `link:${await readlink(abs)}`;
      } else if (entry.isFile()) {
        contentHash = sha256(await readFile(abs));
      } else {
        fail("smoke_repository_invalid", record.path, "not_regular_or_symlink");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        mode = "000000";
        contentHash = "DELETED";
      } else {
        throw error;
      }
    }
    out.push({ status: record.status, path: record.path, mode, contentHash });
  }
  return out;
}

export async function canonicalRevisionStream(gitHead, records, { repoRoot, excludeStrictDescendant } = {}) {
  const canonical = await canonicalStatusRecords(records, { repoRoot, excludeStrictDescendant });
  const lines = canonical
    .map((record) => `${record.status}\0${record.path}\0${record.mode}\0${record.contentHash}`)
    .sort();
  return `${gitHead}\0${lines.join("\0")}`;
}

export async function computeWorkingTreeRevision(repoRoot, expectedTask, expectedSession) {
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  const gitHead = await readExactGitHead(repoRoot);
  const records = await readPorcelainRecords(repoRoot, { includeUntracked: true });
  const outsideEvidence = await canonicalStatusRecords(records, { repoRoot, excludeStrictDescendant: evidenceRoot });
  const canonical = await canonicalRevisionStream(gitHead, records, { repoRoot, excludeStrictDescendant: evidenceRoot });
  return {
    gitHead,
    workingTreeDirty: outsideEvidence.length > 0,
    workingTreeSha256: sha256(canonical),
    records: outsideEvidence,
  };
}

// ---------------------------------------------------------------------------
// Evidence directory audit
// ---------------------------------------------------------------------------

async function requireExactRegularFile(path) {
  try {
    const entry = await lstat(path);
    if (!entry.isFile() || entry.isSymbolicLink()) fail("smoke_evidence_file_invalid", path, "not_regular");
  } catch (error) {
    if (error.code === "ENOENT") fail("smoke_evidence_file_missing", path, "missing");
    throw error;
  }
}

async function readCappedJsonFile(path, maxBytes, code, label) {
  await requireExactRegularFile(path);
  let entry;
  try {
    entry = await stat(path);
  } catch (error) {
    if (error.code === "ENOENT") fail(code, label, "missing");
    throw error;
  }
  if (entry.size > maxBytes) fail(code, label, `size=${entry.size}`);
  const text = await readFile(path, "utf8");
  if (Buffer.byteLength(text, "utf8") > maxBytes) fail(code, label, "size");
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("smoke_json_invalid", label, "parse");
  }
}

async function verifyScenarioScreenshots(root, manifest) {
  const referenced = ["manifest.json", "report.json"];
  const seen = new Set(referenced);
  for (const scenario of manifest.scenarios) {
    for (const shot of scenario.screenshots) {
      const resolved = resolve(root, shot.path);
      if (!isStrictDescendant(root, resolved)) fail("smoke_path_escape", "screenshot", shot.path);
      await requireExactRegularFile(resolved);
      const bytes = await readFile(resolved);
      if (bytes.length > MAX_SCREENSHOT_BYTES) fail("smoke_screenshot_too_large", shot.path, `size=${bytes.length}`);
      if (!timingSafeEqualHex(sha256(bytes), shot.sha256)) fail("smoke_hash_mismatch", shot.path, "bytes");
      if (seen.has(shot.path)) fail("smoke_screenshot_duplicate", "screenshot", shot.path);
      seen.add(shot.path);
      referenced.push(shot.path);
    }
  }
  return referenced.sort();
}

// Canonical read-only driver. Reads the strict manifest from the canonical
// evidence directory, verifies schema/caps/version, identity and revision
// equality, the byte-exact shared-runner report, and every screenshot hash.
export async function validateSmokeEvidence(options) {
  requireExactKeys(
    options,
    ["repoRoot", "expectedTask", "expectedSuite", "expectedProfile", "expectedSession", "expectedRevision"],
    "validateSmokeEvidence"
  );
  const { repoRoot, expectedTask, expectedSuite, expectedProfile, expectedSession, expectedRevision } = options;
  requireRepoTaskId(expectedTask);
  requireRuntimeSmokeSessionName(expectedSession);
  if (!isPlainRecord(expectedRevision)) fail("smoke_revision_invalid", "expectedRevision", "shape");
  const root = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  const manifestPath = join(root, "manifest.json");
  const raw = await readCappedJsonFile(manifestPath, MAX_MANIFEST_BYTES, "smoke_manifest_too_large", "manifest");
  const manifest = validateSmokeEvidenceManifest(raw);
  if (manifest.taskId !== expectedTask) fail("smoke_task_manifest_mismatch", "manifest.taskId", "task");
  requireRegisteredRuntimeSmokeIdentity({
    suiteId: manifest.suiteId,
    profile: manifest.profile,
    session: manifest.session,
    expectedSuite,
    expectedProfile,
    expectedSession,
  });
  if (!revisionEquals(manifest.revision, expectedRevision)) fail("smoke_revision_mismatch", "revision", "bytes");
  const reportPath = join(root, manifest.report.path);
  const report = await readCappedJsonFile(reportPath, MAX_REPORT_BYTES, "smoke_report_too_large", "report");
  if (!timingSafeEqualHex(sha256(await readFile(reportPath)), manifest.report.sha256)) {
    fail("smoke_hash_mismatch", "report.sha256", "bytes");
  }
  requireManifestEqualsRunnerReport(manifest, report);
  const referencedFiles = await verifyScenarioScreenshots(root, manifest);
  return Object.freeze({
    pass: true,
    taskId: manifest.taskId,
    suiteId: manifest.suiteId,
    profile: manifest.profile,
    session: manifest.session,
    revision: manifest.revision,
    scenarios: manifest.scenarios.length,
    referencedFiles,
  });
}

export async function enumerateRegularFilesNoSymlinks(dir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const abs = join(current, entry.name);
      if (entry.isSymbolicLink()) fail("smoke_path_symlink", "evidence", relative(dir, abs));
      if (entry.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (entry.isFile()) {
        out.push(relative(dir, abs));
      } else {
        fail("smoke_evidence_file_invalid", "evidence", relative(dir, abs));
      }
    }
  }
  await walk(dir);
  return out.sort();
}

export function sameSortedPaths(left, right) {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

// File-set parity audit: the present regular-file set under the canonical
// evidence directory must exactly equal the manifest-referenced files plus the
// optional checkpoint control file. With requireTracked, that same exact set
// must appear in `git ls-files`.
export async function auditSmokeEvidenceDirectory(options) {
  requireExactKeys(
    options,
    ["repoRoot", "expectedTask", "expectedSuite", "expectedProfile", "expectedSession", "expectedRevision", "requireCheckpoint", "requireTracked"],
    "auditSmokeEvidenceDirectory"
  );
  const result = await validateSmokeEvidence({
    repoRoot: options.repoRoot,
    expectedTask: options.expectedTask,
    expectedSuite: options.expectedSuite,
    expectedProfile: options.expectedProfile,
    expectedSession: options.expectedSession,
    expectedRevision: options.expectedRevision,
  });
  const taskDir = await resolveCanonicalEvidenceDirectory(options.repoRoot, options.expectedTask, options.expectedSession);
  const present = await enumerateRegularFilesNoSymlinks(taskDir);
  const expected = options.requireCheckpoint
    ? [...result.referencedFiles, "resume-checkpoint.json"].sort()
    : result.referencedFiles;
  if (!sameSortedPaths(expected, present)) fail("smoke_evidence_file_set_mismatch", "evidence", "set");
  if (options.requireTracked) {
    const raw = git(options.repoRoot, ["ls-files", "-z", "--", taskDir]);
    const tracked = raw
      .split("\0")
      .filter((path) => path.length > 0)
      .map((path) => relative(taskDir, resolve(options.repoRoot, path)))
      .sort();
    if (!sameSortedPaths(expected, tracked)) fail("smoke_evidence_untracked", "evidence", "tracked");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Manifest projection and writing
// ---------------------------------------------------------------------------

// Pure manifest generation from the strict shared-runner report: a projection
// that can only drop runtime-only elapsed/timing fields, never add, rename,
// reinterpret, or mark passing a scenario, variant, assertion, console result,
// or screenshot. The runner report is the sole authority for pass state and
// evidence assignment.
export function projectSmokeEvidenceManifest({ taskId, suiteId, profile, session, reportPath, reportSha256, revision, generatedAt, report }) {
  requireRepoTaskId(taskId);
  requireRuntimeSmokeSessionName(session);
  if (!isPlainRecord(report) || !Array.isArray(report.scenarios) || !Array.isArray(report.screenshots)) {
    fail("smoke_report_invalid", "report", "shape");
  }
  const scenarios = report.scenarios.map(validateStrictManifestableScenario);
  requireEveryScenarioPassed(scenarios);
  const projected = scenarios.map(projectManifestableScenarioWithoutElapsedMs);
  requireCanonicalByteEquality(
    uniqueScenarioScreenshotUnion(projected),
    report.screenshots.map(validateStrictScreenshot),
    "smoke_manifest_report_screenshot_mismatch",
    "screenshots"
  );
  return validateSmokeEvidenceManifest({
    schemaVersion: SMOKE_MANIFEST_SCHEMA_VERSION,
    taskId,
    suiteId,
    profile,
    session,
    report: { path: reportPath, sha256: reportSha256 },
    revision,
    generatedAt,
    serverUp: report.serverUp === true,
    scenarios: projected,
  });
}

// Writes the canonical manifest.json (canonical JSON plus one final LF, 0600)
// into the canonical evidence directory. Refuses to overwrite an existing
// manifest: evidence is created once by the owning workflow and never rewritten
// during validation.
export async function writeSmokeEvidenceManifest({ repoRoot, expectedTask, expectedSession, manifest }) {
  const root = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask, expectedSession);
  const validated = validateSmokeEvidenceManifest(manifest);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const manifestPath = join(root, "manifest.json");
  const bytes = `${canonicalJson(validated)}\n`;
  if (Buffer.byteLength(bytes, "utf8") > MAX_MANIFEST_BYTES) fail("smoke_manifest_too_large", "manifest", "bytes");
  let handle;
  try {
    handle = await open(manifestPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(bytes, "utf8");
  } catch (error) {
    if (error.code === "EEXIST") fail("smoke_manifest_conflict", "manifest", "exists");
    throw error;
  } finally {
    if (handle !== undefined) await handle.close();
  }
  return { path: manifestPath, sha256: sha256(bytes) };
}

// ---------------------------------------------------------------------------
// Diagnostic CLI (never the owner closure entrypoint)
// ---------------------------------------------------------------------------

function printHelp() {
  process.stdout.write(
    [
      "smoke-evidence.mjs - TASK-545 smoke evidence manifest validator (diagnostic)",
      "",
      "Usage:",
      "  node smoke-evidence.mjs --help",
      "  node smoke-evidence.mjs validate-tracked --repo-root <root> --task TASK-###",
      "      --suite <registered-suite> --profile <fast|certification> --session <session>",
      "      [--audit-directory] [--require-tracked]",
      "",
      "validate-tracked reads manifest.json, report.json, and the referenced",
      "screenshots from the canonical evidence directory, verifies schema,",
      "identity, revision, report byte-equality, and every hash, then exits 0",
      "on success. --audit-directory additionally requires the exact present",
      "file set; --require-tracked requires that exact set in git ls-files.",
      "The phase-1 checkpoint/tracked-resume APIs moved to TASK-545-03-L03 and",
      "the closure-delta stage to TASK-545-03-L04; this surface ships",
      "validate-tracked",
      "",
      "Every failure is structured JSON on stderr with exit code 1; usage",
      "errors exit 2.",
    ].join("\n") + "\n"
  );
}

function parseFlags(argv) {
  const flags = {};
  const booleans = new Set(["audit-directory", "require-tracked"]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith("--") || flag.length === 2) return null;
    const name = flag.slice(2);
    if (booleans.has(name)) {
      flags[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) return null;
    flags[name] = value;
    index += 1;
  }
  return flags;
}

async function runValidateTracked(flags) {
  const { repoRoot, task, suite, profile, session } = flags;
  if (
    typeof repoRoot !== "string" || typeof task !== "string" || typeof suite !== "string" ||
    typeof profile !== "string" || typeof session !== "string"
  ) {
    fail("smoke_cli_usage", "validate-tracked", "missing_required_flags");
  }
  const revision = await computeWorkingTreeRevision(repoRoot, task, session);
  const expectedRevision = publicRevision(revision);
  const options = {
    repoRoot,
    expectedTask: task,
    expectedSuite: suite,
    expectedProfile: profile,
    expectedSession: session,
    expectedRevision,
  };
  if (flags["audit-directory"] === true) {
    await auditSmokeEvidenceDirectory({
      ...options,
      requireCheckpoint: false,
      requireTracked: flags["require-tracked"] === true,
    });
  } else {
    await validateSmokeEvidence(options);
  }
  process.stdout.write(`${JSON.stringify({ pass: true, taskId: task, suiteId: suite, profile, session, revision: expectedRevision })}\n`);
}

async function main(argv) {
  if (argv.length === 0) {
    printHelp();
    process.exitCode = 2;
    return;
  }
  const command = argv[0];
  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (command === "validate-tracked") {
    const flags = parseFlags(argv.slice(1));
    if (flags === null) fail("smoke_cli_usage", "validate-tracked", "flags");
    await runValidateTracked(flags);
    return;
  }
  fail("smoke_cli_unknown_command", command, "command");
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    if (error instanceof SmokeEvidenceError) {
      process.stderr.write(`${JSON.stringify({ pass: false, code: error.code, label: error.label, detail: error.detail })}\n`);
    } else {
      process.stderr.write(`${JSON.stringify({ pass: false, code: "smoke_cli_internal", detail: String((error && error.message) ?? error) })}\n`);
    }
    process.exitCode = 1;
  });
}
