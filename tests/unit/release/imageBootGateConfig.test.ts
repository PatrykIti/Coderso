import { expect, test } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../../");

const readFile = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf-8");

const PR_GATES_WORKFLOW = ".github/workflows/coderso-pr-gates.yml";
const RELEASE_WORKFLOW = ".github/workflows/release.yml";
const BOOT_SCRIPT = ".github/scripts/verify-image-boot.sh";
const PUBLISH_SCRIPT = ".github/scripts/verify-published-image.sh";
const STARTUP_ASSISTANT_DOCS = "core/server/startupAssistantDocs.ts";

/**
 * Paths that decide what lands in the runtime image: everything the Dockerfile
 * copies, the lockfile and manifests it installs from, and the files that
 * define the gate itself. A pull request touching one of these has to build the
 * image and start it, because the image runs TypeScript source and resolves its
 * imports at boot — no earlier gate can see a module that stopped being there.
 */
const IMAGE_SHAPING_PATHS = [
  "Dockerfile",
  ".dockerignore",
  "bun.lock",
  "bunfig.toml",
  "package.json",
  "core/package.json",
  "store/package.json",
  "core/server/dockerStart.ts",
  "core/server/startupAssistantDocs.ts",
  "docs/guide/getting-started.md",
  "packages/sdk/src/index.ts",
  "themes/default/theme.json",
  PR_GATES_WORKFLOW,
  // The release job runs the same boot script against the same image on main,
  // once the version is already tagged. If a pull request does not build for a
  // change to it, nothing does until it is too late to un-tag.
  RELEASE_WORKFLOW,
  BOOT_SCRIPT,
  PUBLISH_SCRIPT,
  ".github/scripts/a-gate-script-added-later.sh",
];

/**
 * Paths that cannot reach the runtime image. Building for these buys nothing
 * and costs a runner every time, so the filter has to stay a filter.
 */
const NON_IMAGE_PATHS = [
  "README.md",
  "_docs/_TASKS/task-540.md",
  "tests/unit/release/imageBootGateConfig.test.ts",
  "scripts/coderso-release-gates.ts",
  "store/src/index.ts",
  "vitest.config.ts",
];

const getJobBlock = (workflow: string, jobName: string) => {
  const start = workflow.indexOf(`  ${jobName}:`);
  expect(start).toBeGreaterThan(-1);
  const rest = workflow.slice(start + 1);
  const nextJob = rest.search(/\n  [a-z0-9-]+:\n/);
  if (nextJob === -1) return workflow.slice(start);
  return workflow.slice(start, start + 1 + nextJob);
};

type WorkflowStep = { name: string; body: string };

const getSteps = (jobBlock: string): WorkflowStep[] => {
  const steps = jobBlock
    .split("\n      - name: ")
    .slice(1)
    .map((part) => {
      const lineEnd = part.indexOf("\n");
      return {
        name: (lineEnd === -1 ? part : part.slice(0, lineEnd)).trim(),
        body: part,
      };
    });
  // Splitting on the name is only a faithful reading of the job while every
  // step has one; an unnamed step would silently fold into its predecessor and
  // hide whatever it does from every ordering assertion below.
  const bullets = jobBlock.match(/\n {6}- /g) ?? [];
  if (bullets.length !== steps.length) {
    throw new Error(
      `Every step in this job must start with "- name:" for these assertions to read it; found ${bullets.length} steps and ${steps.length} names.`
    );
  }
  return steps;
};

const publishes = (step: WorkflowStep) =>
  /^\s+push: true$/m.test(step.body) || /\bdocker push\b/.test(step.body);

const indexesOf = (steps: WorkflowStep[], predicate: (step: WorkflowStep) => boolean) =>
  steps.map((step, index) => (predicate(step) ? index : -1)).filter((index) => index >= 0);

const imageScopeFilter = () => {
  const job = getJobBlock(readFile(PR_GATES_WORKFLOW), "image-boot-gate");
  const match = /grep -qE '([^']+)'/.exec(job);
  if (!match || typeof match[1] !== "string") {
    throw new Error(
      "image-boot-gate no longer decides its scope with a grep -qE path filter; these assertions cannot read what it builds for."
    );
  }
  return new RegExp(match[1]);
};

test("the pull-request image gate builds the image, boots it, and never publishes", () => {
  const job = getJobBlock(readFile(PR_GATES_WORKFLOW), "image-boot-gate");
  const steps = getSteps(job);

  const buildSteps = indexesOf(steps, (step) => /^\s+load: true$/m.test(step.body));
  const bootSteps = indexesOf(steps, (step) => step.body.includes(BOOT_SCRIPT));

  expect(buildSteps).toHaveLength(1);
  expect(bootSteps).toHaveLength(1);
  expect(Math.min(...bootSteps)).toBeGreaterThan(Math.max(...buildSteps));

  // A pull request may build and start the image; it may not ship one.
  expect(indexesOf(steps, publishes)).toEqual([]);
  expect(job).not.toContain("ghcr.io");
});

