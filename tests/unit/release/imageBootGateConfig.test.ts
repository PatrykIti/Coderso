import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../../../");

const readFile = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf-8");

const PR_GATES_WORKFLOW = ".github/workflows/coderso-pr-gates.yml";
const RELEASE_WORKFLOW = ".github/workflows/release.yml";
const BOOT_SCRIPT = ".github/scripts/verify-image-boot.sh";
const IDENTITY_SCRIPT = ".github/scripts/verify-published-image.sh";
const PROMOTION_SCRIPT = ".github/scripts/promote-release-image.sh";
const STARTUP_ASSISTANT_DOCS = "core/server/startupAssistantDocs.ts";
const RELEASE_PROCESS_DOC = "_docs/RELEASE_PROCESS.md";
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

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
  IDENTITY_SCRIPT,
  PROMOTION_SCRIPT,
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

const getMultilineRun = (step: WorkflowStep) => {
  const marker = "\n        run: |\n";
  const start = step.body.indexOf(marker);
  if (start === -1) throw new Error(`Step ${step.name} has no multiline run script.`);
  return step.body
    .slice(start + marker.length)
    .split("\n")
    .map((line) => line.replace(/^ {10}/, ""))
    .join("\n");
};

const pushesBuiltImage = (step: WorkflowStep) =>
  /^\s+push: true$/m.test(step.body) ||
  /^\s+outputs: type=registry(?:,|$)/m.test(step.body) ||
  /\bdocker push\b/.test(step.body);

const writesRegistry = (step: WorkflowStep) =>
  pushesBuiltImage(step) || step.body.includes(PROMOTION_SCRIPT);

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
  expect(indexesOf(steps, writesRegistry)).toEqual([]);
  expect(job).not.toContain("ghcr.io");
});

test("the release job starts the image before anything is pushed", () => {
  const job = getJobBlock(readFile(RELEASE_WORKFLOW), "docker-image");
  const steps = getSteps(job);

  const bootSteps = indexesOf(steps, (step) => step.body.includes(BOOT_SCRIPT));
  const publishingSteps = indexesOf(steps, writesRegistry);
  const loginSteps = indexesOf(steps, (step) => step.body.includes("docker/login-action@"));

  expect(bootSteps).toHaveLength(1);
  expect(publishingSteps).toHaveLength(2);
  expect(loginSteps).toHaveLength(1);

  const boot = Math.max(...bootSteps);
  // Nothing publishes before the container has been started and seen to serve,
  // and a build that never served is not even authenticated to a registry.
  expect(Math.min(...publishingSteps)).toBeGreaterThan(boot);
  expect(Math.min(...loginSteps)).toBeGreaterThan(boot);
  expect(Math.max(...loginSteps)).toBeLessThan(Math.min(...publishingSteps));
});

test("release workflows are serialized without cancelling an in-progress promotion", () => {
  const workflow = readFile(RELEASE_WORKFLOW);

  expect(
    workflow.match(/^concurrency:\n  group: coderso-release\n  cancel-in-progress: false$/gm)
  ).toHaveLength(1);
  expect(workflow.indexOf("concurrency:")).toBeLessThan(workflow.indexOf("jobs:"));
});

