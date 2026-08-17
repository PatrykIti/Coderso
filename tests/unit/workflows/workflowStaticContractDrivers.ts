// TASK-545-01-L02 / TASK-576 shared static-contract driver surfaces (Bun lane).
//
// Pure, framework-free helpers for the heavier workflow contract surfaces:
// the canonical audit-round and post-audit driver options, the UI-closure
// owner-staging prompts, forbidden action directives (with the aggregated
// whole-inventory check), owning-workflow registrations, and the live-tree
// temp-repo corpus. Imported by workflowStaticContract.test.ts,
// workflowForbiddenDirectives.test.ts, and workflowStaticContractFixtures.test.ts
// so every split suite stays independently runnable.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import {
  ENTRY_TASK_NUMBER,
  FULL_UNGUARDED_CONSUMER_OPTIONS,
  INITIAL_MIGRATION_ROLES,
  IDENTITY_GUARD_FUNCTION_NAMES,
  ParsedModule,
  ROOT,
  WorkflowRole,
  assertCanonicalDriverImportAndCall,
  assertNoUnguardedAgentResultConsumer,
  assertTask554CloseoutGuardContract,
  basenameOf,
  callsOfIdentifier,
  collectCalls,
  hasFunctionDeclaration,
  importedSymbolFromLib,
  isIdentityGuardCall,
  isFunctionLike,
  objectArgumentKeys,
  parseModuleFile,
  parseModuleSource,
  propertyValueOf,
  trackedWorkflowEntries,
  trackedWorkflowFiles,
} from "./workflowStaticContractCore.js";
// ---- Audit-round driver contract (author/audit workflows) ----

export interface CanonicalAuditDriverOptions {
  readonly requireInitialCompletePass: boolean;
  readonly reconcilePerPass: number;
  readonly affectedScopesOnlyAfterVerifiedFix: boolean;
  readonly deriveActualChangedScopesFromPerScopeFingerprints: boolean;
  readonly requireDeclaredActualIdentitySetEquality: boolean;
  readonly invalidateAllReceiptsOnUnmappableChange: boolean;
  readonly requireAllResults: boolean;
  readonly requireExactOrderedIdentities: boolean;
  readonly requireRevisionFingerprint: boolean;
}
export const FULL_AUDIT_DRIVER_OPTIONS: CanonicalAuditDriverOptions = Object.freeze({
  requireInitialCompletePass: true,
  reconcilePerPass: 1,
  affectedScopesOnlyAfterVerifiedFix: true,
  deriveActualChangedScopesFromPerScopeFingerprints: true,
  requireDeclaredActualIdentitySetEquality: true,
  invalidateAllReceiptsOnUnmappableChange: true,
  requireAllResults: true,
  requireExactOrderedIdentities: true,
  requireRevisionFingerprint: true,
});
export function assertDriverLibRequiresAllResults(libBasename: string): void {
  const parsed = parseModuleFile(`_docs/_workflows/lib/${libBasename}`);
  if (!importedSymbolFromLib(parsed.sourceFile, "workflow-contracts.mjs", "requireAllResults")) {
    throw new Error(
      `lib/${libBasename}: missing requireAllResults import from workflow-contracts.mjs`
    );
  }
  const calls = callsOfIdentifier(parsed.sourceFile, "requireAllResults");
  if (calls.length === 0) throw new Error(`lib/${libBasename}: requireAllResults is never called`);
  for (const call of calls) {
    if (call.arguments.length !== 3)
      throw new Error(
        `lib/${libBasename}: requireAllResults must receive (results, expectedIdentities, label)`
      );
  }
  if (!/identity:/u.test(parsed.source))
    throw new Error(`lib/${libBasename}: missing trusted ordered identity envelopes`);
}
export function assertCanonicalAuditDriver(
  source: string,
  displayPath: string,
  options: CanonicalAuditDriverOptions
): void {
  const parsed = parseModuleSource(source, displayPath);
  const calls = callsOfIdentifier(parsed.sourceFile, "runCanonicalAuditRounds");
  if (calls.length === 0) throw new Error(`${displayPath}: no runCanonicalAuditRounds driver call`);
  for (const call of calls) {
    const keys = objectArgumentKeys(call);
    const required = ["groups", "auditFile", "reconcile", "fix", "fingerprint", "label"];
    if (options.deriveActualChangedScopesFromPerScopeFingerprints)
      required.push("fingerprintEveryScope");
    if (
      options.requireDeclaredActualIdentitySetEquality ||
      options.invalidateAllReceiptsOnUnmappableChange
    )
      required.push("fingerprintUniverse", "maximumFixPasses");
    if (options.requireRevisionFingerprint) required.push("fingerprint");
    for (const key of required)
      if (!keys.has(key))
        throw new Error(`${displayPath}: runCanonicalAuditRounds missing required option ${key}`);
    const reconcile = propertyValueOf(call, "reconcile");
    if (!reconcile || !isFunctionLike(reconcile))
      throw new Error(
        `${displayPath}: runCanonicalAuditRounds reconcile must be a single function (one per pass)`
      );
    if (options.affectedScopesOnlyAfterVerifiedFix) {
      const fix = propertyValueOf(call, "fix");
      if (!fix || !isFunctionLike(fix))
        throw new Error(`${displayPath}: runCanonicalAuditRounds fix must be a function`);
    }
  }
  if (options.requireInitialCompletePass && calls.length !== 1)
    throw new Error(
      `${displayPath}: expected exactly one complete audit-round pass, found ${calls.length}`
    );
  if (options.requireAllResults || options.requireExactOrderedIdentities)
    assertDriverLibRequiresAllResults("audit-rounds.mjs");
}

