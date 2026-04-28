import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

const readFile = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf-8");

test("semantic release workflow pins a supported Node runtime", () => {
  const workflow = readFile(".github/workflows/release.yml");

  expect(workflow).toContain("NODE_VERSION: 22.14.0");
  expect(workflow).toContain("actions/setup-node@v4");
  expect(workflow).toContain("node-version: ${{ env.NODE_VERSION }}");
  expect(workflow).toContain("Verify release runtime");
  expect(workflow).toContain("node --version");

  const setupNodeIndex = workflow.indexOf("Setup Node");
  const releaseIndex = workflow.indexOf("Run semantic-release");

  expect(setupNodeIndex).toBeGreaterThan(-1);
  expect(releaseIndex).toBeGreaterThan(setupNodeIndex);
});

test("semantic release package version requires Node 22.14 or newer", () => {
  const pkg = JSON.parse(readFile("package.json")) as {
    devDependencies: Record<string, string>;
  };

  expect(pkg.devDependencies["semantic-release"]).toBe("^25.0.3");
});
