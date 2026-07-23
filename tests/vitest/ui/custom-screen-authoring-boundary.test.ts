import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  canHaveModifiers,
  createSourceFile,
  formatDiagnostics,
  forEachChild,
  getModifiers,
  isCallExpression,
  isExportAssignment,
  isExportDeclaration,
  isExternalModuleReference,
  isFunctionDeclaration,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportTypeNode,
  isLiteralTypeNode,
  isNamedExports,
  isNamedImports,
  isNamespaceExportDeclaration,
  isStringLiteral,
  parseJsonConfigFileContent,
  readConfigFile,
  resolveModuleName,
  sys,
  type CompilerOptions,
  type Diagnostic,
  type Node,
  type SourceFile,
} from "typescript";
import { describe, expect, test } from "vitest";

const repoRoot = process.cwd();

const readSourceFiles = async (
  directory: string
): Promise<Array<{ file: string; source: string }>> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return readSourceFiles(absolute);
      if (!/\.[cm]?[tj]sx?$/.test(entry.name)) return [];
      return [{ file: absolute, source: await readFile(absolute, "utf8") }];
    })
  );
  return nested.flat();
};

const expectNoForbiddenImports = (
  files: Array<{ file: string; source: string }>,
  forbidden: RegExp[]
) => {
  const violations = files.flatMap(({ file, source }) =>
    forbidden
      .filter((pattern) => pattern.test(source))
      .map((pattern) => `${path.relative(repoRoot, file)} matched ${pattern}`)
  );
  expect(violations).toEqual([]);
};

const customScreensRoot = "core/admin/ui/custom-screens";
const entryAuthoringModules = {
  facade: `${customScreensRoot}/CustomScreenEntryEditor.tsx`,
  session: `${customScreensRoot}/CustomScreenEntryRouteSession.tsx`,
  layout: `${customScreensRoot}/CustomScreenEntryEditorLayout.tsx`,
  panel: `${customScreensRoot}/CustomScreenEntryPresentationPanel.tsx`,
  runtime: `${customScreensRoot}/customScreenEntryRuntime.ts`,
  presentation: `${customScreensRoot}/customScreenEntryPresentation.ts`,
  media: `${customScreensRoot}/customScreenEntryPresentationMedia.ts`,
  hydrationHook: `${customScreensRoot}/hooks/useScreenEntryHydration.ts`,
  mediaHook: `${customScreensRoot}/hooks/useScreenEntryPresentationMedia.ts`,
} as const;
const builderAuthoringModules = {
  facade: `${customScreensRoot}/CustomScreenEditorPage.tsx`,
  model: `${customScreensRoot}/customScreenEditorModel.ts`,
  persistenceHook: `${customScreensRoot}/hooks/useCustomScreenEditorPersistence.ts`,
  actionsHook: `${customScreensRoot}/hooks/useCustomScreenDocumentActions.ts`,
  preview: `${customScreensRoot}/CustomScreenEditorPreviewOwner.tsx`,
  settings: `${customScreensRoot}/CustomScreenEditorSettingsPanel.tsx`,
  layout: `${customScreensRoot}/CustomScreenEditorLayout.tsx`,
  session: `${customScreensRoot}/CustomScreenEditorRouteSession.tsx`,
} as const;
const allAuthoringModulePaths = [
  ...Object.values(entryAuthoringModules),
  ...Object.values(builderAuthoringModules),
] as const;

type ModuleReference = {
  specifier: string;
  typeOnly: boolean;
  resolvedPath: string | null;
};

type ParsedAuthoringModule = {
  relativePath: string;
  sourceFile: SourceFile;
  references: ModuleReference[];
};

const diagnosticHost = {
  getCanonicalFileName: (fileName: string) => fileName,
  getCurrentDirectory: () => repoRoot,
  getNewLine: () => "\n",
};

const readCoreCompilerOptions = (): CompilerOptions => {
  const configPath = path.join(repoRoot, "core/tsconfig.json");
  const result = readConfigFile(configPath, sys.readFile);
  if (result.error) {
    throw new Error(formatDiagnostics([result.error], diagnosticHost));
  }
  const parsed = parseJsonConfigFileContent(result.config, sys, path.dirname(configPath));
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors, diagnosticHost));
  }
  return parsed.options;
};

