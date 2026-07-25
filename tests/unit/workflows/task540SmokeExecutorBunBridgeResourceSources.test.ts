import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  createSourceFile,
  isExportDeclaration,
  isFunctionDeclaration,
  isImportDeclaration,
  isNamedExports,
  isNamedImports,
  isStringLiteral,
  isVariableStatement,
  type Statement,
} from "typescript";

const root = path.resolve(import.meta.dir, "../../..");
const executorRelative = "_docs/_workflows/task-540-smoke-executor.mjs";
const resourceSourcesRelative =
  "_docs/_workflows/task-540-smoke/executor/bun-bridge-resource-sources.mjs";
const resourceSourcesSpecifier = "./task-540-smoke/executor/bun-bridge-resource-sources.mjs";
const cleanupOperationNames = ["provenance", "delete", "absence"] as const;

type CleanupOperation = (typeof cleanupOperationNames)[number];
type CleanupSourceRegistry = Readonly<Record<CleanupOperation, string>>;
type TaskTrafficSourceRegistry = Readonly<
  Record<"audit-log-task-ua" | "access-log-task-ua" | "session-task", CleanupSourceRegistry>
>;
type ResourceSourcesModule = Readonly<{
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE: string;
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE: string;
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE: string;
  MEDIA_EXACT_BRIDGE_SOURCES: CleanupSourceRegistry;
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES: CleanupSourceRegistry;
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES: CleanupSourceRegistry;
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES: TaskTrafficSourceRegistry;
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE: string;
  USER_EXACT_BRIDGE_SOURCES: CleanupSourceRegistry;
  USER_SETTING_EXACT_BRIDGE_SOURCES: CleanupSourceRegistry;
  assertSeoEntryDocumentExactBridgeSourcesFailClosed: (sources?: CleanupSourceRegistry) => boolean;
}>;

const resourceSourcesModule = import(
  pathToFileURL(path.join(root, resourceSourcesRelative)).href
) as Promise<ResourceSourcesModule>;

const privateBuilderNames = Object.freeze([
  "presentationOverrideExactBridgeSource",
  "seoEntryDocumentExactBridgeSource",
  "userSettingExactBridgeSource",
  "userExactBridgeSource",
  "exactTaskTrafficBridgeSource",
  "entityIdProvenanceBridgeSource",
  "mediaExactBridgeSource",
]);
const declarationNames = Object.freeze([
  "presentationOverrideExactBridgeSource",
  "PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES",
  "seoEntryDocumentExactBridgeSource",
  "SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES",
  "assertSeoEntryDocumentExactBridgeSourcesFailClosed",
  "userSettingExactBridgeSource",
  "USER_SETTING_EXACT_BRIDGE_SOURCES",
  "userExactBridgeSource",
  "USER_EXACT_BRIDGE_SOURCES",
  "TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE",
  "exactTaskTrafficBridgeSource",
  "TASK_TRAFFIC_EXACT_BRIDGE_SOURCES",
  "entityIdProvenanceBridgeSource",
  "CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE",
  "CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE",
  "CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE",
  "mediaExactBridgeSource",
  "MEDIA_EXACT_BRIDGE_SOURCES",
]);
const exportNames = Object.freeze([
  "CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE",
  "CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE",
  "CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE",
  "MEDIA_EXACT_BRIDGE_SOURCES",
  "PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES",
  "SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES",
  "TASK_TRAFFIC_EXACT_BRIDGE_SOURCES",
  "TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE",
  "USER_EXACT_BRIDGE_SOURCES",
  "USER_SETTING_EXACT_BRIDGE_SOURCES",
  "assertSeoEntryDocumentExactBridgeSourcesFailClosed",
]);

