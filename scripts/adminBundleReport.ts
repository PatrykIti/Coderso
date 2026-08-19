import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { analyzeAdminBoundary, type AdminBoundaryViolation } from "./adminBoundaryReport";

export const ADMIN_BASELINE_INITIAL_JS_GZIP_BYTES = 1_061_325;
export const ADMIN_ENTRY_JS_GZIP_BUDGET_BYTES = 160_000;
export const ADMIN_INITIAL_STATIC_JS_GZIP_BUDGET_BYTES = 500_000;
export const ADMIN_MIN_JS_CHUNK_COUNT = 2;

/**
 * TASK-467 dynamic raw chunk warning threshold. Every dynamic JS chunk at or
 * above this raw size fails `check:admin-bundle` unless a non-TASK-467 owner
 * is explicitly documented with a follow-up. The lazy widget editor split
 * exists so no TASK-467-owned chunk (registry, custom-screens clients, or
 * concrete editor modules) ever needs such an allowlist.
 */
export const ADMIN_DYNAMIC_RAW_WARNING_BYTES = 500_000;

export type AdminBundleBudget = {
  entryJsGzipBytes: number;
  initialStaticJsGzipBytes: number;
  minJsChunkCount: number;
};

export type AdminBundleAsset = {
  file: string;
  rawBytes: number;
  gzipBytes: number;
  isHtmlEntry: boolean;
  isHtmlModulePreload: boolean;
  isInitialStatic: boolean;
};

export type AdminBundleReport = {
  viteVersion: string;
  rolldownVersion: string;
  baselineInitialJsGzipBytes: number;
  jsChunkCount: number;
  entryJsFiles: string[];
  modulePreloadJsFiles: string[];
  initialStaticJsFiles: string[];
  dynamicJsChunkCount: number;
  entryJsRawBytes: number;
  entryJsGzipBytes: number;
  initialStaticJsRawBytes: number;
  initialStaticJsGzipBytes: number;
  largestInitialStaticChunkFile: string | null;
  largestInitialStaticChunkRawBytes: number;
  largestInitialStaticChunkGzipBytes: number;
  largestDynamicChunkFile: string | null;
  largestDynamicChunkRawBytes: number;
  largestDynamicChunkGzipBytes: number;
  totalJsRawBytes: number;
  totalJsGzipBytes: number;
  cssRawBytes: number;
  cssGzipBytes: number;
  budget: AdminBundleBudget;
  assets: AdminBundleAsset[];
};

export type ReadAdminBundleOptions = {
  distDir?: string;
  repoRoot?: string;
  budget?: Partial<AdminBundleBudget>;
};

const DEFAULT_BUDGET: AdminBundleBudget = {
  entryJsGzipBytes: ADMIN_ENTRY_JS_GZIP_BUDGET_BYTES,
  initialStaticJsGzipBytes: ADMIN_INITIAL_STATIC_JS_GZIP_BUDGET_BYTES,
  minJsChunkCount: ADMIN_MIN_JS_CHUNK_COUNT,
};

const sortStrings = (values: Iterable<string>) => [...values].sort((a, b) => a.localeCompare(b));

