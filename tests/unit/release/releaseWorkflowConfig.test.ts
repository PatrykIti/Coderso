import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

const BUN_VERSION = "1.3.14";
const NODE_VERSION = "26.5.0";

const readFile = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf-8");

test("semantic release workflow pins a supported Node runtime", () => {
  const workflow = readFile(".github/workflows/release.yml");

  expect(workflow).toContain(`BUN_VERSION: ${BUN_VERSION}`);
  expect(workflow).toContain(`NODE_VERSION: ${NODE_VERSION}`);
  expect(workflow).toContain("bun-version: ${{ env.BUN_VERSION }}");
  expect(workflow).toContain(
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0"
  );
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

  expect(workflow).toContain(
    "owner=\"$(printf '%s' \"${GITHUB_REPOSITORY_OWNER}\" | tr '[:upper:]' '[:lower:]')\""
  );
  expect(workflow).toContain(
    "image_name=\"$(printf '%s' \"${DOCKER_IMAGE_NAME}\" | tr '[:upper:]' '[:lower:]')\""
  );
  expect(workflow).toContain('image="ghcr.io/${owner}/${image_name}"');
  expect(workflow).not.toContain('image="ghcr.io/${GITHUB_REPOSITORY_OWNER}/${DOCKER_IMAGE_NAME}"');
});

test("release tooling pins the supported Node 26 and Bun metadata", () => {
  const pkg = JSON.parse(readFile("package.json")) as {
    devDependencies: Record<string, string>;
    engines: { node: string };
    packageManager: string;
  };

  expect(pkg.devDependencies["semantic-release"]).toBe("^25.0.8");
  expect(pkg.engines.node).toBe(">=26.5.0 <27");
  expect(pkg.packageManager).toBe(`bun@${BUN_VERSION}`);
});

test("release workflow pins current actions to immutable commits", () => {
  const workflow = readFile(".github/workflows/release.yml");

  expect(workflow).toContain(
    "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0"
  );
  expect(workflow).toContain("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1");
  expect(workflow).toContain("oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0");
  expect(workflow).toContain(
    "docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c # v4.2.0"
  );
  expect(workflow).toContain(
    "docker/login-action@af1e73f918a031802d376d3c8bbc3fe56130a9b0 # v4.4.0"
  );
  expect(workflow).toContain(
    "docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a # v7.3.0"
  );
});

test("Docker builder and runner use the same non-root Bun runtime", () => {
  const dockerfile = readFile("Dockerfile");
  const bunImages = [...dockerfile.matchAll(/^FROM oven\/bun:([^ ]+)/gm)].map((match) => match[1]);
  const bunfigCopyIndex = dockerfile.indexOf("COPY package.json bun.lock bunfig.toml ./");
  const frozenInstallIndex = dockerfile.indexOf("RUN bun install --frozen-lockfile");

  // Three stages since the runner stopped inheriting the builder's node_modules:
  // prod-deps installs the production-only tree, builder keeps the full one for
  // the vite builds, runner takes only what it needs from each. All three must
  // stay on the pinned Bun version -- a drift between them would mean the image
  // runs a different Bun than the one the dependencies were installed with.
  expect(bunImages).toEqual([BUN_VERSION, BUN_VERSION, BUN_VERSION]);
  expect(bunfigCopyIndex).toBeGreaterThanOrEqual(0);
  expect(frozenInstallIndex).toBeGreaterThan(bunfigCopyIndex);
  expect(dockerfile).toContain("USER bun");
  expect(dockerfile).toContain(
    'CMD ["bun", "--config=/app/bunfig.toml", "--preload=/app/core/server/productionReactRuntime.ts", "run", "server/dockerStart.ts"]'
  );

  const corePackage = JSON.parse(readFile("core/package.json")) as {
    scripts: Record<string, string>;
  };
  expect(corePackage.scripts["start:prod"]).toBe(
    "bun --config=../bunfig.toml --preload=./server/productionReactRuntime.ts run server/prod.ts"
  );
});

test("Bun preserves the repository's hoisted workspace resolution contract", () => {
  const bunfig = readFile("bunfig.toml");

  expect(bunfig).toContain("[install]");
  expect(bunfig).toContain('linker = "hoisted"');
});
