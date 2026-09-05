import { createRequire } from "node:module";
import type * as tsNS from "typescript";

import {
  type CallerFamily,
  type CallerOperation,
  type DiscoveredCaller,
  canonicalRecordId,
  fail,
  isCanonicalCoreSourceFile,
} from "./contracts";
import { canonicalizeDiscoveredCallers } from "./canonical";
import {
  clientKindForExpression,
  constructorKindForExpression,
  memberNames,
  rootIdentifier,
  rootIdentifierNode,
  transparentConditionalClientKindOrThrow,
  type ClientKind,
  type ConstructorKind,
} from "./clientExpressions";
import {
  assertSupportedNamespaceCapability,
  bindingNames,
  collectStaticCapabilityBindings,
  collectVariableCapabilityAliases,
  dynamicImportModule,
  isDbLikeSpecifier,
  isSessionWrapperCall,
  type DynamicImportBinding,
} from "./clientNamespaceAssignments";
import { createNodeScanIo, listCanonicalCoreFilesOrThrow } from "./fileDiscovery";
import type { InventoryScanIo } from "./fileDiscovery";
import { collectDatabaseLifecycleClientLoaderImportsOrThrow } from "./literalDynamicClientImports";
import {
  assertNoLiteralDynamicCapabilityAliasNameCollision,
  assertNoLiteralDynamicClientNamespaceEscape,
  assertNoLiteralDynamicNamespaceNameCollision,
  collectLiteralDynamicNamespaceBindings,
  type LiteralDynamicCapabilityBinding,
} from "./literalDynamicNamespaceSafety";
import { assertNoLiteralDynamicCapabilityEscape } from "./literalDynamicCapabilitySafety";
import { namedFunctionSymbol } from "./dynamicImportOrigins";
import type { DynamicImportProvenance } from "./dynamicImportProvenance";
import { dynamicCapabilityAliasKind } from "./dynamicCapabilityAliases";
import {
  assertNoPotentialNonliteralDynamicCapabilityUse,
  dynamicImportBindingName,
} from "./nonliteralDynamicImports";
import { scanIndexedSourcesOrThrow } from "./productionScan";

const require = createRequire(import.meta.url);
const defaultTs = require("typescript") as typeof tsNS;

export { listCanonicalCoreFilesOrThrow } from "./fileDiscovery";
export type { InventoryDirectoryEntry, InventoryScanIo } from "./fileDiscovery";
export type TypeScriptAdapter = typeof tsNS;

export type ScanSourceTextInput = Readonly<{
  file: string;
  text: string;
  ts?: TypeScriptAdapter;
}>;

export type ScanProductionDbCallersInput = Readonly<{
  root?: "core";
  io?: InventoryScanIo;
  readConcurrency?: number;
  ts?: TypeScriptAdapter;
}>;

type Candidate = Readonly<{
  node: tsNS.Node;
  anchor?: tsNS.Node;
  family: CallerFamily;
  operation: CallerOperation;
}>;

const DB_OPERATIONS = new Set<CallerOperation>([
  "select",
  "query",
  "execute",
  "insert",
  "update",
  "delete",
  "transaction",
  "batch",
]);
const DATABASE_LIKE_IDENTIFIER = /^(?:db|database|tx|sql|postgres)$|(?:db|database|postgres)$/i;
// A fixed 32-worker prefetch leaves CPU room for AST parsing; callers may use
// the bounded 64-worker ceiling for controlled scan seams without env sizing.
const DEFAULT_SCAN_READ_CONCURRENCY = 32;
const MAX_SCAN_READ_CONCURRENCY = 64;

function scriptKindForFile(ts: TypeScriptAdapter, file: string): tsNS.ScriptKind {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  return ts.ScriptKind.TS;
}

function capabilityRootForNode(
  ts: TypeScriptAdapter,
  node: tsNS.Node,
  bindings: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  isClientReferenceAllowed: (reference: tsNS.Identifier) => boolean
): tsNS.Identifier | null {
  if (ts.isCallExpression(node)) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) return null;
    const root = rootIdentifierNode(ts, node.expression);
    if (root === null) return null;
    if (
      constructorKindForExpression(
        ts,
        node.expression,
        constructors,
        constructorNamespaces,
        isClientReferenceAllowed
      ) !== null
    )
      return root;
    if (
      isSessionWrapperCall(
        ts,
        node.expression,
        sessionWrappers,
        sessionWrapperNamespaces,
        isClientReferenceAllowed
      )
    )
      return root;
    const client = clientKindForExpression(
      ts,
      node.expression,
      bindings,
      clientNamespaces,
      isClientReferenceAllowed
    );
    const terminal = ts.isPropertyAccessExpression(node.expression)
      ? (node.expression.name.text as CallerOperation)
      : null;
    if (
      client !== null &&
      terminal !== null &&
      (DB_OPERATIONS.has(terminal) || memberNames(ts, node.expression).includes("query"))
    )
      return root;
  }
  if (
    ts.isTaggedTemplateExpression(node) &&
    clientKindForExpression(ts, node.tag, bindings, clientNamespaces, isClientReferenceAllowed) !==
      null
  ) {
    return rootIdentifierNode(ts, node.tag);
  }
  return null;
}

