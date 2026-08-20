import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  isIdentifier,
  isImportDeclaration,
  isNamedImports,
  isNamespaceImport,
  isNoSubstitutionTemplateLiteral,
  isStringLiteral,
  type Node,
  type SourceFile,
} from "typescript";

const repoRoot = process.cwd();

const sourceTextCache = new Map<string, string>();
const parsedSourceCache = new Map<string, SourceFile>();

export const readSource = (path: string): string => {
  const cached = sourceTextCache.get(path);
  if (cached !== undefined) return cached;
  const source = readFileSync(resolve(repoRoot, path), "utf8");
  sourceTextCache.set(path, source);
  return source;
};

const listTypeScriptSources = (directory: string): string[] => {
  const absoluteDirectory = resolve(repoRoot, directory);
  const paths: string[] = [];
  const visit = (currentDirectory: string) => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        paths.push(relative(repoRoot, absolutePath).replaceAll("\\", "/"));
      }
    }
  };
  visit(absoluteDirectory);
  return paths.sort();
};

export const coreSources = listTypeScriptSources("core");

export const parseSourceText = (file: string, source: string): SourceFile =>
  createSourceFile(
    file,
    source,
    ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS
  );

export const parseSourceFile = (file: string): SourceFile => {
  const cached = parsedSourceCache.get(file);
  if (cached !== undefined) return cached;
  const sourceFile = parseSourceText(file, readSource(file));
  parsedSourceCache.set(file, sourceFile);
  return sourceFile;
};

const resolveImportedModule = (importer: string, specifier: string): string | undefined => {
  if (!specifier.startsWith(".")) return undefined;
  const importedBase = resolve(dirname(resolve(repoRoot, importer)), specifier);
  const extensionlessBase = importedBase.replace(/\.(?:c|m)?jsx?$/, "");
  const candidates = [
    importedBase,
    `${extensionlessBase}.ts`,
    `${extensionlessBase}.tsx`,
    resolve(extensionlessBase, "index.ts"),
    resolve(extensionlessBase, "index.tsx"),
  ];
  const resolvedPath = candidates.find((candidate) => existsSync(candidate));
  return resolvedPath ? relative(repoRoot, resolvedPath).replaceAll("\\", "/") : undefined;
};

// Follow pure re-export shims (a file whose entire body is a single
// `export * from "./target"`) so callers bound through a legacy boundary path
// are still matched against the single canonical implementation module.
const resolveCanonicalModulePath = (importer: string, specifier: string): string | undefined => {
  let resolved = resolveImportedModule(importer, specifier);
  const seen = new Set<string>();
  while (resolved && !seen.has(resolved)) {
    seen.add(resolved);
    const absolute = resolve(repoRoot, resolved);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) break;
    const source = readSource(resolved).trim();
    const shimMatch = /^\s*export\s+\*\s+from\s+["'](\.[^"']+)["']\s*;\s*$/.exec(source);
    if (!shimMatch) break;
    resolved = resolveImportedModule(resolved, shimMatch[1]!);
  }
  return resolved;
};

type ImportedSymbolBindings = Readonly<{
  named: ReadonlySet<string>;
  namespaces: ReadonlySet<string>;
}>;

export const collectImportedSymbolBindings = (
  sourceFile: SourceFile,
  file: string,
  modulePath: string,
  exportName: string
): ImportedSymbolBindings => {
  const named = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !isImportDeclaration(statement) ||
      !isStringLiteral(statement.moduleSpecifier) ||
      resolveCanonicalModulePath(file, statement.moduleSpecifier.text) !== modulePath ||
      statement.importClause?.isTypeOnly
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings && isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        const importedName = specifier.propertyName?.text ?? specifier.name.text;
        if (!specifier.isTypeOnly && importedName === exportName) named.add(specifier.name.text);
      }
    } else if (bindings && isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
    }
  }
  return { named, namespaces };
};

export const propertyNameText = (node: Node): string | undefined => {
  if (isIdentifier(node) || isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
};
