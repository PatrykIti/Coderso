// TASK-545-01-L02: statically enforce the tracked workflow inventory contract.
//
// Whole-inventory static gate over `_docs/_workflows/` (globally ignored,
// force-tracked through owner handoffs). It enumerates tracked entries via
// `git ls-files` (never a recursive filesystem scan), classifies each entry,
// requires canonical TASK-545 driver imports/calls (workflow-contracts /
// audit-rounds / post-audit symbols), rejects unguarded agent-result
// consumption while permitting unrelated domain collection filtering, and
// proves ignored local files cannot alter a clean-checkout inventory.
//
// Parser: `typescript` is a declared devDependency; the suite uses its real
// AST (ts.createSourceFile), so comments and numeric literals can never
// satisfy a structural contract. Dynamic null/identity/fingerprint/fixer
// behavior stays in the landed auditRounds.test.ts and postAudit.test.ts
// suites; owner-stage/resume runtime behavior belongs to TASK-545-03-L01.

import { describe, expect, test } from "bun:test";
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

const ROOT = path.resolve(import.meta.dir, "../../..");
const WORKFLOW_GLOBS = ["_docs/_workflows/*.mjs", "_docs/_workflows/lib/*.mjs"] as const;
type WorkflowRole = "author-audit" | "implement" | "fix" | "closeout";
interface WorkflowEntry {
  readonly path: string;
  readonly role: WorkflowRole;
  readonly taskId: string | null;
}
interface ParsedModule {
  readonly displayPath: string;
  readonly source: string;
  readonly sourceFile: ts.SourceFile;
}

// The six post-TASK-554 migration entries are the initial compatibility set,
// not the universe of future owners. Later entries must match the canonical
// task-###-(author-audit|implement|fix).mjs pattern (TASK-9999 sole exception).
const INITIAL_MIGRATION_ROLES: Readonly<Record<string, WorkflowRole>> = Object.freeze({
  "task-522-author.mjs": "author-audit",
  "task-543-implement.mjs": "implement",
  "task-554-author-audit.mjs": "author-audit",
  "task-554-closeout.mjs": "closeout",
  "task-554-implement.mjs": "implement",
  "task-554-fix.mjs": "fix",
});
const CANONICAL_FUTURE_ENTRY =
  /^task-(?<task>[0-9]{3}|9999)-(?<suffix>author-audit|implement|fix)\.mjs$/u;
const ENTRY_TASK_NUMBER = /^task-(?<task>[0-9]+)-/u;
const CANONICAL_FUTURE_PATH_PATTERN =
  /^(?:_docs\/_workflows\/task-554-closeout\.mjs|_docs\/_workflows\/task-(?:[0-9]{3}|9999)-(author-audit|implement|fix)\.mjs)$/u;
const basenameOf = (relativePath: string): string => relativePath.split("/").pop() ?? "";