// ---- Post-audit driver contract (implement/fix workflows) ----

export interface CanonicalPostAuditDriverOptions {
  readonly requireDeclaredIndependentLensIds: boolean;
  readonly requireAllResults: boolean;
  readonly requireExactOrderedIdentities: boolean;
  readonly fingerprintBeforeAndAfterPass: boolean;
  readonly fingerprintFixAndValidation: boolean;
  readonly deriveActualChangedLensesFromInputFingerprints: boolean;
  readonly requireDeclaredActualIdentitySetEquality: boolean;
  readonly invalidateAllReceiptsOnUnmappableChange: boolean;
}
export const FULL_POST_AUDIT_DRIVER_OPTIONS: CanonicalPostAuditDriverOptions = Object.freeze({
  requireDeclaredIndependentLensIds: true,
  requireAllResults: true,
  requireExactOrderedIdentities: true,
  fingerprintBeforeAndAfterPass: true,
  fingerprintFixAndValidation: true,
  deriveActualChangedLensesFromInputFingerprints: true,
  requireDeclaredActualIdentitySetEquality: true,
  invalidateAllReceiptsOnUnmappableChange: true,
});
export function declaredLensIds(sourceFile: ts.SourceFile): readonly string[] | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !/LENS/u.test(declaration.name.text)) continue;
      const initializer = declaration.initializer;
      if (!initializer || !ts.isCallExpression(initializer)) continue;
      const isObjectFreeze =
        (ts.isIdentifier(initializer.expression) &&
          initializer.expression.text === "Object.freeze") ||
        (ts.isPropertyAccessExpression(initializer.expression) &&
          ts.isIdentifier(initializer.expression.expression) &&
          initializer.expression.expression.text === "Object" &&
          initializer.expression.name.text === "freeze");
      if (!isObjectFreeze || !ts.isArrayLiteralExpression(initializer.arguments[0])) continue;
      const ids = initializer.arguments[0].elements.map((element) =>
        ts.isStringLiteral(element) ? element.text : null
      );
      if (ids.length > 0 && ids.every((id) => id !== null)) return ids as string[];
    }
  }
  return null;
}
export function assertLegacyPostAuditContract(
  parsed: ParsedModule,
  displayPath: string,
  options: CanonicalPostAuditDriverOptions
): void {
  const sourceFile = parsed.sourceFile;
  if (options.requireDeclaredIndependentLensIds) {
    const lensIds = declaredLensIds(sourceFile);
    if (!lensIds || lensIds.length === 0 || new Set(lensIds).size !== lensIds.length)
      throw new Error(`${displayPath}: legacy post-audit must declare independent lens ids`);
  }
  if (options.requireAllResults || options.requireExactOrderedIdentities) {
    if (
      IDENTITY_GUARD_FUNCTION_NAMES.filter((name) => hasFunctionDeclaration(sourceFile, name))
        .length === 0
    ) {
      throw new Error(
        `${displayPath}: legacy post-audit must define an exact-identity result guard`
      );
    }
    for (const call of collectCalls(sourceFile).filter(isIdentityGuardCall)) {
      if (call.arguments.length < 2)
        throw new Error(`${displayPath}: identity guard call missing its identity argument`);
    }
  }
  if (options.fingerprintBeforeAndAfterPass || options.fingerprintFixAndValidation) {
    if (!/Fingerprint|fingerprint/u.test(parsed.source))
      throw new Error(`${displayPath}: legacy post-audit must fingerprint the audited state`);
    if (
      !/(assertScopedRepositoryMutation|assertNoRepositoryMutation|assertFixScope|sameFingerprint)/u.test(
        parsed.source
      )
    ) {
      throw new Error(
        `${displayPath}: legacy post-audit must validate repository mutation against fingerprints`
      );
    }
  }
  if (
    options.deriveActualChangedLensesFromInputFingerprints &&
    !/ownersForChangedPaths|deriveChanged|assertScopedRepositoryMutation|assertFixScope/u.test(
      parsed.source
    )
  ) {
    throw new Error(
      `${displayPath}: legacy post-audit must derive actual changed scopes from fingerprints`
    );
  }
  if (
    (options.requireDeclaredActualIdentitySetEquality ||
      options.invalidateAllReceiptsOnUnmappableChange) &&
    !/receipt_stale|sameFingerprint\(|assertResumePreflight|assertImplementationPreflight/u.test(
      parsed.source
    )
  ) {
    throw new Error(
      `${displayPath}: legacy post-audit must invalidate receipts on unmappable change`
    );
  }
}
export function assertCanonicalPostAuditDriver(
  source: string,
  displayPath: string,
  options: CanonicalPostAuditDriverOptions
): void {
  const parsed = parseModuleSource(source, displayPath);
  const driverCalls = callsOfIdentifier(parsed.sourceFile, "runCanonicalPostAudit");
  if (driverCalls.length > 0) {
    for (const call of driverCalls) {
      const keys = objectArgumentKeys(call);
      const required = ["lenses", "runLens", "fix", "validate", "fingerprint", "label"];
      if (
        options.fingerprintFixAndValidation ||
        options.deriveActualChangedLensesFromInputFingerprints
      )
        required.push("fingerprintEveryLensInput");
      if (
        options.requireDeclaredActualIdentitySetEquality ||
        options.invalidateAllReceiptsOnUnmappableChange ||
        options.fingerprintFixAndValidation
      ) {
        required.push("fingerprintUniverse", "maximumFixPasses");
      }
      for (const key of required)
        if (!keys.has(key))
          throw new Error(`${displayPath}: runCanonicalPostAudit missing required option ${key}`);
    }
    if (options.requireAllResults || options.requireExactOrderedIdentities)
      assertDriverLibRequiresAllResults("post-audit.mjs");
    return;
  }
  assertLegacyPostAuditContract(parsed, displayPath, options);
}

// ---- UI closure: owner evidence staging and resume contracts ----

export function assertPromptRequiresImmediateEvidenceValidation(
  source: string,
  file: string
): void {
  if (
    !/(validateSmoke\s*\(|assertExactTask554SmokeEvidence|sameFingerprint\s*\(|normalizeAuditFindings\s*\()/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure prompts must validate evidence immediately`);
  }
}
export function assertPromptReturnsOwnerActionRequiredBeforeTrackedAudit(
  source: string,
  file: string
): void {
  if (
    !/(ownerActionRequired|createTask543ResumeCheckpoint|openTask543ClosureResume)/u.test(source)
  ) {
    throw new Error(`${file}: closure flow must return owner_action_required before tracked audit`);
  }
  const checkpointAt = source.indexOf("createTask543ResumeCheckpoint");
  const closePhaseAt = source.indexOf('phase("543-03-L01 close")');
  if (checkpointAt !== -1 && closePhaseAt !== -1 && checkpointAt > closePhaseAt) {
    throw new Error(`${file}: the owner checkpoint must be created before the closure phase`);
  }
}
export function assertPromptUsesCanonicalResumeCheckpoint(source: string, file: string): void {
  if (
    !/(createResumeCheckpoint|openWorkflowClosureResume|openTask543ClosureResume|RESUME_AFTER_FIX_ARG|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure flow must use a canonical resume checkpoint`);
  }
}
export function assertPromptReturnsExactOwningWorkflowResumeArgv(
  source: string,
  file: string
): void {
  if (
    !/(checkpointPath|checkpointSha256|runId|RESUME_AFTER_FIX_ARG|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure flow must return the exact owning-workflow resume argv`);
  }
}
export function assertResumeEntryMatchesExecutingWorkflow(source: string, file: string): void {
  if (!/import\.meta\.url/u.test(source))
    throw new Error(`${file}: resume identity must derive from the executing import.meta.url`);
}
export function assertPromptResumesWithRequireTracked(source: string, file: string): void {
  if (
    !/(checkpointSha256|assertResumePreflight|assertImplementationPreflight|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: resume must require tracked, identity-bound evidence`);
  }
}
export function assertPromptValidatesMetadataOnlyClosureDelta(source: string, file: string): void {
  if (
    !/(finalMetadataGatePrompt|assertTask554BoardClosureDelta|assertTask554ChangelogClosureDelta|assertTask554TerminalStatusDelta|validateTask554MetadataCloseout|terminal_phase_receipt_required)/u.test(
      source
    )
  ) {
    throw new Error(
      `${file}: closure must validate a metadata-only delta against the frozen snapshot`
    );
  }
}
export function functionDeclarationBodyContains(
  sourceFile: ts.SourceFile,
  functionName: string,
  calleeNames: readonly string[],
  stringLiterals: readonly string[] = []
): boolean {
  let body: ts.Block | null = null;
  const find = (node: ts.Node): void => {
    if (body) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName && node.body) {
      body = node.body;
      return;
    }
    ts.forEachChild(node, find);
  };
  find(sourceFile);
  if (!body) return false;
  let hit = false;
  const check = (node: ts.Node): void => {
    if (hit) return;
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      calleeNames.includes(node.expression.text)
    ) {
      hit = true;
      return;
    }
    if (ts.isStringLiteral(node) && stringLiterals.includes(node.text)) {
      hit = true;
      return;
    }
    ts.forEachChild(node, check);
  };
  check(body);
  return hit;
}
export function assertResumeCannotDispatchImplementationStages(source: string, file: string): void {
  const parsed = parseModuleSource(source, file);
  for (const fn of ["createTask543ResumeCheckpoint", "openTask543ClosureResume"]) {
    if (functionDeclarationBodyContains(parsed.sourceFile, fn, ["agent"])) {
      throw new Error(`${file}: the resume checkpoint path must not dispatch agents`);
    }
  }
  if (
    functionDeclarationBodyContains(
      parsed.sourceFile,
      "runResumeAfterFixWorkflow",
      ["runOwner"],
      ["Sequential owners"]
    )
  ) {
    throw new Error(`${file}: the resume branch must not dispatch implementation stages`);
  }
}
export function assertPromptNeverStagesAsAgent(source: string, file: string): void {
  if (
    /\bgit\s+(?:add|commit|push)\b/iu.test(source) ||
    /\bstage\s+(?:the|your|all|these)\s+(?:files|changes)\b/iu.test(source) ||
    /\b(?:then|now)\s+stage\b/iu.test(source)
  ) {
    throw new Error(`${file}: a prompt must never instruct an agent to stage or commit`);
  }
  if (
    !/Never\s+(?:stage|commit|push)|stage, or commit|do not\s+(?:stage|commit|push)/iu.test(source)
  ) {
    throw new Error(`${file}: closure prompts must explicitly forbid agent staging`);
  }
}

// ---- Forbidden action directives (tracked prompts) ----

// Action-scoped only: "guess next-free" prohibition prose is never banned.
// Executable commands/directives that commit, allocate a changelog
// dynamically, or defer mandatory smoke are rejected.
export const FORBIDDEN_ACTION_PATTERNS = Object.freeze([
  /git\s+commit/iu,
  /commit\s+on\s+the\s+worktree/iu,
  /(?:scan|find|allocate|pick|choose|use)\s+(?:the\s+)?(?:next|highest)[- ]free/iu,
  /(?:highest|last|largest)\s*\+\s*1/iu,
  /smokeDeferred/iu,
  /smoke.{0,80}deferred/iu,
] as const);
export function assertNoForbiddenPatterns(
  source: string,
  displayPath: string,
  patterns: ReadonlyArray<RegExp>
): void {
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match)
      throw new Error(
        `${displayPath}: forbidden action directive matched ${pattern}: ${JSON.stringify(match[0])}`
      );
  }
}
// Aggregating variant: collects EVERY forbidden directive across ALL files into
// one error instead of failing fast on the first hit (M-545-07).
export function assertNoForbiddenPatternsInFiles(
  files: readonly string[],
  patterns: ReadonlyArray<RegExp>,
  root: string = ROOT
): void {
  const hits: Array<{ file: string; pattern: string; match: string }> = [];
  for (const file of files) {
    const source = readFileSync(path.join(root, file), "utf8");
    for (const pattern of patterns) {
      const match = pattern.exec(source);
      if (match) hits.push({ file, pattern: String(pattern), match: match[0] });
    }
  }
  if (hits.length > 0) {
    throw new Error(
      `forbidden action directives found:\n${hits
        .map((hit) => `- ${hit.file}: matched ${hit.pattern}: ${JSON.stringify(hit.match)}`)
        .join("\n")}`
    );
  }
}

