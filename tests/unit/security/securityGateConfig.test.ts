import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

const readFile = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf-8");

const expectFile = (relativePath: string) => {
  const fullPath = path.join(root, relativePath);
  expect(existsSync(fullPath)).toBe(true);
  return fullPath;
};

test("security gate workflow and configs are present", () => {
  expectFile(".github/workflows/security-gate.yml");
  expectFile(".semgrep.yml");
  expectFile(".gitleaks.toml");
  expectFile(".trivyignore");
});

test("security gate workflow wires semgrep, trivy, and gitleaks", () => {
  const workflow = readFile(".github/workflows/security-gate.yml");
  expect(workflow).toContain("semgrep");
  expect(workflow).toContain("trivy");
  expect(workflow).toContain("gitleaks");
  expect(workflow).toContain("upload-sarif");
});