function gitLsFilesNul(globs: readonly string[], root: string = ROOT): string[] {
  const bytes = execFileSync("git", ["ls-files", "-z", "--", ...globs], {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return bytes.toString("utf8").split("\0").filter(Boolean).sort();
}
function trackedWorkflowFiles(root: string = ROOT): string[] {
  return gitLsFilesNul(WORKFLOW_GLOBS, root);
}
function classifyTrackedEntryOrThrow(relativePath: string): WorkflowEntry {
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
function trackedWorkflowEntries(root: string = ROOT): WorkflowEntry[] {
  return trackedWorkflowFiles(root)
    .filter((relativePath) => !relativePath.includes("/lib/"))
    .map(classifyTrackedEntryOrThrow);
}
function trackedWorkflowEntriesByRole(...roles: WorkflowRole[]): string[] {
  return trackedWorkflowEntries()
    .filter((entry) => roles.includes(entry.role))
    .map((entry) => entry.path);
}
function trackedUiClosureWorkflowFiles(): string[] {
  // UI-capable entries run real smoke and pause for owner evidence staging.
  return trackedWorkflowEntries()
    .map((entry) => entry.path)
    .filter((file) =>
      /ownerActionRequired|createResumeCheckpoint|openWorkflowClosureResume|openTask543ClosureResume|RESUME_AFTER_FIX_ARG/u.test(
        readFileSync(path.join(ROOT, file), "utf8")
      )
    );
}

function assertTrackedRegularFileNoSymlink(relativePath: string, root: string = ROOT): void {
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
function assertBytesEqualGitShowHead(relativePath: string, root: string = ROOT): void {
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
function expectTrackedInitialEntriesOrCanonicalExtensions(
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

function parseModuleSource(source: string, displayPath: string): ParsedModule {
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
function parseModuleFile(relativePath: string, root: string = ROOT): ParsedModule {
  return parseModuleSource(readFileSync(path.join(root, relativePath), "utf8"), relativePath);
}
interface ImportBinding {
  readonly importedName: string | null;
  readonly localName: string;
}
function staticImportBindings(
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
function dynamicImportBindings(
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
function importedSymbolFromLib(
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
function collectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}
function callsOfIdentifier(sourceFile: ts.SourceFile, name: string): ts.CallExpression[] {
  return collectCalls(sourceFile).filter(
    (call) => ts.isIdentifier(call.expression) && call.expression.text === name
  );
}
function hasFunctionDeclaration(sourceFile: ts.SourceFile, name: string): boolean {
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
function propertyNameOf(property: ts.ObjectLiteralElementLike): string | null {
  if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
  if (
    ts.isPropertyAssignment(property) &&
    (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
  )
    return property.name.text;
  return null;
}
function objectArgumentKeys(call: ts.CallExpression): Set<string> {
  const first = call.arguments[0];
  if (!first || !ts.isObjectLiteralExpression(first)) return new Set();
  const keys = new Set<string>();
  for (const property of first.properties) {
    const name = propertyNameOf(property);
    if (name !== null) keys.add(name);
  }
  return keys;
}
function propertyValueOf(call: ts.CallExpression, key: string): ts.Expression | null {
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
const isFunctionLike = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isIdentifier(node);

// ---- Agent-result source analysis and unguarded-consumer detection ----

interface SourceAnalysis {
  readonly agentVars: ReadonlySet<string>;
  readonly collectionVars: ReadonlySet<string>;
}
function callCalleeIdentifier(node: ts.Node): string | null {
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
function addBindingNames(pattern: ts.BindingName, target: Set<string>): void {
  if (ts.isIdentifier(pattern)) {
    target.add(pattern.text);
    return;
  }
  for (const element of pattern.elements) {
    if (ts.isBindingElement(element) && ts.isIdentifier(element.name))
      target.add(element.name.text);
  }
}
function analyzeSources(sourceFile: ts.SourceFile): SourceAnalysis {
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
function rootIdentifier(expression: ts.Expression): string | null {
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
const isSplitCallChain = (expression: ts.Expression): boolean =>
  ts.isCallExpression(expression) &&
  ts.isPropertyAccessExpression(expression.expression) &&
  expression.expression.name.text === "split";

const IDENTITY_GUARD_CALL_NAMES = Object.freeze([
  "requireAllResults",
  "requirePass",
  "requireCleanAudit",
  "requireResult",
  "normalizeAuditFindings",
  "normalizeAuthorAuditResult",
]);
const IDENTITY_GUARD_FUNCTION_NAMES = Object.freeze([
  "requirePass",
  "requireCleanAudit",
  "requireResult",
  "normalizeAuditFindings",
  "normalizeAuthorAuditResult",
]);
const isIdentityGuardCall = (call: ts.CallExpression): boolean =>
  ts.isIdentifier(call.expression) && IDENTITY_GUARD_CALL_NAMES.includes(call.expression.text);

function unguardedAgentResultConsumers(sourceFile: ts.SourceFile): string[] {
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
function assertIdentityGuardCallSites(sourceFile: ts.SourceFile, displayPath: string): void {
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
interface UnguardedConsumerOptions {
  readonly rejectFilterBooleanBeforeValidation: boolean;
  readonly rejectFlattenCountOrCleanBeforeValidation: boolean;
  readonly requireTrustedOrderedIdentityEnvelopes: boolean;
  readonly allowUnrelatedDomainCollectionFiltering: boolean;
}
const FULL_UNGUARDED_CONSUMER_OPTIONS: UnguardedConsumerOptions = Object.freeze({
  rejectFilterBooleanBeforeValidation: true,
  rejectFlattenCountOrCleanBeforeValidation: true,
  requireTrustedOrderedIdentityEnvelopes: true,
  allowUnrelatedDomainCollectionFiltering: true,
});
function assertNoUnguardedAgentResultConsumer(
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

interface CanonicalDriver {
  readonly lib: string;
  readonly symbol: string;
}
const AUDIT_ROUNDS_DRIVER: CanonicalDriver = Object.freeze({
  lib: "audit-rounds.mjs",
  symbol: "runCanonicalAuditRounds",
});
const POST_AUDIT_DRIVER: CanonicalDriver = Object.freeze({
  lib: "post-audit.mjs",
  symbol: "runCanonicalPostAudit",
});
const hasDriverImportAndCall = (parsed: ParsedModule, driver: CanonicalDriver): boolean =>
  importedSymbolFromLib(parsed.sourceFile, driver.lib, driver.symbol) &&
  callsOfIdentifier(parsed.sourceFile, driver.symbol).length > 0;
function assertDriverImportAndCall(
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
function agentCallNodes(sourceFile: ts.SourceFile): ts.CallExpression[] {
  return collectCalls(sourceFile).filter(
    (call) => ts.isIdentifier(call.expression) && call.expression.text === "agent"
  );
}
function everyAgentCallFeedsGuard(sourceFile: ts.SourceFile, displayPath: string): void {
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
function assertLegacyExactIdentityGuardedDispatch(parsed: ParsedModule, displayPath: string): void {
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
function assertCanonicalDriverImportAndCall(
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

const TASK_554_CLOSEOUT_GUARDS = Object.freeze([
  "captureTask554CloseoutSnapshot",
  "normalizeTask554CloseoutSnapshot",
  "assertTask554BoardClosureDelta",
  "assertTask554ChangelogClosureDelta",
  "assertTask554TerminalStatusDelta",
  "validateTask554MetadataCloseout",
  "validateTask554TerminalCloseout",
]);
function assertTask554CloseoutGuardContract(parsed: ParsedModule, displayPath: string): void {
  if (agentCallNodes(parsed.sourceFile).length > 0)
    throw new Error(`${displayPath}: closeout guard must never dispatch agents`);
  if (
    importedSymbolFromLib(parsed.sourceFile, "audit-rounds.mjs", "runCanonicalAuditRounds") ||
    importedSymbolFromLib(parsed.sourceFile, "post-audit.mjs", "runCanonicalPostAudit")
  ) {
    throw new Error(`${displayPath}: closeout guard must not import agent drivers`);
  }
  for (const guard of TASK_554_CLOSEOUT_GUARDS) {
    if (!hasFunctionDeclaration(parsed.sourceFile, guard))
      throw new Error(`${displayPath}: closeout guard missing ${guard}`);
  }
  if (!/function selfTest\(|selfTest\(\)/u.test(parsed.source))
    throw new Error(`${displayPath}: closeout guard missing its self-test`);
  if (!/TASK_554_WORKFLOW_IMPORT/u.test(parsed.source))
    throw new Error(`${displayPath}: closeout guard missing the direct-invocation guard`);
}

// ---- Audit-round driver contract (author/audit workflows) ----

interface CanonicalAuditDriverOptions {
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
const FULL_AUDIT_DRIVER_OPTIONS: CanonicalAuditDriverOptions = Object.freeze({
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
function assertDriverLibRequiresAllResults(libBasename: string): void {
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
function assertCanonicalAuditDriver(
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

interface CanonicalPostAuditDriverOptions {
  readonly requireDeclaredIndependentLensIds: boolean;
  readonly requireAllResults: boolean;
  readonly requireExactOrderedIdentities: boolean;
  readonly fingerprintBeforeAndAfterPass: boolean;
  readonly fingerprintFixAndValidation: boolean;
  readonly deriveActualChangedLensesFromInputFingerprints: boolean;
  readonly requireDeclaredActualIdentitySetEquality: boolean;
  readonly invalidateAllReceiptsOnUnmappableChange: boolean;
}
const FULL_POST_AUDIT_DRIVER_OPTIONS: CanonicalPostAuditDriverOptions = Object.freeze({
  requireDeclaredIndependentLensIds: true,
  requireAllResults: true,
  requireExactOrderedIdentities: true,
  fingerprintBeforeAndAfterPass: true,
  fingerprintFixAndValidation: true,
  deriveActualChangedLensesFromInputFingerprints: true,
  requireDeclaredActualIdentitySetEquality: true,
  invalidateAllReceiptsOnUnmappableChange: true,
});
function declaredLensIds(sourceFile: ts.SourceFile): readonly string[] | null {
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
function assertLegacyPostAuditContract(
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
function assertCanonicalPostAuditDriver(
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

function assertPromptRequiresImmediateEvidenceValidation(source: string, file: string): void {
  if (
    !/(validateSmoke\s*\(|assertExactTask554SmokeEvidence|sameFingerprint\s*\(|normalizeAuditFindings\s*\()/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure prompts must validate evidence immediately`);
  }
}
function assertPromptReturnsOwnerActionRequiredBeforeTrackedAudit(
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
function assertPromptUsesCanonicalResumeCheckpoint(source: string, file: string): void {
  if (
    !/(createResumeCheckpoint|openWorkflowClosureResume|openTask543ClosureResume|RESUME_AFTER_FIX_ARG|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure flow must use a canonical resume checkpoint`);
  }
}
function assertPromptReturnsExactOwningWorkflowResumeArgv(source: string, file: string): void {
  if (
    !/(checkpointPath|checkpointSha256|runId|RESUME_AFTER_FIX_ARG|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: closure flow must return the exact owning-workflow resume argv`);
  }
}
function assertResumeEntryMatchesExecutingWorkflow(source: string, file: string): void {
  if (!/import\.meta\.url/u.test(source))
    throw new Error(`${file}: resume identity must derive from the executing import.meta.url`);
}
function assertPromptResumesWithRequireTracked(source: string, file: string): void {
  if (
    !/(checkpointSha256|assertResumePreflight|assertImplementationPreflight|resume_full_validation_post_audit_smoke)/u.test(
      source
    )
  ) {
    throw new Error(`${file}: resume must require tracked, identity-bound evidence`);
  }
}
function assertPromptValidatesMetadataOnlyClosureDelta(source: string, file: string): void {
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
function functionDeclarationBodyContains(
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
function assertResumeCannotDispatchImplementationStages(source: string, file: string): void {
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
function assertPromptNeverStagesAsAgent(source: string, file: string): void {
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
const FORBIDDEN_ACTION_PATTERNS = Object.freeze([
  /git\s+commit/iu,
  /commit\s+on\s+the\s+worktree/iu,
  /(?:scan|find|allocate|pick|choose|use)\s+(?:the\s+)?(?:next|highest)[- ]free/iu,
  /(?:highest|last|largest)\s*\+\s*1/iu,
  /smokeDeferred/iu,
  /smoke.{0,80}deferred/iu,
] as const);
function assertNoForbiddenPatterns(
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

// ---- Owning workflow entries: tracked, clean, task-bound, import.meta.url-only ----

interface OwningWorkflowRegistration {
  readonly importMetaUrl: string;
  readonly taskId: string;
  readonly role: WorkflowRole;
  readonly path: string;
}
function trackedOwningWorkflowRegistrations(): OwningWorkflowRegistration[] {
  return trackedWorkflowEntries().map((entry) => ({
    importMetaUrl: pathToFileURL(path.join(ROOT, entry.path)).href,
    taskId: entry.taskId ?? "unknown",
    role: entry.role,
    path: entry.path,
  }));
}
function deriveOnlyFromExecutingImportMetaUrl(importMetaUrl: string): string {
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
const isExactTask545BuiltinEntry = (entry: string): boolean =>
  Object.prototype.hasOwnProperty.call(INITIAL_MIGRATION_ROLES, basenameOf(entry));
function assertExactBuiltinTaskAndRoleBinding(entry: string, registeredTaskId: string): void {
  const role = INITIAL_MIGRATION_ROLES[basenameOf(entry)];
  if (!role) throw new Error(`entry is not an exact TASK-545 builtin: ${entry}`);
  const taskId = ENTRY_TASK_NUMBER.exec(basenameOf(entry))?.groups?.task;
  if (taskId !== registeredTaskId)
    throw new Error(
      `TASK-545 builtin task binding mismatch for ${entry}: registered ${registeredTaskId}`
    );
}
function assertCanonicalFutureEntry(
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
function assertNoCallerWorkflowEntryOverride(
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
function assertCanonicalTask545StaticContractsAndImports(
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

function createTrackedWorkflowRepo(): string {
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

// ---- Tests ----

const REQUIRED_TASK_545_DRIVER_SUPPORT = Object.freeze([
  "_docs/_workflows/lib/workflow-contracts.mjs",
  "_docs/_workflows/lib/workflow-contracts.d.mts",
  "_docs/_workflows/lib/audit-rounds.mjs",
  "_docs/_workflows/lib/audit-rounds.d.mts",
  "_docs/_workflows/lib/post-audit.mjs",
  "_docs/_workflows/lib/post-audit.d.mts",
] as const);
const INITIAL_MIGRATION_SET: ReadonlyArray<readonly [string, WorkflowRole]> = Object.freeze([
  ["task-522-author.mjs", "author-audit"],
  ["task-543-implement.mjs", "implement"],
  ["task-554-author-audit.mjs", "author-audit"],
  ["task-554-closeout.mjs", "closeout"],
  ["task-554-implement.mjs", "implement"],
  ["task-554-fix.mjs", "fix"],
]);

describe("TASK-545-01-L02 static workflow contract", () => {
  test("canonical driver runtime and declarations are tracked HEAD bytes", () => {
    for (const relativePath of REQUIRED_TASK_545_DRIVER_SUPPORT) {
      assertTrackedRegularFileNoSymlink(relativePath);
      assertBytesEqualGitShowHead(relativePath);
    }
  });

  test("initial migration entries and all future owners are tracked", () => {
    expectTrackedInitialEntriesOrCanonicalExtensions(
      trackedWorkflowEntries(),
      INITIAL_MIGRATION_SET
    );
  });

  test("agent-result collections use the all-results guard", () => {
    for (const entry of trackedWorkflowEntries()) {
      const parsed = parseModuleFile(entry.path);
      if (entry.role === "closeout") {
        assertTask554CloseoutGuardContract(parsed, entry.path);
        continue;
      }
      assertCanonicalDriverImportAndCall(parsed, entry.role, entry.path);
      assertNoUnguardedAgentResultConsumer(parsed, entry.path, FULL_UNGUARDED_CONSUMER_OPTIONS);
    }
  });

  test("canonical author/audit workflows run one complete pass and affected reruns", () => {
    for (const file of trackedWorkflowEntriesByRole("author-audit")) {
      assertCanonicalAuditDriver(
        readFileSync(path.join(ROOT, file), "utf8"),
        file,
        FULL_AUDIT_DRIVER_OPTIONS
      );
    }
  });

  test("implementation workflows declare and complete their independent post lenses", () => {
    for (const file of trackedWorkflowEntriesByRole("implement", "fix")) {
      assertCanonicalPostAuditDriver(
        readFileSync(path.join(ROOT, file), "utf8"),
        file,
        FULL_POST_AUDIT_DRIVER_OPTIONS
      );
    }
  });

  test("UI closure pauses for owner evidence staging", () => {
    for (const file of trackedUiClosureWorkflowFiles()) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      assertPromptRequiresImmediateEvidenceValidation(source, file);
      assertPromptReturnsOwnerActionRequiredBeforeTrackedAudit(source, file);
      assertPromptUsesCanonicalResumeCheckpoint(source, file);
      assertPromptReturnsExactOwningWorkflowResumeArgv(source, file);
      assertResumeEntryMatchesExecutingWorkflow(source, file);
      assertPromptResumesWithRequireTracked(source, file);
      assertPromptValidatesMetadataOnlyClosureDelta(source, file);
      assertResumeCannotDispatchImplementationStages(source, file);
      assertPromptNeverStagesAsAgent(source, file);
    }
  });

  test("owning workflow entries are tracked, clean, and task-bound", () => {
    for (const owner of trackedOwningWorkflowRegistrations()) {
      const entry = deriveOnlyFromExecutingImportMetaUrl(owner.importMetaUrl);
      if (isExactTask545BuiltinEntry(entry)) {
        assertExactBuiltinTaskAndRoleBinding(entry, owner.taskId);
      } else {
        assertCanonicalFutureEntry(entry, owner.taskId, {
          pattern: CANONICAL_FUTURE_PATH_PATTERN,
          requireTaskIdAndSuffixBinding: true,
          role: owner.role,
        });
      }
      assertTrackedRegularFileNoSymlink(entry);
      assertBytesEqualGitShowHead(entry);
      assertCanonicalTask545StaticContractsAndImports(entry, owner.role);
      assertNoCallerWorkflowEntryOverride(owner, entry);
    }
  });

  test("tracked prompts do not commit, allocate dynamically, or defer smoke", () => {
    for (const file of trackedWorkflowFiles()) {
      assertNoForbiddenPatterns(
        readFileSync(path.join(ROOT, file), "utf8"),
        file,
        FORBIDDEN_ACTION_PATTERNS
      );
    }
  });

  test("negative source fixtures fail exactly where the static contract rejects them", () => {
    const fixtures = path.join(ROOT, "tests/fixtures/workflows/static");
    const parseFixture = (filename: string, syntheticPath: string): ParsedModule =>
      parseModuleSource(readFileSync(path.join(fixtures, filename), "utf8"), syntheticPath);
    const allowed: ReadonlyArray<readonly [string, string, WorkflowRole]> = Object.freeze([
      ["future-author-audit.mjs", "_docs/_workflows/task-777-author-audit.mjs", "author-audit"],
      ["future-implement.mjs", "_docs/_workflows/task-777-implement.mjs", "implement"],
      ["future-fix.mjs", "_docs/_workflows/task-777-fix.mjs", "fix"],
      ["future-task-9999-implement.mjs", "_docs/_workflows/task-9999-implement.mjs", "implement"],
    ]);
    for (const [filename, syntheticPath, role] of allowed) {
      expect(classifyTrackedEntryOrThrow(syntheticPath).role).toBe(role);
      const parsed = parseFixture(filename, syntheticPath);
      assertCanonicalDriverImportAndCall(parsed, role, syntheticPath);
      assertNoUnguardedAgentResultConsumer(parsed, syntheticPath, FULL_UNGUARDED_CONSUMER_OPTIONS);
      if (role === "author-audit")
        assertCanonicalAuditDriver(parsed.source, syntheticPath, FULL_AUDIT_DRIVER_OPTIONS);
      else
        assertCanonicalPostAuditDriver(
          parsed.source,
          syntheticPath,
          FULL_POST_AUDIT_DRIVER_OPTIONS
        );
    }
    const domainParsed = parseFixture(
      "legal-domain-filter-boolean.mjs",
      "_docs/_workflows/task-777-implement.mjs"
    );
    expect(() =>
      assertNoUnguardedAgentResultConsumer(domainParsed, domainParsed.displayPath, {
        rejectFilterBooleanBeforeValidation: true,
        rejectFlattenCountOrCleanBeforeValidation: true,
        requireTrustedOrderedIdentityEnvelopes: true,
        allowUnrelatedDomainCollectionFiltering: true,
      })
    ).not.toThrow();
    expect(() =>
      assertNoUnguardedAgentResultConsumer(
        parseFixture(
          "unguarded-result-filter-false-clean.mjs",
          "_docs/_workflows/task-777-implement.mjs"
        ),
        "unguarded-result-filter-false-clean.mjs",
        FULL_UNGUARDED_CONSUMER_OPTIONS
      )
    ).toThrow(/filter\(Boolean\)/);
    expect(() =>
      assertNoUnguardedAgentResultConsumer(
        parseFixture(
          "flatten-count-clean-before-validation.mjs",
          "_docs/_workflows/task-777-implement.mjs"
        ),
        "flatten-count-clean-before-validation.mjs",
        FULL_UNGUARDED_CONSUMER_OPTIONS
      )
    ).toThrow(/flatMap|counts a filtered/);
    expect(() =>
      assertCanonicalDriverImportAndCall(
        parseFixture(
          "comment-only-static-contract-fake.mjs",
          "_docs/_workflows/task-777-author-audit.mjs"
        ),
        "author-audit",
        "comment-only-static-contract-fake.mjs"
      )
    ).toThrow(/missing canonical driver/);
    expect(() =>
      assertCanonicalDriverImportAndCall(
        parseFixture("missing-task545-imports.mjs", "_docs/_workflows/task-777-implement.mjs"),
        "implement",
        "missing-task545-imports.mjs"
      )
    ).toThrow(/no exact-identity result guard/);
    expect(() =>
      assertNoForbiddenPatterns(
        readFileSync(path.join(fixtures, "forbidden-prompt-actions.mjs"), "utf8"),
        "forbidden-prompt-actions.mjs",
        FORBIDDEN_ACTION_PATTERNS
      )
    ).toThrow(/forbidden action directive/);
    expect(() =>
      assertCanonicalFutureEntry("_docs/_workflows/task-556-implement.mjs", "555", {
        pattern: CANONICAL_FUTURE_PATH_PATTERN,
        requireTaskIdAndSuffixBinding: true,
        role: "implement",
      })
    ).toThrow(/task binding mismatch/);
    expect(() =>
      assertCanonicalFutureEntry("_docs/_workflows/task-555-fix.mjs", "555", {
        pattern: CANONICAL_FUTURE_PATH_PATTERN,
        requireTaskIdAndSuffixBinding: true,
        role: "implement",
      })
    ).toThrow(/suffix\/role binding mismatch/);
    expect(() => classifyTrackedEntryOrThrow("_docs/_workflows/task-1234-implement.mjs")).toThrow(
      /neither an initial TASK-545 entry nor a canonical future entry/
    );
    expect(() => classifyTrackedEntryOrThrow("_docs/_workflows/task-555-migrate.mjs")).toThrow(
      /neither an initial TASK-545 entry nor a canonical future entry/
    );
    const overrideOwner: OwningWorkflowRegistration = {
      importMetaUrl: pathToFileURL(path.join(ROOT, "_docs/_workflows/task-543-implement.mjs")).href,
      taskId: "543",
      role: "implement",
      path: "_docs/_workflows/task-554-implement.mjs",
    };
    expect(() =>
      assertNoCallerWorkflowEntryOverride(
        overrideOwner,
        deriveOnlyFromExecutingImportMetaUrl(overrideOwner.importMetaUrl)
      )
    ).toThrow(/caller workflow entry override/);
  });

  test("ignored local files cannot alter the tracked inventory and a missing canonical driver call is rejected", () => {
    const tempRoot = createTrackedWorkflowRepo();
    const fixturePath = path.join(ROOT, "tests/fixtures/workflows/static");
    try {
      expect(trackedWorkflowFiles(tempRoot)).toEqual(trackedWorkflowFiles(ROOT));
      expect(trackedWorkflowEntries(tempRoot).map((entry) => entry.path)).toEqual(
        trackedWorkflowEntries().map((entry) => entry.path)
      );
      writeFileSync(
        path.join(tempRoot, "_docs/_workflows/task-999-local-only.mjs"),
        "export const x = 1;\n"
      );
      writeFileSync(
        path.join(tempRoot, "_docs/_workflows/lib/ignored-local-helper.mjs"),
        "export const x = 1;\n"
      );
      expect(trackedWorkflowFiles(tempRoot)).toEqual(trackedWorkflowFiles(ROOT));
      expect(() =>
        assertTrackedRegularFileNoSymlink("_docs/_workflows/lib/ignored-local-helper.mjs", tempRoot)
      ).toThrow(/not tracked by git ls-files/);
      const authorPath = path.join(tempRoot, "_docs/_workflows/task-522-author.mjs");
      writeFileSync(authorPath, `${readFileSync(authorPath, "utf8")}\n// dirty\n`);
      expect(() =>
        assertBytesEqualGitShowHead("_docs/_workflows/task-522-author.mjs", tempRoot)
      ).toThrow(/bytes differ|unstaged changes/);
      execFileSync("git", ["checkout", "--", "_docs/_workflows/task-522-author.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      rmSync(path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs"));
      symlinkSync(
        "task-554-fix.mjs",
        path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs")
      );
      execFileSync("git", ["add", "-f", "_docs/_workflows/task-554-closeout.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      execFileSync("git", ["commit", "-qm", "symlink closeout"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      expect(() =>
        assertTrackedRegularFileNoSymlink("_docs/_workflows/task-554-closeout.mjs", tempRoot)
      ).toThrow(/not a regular non-symlink file/);
      rmSync(path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs"));
      execFileSync("git", ["checkout", "HEAD^", "--", "_docs/_workflows/task-554-closeout.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const missingDriver = readFileSync(
        path.join(fixturePath, "missing-task545-imports.mjs"),
        "utf8"
      );
      const futurePath = "_docs/_workflows/task-777-implement.mjs";
      writeFileSync(path.join(tempRoot, futurePath), missingDriver);
      execFileSync("git", ["add", "-f", futurePath], { cwd: tempRoot, stdio: "ignore" });
      execFileSync("git", ["commit", "-qm", "add missing-driver future entry"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const future = trackedWorkflowEntries(tempRoot).find((entry) => entry.path === futurePath);
      expect(future).toBeDefined();
      expect(() =>
        assertCanonicalTask545StaticContractsAndImports(future!.path, future!.role, tempRoot)
      ).toThrow(/no exact-identity result guard/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