// ---- Owning workflow entries: tracked, clean, task-bound, import.meta.url-only ----

export interface OwningWorkflowRegistration {
  readonly importMetaUrl: string;
  readonly taskId: string;
  readonly role: WorkflowRole;
  readonly path: string;
}
export function trackedOwningWorkflowRegistrations(): OwningWorkflowRegistration[] {
  return trackedWorkflowEntries().map((entry) => ({
    importMetaUrl: pathToFileURL(path.join(ROOT, entry.path)).href,
    taskId: entry.taskId ?? "unknown",
    role: entry.role,
    path: entry.path,
  }));
}
export function deriveOnlyFromExecutingImportMetaUrl(importMetaUrl: string): string {
  if (!importMetaUrl.startsWith("file:"))
    throw new Error(`workflow identity must derive from a file: import.meta.url: ${importMetaUrl}`);
  const relativePath = path.relative(ROOT, fileURLToPath(importMetaUrl)).split(path.sep).join("/");
  if (
    relativePath.startsWith("../") ||
    path.posix.isAbsolute(relativePath) ||
    !relativePath.startsWith("_docs/_workflows/")
  ) {
    throw new Error(`workflow identity escapes the tracked workflow inventory: ${relativePath}`);
  }
  return relativePath;
}
export const isExactTask545BuiltinEntry = (entry: string): boolean =>
  Object.prototype.hasOwnProperty.call(INITIAL_MIGRATION_ROLES, basenameOf(entry));
