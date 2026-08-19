import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import {
  assertAdminBundleBudget,
  assertAdminBundleSplitEvidence,
  clearDocumentedNonTask467DynamicBudgetFollowUps,
  collectWidgetRegistryEvidence,
  loadAdminBundleReport,
  readAdminBundleReport,
  readWidgetEditorChunkModuleNames,
  registerDocumentedNonTask467DynamicBudgetFollowUp,
  registrySourceImportsEditorBarrel,
  resolveStaticImportsFromJavaScript,
} from "../../../scripts/adminBundleReport";

const tempDirs: string[] = [];

const createDist = async (files: Record<string, string>) => {
  const dir = path.join(tmpdir(), `coderso-admin-bundle-${crypto.randomUUID()}`);
  tempDirs.push(dir);
  for (const [file, content] of Object.entries(files)) {
    const absolutePath = path.join(dir, file);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolveStaticImportsFromJavaScript", () => {
  test("ignores dynamic imports while keeping static import and export specifiers", () => {
    const specifiers = resolveStaticImportsFromJavaScript(`
      import{a as b}from"./vendor.js";
      import "./side-effect.js";
      export { c } from "./shared.js";
      const lazy = () => import("./route.js");
    `);

    expect([...specifiers].sort()).toEqual(["./shared.js", "./side-effect.js", "./vendor.js"]);
  });
});

describe("readAdminBundleReport", () => {
  test("measures HTML entry scripts and their static graph without counting dynamic chunks as initial", async () => {
    const distDir = await createDist({
      "index.html": `
        <script src="./assets/index-abc.js" crossorigin type="module"></script>
        <link href="./assets/vendor-def.js" crossorigin rel="modulepreload">
        <link href="./assets/index.css" crossorigin rel="stylesheet">
      `,
      "assets/index-abc.js":
        'import{a}from"./vendor-def.js";const page=()=>import("./route-ghi.js");',
      "assets/vendor-def.js": "export const a = 1;",
      "assets/route-ghi.js": "export const Route = () => null;",
      "assets/index.css": "body{margin:0}",
    });

    const report = readAdminBundleReport({
      distDir,
      repoRoot: process.cwd(),
      budget: {
        entryJsGzipBytes: 1_000,
        initialStaticJsGzipBytes: 2_000,
      },
    });

    expect(report.jsChunkCount).toBe(3);
    expect(report.entryJsFiles).toEqual(["assets/index-abc.js"]);
    expect(report.modulePreloadJsFiles).toEqual(["assets/vendor-def.js"]);
    expect(report.initialStaticJsFiles).toEqual(["assets/index-abc.js", "assets/vendor-def.js"]);
    expect(report.dynamicJsChunkCount).toBe(1);
    expect(report.largestDynamicChunkFile).toBe("assets/route-ghi.js");
    expect(report.cssRawBytes).toBeGreaterThan(0);
    expect(() => assertAdminBundleBudget(report)).not.toThrow();
  });

  test("fails when the admin build has only one JavaScript chunk", async () => {
    const distDir = await createDist({
      "index.html": '<script type="module" src="./assets/index.js"></script>',
      "assets/index.js": "console.log('entry');",
    });
    const report = readAdminBundleReport({
      distDir,
      repoRoot: process.cwd(),
      budget: {
        entryJsGzipBytes: 1_000,
        initialStaticJsGzipBytes: 1_000,
      },
    });

    expect(() => assertAdminBundleBudget(report)).toThrow("admin_bundle_not_split");
  });

  test("fails loudly when the HTML entry script is missing from assets", async () => {
    const distDir = await createDist({
      "index.html": '<script type="module" src="./assets/index.js"></script>',
      "assets/other.js": "console.log('other');",
    });

    expect(() =>
      readAdminBundleReport({
        distDir,
        repoRoot: process.cwd(),
      })
    ).toThrow("admin_bundle_entry_missing:assets/index.js");
  });

  test("fails when the initial static graph exceeds budget", async () => {
    const distDir = await createDist({
      "index.html": `
        <script type="module" src="./assets/index.js"></script>
        <link rel="modulepreload" href="./assets/vendor.js">
      `,
      "assets/index.js": 'import "./vendor.js";',
      "assets/vendor.js": "export const value = 'large';",
      "assets/route.js": "export const Route = () => null;",
    });
    const report = readAdminBundleReport({
      distDir,
      repoRoot: process.cwd(),
      budget: {
        entryJsGzipBytes: 1_000,
        initialStaticJsGzipBytes: 1,
      },
    });

    expect(() => assertAdminBundleBudget(report)).toThrow("admin_initial_static_graph_over_budget");
  });
});

