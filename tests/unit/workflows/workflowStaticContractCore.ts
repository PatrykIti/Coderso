// TASK-545-01-L02 / TASK-576 shared static-contract core (Bun lane).
//
// Pure, framework-free helpers for the tracked workflow inventory gate over
// `_docs/_workflows/`. Owned by workflowStaticContract.test.ts and imported by
// workflowForbiddenDirectives.test.ts and workflowStaticContractFixtures.test.ts
// so every split suite stays independently runnable while the whole-inventory
// contract (inventory classification, canonical driver imports/calls, identity
// guards, and the live-tree temp-repo corpus) lives in exactly one place. The
// heavier audit/post-audit driver contracts, UI-closure prompts, forbidden
// action directives, and owning-workflow registrations live in
// workflowStaticContractDrivers.ts.
//
// The executable surface is enumerated with `:(glob)` pathspecs so the archive
// directory `_docs/_workflows/_archive/` (historical, non-canonical workflows)
// is never part of the inventory.
import { execFileSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";

export const ROOT = path.resolve(import.meta.dir, "../../..");
// The executable workflow surface. `:(glob)` pathspec magic is required:
// without it git's `*` matches across `/` and would sweep the archive dir and
// lib/ into the top-level inventory.
export const WORKFLOW_GLOBS = ["_docs/_workflows/*.mjs", "_docs/_workflows/lib/*.mjs"] as const;
export const ARCHIVE_DIR = "_docs/_workflows/_archive/";
export type WorkflowRole = "author-audit" | "implement" | "fix" | "closeout";
export interface WorkflowEntry {
  readonly path: string;
  readonly role: WorkflowRole;
  readonly taskId: string | null;
}
export interface ParsedModule {
  readonly displayPath: string;
  readonly source: string;
  readonly sourceFile: ts.SourceFile;
}

// The six post-TASK-554 migration entries are the initial compatibility set,
// not the universe of future owners. Later entries must match the canonical
// task-###-(author-audit|implement|fix|closeout).mjs pattern (TASK-9999 sole
// exception). Closeout is a first-class metadata-only role since TASK-554
// established the pattern; TASK-493-closeout is the first future owner of it.
export const INITIAL_MIGRATION_ROLES: Readonly<Record<string, WorkflowRole>> = Object.freeze({
  "task-522-author.mjs": "author-audit",
  "task-543-implement.mjs": "implement",
  "task-554-author-audit.mjs": "author-audit",
  "task-554-closeout.mjs": "closeout",
  "task-554-implement.mjs": "implement",
  "task-554-fix.mjs": "fix",
});
export const CANONICAL_FUTURE_ENTRY =
  /^task-(?<task>[0-9]{3}|9999)-(?<suffix>author-audit|implement|fix|closeout)\.mjs$/u;
export const ENTRY_TASK_NUMBER = /^task-(?<task>[0-9]+)-/u;
export const CANONICAL_FUTURE_PATH_PATTERN =
  /^(?:_docs\/_workflows\/task-554-closeout\.mjs|_docs\/_workflows\/task-(?:[0-9]{3}|9999)-(author-audit|implement|fix|closeout)\.mjs)$/u;
export const basenameOf = (relativePath: string): string => relativePath.split("/").pop() ?? "";

export function gitLsFilesNul(globs: readonly string[], root: string = ROOT): string[] {
  const bytes = execFileSync(
    "git",
    ["ls-files", "-z", "--", ...globs.map((glob) => `:(glob)${glob}`)],
    {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  return bytes.toString("utf8").split("\0").filter(Boolean).sort();
}
export function trackedWorkflowFiles(root: string = ROOT): string[] {
  return gitLsFilesNul(WORKFLOW_GLOBS, root).filter(
    (relativePath) => !relativePath.startsWith(ARCHIVE_DIR)
  );
}
export function classifyTrackedEntryOrThrow(relativePath: string): WorkflowEntry {
  const basename = basenameOf(relativePath);
  const initialRole = INITIAL_MIGRATION_ROLES[basename];
  if (initialRole)
    return {
      path: relativePath,
      role: initialRole,
      taskId: ENTRY_TASK_NUMBER.exec(basename)?.groups?.task ?? null,
    };
  const future = CANONICAL_FUTURE_ENTRY.exec(basename);
  if (future?.groups)
    return {
      path: relativePath,
      role: future.groups.suffix as WorkflowRole,
      taskId: future.groups.task ?? null,
    };
  throw new Error(
    `tracked workflow entry is neither an initial TASK-545 entry nor a canonical future entry: ${relativePath}`
  );
}
// Aggregating classifier: reports EVERY non-canonical path in one error instead
// of failing fast on the first offender (M-545-07).
export function trackedWorkflowEntries(root: string = ROOT): WorkflowEntry[] {
  const files = trackedWorkflowFiles(root).filter(
    (relativePath) => !relativePath.includes("/lib/")
  );
  const entries: WorkflowEntry[] = [];
  const nonCanonical: string[] = [];
  for (const relativePath of files) {
    try {
      entries.push(classifyTrackedEntryOrThrow(relativePath));
    } catch {
      nonCanonical.push(relativePath);
    }
  }
  if (nonCanonical.length > 0) {
    throw new Error(
      `tracked workflow entries are neither initial TASK-545 entries nor canonical future entries:\n${nonCanonical
        .map((relativePath) => `- ${relativePath}`)
        .join("\n")}`
    );
  }
  return entries;
}
export function trackedWorkflowEntriesByRole(...roles: WorkflowRole[]): string[] {
  return trackedWorkflowEntries()
    .filter((entry) => roles.includes(entry.role))
    .map((entry) => entry.path);
}
export function trackedUiClosureWorkflowFiles(): string[] {
  // UI-capable entries run real smoke and pause for owner evidence staging.
  return trackedWorkflowEntries()
    .map((entry) => entry.path)
    .filter((file) =>
      /ownerActionRequired|createResumeCheckpoint|openWorkflowClosureResume|openTask543ClosureResume|RESUME_AFTER_FIX_ARG/u.test(
        readFileSync(path.join(ROOT, file), "utf8")
      )
    );
}

export function assertTrackedRegularFileNoSymlink(relativePath: string, root: string = ROOT): void {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", relativePath], {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`tracked workflow file is not tracked by git ls-files: ${relativePath}`);
  }
  let stats;
  try {
    stats = lstatSync(path.join(root, relativePath));
  } catch {
    throw new Error(`tracked workflow file is missing from the worktree: ${relativePath}`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`tracked workflow file is not a regular non-symlink file: ${relativePath}`);
  }
}
export function assertBytesEqualGitShowHead(relativePath: string, root: string = ROOT): void {
  let headBytes: Buffer;
  try {
    headBytes = execFileSync("git", ["show", `HEAD:${relativePath}`], {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`tracked workflow file has no HEAD blob: ${relativePath}`);
  }
  if (!readFileSync(path.join(root, relativePath)).equals(headBytes)) {
    throw new Error(`tracked workflow file bytes differ from git show HEAD:${relativePath}`);
  }
  try {
    execFileSync("git", ["diff", "--quiet", "--", relativePath], {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`tracked workflow file has unstaged changes: ${relativePath}`);
  }
}
export function expectTrackedInitialEntriesOrCanonicalExtensions(
  entries: readonly WorkflowEntry[],
  initial: ReadonlyArray<readonly [string, WorkflowRole]>
): void {
  const byBasename = new Map(entries.map((entry) => [basenameOf(entry.path), entry]));
  for (const [filename, role] of initial) {
    const entry = byBasename.get(filename);
    if (!entry)
      throw new Error(`initial TASK-545 migration entry missing from inventory: ${filename}`);
    if (entry.role !== role)
      throw new Error(
        `initial TASK-545 migration entry role mismatch for ${filename}: ${entry.role}`
      );
    assertTrackedRegularFileNoSymlink(entry.path);
    assertBytesEqualGitShowHead(entry.path);
  }
  for (const entry of entries) {
    if (INITIAL_MIGRATION_ROLES[basenameOf(entry.path)]) continue;
    const future = CANONICAL_FUTURE_ENTRY.exec(basenameOf(entry.path));
    if (!future?.groups)
      throw new Error(`tracked entry does not match the canonical future pattern: ${entry.path}`);
    if (future.groups.suffix !== entry.role)
      throw new Error(`tracked future entry role mismatch for ${entry.path}`);
    assertTrackedRegularFileNoSymlink(entry.path);
    assertBytesEqualGitShowHead(entry.path);
  }
}

export function parseModuleSource(source: string, displayPath: string): ParsedModule {
  return {
    displayPath,
    source,
    sourceFile: ts.createSourceFile(
      displayPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS
    ),
  };
}
export function parseModuleFile(relativePath: string, root: string = ROOT): ParsedModule {
  return parseModuleSource(readFileSync(path.join(root, relativePath), "utf8"), relativePath);
}
export interface ImportBinding {
  readonly importedName: string | null;
  readonly localName: string;
}
export function staticImportBindings(
  sourceFile: ts.SourceFile
): ReadonlyArray<{ readonly module: string; readonly bindings: readonly ImportBinding[] }> {
  const out: Array<{ module: string; bindings: ImportBinding[] }> = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const bindings: ImportBinding[] = [];
    const clause = statement.importClause;
    if (clause) {
      if (clause.name) bindings.push({ importedName: null, localName: clause.name.text });
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings))
          bindings.push({ importedName: null, localName: clause.namedBindings.name.text });
        else
          for (const specifier of clause.namedBindings.elements) {
            bindings.push({
              importedName: specifier.propertyName
                ? specifier.propertyName.text
                : specifier.name.text,
              localName: specifier.name.text,
            });
          }
      }
    }
    out.push({ module: statement.moduleSpecifier.text, bindings });
  }
  return out;
}
export function dynamicImportBindings(
  sourceFile: ts.SourceFile
): ReadonlyArray<{ readonly module: string; readonly localNames: readonly string[] }> {
  const out: Array<{ module: string; localNames: string[] }> = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isAwaitExpression(node.initializer) &&
      ts.isCallExpression(node.initializer.expression) &&
      node.initializer.expression.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.initializer.expression.arguments[0])
    ) {
      const module = node.initializer.expression.arguments[0].text;
      const localNames: string[] = [];
      if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name))
            localNames.push(element.name.text);
        }
      } else if (ts.isIdentifier(node.name)) localNames.push(node.name.text);
      out.push({ module, localNames });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}
