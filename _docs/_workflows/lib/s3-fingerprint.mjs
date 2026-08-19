// S3 (TASK-481/539/542) shared repository fingerprint + line-gate helpers
// (orchestrator-owned). Environment-neutral ESM: canonical working-tree
// fingerprints (tracked diff + untracked + workflow tree), scope assertions,
// and the baseline-to-current family line gate shared by the three implement
// workflows. No repository, runtime, server, or global agent dependency beyond
// git/awk/read-only fs.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import path from "node:path";

import {
  GENERATED_ARTIFACT_EXTENSION,
  SOURCE_OR_TEST_EXTENSION,
  S3WorkflowError,
  countPhysicalLines,
  normalizedRepositoryPath,
} from "./s3-gate-contracts.mjs";

function runGit(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch (error) {
    throw new S3WorkflowError("git_failed", "s3_git", args.join(" "));
  }
}

export function currentDirtyPaths(root) {
  const lines = runGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const paths = [];
  for (const line of lines.split("\n")) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const relativePath = rawPath.split("\t")[0];
    if (status === "??" && rawPath.includes("->")) {
      // untracked symlink entries may carry " -> target"; keep the link path
    }
    paths.push(normalizedRepositoryPath(relativePath, "dirty_path"));
  }
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right));
}

export function noStagedChanges(root) {
  const output = runGit(root, ["diff", "--cached", "--name-only"]);
  if (output.trim().length !== 0) {
    throw new S3WorkflowError("staged_changes_forbidden", "s3_git", output.trim());
  }
  return true;
}

export function workflowTreePaths(root, depthLimit = 64, entryLimit = 8192) {
  const base = path.join(root, "_docs/_workflows");
  const entries = [];
  const visit = (absolutePath, depth) => {
    if (depth > depthLimit || entries.length >= entryLimit) {
      throw new S3WorkflowError("workflow_tree_limit", "s3_git", String(entries.length));
    }
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT" && absolutePath === base) {
        return;
      }
      throw error;
    }
    const relativePath = normalizedRepositoryPath(
      path.relative(root, absolutePath).split(path.sep).join("/"),
      "workflow_path"
    );
    entries.push(relativePath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return;
    for (const name of readdirSync(absolutePath).sort((a, b) => a.localeCompare(b))) {
      visit(path.join(absolutePath, name), depth + 1);
    }
  };
  visit(base, 0);
  return entries;
}

function fingerprintPath(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  let stats;
  try {
    stats = lstatSync(absolute);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "missing";
    throw error;
  }
  if (stats.isSymbolicLink()) return `symlink:${stats.mode}:${readlinkSync(absolute)}`;
  if (!stats.isFile()) return `non_file:${stats.mode}`;
  return `file:${stats.mode}:${createHash("sha256").update(readFileSync(absolute)).digest("hex")}`;
}

export function captureRepositoryFingerprint(root, excludedPaths = []) {
  const excluded = new Set(excludedPaths.map(normalizedRepositoryPath));
  const tracked = runGit(root, ["ls-files", "-co", "--exclude-standard"])
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const paths = [...new Set([...tracked, ...workflowTreePaths(root)])]
    .map(normalizedRepositoryPath)
    .filter((relativePath) => !excluded.has(relativePath))
    .sort((left, right) => left.localeCompare(right));
  return new Map(paths.map((relativePath) => [relativePath, fingerprintPath(root, relativePath)]));
}

export function changedRepositoryPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((relativePath) => before.get(relativePath) !== after.get(relativePath))
    .sort((left, right) => left.localeCompare(right));
}

export function assertScopedRepositoryMutation(label, before, after, allowedPaths, root) {
  noStagedChanges(root);
  const allowed = new Set(allowedPaths.map(normalizedRepositoryPath));
  const changed = changedRepositoryPaths(before, after);
  const outside = changed.filter((relativePath) => !allowed.has(relativePath));
  if (outside.length > 0) {
    throw new S3WorkflowError("scope_violation", label, JSON.stringify(outside));
  }
  return Object.freeze(changed);
}

export function assertNoRepositoryMutation(label, before, after, root) {
  return assertScopedRepositoryMutation(label, before, after, [], root);
}

// ---- Baseline-to-current family line gate ----

export function baselineReachable(root, baseline) {
  try {
    runGit(root, ["cat-file", "-e", `${baseline}^{commit}`]);
    runGit(root, ["merge-base", "--is-ancestor", baseline, "HEAD"]);
    return true;
  } catch (error) {
    throw new S3WorkflowError("baseline_unreachable", "s3_line_gate", baseline);
  }
}

export function listChangedSourceAndTestCandidates(root, baseline) {
  const comparison = runGit(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMRT",
    baseline,
    "--",
    "core",
    "packages",
    "scripts",
    "tests",
    "_docs/_workflows",
  ])
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const untracked = runGit(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "core",
    "packages",
    "scripts",
    "tests",
    "_docs/_workflows",
  ])
    .split("\n")
    .filter((line) => line.trim().length > 0);
  return [...new Set([...comparison, ...untracked])]
    .map(normalizedRepositoryPath)
    .filter(
      (candidate) =>
        SOURCE_OR_TEST_EXTENSION.test(candidate) && !GENERATED_ARTIFACT_EXTENSION.test(candidate)
    )
    .sort((left, right) => left.localeCompare(right));
}

export function assertFamilyLineLimit(root, baseline, label = "s3_line_gate") {
  baselineReachable(root, baseline);
  const counted = [];
  for (const relativePath of listChangedSourceAndTestCandidates(root, baseline)) {
    const absolute = path.resolve(root, relativePath);
    const stats = lstatSync(absolute);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new S3WorkflowError("line_gate_not_regular", label, relativePath);
    }
    const lines = countPhysicalLines(absolute, label);
    counted.push(Object.freeze({ path: relativePath, lines }));
    if (lines > 1000) {
      throw new S3WorkflowError("line_limit", label, `${relativePath}:${lines}`);
    }
  }
  return Object.freeze(counted);
}

export { S3WorkflowError };
