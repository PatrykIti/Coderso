import { expect, test } from "bun:test";

import {
  toolsAuditMatrix,
  validateToolsAudit,
  validateToolsAuditMatrix,
  validateToolsReportDocs,
} from "../../../scripts/tools-audit-matrix";

test("tools audit matrix covers every Tools route with executable expectations", () => {
  expect(toolsAuditMatrix.map((entry) => entry.id).sort()).toEqual([
    "analytics",
    "backups",
    "import-export",
    "redirects",
    "search",
    "seo",
  ]);

  expect(validateToolsAuditMatrix()).toEqual([]);
});

test("tools audit matrix requires runtime evidence for runtime-effect tools", () => {
  const runtimeKinds = new Map(
    toolsAuditMatrix.map((entry) => [entry.id, entry.runtimeEffects.map((effect) => effect.kind)])
  );

  expect(runtimeKinds.get("seo")).toContain("public-html");
  expect(runtimeKinds.get("backups")).toContain("artifact-or-external-worker");
  expect(runtimeKinds.get("redirects")).toContain("public-redirect");
});

test("tools reports satisfy the matrix drift guard", () => {
  expect(validateToolsReportDocs()).toEqual([]);
  expect(validateToolsAudit()).toEqual([]);
});