function reachedDynamicImports(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  dynamicImports: readonly DynamicImportBinding[],
  dynamicImportProvenance: DynamicImportProvenance,
  bindings: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  isClientReferenceAllowed: (reference: tsNS.Identifier) => boolean
): ReadonlySet<tsNS.CallExpression> {
  if (dynamicImports.length === 0) return new Set<tsNS.CallExpression>();
  const reached = new Set<tsNS.CallExpression>();
  const visit = (node: tsNS.Node): void => {
    const root = capabilityRootForNode(
      ts,
      node,
      bindings,
      constructors,
      constructorNamespaces,
      sessionWrappers,
      sessionWrapperNamespaces,
      clientNamespaces,
      isClientReferenceAllowed
    );
    if (root !== null)
      for (const origin of dynamicImportProvenance.originsForExpression(root)) reached.add(origin);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return reached;
}

function candidateForNode(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  node: tsNS.Node,
  bindings: ReadonlyMap<string, ClientKind>,
  constructors: ReadonlyMap<string, ConstructorKind>,
  constructorNamespaces: ReadonlyMap<string, ConstructorKind>,
  sessionWrappers: ReadonlySet<string>,
  sessionWrapperNamespaces: ReadonlySet<string>,
  clientNamespaces: ReadonlyMap<string, ClientKind>,
  dynamicImports: ReadonlySet<tsNS.CallExpression>,
  dynamicImportProvenance: DynamicImportProvenance,
  isClientReferenceAllowed: (reference: tsNS.Identifier) => boolean,
  lifecycleLoaderImports: ReadonlySet<tsNS.CallExpression>
): Candidate | null {
  if (ts.isCallExpression(node)) {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (lifecycleLoaderImports.has(node)) return null;
      const dynamic = dynamicImportModule(ts, node, sourceFile.fileName);
      if (dynamic !== null && dynamicImports.has(node))
        return { node, family: "dynamic-db-import", operation: "import" };
      const [argument] = node.arguments;
      if (argument !== undefined && ts.isStringLiteral(argument) && argument.text === "./client") {
        fail("query_inventory_scan_invalid", "lifecycle-loader");
      }
      if (
        argument !== undefined &&
        ts.isStringLiteral(argument) &&
        dynamic === null &&
        isDbLikeSpecifier(argument.text)
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
      const binding = dynamicImportBindingName(ts, node);
      if (
        argument !== undefined &&
        !ts.isStringLiteral(argument) &&
        binding !== null &&
        /^(?:db|database|tx|sql|postgres|client|session)$/i.test(
          bindingNames(ts, binding).join("_")
        )
      ) {
        fail("query_inventory_scan_invalid", "dynamic-db-import");
      }
    }
    assertSupportedNamespaceCapability(
      ts,
      node.expression,
      constructors,
      constructorNamespaces,
      sessionWrappers,
      sessionWrapperNamespaces,
      clientNamespaces,
      isClientReferenceAllowed
    );
    const constructor = constructorKindForExpression(
      ts,
      node.expression,
      constructors,
      constructorNamespaces,
      isClientReferenceAllowed
    );
    if (constructor !== null) {
      return { node, family: "client-construction", operation: constructor };
    }
    if (ts.isIdentifier(node.expression) && !isClientReferenceAllowed(node.expression))
      fail("query_inventory_scan_invalid", "static-capability-shadow");
    if (
      ts.isIdentifier(node.expression) &&
      bindings.has(node.expression.text) &&
      isClientReferenceAllowed(node.expression)
    ) {
      fail("query_inventory_scan_invalid", "client-invocation");
    }
    if (ts.isPropertyAccessExpression(node.expression)) {
      const conditionalEscape = transparentConditionalClientKindOrThrow(
        ts,
        node.expression.expression,
        bindings,
        clientNamespaces,
        constructors,
        constructorNamespaces,
        isClientReferenceAllowed
      );
      if (conditionalEscape !== null) fail("query_inventory_scan_invalid", "client-conditional");
      const root = rootIdentifier(ts, node.expression);
      const rootNode = rootIdentifierNode(ts, node.expression);
      const terminal = node.expression.name.text as CallerOperation;
      const client = clientKindForExpression(
        ts,
        node.expression,
        bindings,
        clientNamespaces,
        isClientReferenceAllowed
      );
      if (client !== null && DB_OPERATIONS.has(terminal)) {
        // The lazy security-settings cache is anchored at its resolved `db`.
        const anchor =
          sourceFile.fileName === "core/services/settings/securitySettings.ts" &&
          rootNode !== null &&
          dynamicImportProvenance.originsForExpression(rootNode).length > 0
            ? rootNode
            : undefined;
        return {
          node,
          ...(anchor === undefined ? {} : { anchor }),
          family: client,
          operation: terminal,
        };
      }
      if (root !== null && client !== null && terminal !== "query") {
        const names = memberNames(ts, node.expression);
        if (
          !DB_OPERATIONS.has(terminal) &&
          names.includes("query") &&
          !names.some((name) => name !== "query" && DB_OPERATIONS.has(name as CallerOperation))
        ) {
          return { node, family: client, operation: "query" };
        }
      }
      if (root !== null && client !== null && clientNamespaces.has(root)) {
        fail("query_inventory_scan_invalid", "namespace-capability");
      }
      if (
        root !== null &&
        (!bindings.has(root) || rootNode === null || !isClientReferenceAllowed(rootNode)) &&
        DATABASE_LIKE_IDENTIFIER.test(root) &&
        (DB_OPERATIONS.has(terminal) || memberNames(ts, node.expression).includes("query"))
      ) {
        fail("query_inventory_scan_invalid", "unknown-db-alias");
      }
    }
  }
  if (ts.isTaggedTemplateExpression(node)) {
    assertSupportedNamespaceCapability(
      ts,
      node.tag,
      constructors,
      constructorNamespaces,
      sessionWrappers,
      sessionWrapperNamespaces,
      clientNamespaces,
      isClientReferenceAllowed
    );
    const root = rootIdentifier(ts, node.tag);
    if (
      root !== null &&
      clientKindForExpression(
        ts,
        node.tag,
        bindings,
        clientNamespaces,
        isClientReferenceAllowed
      ) !== null
    )
      return { node, family: "tagged-raw-sql", operation: "tag" };
    // A standalone `sql` tag imported from Drizzle is a schema/query fragment,
    // not an executed statement. Only a classified client/session/transaction
    // tag is inventory-worthy.
    const rootNode = rootIdentifierNode(ts, node.tag);
    if (
      root !== null &&
      root !== "sql" &&
      (!bindings.has(root) || rootNode === null || !isClientReferenceAllowed(rootNode)) &&
      DATABASE_LIKE_IDENTIFIER.test(root)
    )
      fail("query_inventory_scan_invalid", "unknown-db-tag");
  }
  if (ts.isElementAccessExpression(node)) {
    assertSupportedNamespaceCapability(
      ts,
      node.expression,
      constructors,
      constructorNamespaces,
      sessionWrappers,
      sessionWrapperNamespaces,
      clientNamespaces,
      isClientReferenceAllowed
    );
    const root = rootIdentifier(ts, node.expression);
    if (
      root !== null &&
      clientKindForExpression(
        ts,
        node.expression,
        bindings,
        clientNamespaces,
        isClientReferenceAllowed
      ) !== null
    )
      fail("query_inventory_scan_invalid", "database-element-access");
  }
  return null;
}

function candidateAnchorNode(ts: TypeScriptAdapter, candidate: Candidate): tsNS.Node {
  if (candidate.anchor !== undefined) return candidate.anchor;
  const { node } = candidate;
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name;
    return node.expression;
  }
  if (ts.isTaggedTemplateExpression(node)) return node.tag;
  return node;
}