const coreCompilerOptions = readCoreCompilerOptions();
const toRepoPath = (absolutePath: string) =>
  path.relative(repoRoot, path.normalize(absolutePath)).split(path.sep).join("/");
const isLocalSpecifier = (specifier: string) =>
  specifier.startsWith(".") || specifier.startsWith("@/");

const importDeclarationIsTypeOnly = (
  node: ReturnType<typeof createSourceFile>["statements"][number]
) => {
  if (!isImportDeclaration(node) || !node.importClause) return false;
  if (node.importClause.isTypeOnly) return true;
  const bindings = node.importClause.namedBindings;
  return (
    !node.importClause.name &&
    Boolean(
      bindings && isNamedImports(bindings) && bindings.elements.every((item) => item.isTypeOnly)
    )
  );
};

const collectModuleReferences = (sourceFile: SourceFile) => {
  const references: Array<Omit<ModuleReference, "resolvedPath">> = [];
  const add = (specifier: string, typeOnly: boolean) => {
    references.push({ specifier, typeOnly });
  };
  const visit = (node: Node) => {
    if (isImportDeclaration(node) && isStringLiteral(node.moduleSpecifier)) {
      add(node.moduleSpecifier.text, importDeclarationIsTypeOnly(node));
    } else if (
      isExportDeclaration(node) &&
      node.moduleSpecifier &&
      isStringLiteral(node.moduleSpecifier)
    ) {
      const namedExports = node.exportClause && isNamedExports(node.exportClause);
      add(
        node.moduleSpecifier.text,
        node.isTypeOnly ||
          Boolean(namedExports && node.exportClause.elements.every((item) => item.isTypeOnly))
      );
    } else if (
      isImportEqualsDeclaration(node) &&
      isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      isStringLiteral(node.moduleReference.expression)
    ) {
      add(node.moduleReference.expression.text, node.isTypeOnly);
    } else if (
      isImportTypeNode(node) &&
      isLiteralTypeNode(node.argument) &&
      isStringLiteral(node.argument.literal)
    ) {
      add(node.argument.literal.text, true);
    } else if (
      isCallExpression(node) &&
      (node.expression.kind === SyntaxKind.ImportKeyword ||
        (isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const [argument] = node.arguments;
      if (!argument || !isStringLiteral(argument)) {
        throw new Error(`${sourceFile.fileName} contains a non-literal module load`);
      }
      add(argument.text, false);
    }
    forEachChild(node, visit);
  };
  forEachChild(sourceFile, visit);
  return references;
};

const readAuthoringModule = async (relativePath: string): Promise<ParsedAuthoringModule> => {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = await readFile(absolutePath, "utf8");
  if (!source.trim()) throw new Error(`${relativePath} is empty`);
  const sourceFile = createSourceFile(
    absolutePath,
    source,
    ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS
  );
  const parseDiagnostics = (sourceFile as SourceFile & { parseDiagnostics?: readonly Diagnostic[] })
    .parseDiagnostics;
  if (parseDiagnostics && parseDiagnostics.length > 0) {
    throw new Error(formatDiagnostics([...parseDiagnostics], diagnosticHost));
  }
  if (sourceFile.statements.length === 0) {
    throw new Error(`${relativePath} produced an empty TypeScript AST`);
  }

  const references = collectModuleReferences(sourceFile).map((reference) => {
    const resolved = resolveModuleName(
      reference.specifier,
      absolutePath,
      coreCompilerOptions,
      sys
    ).resolvedModule;
    if (isLocalSpecifier(reference.specifier) && !resolved) {
      throw new Error(`${relativePath} has unresolved local module ${reference.specifier}`);
    }
    return {
      ...reference,
      resolvedPath: resolved ? toRepoPath(resolved.resolvedFileName) : null,
    };
  });
  return { relativePath, sourceFile, references };
};

const readAuthoringModules = async (relativePaths: readonly string[]) =>
  Promise.all(relativePaths.map(readAuthoringModule));

const buildInternalGraph = (
  modules: readonly ParsedAuthoringModule[],
  internalPaths: ReadonlySet<string>
) =>
  new Map(
    modules.map((module) => [
      module.relativePath,
      [
        ...new Set(
          module.references.flatMap(({ resolvedPath }) =>
            resolvedPath && internalPaths.has(resolvedPath) ? [resolvedPath] : []
          )
        ),
      ].sort(),
    ])
  );

const graphAsObject = (graph: ReadonlyMap<string, readonly string[]>) =>
  Object.fromEntries([...graph].sort(([left], [right]) => left.localeCompare(right)));

const findImportCycles = (graph: ReadonlyMap<string, readonly string[]>) => {
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const cycles: string[] = [];
  const visit = (modulePath: string) => {
    if (active.has(modulePath)) {
      const cycleStart = stack.indexOf(modulePath);
      cycles.push([...stack.slice(cycleStart), modulePath].join(" -> "));
      return;
    }
    if (visited.has(modulePath)) return;
    active.add(modulePath);
    stack.push(modulePath);
    for (const dependency of graph.get(modulePath) ?? []) visit(dependency);
    stack.pop();
    active.delete(modulePath);
    visited.add(modulePath);
  };
  for (const modulePath of [...graph.keys()].sort()) visit(modulePath);
  return cycles;
};

const findCrossFamilyEdges = (
  graph: ReadonlyMap<string, readonly string[]>,
  firstFamily: ReadonlySet<string>,
  secondFamily: ReadonlySet<string>
) =>
  [...graph]
    .flatMap(([source, dependencies]) =>
      dependencies.flatMap((dependency) =>
        (firstFamily.has(source) && secondFamily.has(dependency)) ||
        (secondFamily.has(source) && firstFamily.has(dependency))
          ? [`${source} -> ${dependency}`]
          : []
      )
    )
    .sort();

const containsIdentifier = (sourceFile: SourceFile, expected: string) => {
  let found = false;
  const visit = (node: Node) => {
    if (isIdentifier(node) && node.text === expected) found = true;
    if (!found) forEachChild(node, visit);
  };
  forEachChild(sourceFile, visit);
  return found;
};

const isAdminClientPath = (relativePath: string | null) =>
  Boolean(relativePath && /^core\/admin\/services\/[^/]*Client\.[cm]?[tj]sx?$/.test(relativePath));
const isCacheBusPath = (relativePath: string | null) =>
  relativePath === "core/admin/utils/cacheBus.ts";

const forbiddenPageOrWidgetReferences = (modules: readonly ParsedAuthoringModule[]) =>
  modules.flatMap((module) => {
    const violations = module.references.flatMap(({ specifier, resolvedPath }) => {
      const forbidden =
        specifier.includes("ui/pages/builder") ||
        specifier.startsWith("@/ui/pages") ||
        specifier.includes("ui/widgets/registry") ||
        specifier.startsWith("@/ui/widgets") ||
        specifier.includes("WidgetRenderer") ||
        Boolean(
          resolvedPath &&
          (resolvedPath.startsWith("core/admin/ui/pages/") ||
            resolvedPath.startsWith("core/admin/ui/widgets/") ||
            resolvedPath.startsWith("core/widgets/") ||
            resolvedPath.endsWith("/WidgetRenderer.tsx"))
        );
      return forbidden ? [`${module.relativePath} -> ${specifier}`] : [];
    });
    if (containsIdentifier(module.sourceFile, "WidgetRenderer")) {
      violations.push(`${module.relativePath} references WidgetRenderer`);
    }
    return violations;
  });

const pureOwnerViolations = (modules: readonly ParsedAuthoringModule[]) =>
  modules.flatMap((module) => {
    const violations = module.references.flatMap(({ specifier, resolvedPath }) => {
      const forbidden =
        specifier === "react" ||
        specifier.startsWith("react/") ||
        specifier === "bun" ||
        specifier.startsWith("bun:") ||
        specifier.startsWith("node:") ||
        isAdminClientPath(resolvedPath) ||
        isCacheBusPath(resolvedPath) ||
        Boolean(
          resolvedPath &&
          (resolvedPath.startsWith("core/admin/ui/") ||
            resolvedPath.startsWith("core/db/") ||
            resolvedPath.startsWith("core/server/") ||
            resolvedPath.includes("/runtime/"))
        );
      return forbidden ? [`${module.relativePath} -> ${specifier}`] : [];
    });
    if (containsIdentifier(module.sourceFile, "Bun")) {
      violations.push(`${module.relativePath} references Bun`);
    }
    return violations;
  });

const viewBoundaryViolations = (modules: readonly ParsedAuthoringModule[]) =>
  modules.flatMap((module) =>
    module.references.flatMap(({ specifier, resolvedPath }) =>
      (resolvedPath?.includes("/hooks/") ?? false) || isAdminClientPath(resolvedPath)
        ? [`${module.relativePath} -> ${specifier}`]
        : []
    )
  );

const hookBoundaryViolations = (
  modules: readonly ParsedAuthoringModule[],
  forbiddenFamilyPaths: ReadonlySet<string>
) =>
  modules.flatMap((module) =>
    module.references.flatMap(({ specifier, resolvedPath }) =>
      resolvedPath &&
      (resolvedPath.includes("/hooks/") ||
        forbiddenFamilyPaths.has(resolvedPath) ||
        (/^core\/admin\/ui\/custom-screens\/(?:Custom|Screen).*\.tsx$/.test(resolvedPath) &&
          resolvedPath !== module.relativePath))
        ? [`${module.relativePath} -> ${specifier}`]
        : []
    )
  );

const readReexportSignatures = (module: ParsedAuthoringModule) => {
  const signatures: string[] = [];
  for (const statement of module.sourceFile.statements) {
    if (!isExportDeclaration(statement)) continue;
    if (!statement.exportClause || !isNamedExports(statement.exportClause)) {
      throw new Error(`${module.relativePath} must not use export-star declarations`);
    }
    const specifier =
      statement.moduleSpecifier && isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null;
    const owner = specifier
      ? module.references.find((reference) => reference.specifier === specifier)?.resolvedPath
      : null;
    for (const element of statement.exportClause.elements) {
      const exportedName = element.name.text;
      const ownerName = element.propertyName?.text ?? exportedName;
      const typeOnly = statement.isTypeOnly || element.isTypeOnly;
      signatures.push(
        `${typeOnly ? "type" : "value"}:${exportedName}<-${ownerName}@${owner ?? "<local>"}`
      );
    }
  }
  return signatures.sort();
};

const localFacadeExportViolations = (
  module: Pick<ParsedAuthoringModule, "relativePath" | "sourceFile">,
  expectedComponentName: string
) => {
  const violations: string[] = [];
  let exactComponentExports = 0;
  for (const statement of module.sourceFile.statements) {
    if (isExportAssignment(statement)) {
      violations.push(`${module.relativePath} has an export assignment`);
      continue;
    }
    if (isNamespaceExportDeclaration(statement)) {
      violations.push(`${module.relativePath} has a namespace export declaration`);
      continue;
    }
    if (isExportDeclaration(statement)) {
      if (!statement.moduleSpecifier) {
        violations.push(`${module.relativePath} has a local export declaration`);
      }
      continue;
    }
    if (!canHaveModifiers(statement)) continue;
    const modifiers = getModifiers(statement) ?? [];
    const hasExportModifier = modifiers.some(
      ({ kind }) => kind === SyntaxKind.ExportKeyword || kind === SyntaxKind.DefaultKeyword
    );
    if (!hasExportModifier) continue;
    const isExactComponent =
      isFunctionDeclaration(statement) &&
      statement.name?.text === expectedComponentName &&
      statement.body !== undefined &&
      modifiers.length === 1 &&
      modifiers[0]?.kind === SyntaxKind.ExportKeyword;
    if (isExactComponent) {
      exactComponentExports += 1;
      continue;
    }
    violations.push(
      `${module.relativePath} has forbidden local export ${SyntaxKind[statement.kind]}`
    );
  }
  if (exactComponentExports !== 1) {
    violations.push(
      `${module.relativePath} exports ${exactComponentExports} exact ${expectedComponentName} components`
    );
  }
  return violations;
};

const parseFacadeMutation = (
  source: string
): Pick<ParsedAuthoringModule, "relativePath" | "sourceFile"> => ({
  relativePath: "synthetic-facade.ts",
  sourceFile: createSourceFile(
    "synthetic-facade.ts",
    source,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS
  ),
});

const reexportSignatures = (owner: string, kind: "type" | "value", names: readonly string[]) =>
  names.map((name) => `${kind}:${name}<-${name}@${owner}`).sort();

describe("custom screen authoring boundaries", () => {
  test("screen canvas reserves panel clearance only at the wide breakpoint", async () => {
    const source = await readFile(
      path.join(repoRoot, "core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx"),
      "utf8"
    );

    expect(source).toContain('import { cn } from "@/lib/utils";');
    expect(source).toContain(
      '"min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"'
    );
    expect(source).toContain('panelOpen && "lg:pr-[332px]"');
    expect(source).toContain('data-screen-canvas-panel-open={panelOpen ? "true" : undefined}');
    expect(source).not.toMatch(/paddingRight\s*:\s*300/);
  });

  test("neutral authoring modules stay UI-only", async () => {
    const files = await readSourceFiles(path.join(repoRoot, "core/admin/ui/authoring"));

    expectNoForbiddenImports(files, [
      /custom-screens/,
      /customScreens/,
      /\/pages\//,
      /services\/pages/,
      /services\/customScreens/,
      /widgets\/registry/,
      /WidgetRenderer/,
      /db\/client/,
      /server\//,
      /\bBun\./,
    ]);
  });

  test("active custom screen canvas modules do not import page builder or widget runtime code", async () => {
    const files = await Promise.all(
      [
        "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
        "core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx",
        "core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx",
        "core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx",
        "core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx",
        "core/admin/ui/custom-screens/CustomScreenPreview.tsx",
        "core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx",
        "core/admin/ui/custom-screens/ScreenBlockInspector.tsx",
        "core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts",
      ].map(async (relative) => ({
        file: path.join(repoRoot, relative),
        source: await readFile(path.join(repoRoot, relative), "utf8"),
      }))
    );

    expectNoForbiddenImports(files, [
      /ui\/pages\/builder/,
      /@\/ui\/pages/,
      /ui\/widgets\/registry/,
      /@\/ui\/widgets/,
      /WidgetRenderer/,
    ]);
  });

  test("page editor modules do not import custom screen UI or services", async () => {
    const files = await readSourceFiles(path.join(repoRoot, "core/admin/ui/pages"));

    expectNoForbiddenImports(files, [/custom-screens/, /customScreens/]);
  });

  test("split authoring graph covers all seventeen modules without cycles or retained runtime edges", async () => {
    expect(allAuthoringModulePaths).toHaveLength(17);
    expect(new Set(allAuthoringModulePaths)).toHaveLength(17);

    const modules = await readAuthoringModules(allAuthoringModulePaths);
    expect(modules.map(({ relativePath }) => relativePath).sort()).toEqual(
      [...allAuthoringModulePaths].sort()
    );
    expect(forbiddenPageOrWidgetReferences(modules)).toEqual([]);

    const graph = buildInternalGraph(modules, new Set(allAuthoringModulePaths));
    expect([...graph.keys()].sort()).toEqual([...allAuthoringModulePaths].sort());
    expect(findImportCycles(graph)).toEqual([]);
    const entryPaths = new Set<string>(Object.values(entryAuthoringModules));
    const builderPaths = new Set<string>(Object.values(builderAuthoringModules));
    expect(findCrossFamilyEdges(graph, entryPaths, builderPaths)).toEqual([]);

    const crossEdgeMutation = new Map(
      [...graph].map(([modulePath, dependencies]) => [modulePath, [...dependencies]])
    );
    crossEdgeMutation.set(entryAuthoringModules.runtime, [builderAuthoringModules.model]);
    crossEdgeMutation.set(builderAuthoringModules.model, [entryAuthoringModules.runtime]);
    expect(findCrossFamilyEdges(crossEdgeMutation, entryPaths, builderPaths)).toEqual(
      [
        `${entryAuthoringModules.runtime} -> ${builderAuthoringModules.model}`,
        `${builderAuthoringModules.model} -> ${entryAuthoringModules.runtime}`,
      ].sort()
    );
  });

  test("entry editor split pins its compatibility surface and one-way dependency graph", async () => {
    const entryPaths = Object.values(entryAuthoringModules);
    const modules = await readAuthoringModules(entryPaths);
    const byPath = new Map(modules.map((module) => [module.relativePath, module]));
    const graph = buildInternalGraph(modules, new Set(entryPaths));
    const expectedGraph = new Map<string, readonly string[]>([
      [
        entryAuthoringModules.facade,
        [
          entryAuthoringModules.media,
          entryAuthoringModules.presentation,
          entryAuthoringModules.session,
        ].sort(),
      ],
      [
        entryAuthoringModules.session,
        [
          entryAuthoringModules.hydrationHook,
          entryAuthoringModules.layout,
          entryAuthoringModules.mediaHook,
          entryAuthoringModules.presentation,
          entryAuthoringModules.runtime,
        ].sort(),
      ],
      [entryAuthoringModules.layout, [entryAuthoringModules.panel]],
      [entryAuthoringModules.panel, [entryAuthoringModules.presentation]],
      [entryAuthoringModules.runtime, []],
      [entryAuthoringModules.presentation, []],
      [entryAuthoringModules.media, []],
      [
        entryAuthoringModules.hydrationHook,
        [entryAuthoringModules.presentation, entryAuthoringModules.runtime].sort(),
      ],
      [
        entryAuthoringModules.mediaHook,
        [entryAuthoringModules.media, entryAuthoringModules.runtime].sort(),
      ],
    ]);
    expect(graphAsObject(graph)).toEqual(graphAsObject(expectedGraph));

    const facade = byPath.get(entryAuthoringModules.facade);
    expect(facade).toBeDefined();
    expect(
      facade ? localFacadeExportViolations(facade, "CustomScreenEntryEditor") : ["facade missing"]
    ).toEqual([]);
    expect([...new Set(facade?.references.map(({ specifier }) => specifier))].sort()).toEqual(
      [
        "./CustomScreenEntryRouteSession",
        "./customScreenEntryPresentation",
        "./customScreenEntryPresentationMedia",
        "./routeParams",
        "@/ui/contexts/AdminRouterContext",
        "react",
      ].sort()
    );

    const exactComponentSource = "export function CustomScreenEntryEditor() {}";
    expect(
      localFacadeExportViolations(
        parseFacadeMutation(
          `${exactComponentSource}\nexport { helper } from "./customScreenEntryPresentation";`
        ),
        "CustomScreenEntryEditor"
      )
    ).toEqual([]);
    const forbiddenLocalExportMutations = [
      "export type Hidden = string;",
      "export interface Hidden {}",
      "export declare function Hidden(): void;",
      "export class Hidden {}",
      "export enum Hidden { Value }",
      "export namespace Hidden { export const value = 1; }",
      "export as namespace Hidden;",
      "export const hidden = 1;",
      "export default function Hidden() {}",
      "const hidden = 1; export default hidden;",
      "const hidden = 1; export = hidden;",
      "type Hidden = string; export type { Hidden };",
      "export async function CustomScreenEntryEditor() {}",
      "export declare function CustomScreenEntryEditor(): void;",
    ];
    for (const mutation of forbiddenLocalExportMutations) {
      expect(
        localFacadeExportViolations(
          parseFacadeMutation(`${exactComponentSource}\n${mutation}`),
          "CustomScreenEntryEditor"
        ),
        mutation
      ).not.toEqual([]);
    }

    const presentationValues = [
      "filterRenderableScreenEntryPresentationOverrides",
      "isDraftAuthorityClean",
      "resolvePresentationDraftTransition",
    ] as const;
    const mediaValues = [
      "PRESENTATION_MEDIA_LOAD_ERROR",
      "allocateMediaAttempt",
      "buildEntryRouteKey",
      "buildPresentationMediaRequestKey",
      "collectWinningDirectImageAssetIds",
      "decodeAndValidatePresentationMediaRequestKey",
      "initializeMediaMachineState",
      "mediaAttemptReducer",
      "projectExactRequestedMediaUrls",
      "readRequestedIdsFromMediaRequestKey",
    ] as const;
    const mediaTypes = [
      "MediaAttempt",
      "MediaAttemptAction",
      "MediaAttemptCause",
      "MediaAttemptInput",
      "MediaMachineState",
    ] as const;
    expect(facade ? readReexportSignatures(facade) : []).toEqual(
      [
        ...reexportSignatures(entryAuthoringModules.presentation, "value", presentationValues),
        ...reexportSignatures(entryAuthoringModules.media, "value", mediaValues),
        ...reexportSignatures(entryAuthoringModules.media, "type", mediaTypes),
      ].sort()
    );

    expect(
      pureOwnerViolations(
        [
          entryAuthoringModules.runtime,
          entryAuthoringModules.presentation,
          entryAuthoringModules.media,
        ].flatMap((modulePath) => (byPath.get(modulePath) ? [byPath.get(modulePath)!] : []))
      )
    ).toEqual([]);
    expect(
      viewBoundaryViolations(
        [entryAuthoringModules.layout, entryAuthoringModules.panel].flatMap((modulePath) =>
          byPath.get(modulePath) ? [byPath.get(modulePath)!] : []
        )
      )
    ).toEqual([]);
    expect(
      hookBoundaryViolations(
        [entryAuthoringModules.hydrationHook, entryAuthoringModules.mediaHook].flatMap(
          (modulePath) => (byPath.get(modulePath) ? [byPath.get(modulePath)!] : [])
        ),
        new Set([
          entryAuthoringModules.facade,
          entryAuthoringModules.session,
          entryAuthoringModules.layout,
          entryAuthoringModules.panel,
        ])
      )
    ).toEqual([]);

    const [facadeRuntime, presentationOwner, mediaOwner] = await Promise.all([
      import("../../../core/admin/ui/custom-screens/CustomScreenEntryEditor"),
      import("../../../core/admin/ui/custom-screens/customScreenEntryPresentation"),
      import("../../../core/admin/ui/custom-screens/customScreenEntryPresentationMedia"),
    ]);
    const facadeValues = facadeRuntime as Record<string, unknown>;
    const presentationOwnerValues = presentationOwner as Record<string, unknown>;
    const mediaOwnerValues = mediaOwner as Record<string, unknown>;
    expect(Object.keys(facadeValues).sort()).toEqual(
      ["CustomScreenEntryEditor", ...presentationValues, ...mediaValues].sort()
    );
    for (const name of presentationValues) {
      expect(facadeValues[name], name).toBe(presentationOwnerValues[name]);
    }
    for (const name of mediaValues) {
      expect(facadeValues[name], name).toBe(mediaOwnerValues[name]);
    }
  }, 15_000);

  test("screen builder split pins its five live helpers and coordinator boundaries", async () => {
    const builderPaths = Object.values(builderAuthoringModules);
    const modules = await readAuthoringModules(builderPaths);
    const byPath = new Map(modules.map((module) => [module.relativePath, module]));
    const graph = buildInternalGraph(modules, new Set(builderPaths));
    const expectedGraph = new Map<string, readonly string[]>([
      [
        builderAuthoringModules.facade,
        [builderAuthoringModules.model, builderAuthoringModules.session].sort(),
      ],
      [builderAuthoringModules.model, []],
      [builderAuthoringModules.persistenceHook, [builderAuthoringModules.model]],
      [builderAuthoringModules.actionsHook, [builderAuthoringModules.model]],
      [builderAuthoringModules.preview, []],
      [builderAuthoringModules.settings, []],
      [builderAuthoringModules.layout, [builderAuthoringModules.settings]],
      [
        builderAuthoringModules.session,
        [
          builderAuthoringModules.actionsHook,
          builderAuthoringModules.layout,
          builderAuthoringModules.model,
          builderAuthoringModules.persistenceHook,
          builderAuthoringModules.preview,
        ].sort(),
      ],
    ]);
    expect(graphAsObject(graph)).toEqual(graphAsObject(expectedGraph));

    const facade = byPath.get(builderAuthoringModules.facade);
    expect(facade).toBeDefined();
    expect(
      facade ? localFacadeExportViolations(facade, "CustomScreenEditorPage") : ["facade missing"]
    ).toEqual([]);
    expect([...new Set(facade?.references.map(({ specifier }) => specifier))].sort()).toEqual(
      [
        "./CustomScreenEditorRouteSession",
        "./customScreenEditorModel",
        "./routeParams",
        "@/ui/contexts/AdminRouterContext",
        "react",
      ].sort()
    );
    const compatibilityValues = [
      "advanceBuilderDraftGeneration",
      "detectScreenBindingOrphans",
      "getBuilderExternalRevisionSaveError",
      "runBuilderManualRefresh",
      "uniqueFieldNames",
    ] as const;
    expect(facade ? readReexportSignatures(facade) : []).toEqual(
      reexportSignatures(builderAuthoringModules.model, "value", compatibilityValues)
    );

    const model = byPath.get(builderAuthoringModules.model);
    expect(model ? pureOwnerViolations([model]) : ["model missing"]).toEqual([]);
    expect(
      hookBoundaryViolations(
        [builderAuthoringModules.persistenceHook, builderAuthoringModules.actionsHook].flatMap(
          (modulePath) => (byPath.get(modulePath) ? [byPath.get(modulePath)!] : [])
        ),
        new Set([
          builderAuthoringModules.facade,
          builderAuthoringModules.session,
          builderAuthoringModules.preview,
          builderAuthoringModules.settings,
          builderAuthoringModules.layout,
        ])
      )
    ).toEqual([]);
    expect(
      viewBoundaryViolations(
        [builderAuthoringModules.settings, builderAuthoringModules.layout].flatMap((modulePath) =>
          byPath.get(modulePath) ? [byPath.get(modulePath)!] : []
        )
      )
    ).toEqual([]);

    const preview = byPath.get(builderAuthoringModules.preview);
    expect(preview).toBeDefined();
    const previewViolations = (preview?.references ?? []).flatMap(
      ({ specifier, typeOnly, resolvedPath }) =>
        isCacheBusPath(resolvedPath) ||
        (!typeOnly && isAdminClientPath(resolvedPath)) ||
        resolvedPath === builderAuthoringModules.persistenceHook ||
        resolvedPath === builderAuthoringModules.actionsHook ||
        Boolean(resolvedPath?.includes("/hooks/"))
          ? [`${builderAuthoringModules.preview} -> ${specifier}`]
          : []
    );
    expect(previewViolations).toEqual([]);
    expect(
      (preview?.references ?? [])
        .filter(
          ({ typeOnly, resolvedPath }) => !typeOnly && Boolean(resolvedPath?.startsWith("core/"))
        )
        .map(({ resolvedPath }) => resolvedPath)
        .sort()
    ).toEqual([`${customScreensRoot}/customScreenPreviewData.ts`]);

    const [facadeRuntime, modelOwner] = await Promise.all([
      import("../../../core/admin/ui/custom-screens/CustomScreenEditorPage"),
      import("../../../core/admin/ui/custom-screens/customScreenEditorModel"),
    ]);
    const facadeValues = facadeRuntime as Record<string, unknown>;
    const modelOwnerValues = modelOwner as Record<string, unknown>;
    expect(Object.keys(facadeValues).sort()).toEqual(
      ["CustomScreenEditorPage", ...compatibilityValues].sort()
    );
    for (const name of compatibilityValues) {
      expect(facadeValues[name], name).toBe(modelOwnerValues[name]);
    }
  });
});