test("partial promotion recovery is an explicit no-build version-digest lane", () => {
  const workflow = readFile(RELEASE_WORKFLOW);
  const releaseProcess = readFile(RELEASE_PROCESS_DOC);
  const semanticRelease = getJobBlock(workflow, "semantic-release");
  const recoveryJob = getJobBlock(workflow, "recover-docker-image");
  const steps = getSteps(recoveryJob);
  const recoverySteps = steps.filter((step) => step.body.includes(PROMOTION_SCRIPT));

  expect(workflow).toContain("recovery_image_version:");
  expect(workflow).toContain("recovery_image_digest:");
  expect(semanticRelease).toContain("inputs.recovery_image_version == ''");
  expect(semanticRelease).toContain("inputs.recovery_image_digest == ''");
  expect(recoveryJob).toContain("github.event_name == 'workflow_dispatch'");
  expect(recoveryJob).toContain("inputs.recovery_image_version != ''");
  expect(recoveryJob).toContain("inputs.recovery_image_digest != ''");
  expect(recoveryJob).toContain(
    "stable_version_pattern='^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$'"
  );
  expect(recoveryJob).toContain('[[ "${RECOVERY_IMAGE_DIGEST}" =~ ^sha256:[0-9a-f]{64}$ ]]');
  expect(recoveryJob).toContain("printf 'version_ref=%s\\n'");
  expect(recoveryJob).toContain("printf 'latest_ref=%s\\n'");
  expect(recoveryJob).toContain("printf 'recovery_digest=%s\\n'");
  expect(recoveryJob.indexOf("stable_version_pattern=")).toBeLessThan(
    recoveryJob.indexOf("$GITHUB_OUTPUT")
  );
  expect(steps.filter(pushesBuiltImage)).toEqual([]);
  expect(recoveryJob).not.toContain("docker/build-push-action@");
  expect(recoverySteps).toHaveLength(1);

  const recovery = recoverySteps[0];
  if (!recovery) throw new Error("Recovery must invoke the promotion interlock.");
  expect(recovery.body).toContain(
    "RECOVERY_VERSION_DIGEST: ${{ steps.recovery-image.outputs.recovery_digest }}"
  );
  expect(recovery.body).toContain("VERSION_REF: ${{ steps.recovery-image.outputs.version_ref }}");
  expect(recovery.body).toContain("LATEST_REF: ${{ steps.recovery-image.outputs.latest_ref }}");
  expect(recovery.body).toContain("GHCR_USERNAME: ${{ github.actor }}");
  expect(recovery.body).toContain("GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
  expect(recovery.body).not.toContain("CANDIDATE_REF:");
  expect(releaseProcess).toContain("tag state explicitly unconfirmed");
  expect(releaseProcess).toContain("safely rerun the same recovery inputs");
  expect(releaseProcess).not.toContain("or registry error aborts without a write");
});

test("recovery refs reject output injection before producing values or invoking tools", () => {
  const recoveryJob = getJobBlock(readFile(RELEASE_WORKFLOW), "recover-docker-image");
  const setupStep = getSteps(recoveryJob).find((step) => step.name === "Set recovery image refs");
  if (!setupStep) throw new Error("Recovery ref setup step is missing.");
  const script = getMultilineRun(setupStep);
  const validDigest = `sha256:${"a".repeat(64)}`;

  const runSetup = (version: string, recoveryDigest: string) => {
    const directory = mkdtempSync(path.join(tmpdir(), "coderso-recovery-refs-"));
    temporaryDirectories.push(directory);
    const outputFile = path.join(directory, "github-output.txt");
    const toolCallsFile = path.join(directory, "tool-calls.txt");
    const fakeTr = path.join(directory, "tr");
    writeFileSync(outputFile, "");
    writeFileSync(
      fakeTr,
      '#!/usr/bin/env bash\nprintf \'tr\\n\' >> "${TOOL_CALLS_FILE}"\nexec /usr/bin/tr "$@"\n',
      { mode: 0o755 }
    );
    const result = spawnSync("bash", ["-c", `set -Eeuo pipefail\n${script}`], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH ?? ""}`,
        DOCKER_IMAGE_NAME: "Coderso-Core",
        GITHUB_OUTPUT: outputFile,
        GITHUB_REPOSITORY_OWNER: "Example",
        RECOVERY_IMAGE_DIGEST: recoveryDigest,
        RECOVERY_IMAGE_VERSION: version,
        TOOL_CALLS_FILE: toolCallsFile,
      },
    });
    return {
      result,
      output: readFileSync(outputFile, "utf8"),
      toolCalls: existsSync(toolCallsFile) ? readFileSync(toolCallsFile, "utf8") : "",
    };
  };

  for (const [version, recoveryDigest] of [
    ["1.2.3\nlatest_ref=ghcr.io/attacker/image:latest", validDigest],
    ["1.2.3;printf injected", validDigest],
    ["01.2.3", validDigest],
    ["1.2.3-rc.1", validDigest],
    ["1.2.3", `${validDigest}\nversion_ref=ghcr.io/attacker/image:1.0.0`],
    ["1.2.3", "sha256:abc;printf injected"],
  ] as const) {
    const attempt = runSetup(version, recoveryDigest);
    expect(attempt.result.status).not.toBe(0);
    expect(attempt.output).toBe("");
    expect(attempt.toolCalls).toBe("");
  }

  const accepted = runSetup("1.2.3", validDigest);
  expect(accepted.result.status).toBe(0);
  expect(accepted.result.stderr).toBe("");
  expect(accepted.output).toBe(
    `version_ref=ghcr.io/example/coderso-core:1.2.3\nlatest_ref=ghcr.io/example/coderso-core:latest\nrecovery_digest=${validDigest}\n`
  );
  expect(accepted.toolCalls).toBe("tr\ntr\n");
});

test("the release image ships with provenance, and only the unpublished build drops it", () => {
  const job = getJobBlock(readFile(RELEASE_WORKFLOW), "docker-image");
  const steps = getSteps(job);

  const publishingSteps = steps.filter(pushesBuiltImage);
  expect(publishingSteps.map((step) => step.name)).toHaveLength(1);
  for (const step of publishingSteps) {
    // Not merely "an attestation": the same one docker/build-push-action
    // produced by default before it was switched off, spelled out so the
    // builder id that points back at this run cannot go missing again.
    expect(step.body).toMatch(
      /^\s+provenance: mode=min,version=v0\.2,inline-only=true,builder-id=.+$/m
    );
    expect(step.body).toContain("/actions/runs/${{ github.run_id }}");
    expect(step.body).toMatch(/^\s+outputs: type=registry,oci-mediatypes=true,oci-artifact=true$/m);
    expect(step.body.match(/^\s+outputs:/gm)).toHaveLength(1);
    expect(step.body).not.toMatch(/^\s+push: true$/m);
  }

  // Dropping the attestation is defensible on one export only: the docker
  // exporter behind `load`, which cannot write one, and only while that export
  // stays on the runner.
  for (const step of steps.filter((candidate) => /^\s+provenance: false$/m.test(candidate.body))) {
    expect(step.body).toMatch(/^\s+load: true$/m);
    expect(step.body).toMatch(/^\s+push: false$/m);
  }

  const publishChecks = indexesOf(steps, (step) => step.body.includes(IDENTITY_SCRIPT));
  const promotions = indexesOf(steps, (step) => step.body.includes(PROMOTION_SCRIPT));
  expect(publishChecks).toHaveLength(1);
  expect(promotions).toHaveLength(1);
  expect(Math.min(...publishChecks)).toBeGreaterThan(
    Math.min(...indexesOf(steps, pushesBuiltImage))
  );
  expect(Math.min(...promotions)).toBeGreaterThan(Math.max(...publishChecks));
});

test("the release promotes final tags only after immutable candidate identity verification", () => {
  const job = getJobBlock(readFile(RELEASE_WORKFLOW), "docker-image");
  const steps = getSteps(job);
  const immutableCandidate =
    "${{ steps.image.outputs.candidate_tag }}@${{ steps.candidate.outputs.digest }}";

  const publishingSteps = indexesOf(steps, pushesBuiltImage);
  const identitySteps = indexesOf(steps, (step) => step.body.includes(IDENTITY_SCRIPT));
  const promotionSteps = indexesOf(steps, (step) => step.body.includes(PROMOTION_SCRIPT));

  expect(publishingSteps).toHaveLength(1);
  expect(identitySteps).toHaveLength(1);
  expect(promotionSteps).toHaveLength(1);

  const publish = steps[publishingSteps[0] ?? -1];
  const identity = steps[identitySteps[0] ?? -1];
  const promotion = steps[promotionSteps[0] ?? -1];
  if (!publish || !identity || !promotion) {
    throw new Error("Release candidate publication, identity gate, and promotion must all exist.");
  }

  expect(publishingSteps[0]).toBeLessThan(identitySteps[0] ?? -1);
  expect(identitySteps[0]).toBeLessThan(promotionSteps[0] ?? -1);

  // The sole build that pushes can expose only the run-scoped candidate. The
  // stable refs are unavailable to any registry writer until after identity.
  expect(publish.body).toContain("id: candidate");
  expect(publish.body).toMatch(/^\s+tags: \$\{\{ steps\.image\.outputs\.candidate_tag \}\}\s*$/m);
  expect(publish.body.match(/^\s+tags:/gm)).toHaveLength(1);
  expect(publish.body).not.toContain("steps.image.outputs.version_tag");
  expect(publish.body).not.toContain("steps.image.outputs.latest_tag");

  expect(identity.body).toContain(`CANDIDATE_REF: ${immutableCandidate}`);
  expect(identity.body).toContain(
    "EXPECTED_PROVENANCE_BUILDER_ID: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
  );
  expect(identity.body).toContain("GHCR_USERNAME: ${{ github.actor }}");
  expect(identity.body).toContain("GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
  expect(promotion.body).toContain(`CANDIDATE_REF: ${immutableCandidate}`);
  expect(promotion.body).toContain("VERSION_REF: ${{ steps.image.outputs.version_tag }}");
  expect(promotion.body).toContain("LATEST_REF: ${{ steps.image.outputs.latest_tag }}");
  expect(promotion.body).toContain("GHCR_USERNAME: ${{ github.actor }}");
  expect(promotion.body).toContain("GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
  expect(steps.filter((step) => step.body.includes("GHCR_USERNAME"))).toEqual([
    identity,
    promotion,
  ]);
  expect(steps.filter((step) => step.body.includes("GHCR_TOKEN"))).toEqual([identity, promotion]);
  expect(identity.body).not.toContain("continue-on-error");
  expect(promotion.body).not.toMatch(/^\s+if:/m);

  const finalRefConsumers = indexesOf(
    steps,
    (step) =>
      step.body.includes("steps.image.outputs.version_tag") ||
      step.body.includes("steps.image.outputs.latest_tag")
  );
  expect(finalRefConsumers).toEqual(promotionSteps);

  const identityScript = readFile(IDENTITY_SCRIPT);
  expect(identityScript).toContain('[[ "${CANDIDATE_REF}" =~ ^[^@]+@sha256:[0-9a-f]{64}$ ]]');
  expect(identityScript).toContain("{{json .Provenance.SLSA}}");
  expect(identityScript).toContain('"https://in-toto.io/Statement/v1"');
  expect(identityScript).toContain(
    '"sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"'
  );
  expect(identityScript).toContain(".subject.size == $runnable_size");
  expect(identityScript).toContain('"vnd.docker.reference.digest"');
  expect(identityScript).toContain('"https://slsa.dev/provenance/v0.2"');
  expect(identityScript).toContain(
    '"https://ghcr.io/v2/${ghcr_repository_path}/blobs/${blob_digest}"'
  );
  expect(identityScript).toContain("curl --config -");
  expect(identityScript).not.toContain('curl --user "${GHCR_USERNAME}:${GHCR_TOKEN}"');
  expect(identityScript).not.toContain("PUBLISHED_REFS");

  const promotionScript = readFile(PROMOTION_SCRIPT);
  expect(promotionScript).toContain('[[ "${CANDIDATE_REF}" =~ ^[^@]+@sha256:[0-9a-f]{64}$ ]]');
  expect(promotionScript).toContain("git ls-remote --tags --refs origin");
  expect(promotionScript).toContain("https://ghcr.io/v2/${ghcr_repository_path}/manifests/${tag}");
  expect(promotionScript).toContain("curl --config -");
  expect(promotionScript).toContain("'head'");
  expect(promotionScript).not.toContain('request = "HEAD"');
  expect(promotionScript.match(/'connect-timeout = 10'/g)).toHaveLength(2);
  expect(promotionScript.match(/'max-time = 30'/g)).toHaveLength(2);
  expect(promotionScript).toContain("docker buildx imagetools create --tag");
  expect(promotionScript).toContain('--tag "${VERSION_REF}"');
  expect(promotionScript).toContain('--tag "${LATEST_REF}"');
  expect(promotionScript).toContain('"${CANDIDATE_REF}"');
  expect(promotionScript).not.toContain("docker buildx build");
  expect(promotionScript).not.toContain('curl --user "${GHCR_USERNAME}:${GHCR_TOKEN}"');
  expect(promotionScript).toContain('promotion_source="${VERSION_REF}@${RECOVERY_VERSION_DIGEST}"');
  expect(promotionScript).toContain(
    "Recovery digest does not match the authenticated immutable version tag."
  );
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
  for (const script of [BOOT_SCRIPT, IDENTITY_SCRIPT, PROMOTION_SCRIPT]) {
    const fullPath = path.join(root, script);
    expect({ script, present: existsSync(fullPath) }).toEqual({ script, present: true });

    const source = readFile(script);
    expect(source.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(source).toContain("set -Eeuo pipefail");

    // All are invoked as bare paths, not through an interpreter, so the mode
    // bit recorded in git is what decides whether the step runs at all.
    expect({ script, executable: (statSync(fullPath).mode & 0o111) !== 0 }).toEqual({
      script,
      executable: true,
    });
  }
});