export function scanSourceTextOrThrow(input: ScanSourceTextInput): readonly DiscoveredCaller[] {
  const ts = input.ts ?? defaultTs;
  if (!isCanonicalCoreSourceFile(input.file) || typeof input.text !== "string")
    fail("query_inventory_scan_invalid", "source-input");
  const sourceFile = ts.createSourceFile(
    input.file,
    input.text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(ts, input.file)
  );
  const parseDiagnostics = (
    sourceFile as tsNS.SourceFile & Readonly<{ parseDiagnostics?: readonly tsNS.Diagnostic[] }>
  ).parseDiagnostics;
  if (parseDiagnostics !== undefined && parseDiagnostics.length > 0)
    fail("query_inventory_scan_invalid", "parse-diagnostic");
  const literalDynamicNamespaces = collectLiteralDynamicNamespaceBindings(ts, sourceFile, (node) =>
    dynamicImportModule(ts, node, sourceFile.fileName)
  );
  const lifecycleLoaderImports = collectDatabaseLifecycleClientLoaderImportsOrThrow(ts, sourceFile);
  const {
    clients,
    constructors,
    constructorNamespaces,
    sessionWrappers,
    sessionWrapperNamespaces,
    clientNamespaces,
  } = collectStaticCapabilityBindings(ts, sourceFile);
  const {
    dynamicImports,
    dynamicCapabilityAliasNames,
    dynamicCapabilityAliasDeclarations,
    dynamicCapabilityAliasKinds,
    dynamicImportProvenance,
    isClientReferenceAllowed,
    literalDynamicThenNamespaces,
    nonliteralDynamicImportBindings,
  } = collectVariableCapabilityAliases(
    ts,
    sourceFile,
    clients,
    constructors,
    constructorNamespaces,
    sessionWrappers,
    sessionWrapperNamespaces,
    clientNamespaces,
    literalDynamicNamespaces
  );
  assertNoLiteralDynamicNamespaceNameCollision(ts, sourceFile, [
    ...literalDynamicNamespaces,
    ...literalDynamicThenNamespaces,
  ]);
  const literalDynamicBindings: LiteralDynamicCapabilityBinding[] = [];
  for (const dynamicImport of dynamicImports) {
    for (const declaration of dynamicImport.declarations) {
      const kind = dynamicCapabilityAliasKind(
        declaration.text,
        clients,
        constructors,
        constructorNamespaces,
        sessionWrappers,
        sessionWrapperNamespaces,
        clientNamespaces
      );
      if (kind === null) fail("query_inventory_scan_invalid", "dynamic-db-import");
      literalDynamicBindings.push(Object.freeze({ declaration, kind, name: declaration.text }));
    }
  }
  assertNoLiteralDynamicCapabilityAliasNameCollision(
    ts,
    sourceFile,
    literalDynamicBindings,
    dynamicCapabilityAliasNames,
    dynamicCapabilityAliasDeclarations,
    dynamicCapabilityAliasKinds
  );
  assertNoLiteralDynamicCapabilityEscape(ts, sourceFile, literalDynamicBindings);
  assertNoLiteralDynamicClientNamespaceEscape(ts, sourceFile, literalDynamicNamespaces);
  assertNoPotentialNonliteralDynamicCapabilityUse(ts, sourceFile, nonliteralDynamicImportBindings);
  const reachedImports = reachedDynamicImports(
    ts,
    sourceFile,
    dynamicImports,
    dynamicImportProvenance,
    clients,
    constructors,
    constructorNamespaces,
    sessionWrappers,
    sessionWrapperNamespaces,
    clientNamespaces,
    isClientReferenceAllowed
  );
  const candidates: Candidate[] = [];
  const visit = (node: tsNS.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      assertSupportedNamespaceCapability(
        ts,
        node,
        constructors,
        constructorNamespaces,
        sessionWrappers,
        sessionWrapperNamespaces,
        clientNamespaces,
        isClientReferenceAllowed
      );
    }
    const candidate = candidateForNode(
      ts,
      sourceFile,
      node,
      clients,
      constructors,
      constructorNamespaces,
      sessionWrappers,
      sessionWrapperNamespaces,
      clientNamespaces,
      reachedImports,
      dynamicImportProvenance,
      isClientReferenceAllowed,
      lifecycleLoaderImports
    );
    if (candidate !== null) candidates.push(candidate);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const discovered = candidates.map((candidate) => {
    const position = sourceFile.getLineAndCharacterOfPosition(
      candidateAnchorNode(ts, candidate).getStart(sourceFile)
    );
    const symbol = namedFunctionSymbol(ts, candidate.node);
    if (symbol === null) fail("query_inventory_scan_invalid", "source-symbol");
    const source = Object.freeze({
      file: input.file,
      symbol,
      line: position.line + 1,
      column: position.character + 1,
    });
    const caller = Object.freeze({ family: candidate.family, operation: candidate.operation });
    return Object.freeze({ id: canonicalRecordId(source, caller), source, caller });
  });
  return canonicalizeDiscoveredCallers(discovered);
}

export async function scanProductionDbCallers(
  input: ScanProductionDbCallersInput = {}
): Promise<readonly DiscoveredCaller[]> {
  const root = input.root ?? "core";
  const io = input.io ?? createNodeScanIo();
  const files = await listCanonicalCoreFilesOrThrow({ root, io });
  const requestedConcurrency = input.readConcurrency;
  if (
    requestedConcurrency !== undefined &&
    (!Number.isSafeInteger(requestedConcurrency) ||
      requestedConcurrency < 1 ||
      requestedConcurrency > MAX_SCAN_READ_CONCURRENCY)
  ) {
    fail("query_inventory_scan_invalid", "read-concurrency");
  }
  const readConcurrency =
    requestedConcurrency ?? (input.io === undefined ? DEFAULT_SCAN_READ_CONCURRENCY : 1);
  const discovered = await scanIndexedSourcesOrThrow({
    files,
    io,
    readConcurrency,
    scanSource: (file, text) => scanSourceTextOrThrow({ file, text, ts: input.ts }),
  });
  return canonicalizeDiscoveredCallers(discovered);
}
