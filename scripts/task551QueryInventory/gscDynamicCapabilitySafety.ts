/** Fail-closed AST allowlist for the two dynamic-DB GSC dependency containers. */
import type * as tsNS from "typescript";

import { isReferenceIdentifier } from "./literalDynamicNamespaceSafety";

type TypeScriptAdapter = typeof tsNS;
type Resolver = (reference: tsNS.Identifier) => tsNS.Identifier | null;

const SITEMAP_SUBMISSION_FILE = "core/services/seo/sitemapSubmissionService.ts";
const GSC_SYNC_FILE = "core/services/seo/gscSyncService.ts";

type GscResultSink = Readonly<{ name: string; index: number }>;

function directGscMemberCall(
  ts: TypeScriptAdapter,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): tsNS.CallExpression | null {
  const call = access.parent;
  return access.expression === reference &&
    access.questionDotToken === undefined &&
    ts.isCallExpression(call) &&
    call.expression === access &&
    call.questionDotToken === undefined &&
    !call.typeArguments?.length
    ? call
    : null;
}

function directTopLevelSinkArgument(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  reference: tsNS.Identifier,
  sink: GscResultSink
): boolean {
  const call = reference.parent;
  if (
    !ts.isCallExpression(call) ||
    call.arguments[sink.index] !== reference ||
    !ts.isIdentifier(call.expression) ||
    call.expression.text !== sink.name
  )
    return false;
  const declaration = resolver(call.expression);
  return declaration !== null && hasExactGscResultSinkDefinition(ts, sourceFile, declaration, sink);
}

function resultSink(sourceFile: tsNS.SourceFile, member: string): GscResultSink | null {
  if (sourceFile.fileName === SITEMAP_SUBMISSION_FILE && member === "request")
    return { name: "applySitemapStatusPayload", index: 1 };
  if (sourceFile.fileName === GSC_SYNC_FILE && member === "request")
    return { name: "extractRows", index: 0 };
  if (sourceFile.fileName === GSC_SYNC_FILE && member === "inspectUrl")
    return { name: "upsertIndexedPage", index: 1 };
  return null;
}

function hasExactTypeOnlyNamedImport(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  moduleSpecifier: string,
  name: string
): boolean {
  let exact = 0;
  let conflicting = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name?.text === name) {
        conflicting = true;
        continue;
      }
      const bindings = clause?.namedBindings;
      if (bindings === undefined) continue;
      if (ts.isNamespaceImport(bindings)) {
        if (bindings.name.text === name) conflicting = true;
        continue;
      }
      for (const element of bindings.elements) {
        if (element.name.text !== name) continue;
        if (
          ts.isStringLiteral(statement.moduleSpecifier) &&
          statement.moduleSpecifier.text === moduleSpecifier &&
          (clause?.isTypeOnly === true || element.isTypeOnly) &&
          (element.propertyName?.text ?? element.name.text) === name
        )
          exact += 1;
        else conflicting = true;
      }
      continue;
    }
    if (
      (ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name
        )) ||
      ((ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement)) &&
        statement.name?.text === name)
    )
      conflicting = true;
  }
  return exact === 1 && !conflicting;
}

function isExactTypeQuery(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  type: tsNS.TypeNode | undefined,
  name: string,
  moduleSpecifier: string
): boolean {
  return (
    type !== undefined &&
    ts.isTypeQueryNode(type) &&
    ts.isIdentifier(type.exprName) &&
    type.exprName.text === name &&
    hasExactTypeOnlyNamedImport(ts, sourceFile, moduleSpecifier, name)
  );
}

function isExactTypeReference(
  ts: TypeScriptAdapter,
  type: tsNS.TypeNode | undefined,
  name: string
): boolean {
  return (
    type !== undefined &&
    ts.isTypeReferenceNode(type) &&
    ts.isIdentifier(type.typeName) &&
    type.typeName.text === name &&
    !type.typeArguments?.length
  );
}

function isExactPromiseVoid(ts: TypeScriptAdapter, type: tsNS.TypeNode | undefined): boolean {
  if (
    type === undefined ||
    !ts.isTypeReferenceNode(type) ||
    !ts.isIdentifier(type.typeName) ||
    type.typeName.text !== "Promise"
  )
    return false;
  const [value] = type.typeArguments ?? [];
  return (
    value !== undefined &&
    value.kind === ts.SyntaxKind.VoidKeyword &&
    type.typeArguments?.length === 1
  );
}

function isExactUnknownArray(ts: TypeScriptAdapter, type: tsNS.TypeNode | undefined): boolean {
  return (
    type !== undefined &&
    ts.isArrayTypeNode(type) &&
    type.elementType.kind === ts.SyntaxKind.UnknownKeyword
  );
}

