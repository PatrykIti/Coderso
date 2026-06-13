import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export type AdminBoundaryImportKind = "static" | "dynamic";

export type AdminBoundaryImportEdge = {
  specifier: string;
  kind: AdminBoundaryImportKind;
};

export type AdminBoundaryViolation = {
  code: "admin_boundary_forbidden_import" | "admin_boundary_import_missing";
  specifier: string;
  reason: string;
  importer: string;
  resolvedPath?: string;
  chain: string[];
};

export type AdminBoundaryReport = {
  entrypoints: string[];
  visitedFiles: string[];
  violations: AdminBoundaryViolation[];
};

export type AnalyzeAdminBoundaryOptions = {
  repoRoot?: string;
  entrypoints?: string[];
  forbiddenPathRules?: AdminBoundaryForbiddenPathRule[];
  forbiddenPackageRules?: AdminBoundaryForbiddenPackageRule[];
};

export type AdminBoundaryForbiddenPathRule = {
  label: string;
  path: string;
  exact?: boolean;
};

export type AdminBoundaryForbiddenPackageRule = {
  label: string;
  specifier: string;
  exact?: boolean;
};

const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;
const codeExtensionSet = new Set<string>(codeExtensions);

const defaultEntrypoints = ["core/admin/main.tsx"];

const defaultForbiddenPathRules: AdminBoundaryForbiddenPathRule[] = [
  { label: "database client/schema", path: "core/db/" },
  { label: "server route/runtime modules", path: "core/server/" },
  {
    label: "runtime page data preparer",
    path: "core/services/pages/pageRuntimeDataPreparation.ts",
    exact: true,
  },
  {
    label: "legacy runtime page data binding",
    path: "core/services/pages/pageRuntimeDataBinding.ts",
    exact: true,
  },
  {
    label: "runtime content list resolver",
    path: "core/services/content/contentListResolver.ts",
    exact: true,
  },
  {
    label: "runtime listing query executor",
    path: "core/services/content/queryBuilderService.ts",
    exact: true,
  },
  {
    label: "runtime listing source fetchers",
    path: "core/services/content/listingSources.ts",
    exact: true,
  },
  {
    label: "runtime form resolver",
    path: "core/services/forms/formRuntimeResolver.ts",
    exact: true,
  },
  {
    label: "runtime listing filters resolver",
    path: "core/services/search/listingRuntimeService.ts",
    exact: true,
  },
  {
    label: "runtime listing filter engine",
    path: "core/services/search/filterEngine.ts",
    exact: true,
  },
  { label: "media service", path: "core/services/media/mediaService.ts", exact: true },
  { label: "media storage adapters", path: "core/services/media/storage/" },
  { label: "settings DB service", path: "core/services/settings/settingsService.ts", exact: true },
  {
    label: "security settings service",
    path: "core/services/settings/securitySettings.ts",
    exact: true,
  },
  { label: "secret storage service", path: "core/services/security/secretStore.ts", exact: true },
  { label: "password hashing service", path: "core/services/auth/password.ts", exact: true },
  { label: "password pepper service", path: "core/services/auth/passwordPepper.ts", exact: true },
];

const defaultForbiddenPackageRules: AdminBoundaryForbiddenPackageRule[] = [
  { label: "Node builtin", specifier: "node:" },
  { label: "Azure storage SDK", specifier: "@azure/storage-blob", exact: true },
  { label: "AWS S3 SDK", specifier: "@aws-sdk/client-s3", exact: true },
  { label: "Postgres driver", specifier: "postgres", exact: true },
  { label: "Argon2 native binding", specifier: "@node-rs/argon2", exact: true },
  { label: "Mail transport", specifier: "nodemailer", exact: true },
  { label: "Drizzle ORM runtime", specifier: "drizzle-orm" },
];

const normalizeRepoPath = (repoRoot: string, absolutePath: string) =>
  path.relative(repoRoot, absolutePath).split(path.sep).join(path.posix.sep);

const normalizeRulePath = (value: string) => value.split(path.sep).join(path.posix.sep);

