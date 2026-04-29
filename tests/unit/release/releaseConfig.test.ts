import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");
const require = createRequire(import.meta.url);

type PluginConfig = string | [string, Record<string, unknown>];

type ReleaseConfig = {
  branches: string[];
  tagFormat: string;
  plugins: PluginConfig[];
};

const config = require("../../../release.config.cjs") as ReleaseConfig;

const expectPath = (relativePath: string) => {
  expect(existsSync(path.join(root, relativePath))).toBe(true);
};

const tuplePlugin = (name: string): [string, Record<string, unknown>] => {
  const plugin = config.plugins.find(
    (entry): entry is [string, Record<string, unknown>] =>
      Array.isArray(entry) && entry[0] === name
  );

  if (!plugin) {
    throw new Error(`Missing semantic-release plugin: ${name}`);
  }

  return plugin;
};

test("semantic-release config targets the main branch and plain semver tags", () => {
  expect(config.branches).toEqual(["main"]);
  expect(config.tagFormat).toBe("${version}");
});

test("semantic-release commit analyzer keeps CI and release docs as patch releases", () => {
  const [, options] = tuplePlugin("@semantic-release/commit-analyzer");

  expect(options.preset).toBe("angular");
  expect(options.releaseRules).toContainEqual({ type: "build", release: "patch" });
  expect(options.releaseRules).toContainEqual({ type: "ci", release: "patch" });
  expect(options.releaseRules).toContainEqual({
    type: "docs",
    scope: "release",
    release: "patch",
  });
});

test("semantic-release local notes plugin owns changelog and version files", () => {
  const [, options] = tuplePlugin("./scripts/semantic-release-pr-notes.cjs");
  const versionFiles = options.versionFiles as string[];
  const textVersionFiles = options.textVersionFiles as Array<{
    path: string;
    pattern: string;
  }>;

  expect(options.changelogFile).toBe("CHANGELOG.md");
  expect(options.outputFile).toBe(".tmp/semantic-release.env");
  expect(versionFiles).toEqual([
    "package.json",
    "core/package.json",
    "store/package.json",
    "packages/sdk/package.json",
  ]);
  expect(options.lockfileCommand).toEqual(["bun", "install", "--lockfile-only", "--ignore-scripts"]);

  for (const versionFile of versionFiles) {
    expectPath(versionFile);
  }

  for (const file of textVersionFiles) {
    expectPath(file.path);
    expect(() => new RegExp(file.pattern)).not.toThrow();
  }
});

test("semantic-release git plugin commits all generated release assets", () => {
  const [, options] = tuplePlugin("@semantic-release/git");
  const assets = options.assets as string[];

  expect(assets).toEqual([
    "CHANGELOG.md",
    "bun.lock",
    "package.json",
    "core/package.json",
    "store/package.json",
    "packages/sdk/package.json",
    "core/plugins/compat.ts",
  ]);
  expect(options.message).toContain("chore(release): ${nextRelease.version} [skip ci]");

  for (const asset of assets) {
    expectPath(asset);
  }
});

test("semantic-release GitHub plugin stays quiet on issue comments", () => {
  const [, options] = tuplePlugin("@semantic-release/github");

  expect(options.successComment).toBe(false);
  expect(options.failComment).toBe(false);
});