function isExactParameter(
  ts: TypeScriptAdapter,
  parameter: tsNS.ParameterDeclaration | undefined,
  name: string,
  matchesType: (type: tsNS.TypeNode | undefined) => boolean
): boolean {
  return (
    parameter !== undefined &&
    parameter.dotDotDotToken === undefined &&
    parameter.questionToken === undefined &&
    parameter.initializer === undefined &&
    ts.isIdentifier(parameter.name) &&
    parameter.name.text === name &&
    matchesType(parameter.type)
  );
}

function hasExactlyOneTopLevelBinding(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  declaration: tsNS.Identifier
): boolean {
  let count = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const candidate of statement.declarationList.declarations)
        if (ts.isIdentifier(candidate.name) && candidate.name.text === declaration.text) {
          if (candidate.name === declaration) count += 1;
          else return false;
        }
      continue;
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name?.text === declaration.text
    )
      return false;
    if (ts.isImportDeclaration(statement) && statement.importClause !== undefined) {
      const clause = statement.importClause;
      if (clause.name?.text === declaration.text) return false;
      const bindings = clause.namedBindings;
      if (
        bindings !== undefined &&
        (ts.isNamespaceImport(bindings)
          ? bindings.name.text === declaration.text
          : bindings.elements.some((element) => element.name.text === declaration.text))
      )
        return false;
    }
  }
  return count === 1;
}

function hasRequiredGscInspectionImport(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile
): boolean {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== "./gscClient" ||
      statement.importClause?.isTypeOnly !== true
    )
      return false;
    const bindings = statement.importClause.namedBindings;
    return (
      bindings !== undefined &&
      ts.isNamedImports(bindings) &&
      bindings.elements.some(
        (element) =>
          element.name.text === "GscInspectionResult" &&
          element.propertyName === undefined &&
          !element.isTypeOnly
      )
    );
  });
}

/** Binds the exceptional result paths to their concrete unexported production declarations. */
function hasExactGscResultSinkDefinition(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  declaration: tsNS.Identifier,
  sink: GscResultSink
): boolean {
  const variable = declaration.parent;
  if (
    !ts.isVariableDeclaration(variable) ||
    variable.name !== declaration ||
    !ts.isVariableDeclarationList(variable.parent) ||
    (variable.parent.flags & ts.NodeFlags.Const) === 0 ||
    variable.parent.declarations.length !== 1 ||
    !ts.isVariableStatement(variable.parent.parent) ||
    !ts.isSourceFile(variable.parent.parent.parent) ||
    !hasExactlyOneTopLevelBinding(ts, sourceFile, declaration) ||
    !ts.isArrowFunction(variable.initializer!) ||
    variable.initializer.typeParameters?.length ||
    !ts.isBlock(variable.initializer.body)
  )
    return false;
  const target = variable.initializer!;
  if (sink.name === "applySitemapStatusPayload")
    return (
      sourceFile.fileName === SITEMAP_SUBMISSION_FILE &&
      target.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true &&
      target.parameters.length === 2 &&
      isExactParameter(ts, target.parameters[0], "runtimeDb", (type) =>
        isExactTypeQuery(ts, sourceFile, type, "db", "../../db/client")
      ) &&
      isExactParameter(
        ts,
        target.parameters[1],
        "payload",
        (type) => type?.kind === ts.SyntaxKind.UnknownKeyword
      ) &&
      isExactPromiseVoid(ts, target.type)
    );
  if (sink.name === "extractRows")
    return (
      sourceFile.fileName === GSC_SYNC_FILE &&
      (target.modifiers?.length ?? 0) === 0 &&
      target.parameters.length === 1 &&
      isExactParameter(
        ts,
        target.parameters[0],
        "payload",
        (type) => type?.kind === ts.SyntaxKind.UnknownKeyword
      ) &&
      isExactUnknownArray(ts, target.type)
    );
  return (
    sink.name === "upsertIndexedPage" &&
    sourceFile.fileName === GSC_SYNC_FILE &&
    target.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) === true &&
    target.parameters.length === 3 &&
    isExactParameter(ts, target.parameters[0], "runtimeDb", (type) =>
      isExactTypeQuery(ts, sourceFile, type, "db", "../../db/client")
    ) &&
    isExactParameter(ts, target.parameters[1], "result", (type) =>
      isExactTypeReference(ts, type, "GscInspectionResult")
    ) &&
    isExactParameter(ts, target.parameters[2], "now", (type) =>
      isExactTypeReference(ts, type, "Date")
    ) &&
    isExactPromiseVoid(ts, target.type) &&
    hasRequiredGscInspectionImport(ts, sourceFile)
  );
}

