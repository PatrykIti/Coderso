import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

const readFile = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf-8");

test("semantic release workflow pins a supported Node runtime", () => {
  const workflow = readFile(".github/workflows/release.yml");

  expect(workflow).toContain("BUN_VERSION: 1.3.13");
  expect(workflow).toContain("NODE_VERSION: 22.14.0");
  expect(workflow).toContain("bun-version: ${{ env.BUN_VERSION }}");
  expect(workflow).toContain("actions/setup-node@v4");
  expect(workflow).toContain("node-version: ${{ env.NODE_VERSION }}");
  expect(workflow).toContain("Verify release runtime");
  expect(workflow).toContain("node --version");
  expect(workflow).toContain("bun --version");

  const setupNodeIndex = workflow.indexOf("Setup Node");
  const releaseIndex = workflow.indexOf("Run semantic-release");

  expect(setupNodeIndex).toBeGreaterThan(-1);
  expect(releaseIndex).toBeGreaterThan(setupNodeIndex);
});

test("release Docker image tags normalize the GHCR repository to lowercase", () => {
  const workflow = readFile(".github/workflows/release.yml");

  expect(workflow).toContain('owner="$(printf \'%s\' "${GITHUB_REPOSITORY_OWNER}" | tr \'[:upper:]\' \'[:lower:]\')"');
  expect(workflow).toContain('image_name="$(printf \'%s\' "${DOCKER_IMAGE_NAME}" | tr \'[:upper:]\' \'[:lower:]\')"');
  expect(workflow).toContain('image="ghcr.io/${owner}/${image_name}"');
  expect(workflow).not.toContain('image="ghcr.io/${GITHUB_REPOSITORY_OWNER}/${DOCKER_IMAGE_NAME}"');
});

test("semantic release package version requires Node 22.14 or newer", () => {
  const pkg = JSON.parse(readFile("package.json")) as {
    devDependencies: Record<string, string>;
  };

  expect(pkg.devDependencies["semantic-release"]).toBe("^25.0.3");
});
