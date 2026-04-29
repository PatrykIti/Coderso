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
  expectFile(".github/workflows/coderso-pr-gates.yml");
  expectFile(".semgrep.yml");
  expectFile(".gitleaks.toml");
  expectFile(".trivyignore");
});

const readWorkflow = () => readFile(".github/workflows/coderso-pr-gates.yml");

const getJobBlock = (workflow: string, jobName: string) => {
  const start = workflow.indexOf(`  ${jobName}:`);
  expect(start).toBeGreaterThan(-1);
  const rest = workflow.slice(start + 1);
  const nextJob = rest.search(/\n  [a-z0-9-]+:\n/);
  if (nextJob === -1) return workflow.slice(start);
  return workflow.slice(start, start + 1 + nextJob);
};

test("PR gates prepare the CI database before test lanes", () => {
  const workflow = readWorkflow();
  const preflight = getJobBlock(workflow, "database-preflight");
  const vitestLane = getJobBlock(workflow, "vitest-lane");
  const bunLane = getJobBlock(workflow, "bun-lane");
  const securityGate = getJobBlock(workflow, "security-gate");
  const releaseGates = getJobBlock(workflow, "coderso-release-gates");

  expect(preflight).toContain("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
  expect(preflight).toContain("Verify CI database secret");
  expect(preflight).toContain("DATABASE_URL repository secret is required");
  expect(preflight).toContain("bun run db:migrate");
  expect(vitestLane).toContain("needs: database-preflight");
  expect(bunLane).toContain("needs: database-preflight");
  expect(bunLane).toContain("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
  expect(securityGate).toContain("vitest-lane");
  expect(securityGate).toContain("bun-lane");
  expect(releaseGates).toContain("needs: security-gate");
});

test("security gate workflow wires semgrep, trivy, and gitleaks", () => {
  const workflow = readWorkflow();
  const securityGate = getJobBlock(workflow, "security-gate");

  expect(securityGate).toContain("semgrep");
  expect(securityGate).toContain("trivy");
  expect(securityGate).toContain("fetch-depth: 0");
  expect(securityGate).toContain("aquasecurity/trivy-action@v0.36.0");
  expect(securityGate).toContain("Generate Trivy SARIF (SCA/CVE)");
  expect(securityGate).toContain('format: sarif');
  expect(securityGate).toContain("output: trivy.sarif");
  expect(securityGate).toContain('exit-code: "0"');
  expect(securityGate).toContain("limit-severities-for-sarif: true");
  expect(securityGate).toContain("Run Trivy (Blocking Gate)");
  expect(securityGate).toContain("format: table");
  expect(securityGate).toContain("skip-setup-trivy: true");
  expect(securityGate).toContain("gitleaks");
  expect(securityGate).toContain("gitleaks/gitleaks-action@v2");
  expect(securityGate).toContain("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
  expect(securityGate).toContain("GITLEAKS_CONFIG: .gitleaks.toml");
  expect(securityGate).toContain('GITLEAKS_ENABLE_COMMENTS: "false"');
  expect(securityGate).toContain('GITLEAKS_ENABLE_UPLOAD_ARTIFACT: "true"');
  expect(securityGate).not.toContain("report-format");
  expect(securityGate).not.toContain("report-path");
  expect(securityGate).toContain("actions: read");
  expect(securityGate).toContain("contents: read");
  expect(securityGate).toContain("security-events: write");
  expect(securityGate).toContain("github/codeql-action/upload-sarif@v4");
  expect(securityGate).toContain("--error");
  expect(securityGate).toContain('exit-code: "1"');
  expect(securityGate).toContain('scanners: "vuln,secret,misconfig"');
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

test("PR gate workflow keeps default permissions read-only", () => {
  const workflow = readWorkflow();

  expect(workflow).toContain("permissions:\n  contents: read");
  expect(workflow).not.toContain("contents: write");
  expect(workflow).not.toContain("actions: write");
});