const isTypeOnlyImportClause = (clause: string) => {
  const trimmed = clause.trim();
  if (trimmed.startsWith("type ")) return true;
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  const body = trimmed.slice(1, -1).trim();
  if (!body) return true;
  return body
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .every((item) => item.startsWith("type "));
};

const isTypeOnlyExportClause = (clause: string) => {
  const trimmed = clause.trim();
  if (trimmed.startsWith("type ")) return true;
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  const body = trimmed.slice(1, -1).trim();
  if (!body) return true;
  return body
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .every((item) => item.startsWith("type "));
};

export const resolveAdminBoundaryImportEdges = (source: string): AdminBoundaryImportEdge[] => {
  const edges: AdminBoundaryImportEdge[] = [];
  const importFromPattern = /\bimport\s+([^'";]*?)\s+from\s*["']([^"']+)["']/gs;
  const sideEffectImportPattern = /\bimport\s*["']([^"']+)["']/g;
  const exportFromPattern = /\bexport\s+([^'";]*?)\s+from\s*["']([^"']+)["']/gs;
  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(importFromPattern)) {
    const clause = match[1] ?? "";
    const specifier = match[2];
    if (specifier && !isTypeOnlyImportClause(clause)) {
      edges.push({ specifier, kind: "static" });
    }
  }

  for (const match of source.matchAll(sideEffectImportPattern)) {
    const specifier = match[1];
    if (specifier) edges.push({ specifier, kind: "static" });
  }

  for (const match of source.matchAll(exportFromPattern)) {
    const clause = match[1] ?? "";
    const specifier = match[2];
    if (specifier && !isTypeOnlyExportClause(clause)) {
      edges.push({ specifier, kind: "static" });
    }
  }

  for (const match of source.matchAll(dynamicImportPattern)) {
    const specifier = match[1];
    if (specifier) edges.push({ specifier, kind: "dynamic" });
  }

  return edges;
};

const fileExists = (candidate: string) => existsSync(candidate) && statSync(candidate).isFile();

const resolveLocalFile = (basePath: string) => {
  const extension = path.extname(basePath);
  if (extension) {
    if (!codeExtensionSet.has(extension)) return null;
    return fileExists(basePath) ? basePath : null;
  }

  for (const extension of codeExtensions) {
    const candidate = `${basePath}${extension}`;
    if (fileExists(candidate)) return candidate;
  }

  for (const extension of codeExtensions) {
    const candidate = path.join(basePath, `index${extension}`);
    if (fileExists(candidate)) return candidate;
  }

  return null;
};

const isLocalNonCodeSpecifier = (specifier: string) => {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return false;
  const extension = path.extname(specifier);
  return Boolean(extension) && !codeExtensionSet.has(extension);
};

const resolveAdminImport = (repoRoot: string, importer: string, specifier: string) => {
  if (specifier.startsWith("@/")) {
    return resolveLocalFile(path.join(repoRoot, "core", "admin", specifier.slice(2)));
  }
  if (specifier.startsWith(".")) {
    return resolveLocalFile(path.resolve(path.dirname(importer), specifier));
  }
  return null;
};

const matchForbiddenPath = (
  repoRoot: string,
  absolutePath: string,
  rules: AdminBoundaryForbiddenPathRule[]
) => {
  const repoPath = normalizeRepoPath(repoRoot, absolutePath);
  return rules.find((rule) => {
    const rulePath = normalizeRulePath(rule.path);
    return rule.exact ? repoPath === rulePath : repoPath.startsWith(rulePath);
  });
};

const matchForbiddenPackage = (specifier: string, rules: AdminBoundaryForbiddenPackageRule[]) =>
  rules.find((rule) =>
    rule.exact ? specifier === rule.specifier : specifier.startsWith(rule.specifier)
  );

export function analyzeAdminBoundary(
  options: AnalyzeAdminBoundaryOptions = {}
): AdminBoundaryReport {
  const repoRoot = options.repoRoot ?? path.resolve(import.meta.dir, "..");
  const entrypoints = (options.entrypoints ?? defaultEntrypoints).map((entrypoint) =>
    path.resolve(repoRoot, entrypoint)
  );
  const forbiddenPathRules = options.forbiddenPathRules ?? defaultForbiddenPathRules;
  const forbiddenPackageRules = options.forbiddenPackageRules ?? defaultForbiddenPackageRules;
  const visited = new Set<string>();
  const queue = [...entrypoints];
  const chains = new Map<string, string[]>();
  const violations: AdminBoundaryViolation[] = [];

  for (const entrypoint of entrypoints) {
    chains.set(entrypoint, [normalizeRepoPath(repoRoot, entrypoint)]);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const chain = chains.get(current) ?? [normalizeRepoPath(repoRoot, current)];
    if (!fileExists(current)) {
      violations.push({
        code: "admin_boundary_import_missing",
        specifier: normalizeRepoPath(repoRoot, current),
        reason: "entrypoint is missing",
        importer: chain.at(-2) ?? chain[0],
        resolvedPath: normalizeRepoPath(repoRoot, current),
        chain,
      });
      continue;
    }

    const forbiddenCurrent = matchForbiddenPath(repoRoot, current, forbiddenPathRules);
    if (forbiddenCurrent) {
      violations.push({
        code: "admin_boundary_forbidden_import",
        specifier: normalizeRepoPath(repoRoot, current),
        reason: forbiddenCurrent.label,
        importer: chain.at(-2) ?? chain[0],
        resolvedPath: normalizeRepoPath(repoRoot, current),
        chain,
      });
      continue;
    }

    const source = readFileSync(current, "utf8");
    for (const edge of resolveAdminBoundaryImportEdges(source)) {
      const forbiddenPackage = matchForbiddenPackage(edge.specifier, forbiddenPackageRules);
      if (forbiddenPackage) {
        violations.push({
          code: "admin_boundary_forbidden_import",
          specifier: edge.specifier,
          reason: forbiddenPackage.label,
          importer: normalizeRepoPath(repoRoot, current),
          chain: [...chain, `${edge.kind}:${edge.specifier}`],
        });
        continue;
      }

      const resolved = resolveAdminImport(repoRoot, current, edge.specifier);
      if (!resolved) {
        if (
          (edge.specifier.startsWith(".") || edge.specifier.startsWith("@/")) &&
          !isLocalNonCodeSpecifier(edge.specifier)
        ) {
          violations.push({
            code: "admin_boundary_import_missing",
            specifier: edge.specifier,
            reason: "local import could not be resolved",
            importer: normalizeRepoPath(repoRoot, current),
            chain,
          });
        }
        continue;
      }

      const nextChain = [...chain, normalizeRepoPath(repoRoot, resolved)];
      const forbiddenPath = matchForbiddenPath(repoRoot, resolved, forbiddenPathRules);
      if (forbiddenPath) {
        violations.push({
          code: "admin_boundary_forbidden_import",
          specifier: edge.specifier,
          reason: forbiddenPath.label,
          importer: normalizeRepoPath(repoRoot, current),
          resolvedPath: normalizeRepoPath(repoRoot, resolved),
          chain: nextChain,
        });
        continue;
      }

      if (!visited.has(resolved)) {
        chains.set(resolved, nextChain);
        queue.push(resolved);
      }
    }
  }

  return {
    entrypoints: entrypoints.map((entrypoint) => normalizeRepoPath(repoRoot, entrypoint)).sort(),
    visitedFiles: [...visited].map((file) => normalizeRepoPath(repoRoot, file)).sort(),
    violations,
  };
}

export const formatAdminBoundaryViolation = (violation: AdminBoundaryViolation) => {
  const target = violation.resolvedPath ?? violation.specifier;
  return [
    `${violation.code}: ${violation.reason}`,
    `  importer: ${violation.importer}`,
    `  target: ${target}`,
    `  chain: ${violation.chain.join(" -> ")}`,
  ].join("\n");
};