export function importedSymbolFromLib(
  sourceFile: ts.SourceFile,
  libBasename: string,
  symbolName: string
): boolean {
  const names = new Set<string>();
  for (const entry of staticImportBindings(sourceFile)) {
    if (entry.module.split("/").pop() === libBasename)
      for (const binding of entry.bindings) names.add(binding.localName);
  }
  for (const entry of dynamicImportBindings(sourceFile)) {
    if (entry.module.split("/").pop() === libBasename)
      for (const name of entry.localNames) names.add(name);
  }
  return names.has(symbolName);
}
export function collectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}
export function callsOfIdentifier(sourceFile: ts.SourceFile, name: string): ts.CallExpression[] {
  return collectCalls(sourceFile).filter(
    (call) => ts.isIdentifier(call.expression) && call.expression.text === name
  );
}
export function hasFunctionDeclaration(sourceFile: ts.SourceFile, name: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      found = true;
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}
export function propertyNameOf(property: ts.ObjectLiteralElementLike): string | null {
  if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
  if (
    ts.isPropertyAssignment(property) &&
    (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
  )
    return property.name.text;
  return null;
}
export function objectArgumentKeys(call: ts.CallExpression): Set<string> {
  const first = call.arguments[0];
  if (!first || !ts.isObjectLiteralExpression(first)) return new Set();
  const keys = new Set<string>();
  for (const property of first.properties) {
    const name = propertyNameOf(property);
    if (name !== null) keys.add(name);
  }
  return keys;
}
export function propertyValueOf(call: ts.CallExpression, key: string): ts.Expression | null {
  const first = call.arguments[0];
  if (!first || !ts.isObjectLiteralExpression(first)) return null;
  for (const property of first.properties) {
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === key)
      return property.name;
    if (ts.isPropertyAssignment(property) && propertyNameOf(property) === key)
      return property.initializer;
  }
  return null;
}
export const isFunctionLike = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isIdentifier(node);

