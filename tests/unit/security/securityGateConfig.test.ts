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
  expect(workflow).toContain("aquasecurity/trivy-action@v0.36.0");
  expect(workflow).toContain("gitleaks");
  expect(workflow).toContain("actions: read");
  expect(workflow).toContain("github/codeql-action/upload-sarif@v4");
  expect(workflow).toContain("--error");
  expect(workflow).toContain('exit-code: "1"');
  expect(workflow).toContain('scanners: "vuln,secret,misconfig"');
});

test("security package scripts run layered local scanner coverage", () => {
  const pkg = JSON.parse(readFile("package.json")) as {
    scripts: Record<string, string>;
  };

  expect(pkg.scripts["scan:security"]).toBe("bun scripts/run-security-scan.ts");
  expect(pkg.scripts["scan:security:strict"]).toBe("bun scripts/run-security-scan.ts --strict");
  expect(pkg.scripts["scan:security:image"]).toContain("--image");
  expect(pkg.scripts["scan:audit"]).toContain("bun audit");
  expect(pkg.scripts["scan:trivy"]).toContain("scan:trivy:vuln");
  expect(pkg.scripts["scan:trivy"]).toContain("scan:trivy:config");
  expect(pkg.scripts["scan:trivy"]).toContain("scan:trivy:secret");
  expect(pkg.scripts["scan:gitleaks"]).toContain("scan:gitleaks:history");
  expect(pkg.scripts["scan:gitleaks"]).toContain("scan:gitleaks:worktree");
  expect(pkg.scripts["scan:sbom"]).toContain("cyclonedx");
});
