import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, test } from "vitest";

import {
  analyzeAdminBoundary,
  resolveAdminBoundaryImportEdges,
} from "../../../scripts/adminBoundaryReport";

const tempDirs: string[] = [];

const createRepo = async (files: Record<string, string>) => {
  const repoRoot = path.join(tmpdir(), `coderso-admin-boundary-${crypto.randomUUID()}`);
  tempDirs.push(repoRoot);
  for (const [file, content] of Object.entries(files)) {
    const absolutePath = path.join(repoRoot, file);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }
  return repoRoot;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolveAdminBoundaryImportEdges", () => {
  test("keeps browser-relevant imports and ignores type-only imports", () => {
    const edges = resolveAdminBoundaryImportEdges(`
      import type { ServerOnly } from "../server/secret";
      import { type Contract, value } from "./value";
      import { type PureContract } from "./contract";
      import "./style.css";
      export type { Other } from "./other";
      export { runtime } from "./runtime";
      const route = () => import("./lazy");
    `);

    expect(edges).toEqual([
      { specifier: "./value", kind: "static" },
      { specifier: "./style.css", kind: "static" },
      { specifier: "./runtime", kind: "static" },
      { specifier: "./lazy", kind: "dynamic" },
    ]);
  });
});

describe("analyzeAdminBoundary", () => {
  test("allows admin imports of pure page contracts", async () => {
    const repoRoot = await createRepo({
      "core/admin/main.tsx": 'import { App } from "@/ui/App"; App();',
      "core/admin/ui/App.tsx":
        'import { contract } from "../../services/pages/pageRuntimeBindingContract"; export const App = () => contract;',
      "core/services/pages/pageRuntimeBindingContract.ts": "export const contract = true;",
    });

    const report = analyzeAdminBoundary({ repoRoot });

    expect(report.violations).toEqual([]);
    expect(report.visitedFiles).toContain("core/services/pages/pageRuntimeBindingContract.ts");
  });

  test("rejects lazy imports of runtime page preparation", async () => {
    const repoRoot = await createRepo({
      "core/admin/main.tsx":
        'export const route = () => import("../services/pages/pageRuntimeDataPreparation");',
      "core/services/pages/pageRuntimeDataPreparation.ts": "export const serverOnly = true;",
    });

    const report = analyzeAdminBoundary({ repoRoot });

    expect(report.violations[0]?.reason).toBe("runtime page data preparer");
    expect(report.violations[0]?.resolvedPath).toBe(
      "core/services/pages/pageRuntimeDataPreparation.ts"
    );
  });

  test("rejects provider SDK imports in browser-reachable files", async () => {
    const repoRoot = await createRepo({
      "core/admin/main.tsx": 'import { BlobServiceClient } from "@azure/storage-blob";',
    });

    const report = analyzeAdminBoundary({ repoRoot });

    expect(report.violations[0]?.reason).toBe("Azure storage SDK");
    expect(report.violations[0]?.specifier).toBe("@azure/storage-blob");
  });
});