// ---- Agent-result source analysis and unguarded-consumer detection ----

export interface SourceAnalysis {
  readonly agentVars: ReadonlySet<string>;
  readonly collectionVars: ReadonlySet<string>;
}
export function callCalleeIdentifier(node: ts.Node): string | null {
  if (!ts.isCallExpression(node)) return null;
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.name.text === "all"
  )
    return `${node.expression.expression.text}.all`;
  return null;
}
export function addBindingNames(pattern: ts.BindingName, target: Set<string>): void {
  if (ts.isIdentifier(pattern)) {
    target.add(pattern.text);
    return;
  }
  for (const element of pattern.elements) {
    if (ts.isBindingElement(element) && ts.isIdentifier(element.name))
      target.add(element.name.text);
  }
}
export function analyzeSources(sourceFile: ts.SourceFile): SourceAnalysis {
  const agentVars = new Set<string>();
  const collectionVars = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      let initializer: ts.Node = node.initializer;
      if (ts.isAwaitExpression(initializer)) initializer = initializer.expression;
      const callee = callCalleeIdentifier(initializer);
      if (callee === "agent") addBindingNames(node.name, agentVars);
      if (callee === "parallel" || callee === "Promise.all")
        addBindingNames(node.name, collectionVars);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      let initializer: ts.Node = node.right;
      if (ts.isAwaitExpression(initializer)) initializer = initializer.expression;
      const callee = callCalleeIdentifier(initializer);
      if (callee === "agent") agentVars.add(node.left.text);
      if (callee === "parallel" || callee === "Promise.all") collectionVars.add(node.left.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { agentVars, collectionVars };
}
export function rootIdentifier(expression: ts.Expression): string | null {
  let node: ts.Expression = expression;
  for (;;) {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      node = node.expression;
      continue;
    }
    if (ts.isCallExpression(node)) {
      node = node.expression;
      continue;
    }
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isAwaitExpression(node)
    ) {
      node = node.expression;
      continue;
    }
    return null;
  }
}
export const isSplitCallChain = (expression: ts.Expression): boolean =>
  ts.isCallExpression(expression) &&
  ts.isPropertyAccessExpression(expression.expression) &&
  expression.expression.name.text === "split";

