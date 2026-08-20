import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import {
  assertAdminBundleBudget,
  readAdminBundleReport,
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