export function assertExactBuiltinTaskAndRoleBinding(
  entry: string,
  registeredTaskId: string
): void {
  const role = INITIAL_MIGRATION_ROLES[basenameOf(entry)];
  if (!role) throw new Error(`entry is not an exact TASK-545 builtin: ${entry}`);
  const taskId = ENTRY_TASK_NUMBER.exec(basenameOf(entry))?.groups?.task;
  if (taskId !== registeredTaskId)
    throw new Error(
      `TASK-545 builtin task binding mismatch for ${entry}: registered ${registeredTaskId}`
    );
}
export function assertCanonicalFutureEntry(
  entry: string,
  registeredTaskId: string,
  options: {
    readonly pattern: RegExp;
    readonly requireTaskIdAndSuffixBinding: boolean;
    readonly role: WorkflowRole;
  }
): void {
  if (!options.pattern.test(entry))
    throw new Error(`entry does not match the canonical future workflow pattern: ${entry}`);
  if (!options.requireTaskIdAndSuffixBinding) return;
  const basename = basenameOf(entry);
  const taskId = ENTRY_TASK_NUMBER.exec(basename)?.groups?.task;
  if (taskId !== registeredTaskId)
    throw new Error(
      `future entry task binding mismatch for ${entry}: registered ${registeredTaskId}`
    );
  if (basename === "task-554-closeout.mjs") {
    if (registeredTaskId !== "554")
      throw new Error(`future closeout entry must bind task 554: ${entry}`);
    return;
  }
  const suffix = /-(author-audit|implement|fix)\.mjs$/u.exec(basename)?.[1];
  if (!suffix) throw new Error(`future entry has no role suffix: ${entry}`);
  if (options.role !== "closeout" && suffix !== options.role)
    throw new Error(`future entry suffix/role binding mismatch for ${entry}: role ${options.role}`);
}
export function assertNoCallerWorkflowEntryOverride(
  owner: OwningWorkflowRegistration,
  derivedEntry: string
): void {
  if (owner.path !== derivedEntry) {
    throw new Error(
      `caller workflow entry override: registered path ${owner.path} differs from the import.meta.url-derived ${derivedEntry}`
    );
  }
  const source = readFileSync(path.join(ROOT, derivedEntry), "utf8");
  if (
    /(ownerActionRequired|createResumeCheckpoint|openWorkflowClosureResume|RESUME_AFTER_FIX_ARG)/u.test(
      source
    ) &&
    !/import\.meta\.url/u.test(source)
  ) {
    throw new Error(
      `${derivedEntry}: a resume-capable workflow must derive its identity from import.meta.url`
    );
  }
}
export function assertCanonicalTask545StaticContractsAndImports(
  entry: string,
  role: WorkflowRole,
  root: string = ROOT
): void {
  const parsed = parseModuleFile(entry, root);
  if (role === "closeout") {
    assertTask554CloseoutGuardContract(parsed, entry);
  } else {
    assertCanonicalDriverImportAndCall(parsed, role, entry);
    assertNoUnguardedAgentResultConsumer(parsed, entry, FULL_UNGUARDED_CONSUMER_OPTIONS);
    if (role === "author-audit")
      assertCanonicalAuditDriver(parsed.source, entry, FULL_AUDIT_DRIVER_OPTIONS);
    else assertCanonicalPostAuditDriver(parsed.source, entry, FULL_POST_AUDIT_DRIVER_OPTIONS);
  }
  assertNoForbiddenPatterns(parsed.source, entry, FORBIDDEN_ACTION_PATTERNS);
}

// ---- Live-tree temp repo (mirrors the ignored + force-tracked corpus) ----

export function createTrackedWorkflowRepo(): string {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "task-545-static-"));
  execFileSync("git", ["init", "-q"], { cwd: tempRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "task-545-static@example.invalid"], {
    cwd: tempRoot,
    stdio: "ignore",
  });
  execFileSync("git", ["config", "user.name", "TASK-545 static gate"], {
    cwd: tempRoot,
    stdio: "ignore",
  });
  writeFileSync(path.join(tempRoot, ".gitignore"), "_docs/_workflows/\n");
  execFileSync("git", ["add", ".gitignore"], { cwd: tempRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "ignore workflows"], { cwd: tempRoot, stdio: "ignore" });
  const tracked = trackedWorkflowFiles(ROOT);
  for (const relativePath of tracked) {
    const absolutePath = path.join(tempRoot, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, readFileSync(path.join(ROOT, relativePath)));
  }
  execFileSync("git", ["add", "-f", ...tracked], { cwd: tempRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "tracked workflow corpus"], {
    cwd: tempRoot,
    stdio: "ignore",
  });
  return tempRoot;
}