function readSource(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function parseSource(relativePath: string) {
  return createSourceFile(
    path.join(root, relativePath),
    readSource(relativePath),
    ScriptTarget.Latest,
    true,
    ScriptKind.JS
  );
}

function declarationName(statement: Statement): string | null {
  if (isFunctionDeclaration(statement)) {
    return statement.name?.text ?? null;
  }
  if (!isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
    return null;
  }
  return statement.declarationList.declarations[0].name.getText();
}

test("Bun bridge resource sources have one exact module owner", () => {
  const resourceSources = parseSource(resourceSourcesRelative);
  const imports = resourceSources.statements.filter(isImportDeclaration);
  expect(imports.map((declaration) => declaration.getText(resourceSources))).toEqual([
    'import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";',
    'import { CLEANUP_OPERATION_KINDS } from "./resource-contracts.mjs";',
    `import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "../runtime/bun-child-protocol.mjs";`,
  ]);

  const declarations = resourceSources.statements.filter(
    (statement) => isFunctionDeclaration(statement) || isVariableStatement(statement)
  );
  expect(declarations).toHaveLength(18);
  expect(declarations.map(declarationName)).toEqual(declarationNames);
  expect(resourceSources.statements).toHaveLength(22);
  for (const declaration of declarations) {
    expect(
      declaration.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false
    ).toBe(false);
  }
  expect(
    declarations
      .filter(isFunctionDeclaration)
      .map((declaration) => declaration.name?.text)
      .filter((name) => name !== "assertSeoEntryDocumentExactBridgeSourcesFailClosed")
  ).toEqual(privateBuilderNames);

  const exportDeclarations = resourceSources.statements.filter(isExportDeclaration);
  expect(exportDeclarations).toHaveLength(1);
  const [exportDeclaration] = exportDeclarations;
  expect(exportDeclaration.moduleSpecifier).toBeUndefined();
  expect(exportDeclaration.exportClause && isNamedExports(exportDeclaration.exportClause)).toBe(
    true
  );
  if (!exportDeclaration.exportClause || !isNamedExports(exportDeclaration.exportClause)) {
    throw new Error("Bun bridge resource source export block is absent");
  }
  expect(exportDeclaration.exportClause.elements.map((element) => element.name.text)).toEqual(
    exportNames
  );

  const executor = parseSource(executorRelative);
  const facadeImports = executor.statements
    .filter(isImportDeclaration)
    .filter(
      (declaration) =>
        isStringLiteral(declaration.moduleSpecifier) &&
        declaration.moduleSpecifier.text === resourceSourcesSpecifier
    );
  expect(facadeImports).toHaveLength(1);
  const facadeImportClause = facadeImports[0].importClause;
  const facadeBindings = facadeImportClause?.namedBindings;
  expect(facadeBindings && isNamedImports(facadeBindings)).toBe(true);
  if (!facadeBindings || !isNamedImports(facadeBindings)) {
    throw new Error("Bun bridge resource source facade binding is absent");
  }
  expect(facadeBindings.elements.map((element) => element.name.text)).toEqual(exportNames);

  const facadeDeclarationNames = executor.statements
    .map(declarationName)
    .filter((name): name is string => name !== null);
  for (const movedName of declarationNames) {
    expect(facadeDeclarationNames).not.toContain(movedName);
  }
});

test("Bun bridge resource registries retain exact frozen order and leaf coverage", async () => {
  const {
    CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
    CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
    CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
    MEDIA_EXACT_BRIDGE_SOURCES,
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
    TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
    TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
    USER_EXACT_BRIDGE_SOURCES,
    USER_SETTING_EXACT_BRIDGE_SOURCES,
  } = await resourceSourcesModule;
  for (const registry of [
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
    USER_SETTING_EXACT_BRIDGE_SOURCES,
    USER_EXACT_BRIDGE_SOURCES,
    MEDIA_EXACT_BRIDGE_SOURCES,
  ]) {
    expect(Object.keys(registry)).toEqual(cleanupOperationNames);
    expect(Object.isFrozen(registry)).toBe(true);
  }

  expect(Object.keys(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES)).toEqual([
    "audit-log-task-ua",
    "access-log-task-ua",
    "session-task",
  ]);
  expect(Object.isFrozen(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES)).toBe(true);
  for (const registry of Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES)) {
    expect(Object.keys(registry)).toEqual(cleanupOperationNames);
    expect(Object.isFrozen(registry)).toBe(true);
  }

  const leafSources = [
    ...Object.values(PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES),
    ...Object.values(SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES),
    ...Object.values(USER_SETTING_EXACT_BRIDGE_SOURCES),
    ...Object.values(USER_EXACT_BRIDGE_SOURCES),
    TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
    ...Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES).flatMap((registry) =>
      Object.values(registry)
    ),
    CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
    CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
    CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
    ...Object.values(MEDIA_EXACT_BRIDGE_SOURCES),
  ];
  expect(leafSources).toHaveLength(28);
  expect(new Set(leafSources).size).toBe(28);
  for (const source of leafSources) {
    expect(typeof source).toBe("string");
    expect(source).toContain("/*wf540-bound-input*/");
    expect(source).toContain('await Bun.write(Bun.stdout, canonical(output) + "\\n");');
  }
});

test("SEO entry source owner rejects exact-predicate mutants", async () => {
  const {
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
    assertSeoEntryDocumentExactBridgeSourcesFailClosed,
  } = await resourceSourcesModule;
  expect(assertSeoEntryDocumentExactBridgeSourcesFailClosed()).toBe(true);
  const mutantSources = [
    {
      ...SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
      provenance: SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance.replace(
        "eq(seoDocuments.targetId,targetId)",
        "eq(seoDocuments.targetId,id)"
      ),
    },
    {
      ...SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
      delete: SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete.replace(
        ".where(predicate).returning",
        ".where(eq(seoDocuments.id,id)).returning"
      ),
    },
    {
      ...SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
      absence: SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence + "like(",
    },
  ];
  for (const mutant of mutantSources) {
    expect(() => assertSeoEntryDocumentExactBridgeSourcesFailClosed(mutant)).toThrow(
      "source lost exact ID/type/target predicate authority"
    );
  }
});