describe("TASK-467 widget editor registry split evidence", () => {
  afterEach(() => {
    clearDocumentedNonTask467DynamicBudgetFollowUps();
  });

  test("registry source imports no editor barrel and lists concrete lazy editor modules", () => {
    const source = `
      const a = () => import("./editors/HeroEditors");
      const b = () => import("./editors/ContactEditors");
      const c = () => import("./editors/HeroEditors");
      const bad = () => import("./editors");
    `;
    expect(registrySourceImportsEditorBarrel(source)).toBe(true);
    expect(readWidgetEditorChunkModuleNames(source)).toEqual(["ContactEditors", "HeroEditors"]);

    const cleanSource = `
      const a = () => import("./editors/HeroEditors");
      const b = () => import("./editors/ContactEditors");
    `;
    expect(registrySourceImportsEditorBarrel(cleanSource)).toBe(false);
  });

  test("detects over-budget dynamic chunks and TASK-467-owned chunks from a synthetic dist", async () => {
    const distDir = await createDist({
      "index.html": `
        <script type="module" src="./assets/index.js"></script>
        <link rel="modulepreload" href="./assets/vendor.js">
      `,
      "assets/index.js": 'import "./vendor.js"; const open = () => import("./HeroEditors-abc.js");',
      "assets/vendor.js": "export const value = 1;",
      "assets/HeroEditors-abc.js": "export const HeroWizardEditor = () => null;",
      "assets/ContactEditors-def.js": "export const ContactWizardEditor = () => null;",
      "assets/huge-page-xyz.js": "export const Page = () => null;".repeat(1),
    });
    // Make the huge page chunk clearly over the 500 kB raw threshold.
    const hugePath = path.join(distDir, "assets", "huge-page-xyz.js");
    await writeFile(hugePath, `export const Page = () => null; ${"x".repeat(600_000)}`);

    const report = readAdminBundleReport({ distDir, repoRoot: process.cwd() });
    const evidence = collectWidgetRegistryEvidence(report);

    expect(evidence.registryImportsEditorBarrel).toBe(false);
    expect(evidence.widgetEditorChunks.map((chunk) => chunk.file)).toContain(
      "assets/HeroEditors-abc.js"
    );
    expect(evidence.dynamicOverBudgetChunks.map((chunk) => chunk.file)).toContain(
      "assets/huge-page-xyz.js"
    );
    expect(evidence.unresolvedDynamicOverBudgetChunks.length).toBe(1);
    expect(() => assertAdminBundleSplitEvidence(evidence)).toThrow(
      "admin_bundle_dynamic_chunk_over_budget"
    );
  });

  test("documented non-TASK-467 over-budget chunks pass only when not task467-owned", async () => {
    const distDir = await createDist({
      "index.html": '<script type="module" src="./assets/index.js"></script>',
      "assets/index.js": 'import "./vendor.js";',
      "assets/vendor.js": "export const value = 1;",
      "assets/external-owner-xyz.js": `export const X = 1; ${"y".repeat(600_000)}`,
    });

    const report = readAdminBundleReport({ distDir, repoRoot: process.cwd() });
    const evidence = collectWidgetRegistryEvidence(report);

    // Not yet documented: fails closed.
    expect(() => assertAdminBundleSplitEvidence(evidence)).toThrow(
      "admin_bundle_dynamic_chunk_over_budget"
    );

    // Documented with a follow-up: passes, and no task467-owned chunk is
    // allowlisted.
    registerDocumentedNonTask467DynamicBudgetFollowUp(
      "assets/external-owner-xyz.js",
      "TASK-9999-NEXT"
    );
    const documented = collectWidgetRegistryEvidence(report);
    expect(documented.unresolvedDynamicOverBudgetChunks).toEqual([]);
    expect(documented.invalidDynamicBudgetAllowlistChunks).toEqual([]);
    expect(() => assertAdminBundleSplitEvidence(documented)).not.toThrow();
  });

  test("fails when a TASK-467-owned chunk is allowlisted with a follow-up", async () => {
    const distDir = await createDist({
      "index.html": '<script type="module" src="./assets/index.js"></script>',
      "assets/index.js": 'import "./vendor.js"; const open = () => import("./HeroEditors-abc.js");',
      "assets/vendor.js": "export const value = 1;",
      "assets/HeroEditors-abc.js": "export const W = () => null;",
    });

    const report = readAdminBundleReport({ distDir, repoRoot: process.cwd() });

    // A TASK-467-owned chunk is allowlisted even though it is NOT over
    // budget; the allowlist registration itself is rejected.
    registerDocumentedNonTask467DynamicBudgetFollowUp(
      "assets/HeroEditors-abc.js",
      "TASK-9999-SPLIT"
    );
    const evidence = collectWidgetRegistryEvidence(report);

    expect(evidence.invalidDynamicBudgetAllowlistChunks).toEqual([
      { file: "assets/HeroEditors-abc.js", followUp: "TASK-9999-SPLIT" },
    ]);
    expect(() => assertAdminBundleSplitEvidence(evidence)).toThrow(
      "admin_bundle_invalid_dynamic_allowlist"
    );
  });

  test(
    "fresh real admin build satisfies the TASK-467 split evidence",
    {
      skip: !existsSync(path.join(process.cwd(), "core", "dist", "client", "index.html")),
    },
    () => {
      const report = loadAdminBundleReport();
      const evidence = collectWidgetRegistryEvidence(report);

      expect(evidence.registryImportsEditorBarrel).toBe(false);
      expect(evidence.registryEditorBarrelViolations).toEqual([]);
      if (evidence.registryChunkRawBytes !== null) {
        expect(evidence.registryChunkRawBytes).toBeLessThan(500_000);
      }
      expect(evidence.task467OwnedOverBudgetChunks).toEqual([]);
      expect(evidence.invalidDynamicBudgetAllowlistChunks).toEqual([]);
      expect(evidence.unresolvedDynamicOverBudgetChunks).toEqual([]);
      expect(evidence.widgetEditorChunks.length).toBeGreaterThan(1);
      expect(() => assertAdminBundleSplitEvidence(evidence)).not.toThrow();
    }
  );
});