function hasOnlyExactGscMemberResultUses(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  declaration: tsNS.Identifier,
  member: string
): boolean {
  const sink = resultSink(sourceFile, member);
  if (sink === null) return false;
  let used = false;
  let valid = true;
  const visit = (node: tsNS.Node): void => {
    if (!valid) return;
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      resolver(node) === declaration
    ) {
      used = true;
      if (!directTopLevelSinkArgument(ts, sourceFile, resolver, node, sink)) valid = false;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used && valid;
}

function exactGscMemberResultBinding(
  ts: TypeScriptAdapter,
  call: tsNS.CallExpression
): tsNS.Identifier | null {
  const awaited = call.parent;
  const declaration = awaited.parent;
  return ts.isAwaitExpression(awaited) &&
    awaited.expression === call &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === awaited &&
    declaration.type === undefined &&
    ts.isIdentifier(declaration.name) &&
    ts.isVariableDeclarationList(declaration.parent) &&
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0
    ? declaration.name
    : null;
}

function hasOnlyTemplateInterpolationUses(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  declaration: tsNS.Identifier
): boolean {
  let used = false;
  let valid = true;
  const visit = (node: tsNS.Node): void => {
    if (!valid) return;
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      resolver(node) === declaration
    ) {
      used = true;
      if (!ts.isTemplateSpan(node.parent) || node.parent.expression !== node) valid = false;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used && valid;
}

function isExactGscSiteUrlUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): boolean {
  const call = access.parent;
  if (
    access.expression !== reference ||
    access.questionDotToken !== undefined ||
    !ts.isCallExpression(call) ||
    !ts.isIdentifier(call.expression) ||
    call.expression.text !== "encodeURIComponent" ||
    call.arguments.length !== 1 ||
    call.arguments[0] !== access ||
    call.typeArguments?.length
  )
    return false;
  if (ts.isTemplateSpan(call.parent) && call.parent.expression === call) return true;
  const request = call.parent;
  if (
    ts.isCallExpression(request) &&
    request.arguments.includes(call) &&
    ts.isPropertyAccessExpression(request.expression) &&
    request.expression.name.text === "request" &&
    request.expression.questionDotToken === undefined &&
    ts.isIdentifier(request.expression.expression) &&
    resolver(request.expression.expression) === resolver(reference)
  )
    return true;
  const declaration = call.parent;
  return (
    sourceFile.fileName === GSC_SYNC_FILE &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer === call &&
    declaration.type === undefined &&
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "property" &&
    ts.isVariableDeclarationList(declaration.parent) &&
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
    hasOnlyTemplateInterpolationUses(ts, sourceFile, resolver, declaration.name)
  );
}

function isExactGscMemberCallUse(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  reference: tsNS.Identifier,
  access: tsNS.PropertyAccessExpression
): boolean {
  if (access.name.text !== "request" && access.name.text !== "inspectUrl") return false;
  const call = directGscMemberCall(ts, reference, access);
  if (call === null || !ts.isAwaitExpression(call.parent) || call.parent.expression !== call)
    return false;
  const target = call.parent.parent;
  if (ts.isExpressionStatement(target) && target.expression === call.parent) return true;
  const result = exactGscMemberResultBinding(ts, call);
  return (
    result !== null &&
    hasOnlyExactGscMemberResultUses(ts, sourceFile, resolver, result, access.name.text)
  );
}

/** Accepts only the concrete, non-forwarding GSC data flows in the two production services. */
export function hasOnlySafeGscClientUses(
  ts: TypeScriptAdapter,
  sourceFile: tsNS.SourceFile,
  resolver: Resolver,
  declaration: tsNS.Identifier
): boolean {
  if (sourceFile.fileName !== SITEMAP_SUBMISSION_FILE && sourceFile.fileName !== GSC_SYNC_FILE)
    return false;
  let used = false;
  let valid = true;
  const visit = (node: tsNS.Node): void => {
    if (!valid) return;
    if (
      ts.isIdentifier(node) &&
      isReferenceIdentifier(ts, node) &&
      resolver(node) === declaration
    ) {
      used = true;
      const access = node.parent;
      if (
        !ts.isPropertyAccessExpression(access) ||
        access.expression !== node ||
        access.questionDotToken !== undefined ||
        (access.name.text === "siteUrl"
          ? !isExactGscSiteUrlUse(ts, sourceFile, resolver, node, access)
          : !isExactGscMemberCallUse(ts, sourceFile, resolver, node, access))
      )
        valid = false;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used && valid;
}