test("the release job starts the image before anything is pushed", () => {
  const job = getJobBlock(readFile(RELEASE_WORKFLOW), "docker-image");
  const steps = getSteps(job);

  const bootSteps = indexesOf(steps, (step) => step.body.includes(BOOT_SCRIPT));
  const publishingSteps = indexesOf(steps, publishes);
  const loginSteps = indexesOf(steps, (step) => step.body.includes("docker/login-action@"));

  expect(bootSteps).toHaveLength(1);
  expect(publishingSteps).toHaveLength(1);
  expect(loginSteps).toHaveLength(1);

  const boot = Math.max(...bootSteps);
  // Nothing publishes before the container has been started and seen to serve,
  // and a build that never served is not even authenticated to a registry.
  expect(Math.min(...publishingSteps)).toBeGreaterThan(boot);
  expect(Math.min(...loginSteps)).toBeGreaterThan(boot);
  expect(Math.max(...loginSteps)).toBeLessThan(Math.min(...publishingSteps));
});

test("the release image ships with provenance, and only the unpublished build drops it", () => {
  const job = getJobBlock(readFile(RELEASE_WORKFLOW), "docker-image");
  const steps = getSteps(job);

  const publishingSteps = steps.filter(publishes);
  expect(publishingSteps.map((step) => step.name)).toHaveLength(1);
  for (const step of publishingSteps) {
    // Not merely "an attestation": the same one docker/build-push-action
    // produced by default before it was switched off, spelled out so the
    // builder id that points back at this run cannot go missing again.
    expect(step.body).toMatch(/^\s+provenance: mode=min,inline-only=true,builder-id=.+$/m);
    expect(step.body).toContain("/actions/runs/${{ github.run_id }}");
  }

  // Dropping the attestation is defensible on one export only: the docker
  // exporter behind `load`, which cannot write one, and only while that export
  // stays on the runner.
  for (const step of steps.filter((candidate) => /^\s+provenance: false$/m.test(candidate.body))) {
    expect(step.body).toMatch(/^\s+load: true$/m);
    expect(step.body).toMatch(/^\s+push: false$/m);
  }

  const publishChecks = indexesOf(steps, (step) => step.body.includes(PUBLISH_SCRIPT));
  expect(publishChecks).toHaveLength(1);
  expect(Math.min(...publishChecks)).toBeGreaterThan(Math.min(...indexesOf(steps, publishes)));
});

test("the pull-request image gate fires for every path that shapes the image", () => {
  const filter = imageScopeFilter();

  for (const candidate of IMAGE_SHAPING_PATHS) {
    expect({ path: candidate, builds: filter.test(candidate) }).toEqual({
      path: candidate,
      builds: true,
    });
  }
});

test("the pull-request image gate stays a filter rather than a catch-all", () => {
  const filter = imageScopeFilter();

  for (const candidate of NON_IMAGE_PATHS) {
    expect({ path: candidate, builds: filter.test(candidate) }).toEqual({
      path: candidate,
      builds: false,
    });
  }
});

test("every action the image gates run stays pinned to a commit", () => {
  for (const workflow of [PR_GATES_WORKFLOW, RELEASE_WORKFLOW]) {
    const references = [...readFile(workflow).matchAll(/^\s*uses: (.+)$/gm)].map((match) =>
      (match[1] ?? "").trim()
    );

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect({
        workflow,
        reference,
        pinned: /^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\S+$/.test(reference),
      }).toEqual({ workflow, reference, pinned: true });
    }
  }
});

test("the boot diagnoser recognises a docs-ingest failure by the string the boot path logs", () => {
  const script = readFile(BOOT_SCRIPT);
  const source = readFile(STARTUP_ASSISTANT_DOCS);

  // A diagnoser signature is worth exactly as much as its agreement with the
  // code that writes the line, so both halves are asserted here and neither can
  // be reworded on its own.
  const failureLine = "[startup] Assistant docs reindex failed";
  expect(source).toContain(`\`${failureLine}: \${`);
  // The script greps for it, so its brackets are escaped; deriving the pattern
  // from the logged line is what keeps the two ends tied together.
  expect(script).toContain(failureLine.replace("[", "\\[").replace("]", "\\]"));

  // "partial" deserves its own wording: a document under docs/ failed
  // validation, which is not a broken image and should not be reported as one.
  expect(source).toContain("`assistant_startup_docs_reindex_${result.status}`");
  expect(source).toContain('status: "success" | "partial" | "failed"');
  expect(script).toContain("assistant_startup_docs_reindex_partial");

  // The signature is only reachable because both gates switch the reindex on;
  // with it off, a docs failure could never abort a boot here.
  expect(script).toContain('--env "CODERSO_ASSISTANT_DOCS_REINDEX_ON_START=1"');
});

test("the gate scripts the workflows invoke exist and are runnable as invoked", () => {
  for (const script of [BOOT_SCRIPT, PUBLISH_SCRIPT]) {
    const fullPath = path.join(root, script);
    expect({ script, present: existsSync(fullPath) }).toEqual({ script, present: true });

    const source = readFile(script);
    expect(source.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(source).toContain("set -Eeuo pipefail");

    // Both are invoked as bare paths, not through an interpreter, so the mode
    // bit recorded in git is what decides whether the step runs at all.
    expect({ script, executable: (statSync(fullPath).mode & 0o111) !== 0 }).toEqual({
      script,
      executable: true,
    });
  }
});
