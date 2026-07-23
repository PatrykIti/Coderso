import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../../..");
const executorRelative = "_docs/_workflows/task-540-smoke-executor.mjs";
const implementRelative = "_docs/_workflows/task-540-implement.mjs";
const executorPath = path.join(root, executorRelative);
const implementPath = path.join(root, implementRelative);
const MASKED_IMPLEMENT_SHA256 = "6ce1b4c885cc39b68344fd0bc01efe22d1ea1671d0af387f8929fa0ed5c2f46a";

function readSources() {
  return {
    executor: readFileSync(executorPath, "utf8"),
    implement: readFileSync(implementPath, "utf8"),
  };
}

function frozenExecutorSha256(source: string): string {
  const match = source.match(/const FROZEN_SMOKE_EXECUTOR_SHA256 =\s*\n\s*"([a-f0-9]{64})";/u);
  expect(match).not.toBeNull();
  return match![1];
}

function maskFrozenExecutorSha256(source: string): string {
  return source.replace(
    /(const FROZEN_SMOKE_EXECUTOR_SHA256 =\s*\n\s*")[a-f0-9]{64}(";)/u,
    "$1<FROZEN_EXECUTOR_SHA256>$2"
  );
}

test("TASK-540 executor security self-test passes", () => {
  const result = spawnSync("node", [executorPath, "--self-test"], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toMatchObject({
    pass: true,
    actions: 496,
    runtimeReceipts: 177,
    cleanupActions: 72,
    captures: 26,
  });
}, 120_000);

test("flagged run-code values cross the source boundary only as bounded data", () => {
  const { executor } = readSources();

  expect(executor).toContain("function buildDataBearingRunCodeSource(operation, input)");
  expect(executor).toContain("canonicalRunCodePayloadEncoding(operation, input)");
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("goto-ready"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("fill"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("type"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("press"');
  expect(executor).toContain('return buildDataBearingRunCodeInvocation("focus"');
  expect(executor).toContain("unitResultAlreadyNormalized: true");
  expect(executor).toContain("const unitResultAlreadyNormalized =");
  expect(executor).toContain('const legacySelector = "[data-" + "screen-runtime-root]";');
  expect(executor).not.toContain('.replace("related-failure", "related-failure")');
  expect(executor).not.toContain("frameSha256: hashBytes(frame)");
  expect(executor).not.toContain("stdoutSha256: hashBytes(outcome.stdoutBytes)");
  expect(executor).not.toContain("stderrSha256: hashBytes(outcome.stderrBytes)");
  expect(executor).not.toContain(
    "runCode(`(page) => page.locator(${JSON.stringify(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR)})`)"
  );
});

test("credential evidence avoids fast digests while secret-free evidence stays bound", () => {
  const { executor } = readSources();

  expect(executor).toContain('const LF_SHA256 = "01ba4719');
  expect(executor).toContain('const EMPTY_SHA256 = "e3b0c442');
  expect(executor).not.toContain("projection.frameSha256 =");
  expect(executor).toContain("credentialReceiptDigestCalls === 0");
  expect(executor).toContain('"secret-free Bun frame projection drift"');
  expect(executor).toContain("ordinaryReceiptDigestCalls === 2");
  expect(executor).toContain("normalizedCredentialOutput.equals");
});

test("frozen executor pin matches and is the implement workflow's only dirty byte range", () => {
  const { executor, implement } = readSources();
  const actualSha256 = createHash("sha256").update(executor).digest("hex");

  expect(frozenExecutorSha256(implement)).toBe(actualSha256);
  expect(createHash("sha256").update(maskFrozenExecutorSha256(implement)).digest("hex")).toBe(
    MASKED_IMPLEMENT_SHA256
  );
});