const toAssetPath = (value: string) =>
  path.posix.normalize(value.replace(/^\.?\//, "")).replace(/^\.\//, "");

const readFilesRecursive = (rootDir: string, currentDir = rootDir): string[] => {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readFilesRecursive(rootDir, absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(path.relative(rootDir, absolutePath).split(path.sep).join(path.posix.sep));
    }
  }
  return files;
};

const gzipByteLength = (content: Buffer) => gzipSync(content).byteLength;

const readAssetSize = (distDir: string, file: string) => {
  const content = readFileSync(path.join(distDir, file));
  return {
    rawBytes: content.byteLength,
    gzipBytes: gzipByteLength(content),
  };
};

const readTagAttribute = (tag: string, attributeName: string) => {
  const pattern = new RegExp(`\\b${attributeName}=["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] ?? null;
};

export const resolveEntryScriptsFromHtml = (html: string) => {
  const files = new Set<string>();
  const scriptPattern = /<script\b[^>]*>/gi;
  for (const match of html.matchAll(scriptPattern)) {
    const tag = match[0];
    const file = readTagAttribute(tag, "src");
    const type = readTagAttribute(tag, "type");
    if (type !== "module") continue;
    if (file?.endsWith(".js")) files.add(toAssetPath(file));
  }
  return files;
};

export const resolveModulePreloadsFromHtml = (html: string) => {
  const files = new Set<string>();
  const linkPattern = /<link\b[^>]*>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const tag = match[0];
    const rel = readTagAttribute(tag, "rel");
    if (rel !== "modulepreload") continue;
    const file = readTagAttribute(tag, "href");
    if (file?.endsWith(".js")) files.add(toAssetPath(file));
  }
  return files;
};

const resolveStylesheetsFromHtml = (html: string) => {
  const files = new Set<string>();
  const linkPattern = /<link\b[^>]*>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const tag = match[0];
    const rel = readTagAttribute(tag, "rel");
    if (rel !== "stylesheet") continue;
    const file = readTagAttribute(tag, "href");
    if (file?.endsWith(".css")) files.add(toAssetPath(file));
  }
  return files;
};

export const resolveStaticImportsFromJavaScript = (source: string) => {
  const specifiers = new Set<string>();
  const fromImportPattern = /\bimport\s*(?!\()([^;]*?)\bfrom\s*["']([^"']+)["']/g;
  const sideEffectImportPattern = /\bimport\s*(?!\()\s*["']([^"']+)["']/g;
  const exportFromPattern = /\bexport\s*([^;]*?)\bfrom\s*["']([^"']+)["']/g;

  for (const match of source.matchAll(fromImportPattern)) {
    const specifier = match[2];
    if (specifier) specifiers.add(specifier);
  }
  for (const match of source.matchAll(sideEffectImportPattern)) {
    const specifier = match[1];
    if (specifier) specifiers.add(specifier);
  }
  for (const match of source.matchAll(exportFromPattern)) {
    const specifier = match[2];
    if (specifier) specifiers.add(specifier);
  }

  return specifiers;
};

const resolveRelativeJsAsset = (fromFile: string, specifier: string) => {
  if (!specifier.startsWith(".")) return null;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  if (resolved.startsWith("../") || path.posix.isAbsolute(resolved)) return null;
  return resolved.endsWith(".js") ? resolved : null;
};

const resolveInitialStaticGraph = (
  distDir: string,
  entryFiles: Set<string>,
  modulePreloadFiles: Set<string>,
  jsFiles: Set<string>
) => {
  const initialFiles = new Set([...entryFiles, ...modulePreloadFiles]);
  const queue = [...initialFiles];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const source = readFileSync(path.join(distDir, current), "utf8");
    for (const specifier of resolveStaticImportsFromJavaScript(source)) {
      const resolved = resolveRelativeJsAsset(current, specifier);
      if (!resolved) continue;
      if (!jsFiles.has(resolved)) {
        throw new Error(`admin_bundle_static_import_missing:${resolved}`);
      }
      if (!initialFiles.has(resolved)) {
        initialFiles.add(resolved);
        queue.push(resolved);
      }
    }
  }

  return initialFiles;
};

const sumBytes = (assets: AdminBundleAsset[], key: "rawBytes" | "gzipBytes") =>
  assets.reduce((sum, asset) => sum + asset[key], 0);

const findLargest = (assets: AdminBundleAsset[]) => {
  if (assets.length === 0) return null;
  return assets.reduce((largest, asset) => (asset.rawBytes > largest.rawBytes ? asset : largest));
};

const readPackageVersion = (repoRoot: string, packageName: string) => {
  const candidates = [
    path.join(repoRoot, "node_modules", packageName, "package.json"),
    path.join(repoRoot, "core", "node_modules", packageName, "package.json"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const parsed = JSON.parse(readFileSync(candidate, "utf8")) as { version?: unknown };
    if (typeof parsed.version === "string") return parsed.version;
  }
  return "unknown";
};

export function readAdminBundleReport(options: ReadAdminBundleOptions = {}): AdminBundleReport {
  const repoRoot = options.repoRoot ?? path.resolve(import.meta.dir, "..");
  const distDir = options.distDir ?? path.join(repoRoot, "core", "dist", "client");
  const budget = { ...DEFAULT_BUDGET, ...options.budget };

  if (!existsSync(distDir)) {
    throw new Error("admin_bundle_dist_missing:run_build_admin_first");
  }

  const htmlPath = path.join(distDir, "index.html");
  if (!existsSync(htmlPath)) {
    throw new Error("admin_bundle_index_missing:run_build_admin_first");
  }

  const html = readFileSync(htmlPath, "utf8");
  const files = readFilesRecursive(distDir);
  const jsFiles = new Set(files.filter((file) => file.endsWith(".js")));
  if (jsFiles.size === 0) {
    throw new Error("admin_bundle_js_missing");
  }

  const entryFiles = resolveEntryScriptsFromHtml(html);
  if (entryFiles.size === 0) {
    throw new Error("admin_bundle_entry_missing");
  }

  for (const entryFile of entryFiles) {
    if (!jsFiles.has(entryFile)) {
      throw new Error(`admin_bundle_entry_missing:${entryFile}`);
    }
  }

  const modulePreloadFiles = resolveModulePreloadsFromHtml(html);
  for (const preloadFile of modulePreloadFiles) {
    if (!jsFiles.has(preloadFile)) {
      throw new Error(`admin_bundle_modulepreload_missing:${preloadFile}`);
    }
  }

  const stylesheetFiles = resolveStylesheetsFromHtml(html);
  const initialStaticFiles = resolveInitialStaticGraph(
    distDir,
    entryFiles,
    modulePreloadFiles,
    jsFiles
  );

  const assets = sortStrings(jsFiles).map((file) => {
    const size = readAssetSize(distDir, file);
    return {
      file,
      rawBytes: size.rawBytes,
      gzipBytes: size.gzipBytes,
      isHtmlEntry: entryFiles.has(file),
      isHtmlModulePreload: modulePreloadFiles.has(file),
      isInitialStatic: initialStaticFiles.has(file),
    };
  });
  const entryAssets = assets.filter((asset) => asset.isHtmlEntry);
  const initialStaticAssets = assets.filter((asset) => asset.isInitialStatic);
  const dynamicAssets = assets.filter((asset) => !asset.isInitialStatic);
  const largestInitialStatic = findLargest(initialStaticAssets);
  const largestDynamic = findLargest(dynamicAssets);

  const cssAssets = sortStrings(
    files.filter((file) => file.endsWith(".css") || stylesheetFiles.has(file))
  ).map((file) => readAssetSize(distDir, file));

  return {
    viteVersion: readPackageVersion(repoRoot, "vite"),
    rolldownVersion: readPackageVersion(repoRoot, "rolldown"),
    baselineInitialJsGzipBytes: ADMIN_BASELINE_INITIAL_JS_GZIP_BYTES,
    jsChunkCount: assets.length,
    entryJsFiles: sortStrings(entryFiles),
    modulePreloadJsFiles: sortStrings(modulePreloadFiles),
    initialStaticJsFiles: sortStrings(initialStaticFiles),
    dynamicJsChunkCount: dynamicAssets.length,
    entryJsRawBytes: sumBytes(entryAssets, "rawBytes"),
    entryJsGzipBytes: sumBytes(entryAssets, "gzipBytes"),
    initialStaticJsRawBytes: sumBytes(initialStaticAssets, "rawBytes"),
    initialStaticJsGzipBytes: sumBytes(initialStaticAssets, "gzipBytes"),
    largestInitialStaticChunkFile: largestInitialStatic?.file ?? null,
    largestInitialStaticChunkRawBytes: largestInitialStatic?.rawBytes ?? 0,
    largestInitialStaticChunkGzipBytes: largestInitialStatic?.gzipBytes ?? 0,
    largestDynamicChunkFile: largestDynamic?.file ?? null,
    largestDynamicChunkRawBytes: largestDynamic?.rawBytes ?? 0,
    largestDynamicChunkGzipBytes: largestDynamic?.gzipBytes ?? 0,
    totalJsRawBytes: sumBytes(assets, "rawBytes"),
    totalJsGzipBytes: sumBytes(assets, "gzipBytes"),
    cssRawBytes: cssAssets.reduce((sum, asset) => sum + asset.rawBytes, 0),
    cssGzipBytes: cssAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    budget,
    assets,
  };
}

export function assertAdminBundleBudget(report: AdminBundleReport) {
  if (report.jsChunkCount < report.budget.minJsChunkCount) {
    throw new Error(
      `admin_bundle_not_split:${report.jsChunkCount}<${report.budget.minJsChunkCount}`
    );
  }
  if (report.entryJsGzipBytes > report.budget.entryJsGzipBytes) {
    throw new Error(
      `admin_entry_chunk_over_budget:${report.entryJsGzipBytes}>${report.budget.entryJsGzipBytes}`
    );
  }
  if (report.initialStaticJsGzipBytes > report.budget.initialStaticJsGzipBytes) {
    throw new Error(
      `admin_initial_static_graph_over_budget:${report.initialStaticJsGzipBytes}>${report.budget.initialStaticJsGzipBytes}`
    );
  }
}

export function writeAdminBundleReport(reportPath: string, report: AdminBundleReport) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KiB`;
};

// ---------------------------------------------------------------------------
// TASK-467: widget editor registry split evidence
// ---------------------------------------------------------------------------

export type BundleEvidence = {
  registryChunkFile: string | null;
  registryChunkRawBytes: number | null;
  registryChunkGzipBytes: number | null;
  largestDynamicChunkRawBytes: number;
  largestDynamicChunkGzipBytes: number;
  initialStaticJsGzipBytes: number;
  task467OwnedChunks: AdminBundleAsset[];
  widgetEditorChunks: AdminBundleAsset[];
  dynamicOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  task467OwnedOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  invalidDynamicBudgetAllowlistChunks: Array<{ file: string; followUp: string }>;
  unresolvedDynamicOverBudgetChunks: Array<{ file: string; rawBytes: number }>;
  registryEditorBarrelViolations: AdminBoundaryViolation[];
  registryImportsEditorBarrel: boolean;
};

export type DocumentedNonTask467DynamicBudgetFollowUp = {
  file: string;
  followUp: string;
};

const documentedNonTask467DynamicBudgetFollowUps = new Map<string, string>();

/**
 * Records a documented over-budget dynamic chunk owned OUTSIDE TASK-467.
 * TASK-467-owned chunks and shared widget-editor chunks must never be
 * allowlisted; registering one here is a validation failure.
 */
export function registerDocumentedNonTask467DynamicBudgetFollowUp(file: string, followUp: string) {
  documentedNonTask467DynamicBudgetFollowUps.set(file, followUp);
}

export function clearDocumentedNonTask467DynamicBudgetFollowUps() {
  documentedNonTask467DynamicBudgetFollowUps.clear();
}

export function listDocumentedNonTask467DynamicBudgetFollowUps(): DocumentedNonTask467DynamicBudgetFollowUp[] {
  return [...documentedNonTask467DynamicBudgetFollowUps].map(([file, followUp]) => ({
    file,
    followUp,
  }));
}

export function findChunk(report: AdminBundleReport, pattern: RegExp): AdminBundleAsset | null {
  return report.assets.find((asset) => pattern.test(asset.file)) ?? null;
}

export function matchesChunkStem(assetFile: string, stem: string): boolean {
  const basename = assetFile.split("/").at(-1) ?? assetFile;
  return basename.startsWith(`${stem}-`);
}

const WIDGET_EDITOR_STEM_PREFIXES = [
  "registry",
  "customScreensClient",
  "customScreensEditorClient",
] as const;

export function findTask467OwnedChunks(
  report: AdminBundleReport,
  widgetEditorModuleNames: string[]
): AdminBundleAsset[] {
  return report.assets.filter((asset) => {
    if (asset.isInitialStatic) return false;
    return (
      WIDGET_EDITOR_STEM_PREFIXES.some((stem) => matchesChunkStem(asset.file, stem)) ||
      widgetEditorModuleNames.some((moduleName) => matchesChunkStem(asset.file, moduleName))
    );
  });
}

export function isTask467OwnedOrEditorSharedChunk(
  assetFile: string,
  widgetEditorModuleNames: string[]
): boolean {
  const basename = assetFile.split("/").at(-1) ?? assetFile;
  return (
    WIDGET_EDITOR_STEM_PREFIXES.some((stem) => matchesChunkStem(assetFile, stem)) ||
    widgetEditorModuleNames.some((moduleName) => matchesChunkStem(assetFile, moduleName)) ||
    /(?:WidgetEditor|EditorShared|EditorControls|EditorsShared)/.test(basename)
  );
}

export function findDynamicOverBudgetChunks(
  report: AdminBundleReport
): Array<{ file: string; rawBytes: number }> {
  return report.assets
    .filter((asset) => !asset.isInitialStatic)
    .filter((asset) => asset.rawBytes >= ADMIN_DYNAMIC_RAW_WARNING_BYTES)
    .map((asset) => ({ file: asset.file, rawBytes: asset.rawBytes }));
}

const registrySourcePath = () =>
  path.join(resolveRepoRoot(), "core", "admin", "ui", "widgets", "registry.ts");

export function registrySourceImportsEditorBarrel(
  source = readFileSync(registrySourcePath(), "utf8")
): boolean {
  return (
    /from\s+["']\.\/editors(?:\/index)?["']/.test(source) ||
    /import\s*\(\s*["']\.\/editors(?:\/index)?["']\s*\)/.test(source)
  );
}

export function readWidgetEditorChunkModuleNames(
  source = readFileSync(registrySourcePath(), "utf8")
): string[] {
  const modules = [...source.matchAll(/import\s*\(\s*["']\.\/editors\/([^"']+)["']\s*\)/g)]
    .map((match) => match[1])
    .filter((moduleName) => moduleName !== "index");
  return [...new Set(modules)].sort();
}

/**
 * Resolves the repository root. Under Bun, `import.meta.dir` points at
 * `scripts/`; under Vitest it is undefined, so fall back to `process.cwd()`
 * (tests run from the repo root).
 */
export function resolveRepoRoot(): string {
  const scriptDir = typeof import.meta.dir === "string" ? import.meta.dir : undefined;
  return scriptDir ? path.resolve(scriptDir, "..") : process.cwd();
}

export function collectRegistryEditorBarrelViolations(): AdminBoundaryViolation[] {
  return analyzeAdminBoundary({
    repoRoot: resolveRepoRoot(),
    entrypoints: ["core/admin/ui/widgets/registry.ts"],
    forbiddenPathRules: [
      {
        label: "widget editor barrel",
        path: "core/admin/ui/widgets/editors/index.ts",
        exact: true,
      },
    ],
  }).violations;
}

export function collectWidgetRegistryEvidence(report: AdminBundleReport): BundleEvidence {
  const registryChunk = findChunk(report, /(^|\/)registry-/);
  const registryEditorBarrelViolations = collectRegistryEditorBarrelViolations();
  const widgetEditorModuleNames = readWidgetEditorChunkModuleNames();
  const task467OwnedChunks = findTask467OwnedChunks(report, widgetEditorModuleNames);
  const widgetEditorChunks = task467OwnedChunks.filter((asset) =>
    widgetEditorModuleNames.some((moduleName) => matchesChunkStem(asset.file, moduleName))
  );
  const dynamicOverBudgetChunks = findDynamicOverBudgetChunks(report);
  const task467OwnedOverBudgetChunks = task467OwnedChunks
    .filter((asset) => asset.rawBytes >= ADMIN_DYNAMIC_RAW_WARNING_BYTES)
    .map((asset) => ({ file: asset.file, rawBytes: asset.rawBytes }));
  const invalidDynamicBudgetAllowlistChunks = [...documentedNonTask467DynamicBudgetFollowUps]
    .filter(([file]) => isTask467OwnedOrEditorSharedChunk(file, widgetEditorModuleNames))
    .map(([file, followUp]) => ({ file, followUp }));
  const unresolvedDynamicOverBudgetChunks = dynamicOverBudgetChunks.filter(
    (asset) => !documentedNonTask467DynamicBudgetFollowUps.has(asset.file)
  );

  return {
    registryChunkFile: registryChunk?.file ?? null,
    registryChunkRawBytes: registryChunk?.rawBytes ?? null,
    registryChunkGzipBytes: registryChunk?.gzipBytes ?? null,
    largestDynamicChunkRawBytes: report.largestDynamicChunkRawBytes,
    largestDynamicChunkGzipBytes: report.largestDynamicChunkGzipBytes,
    initialStaticJsGzipBytes: report.initialStaticJsGzipBytes,
    task467OwnedChunks,
    widgetEditorChunks,
    dynamicOverBudgetChunks,
    task467OwnedOverBudgetChunks,
    invalidDynamicBudgetAllowlistChunks,
    unresolvedDynamicOverBudgetChunks,
    registryEditorBarrelViolations,
    registryImportsEditorBarrel:
      registrySourceImportsEditorBarrel() || registryEditorBarrelViolations.length > 0,
  };
}

export function assertAdminBundleSplitEvidence(evidence: BundleEvidence) {
  if (evidence.registryImportsEditorBarrel) {
    throw new Error("admin_bundle_registry_editor_barrel:registry_still_imports_editor_barrel");
  }
  if (evidence.task467OwnedOverBudgetChunks.length > 0) {
    const files = evidence.task467OwnedOverBudgetChunks
      .map((chunk) => `${chunk.file}:${chunk.rawBytes}`)
      .join(",");
    throw new Error(`admin_bundle_task467_chunk_over_budget:${files}`);
  }
  if (evidence.invalidDynamicBudgetAllowlistChunks.length > 0) {
    const files = evidence.invalidDynamicBudgetAllowlistChunks
      .map((chunk) => `${chunk.file}->${chunk.followUp}`)
      .join(",");
    throw new Error(`admin_bundle_invalid_dynamic_allowlist:${files}`);
  }
  if (evidence.unresolvedDynamicOverBudgetChunks.length > 0) {
    const files = evidence.unresolvedDynamicOverBudgetChunks
      .map((chunk) => `${chunk.file}:${chunk.rawBytes}`)
      .join(",");
    throw new Error(`admin_bundle_dynamic_chunk_over_budget:${files}`);
  }
}

/**
 * Recomputes the admin bundle report from the current `core/dist/client`
 * output. Never reads the stale `.tmp` report as the assertion source;
 * missing dist output fails closed.
 */
export function loadAdminBundleReport(): AdminBundleReport {
  return readAdminBundleReport({
    repoRoot: resolveRepoRoot(),
  });
}