export const IDENTITY_GUARD_CALL_NAMES = Object.freeze([
  "requireAllResults",
  "requirePass",
  "requireCleanAudit",
  "requireResult",
  "normalizeAuditFindings",
  "normalizeAuthorAuditResult",
]);
export const IDENTITY_GUARD_FUNCTION_NAMES = Object.freeze([
  "requirePass",
  "requireCleanAudit",
  "requireResult",
  "normalizeAuditFindings",
  "normalizeAuthorAuditResult",
]);
export const isIdentityGuardCall = (call: ts.CallExpression): boolean =>
  ts.isIdentifier(call.expression) && IDENTITY_GUARD_CALL_NAMES.includes(call.expression.text);

export function unguardedAgentResultConsumers(sourceFile: ts.SourceFile): string[] {
  const violations: string[] = [];
  const analysis = analyzeSources(sourceFile);
  const position = (node: ts.Node): string =>
    `${sourceFile.fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`;
  for (const call of collectCalls(sourceFile)) {
    if (!ts.isPropertyAccessExpression(call.expression)) continue;
    const property = call.expression.name.text;
    const receiver = call.expression.expression;
    const root = rootIdentifier(receiver);
    const isCollectionRoot =
      root !== null && (analysis.agentVars.has(root) || analysis.collectionVars.has(root));
    if (
      property === "filter" &&
      call.arguments.length === 1 &&
      ts.isIdentifier(call.arguments[0]) &&
      call.arguments[0].text === "Boolean"
    ) {
      // Domain filtering (git/path/URL/port splits and composed path arrays)
      // stays legal; agent-result Boolean filtering does not.
      if (ts.isArrayLiteralExpression(receiver) || isSplitCallChain(receiver)) continue;
      if (isCollectionRoot)
        violations.push(
          `filter(Boolean) applied to an agent-result collection before identity validation (${position(call)})`
        );
      continue;
    }
    if (
      ["flatten", "flatMap", "map", "reduce", "reduceRight", "count"].includes(property) &&
      root !== null &&
      analysis.collectionVars.has(root)
    ) {
      violations.push(
        `${property} applied to an agent-result collection before identity validation (${position(call)})`
      );
    }
  }
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      (node.name.text === "length" || node.name.text === "size") &&
      ts.isCallExpression(node.expression) &&
      ts.isPropertyAccessExpression(node.expression.expression)
    ) {
      const inner = node.expression.expression;
      const root = rootIdentifier(inner.expression);
      if (
        root !== null &&
        analysis.collectionVars.has(root) &&
        ["filter", "flatMap", "map", "reduce"].includes(inner.name.text)
      ) {
        violations.push(
          `clean classification counts a filtered/mapped agent-result collection before identity validation (${position(node)})`
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}
export function assertIdentityGuardCallSites(sourceFile: ts.SourceFile, displayPath: string): void {
  for (const call of collectCalls(sourceFile)) {
    if (!ts.isIdentifier(call.expression)) continue;
    const name = call.expression.text;
    if (name === "requireAllResults" && call.arguments.length !== 3) {
      throw new Error(
        `${displayPath}: requireAllResults must receive (results, expectedIdentities, label): ${call.arguments.length} argument(s)`
      );
    }
    if (
      IDENTITY_GUARD_CALL_NAMES.includes(name) &&
      name !== "requireAllResults" &&
      call.arguments.length < 2
    ) {
      throw new Error(`${displayPath}: identity guard ${name} must receive an identity argument`);
    }
  }
}
export interface UnguardedConsumerOptions {
  readonly rejectFilterBooleanBeforeValidation: boolean;
  readonly rejectFlattenCountOrCleanBeforeValidation: boolean;
  readonly requireTrustedOrderedIdentityEnvelopes: boolean;
  readonly allowUnrelatedDomainCollectionFiltering: boolean;
}
export const FULL_UNGUARDED_CONSUMER_OPTIONS: UnguardedConsumerOptions = Object.freeze({
  rejectFilterBooleanBeforeValidation: true,
  rejectFlattenCountOrCleanBeforeValidation: true,
  requireTrustedOrderedIdentityEnvelopes: true,
  allowUnrelatedDomainCollectionFiltering: true,
});
export function assertNoUnguardedAgentResultConsumer(
  parsed: ParsedModule,
  displayPath: string,
  options: UnguardedConsumerOptions
): void {
  if (
    options.rejectFilterBooleanBeforeValidation ||
    options.rejectFlattenCountOrCleanBeforeValidation
  ) {
    const violations = unguardedAgentResultConsumers(parsed.sourceFile);
    if (violations.length > 0)
      throw new Error(
        `unguarded agent-result consumption in ${displayPath}:\n${violations.join("\n")}`
      );
  }
  if (options.requireTrustedOrderedIdentityEnvelopes)
    assertIdentityGuardCallSites(parsed.sourceFile, displayPath);
}

// ---- Canonical driver import/call contracts ----

export interface CanonicalDriver {
  readonly lib: string;
  readonly symbol: string;
}
export const AUDIT_ROUNDS_DRIVER: CanonicalDriver = Object.freeze({
  lib: "audit-rounds.mjs",
  symbol: "runCanonicalAuditRounds",
});
export const POST_AUDIT_DRIVER: CanonicalDriver = Object.freeze({
  lib: "post-audit.mjs",
  symbol: "runCanonicalPostAudit",
});
export const hasDriverImportAndCall = (parsed: ParsedModule, driver: CanonicalDriver): boolean =>
  importedSymbolFromLib(parsed.sourceFile, driver.lib, driver.symbol) &&
  callsOfIdentifier(parsed.sourceFile, driver.symbol).length > 0;
export function assertDriverImportAndCall(
  parsed: ParsedModule,
  driver: CanonicalDriver,
  displayPath: string
): void {
  if (!importedSymbolFromLib(parsed.sourceFile, driver.lib, driver.symbol)) {
    throw new Error(
      `${displayPath}: missing canonical driver import ${driver.symbol} from lib/${driver.lib}`
    );
  }
  if (callsOfIdentifier(parsed.sourceFile, driver.symbol).length === 0) {
    throw new Error(`${displayPath}: missing canonical driver call ${driver.symbol}`);
  }
}
export function agentCallNodes(sourceFile: ts.SourceFile): ts.CallExpression[] {
  return collectCalls(sourceFile).filter(
    (call) => ts.isIdentifier(call.expression) && call.expression.text === "agent"
  );
}
export function everyAgentCallFeedsGuard(sourceFile: ts.SourceFile, displayPath: string): void {
  const guardCalls = collectCalls(sourceFile).filter(isIdentityGuardCall);
  for (const agentCall of agentCallNodes(sourceFile)) {
    let node: ts.Node = agentCall;
    while (node.parent && ts.isAwaitExpression(node.parent)) node = node.parent;
    if (ts.isCallExpression(node.parent) && isIdentityGuardCall(node.parent)) continue;
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      const variableName = node.parent.name.text;
      if (
        guardCalls.some((call) =>
          call.arguments.some(
            (argument) => ts.isIdentifier(argument) && argument.text === variableName
          )
        )
      )
        continue;
    }
    const line = sourceFile.getLineAndCharacterOfPosition(agentCall.getStart(sourceFile)).line + 1;
    throw new Error(`${displayPath}:${line} agent() result does not feed an exact-identity guard`);
  }
}
export function assertLegacyExactIdentityGuardedDispatch(
  parsed: ParsedModule,
  displayPath: string
): void {
  const sourceFile = parsed.sourceFile;
  const guardsDefined = IDENTITY_GUARD_FUNCTION_NAMES.filter((name) =>
    hasFunctionDeclaration(sourceFile, name)
  );
  if (
    guardsDefined.length === 0 &&
    collectCalls(sourceFile).filter(isIdentityGuardCall).length === 0
  ) {
    throw new Error(
      `${displayPath}: no exact-identity result guard (requireAllResults/requirePass/requireCleanAudit/requireResult/normalizeAuditFindings)`
    );
  }
  everyAgentCallFeedsGuard(sourceFile, displayPath);
}
export function assertCanonicalDriverImportAndCall(
  parsed: ParsedModule,
  role: WorkflowRole,
  displayPath: string
): void {
  if (role === "author-audit") {
    assertDriverImportAndCall(parsed, AUDIT_ROUNDS_DRIVER, displayPath);
    return;
  }
  if (hasDriverImportAndCall(parsed, POST_AUDIT_DRIVER)) return;
  // The initial TASK-554 compatibility set keeps its exact identity-guarded
  // dispatch machinery; a future entry must use the canonical post-audit driver.
  assertLegacyExactIdentityGuardedDispatch(parsed, displayPath);
}

// ---- Closeout guard contract ----

export const TASK_554_CLOSEOUT_GUARDS = Object.freeze([
  "captureTask554CloseoutSnapshot",
  "normalizeTask554CloseoutSnapshot",
  "assertTask554BoardClosureDelta",
  "assertTask554ChangelogClosureDelta",
  "assertTask554TerminalStatusDelta",
  "validateTask554MetadataCloseout",
  "validateTask554TerminalCloseout",
]);
const CLOSEOUT_TASK_ID = /^_docs\/_workflows\/task-(?<task>[0-9]{3}|9999)-closeout\.mjs$/u;
function taskCloseoutGuards(taskId: string): readonly string[] {
  return [
    `captureTask${taskId}CloseoutSnapshot`,
    `normalizeTask${taskId}CloseoutSnapshot`,
    `assertTask${taskId}BoardClosureDelta`,
    `assertTask${taskId}ChangelogClosureDelta`,
    `assertTask${taskId}TerminalStatusDelta`,
    `validateTask${taskId}MetadataCloseout`,
    `validateTask${taskId}TerminalCloseout`,
  ];
}
export function assertTask554CloseoutGuardContract(
  parsed: ParsedModule,
  displayPath: string
): void {
  const match = CLOSEOUT_TASK_ID.exec(displayPath);
  if (!match?.groups?.task)
    throw new Error(`${displayPath}: closeout guard requires a canonical task-###-closeout path`);
  const taskId = match.groups.task;
  if (agentCallNodes(parsed.sourceFile).length > 0)
    throw new Error(`${displayPath}: closeout guard must never dispatch agents`);
  if (
    importedSymbolFromLib(parsed.sourceFile, "audit-rounds.mjs", "runCanonicalAuditRounds") ||
    importedSymbolFromLib(parsed.sourceFile, "post-audit.mjs", "runCanonicalPostAudit")
  ) {
    throw new Error(`${displayPath}: closeout guard must not import agent drivers`);
  }
  for (const guard of taskCloseoutGuards(taskId)) {
    if (!hasFunctionDeclaration(parsed.sourceFile, guard))
      throw new Error(`${displayPath}: closeout guard missing ${guard}`);
  }
  if (!/function selfTest\(|selfTest\(\)/u.test(parsed.source))
    throw new Error(`${displayPath}: closeout guard missing its self-test`);
  if (!new RegExp(`TASK_${taskId}_WORKFLOW_IMPORT`, "u").test(parsed.source))
    throw new Error(`${displayPath}: closeout guard missing the direct-invocation guard`);
}
