import { expect, test } from "bun:test";
import adapter, {
  createTask540SafeEvidenceAssertion,
  projectTask540LegacySnapshot,
  validateTask540Evidence,
} from "../../../scripts/runtime-smoke/adapters/task-540";

function canonicalEvidence(): unknown {
  return {
    pass: true,
    browserReceipts: Array.from({ length: 420 }, () => ({})),
    runtimeReceipts: Array.from({ length: 177 }, () => ({})),
    cleanupReceipts: Array.from({ length: 72 }, () => ({})),
    scenarios: Array.from({ length: 7 }, (_value, index) => ({ id: `scenario-${index}` })),
    finalization: {
      screenshots: Array.from({ length: 13 }, (_value, index) => ({
        path: `_docs/_workflows/_smoke/task-540-${index}.png`,
        sha256: index.toString(16).padStart(64, "0"),
      })),
    },
  };
}

test("TASK-540 adapter trusts canonical totals and validates its projection fields", () => {
  expect(adapter.suiteId).toBe("task-540");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  expect(validateTask540Evidence(canonicalEvidence())).toMatchObject({ pass: true });
  const drifted = canonicalEvidence() as {
    finalization: { screenshots: unknown[] };
  };
  drifted.finalization.screenshots = [];
  expect(() => validateTask540Evidence(drifted)).toThrow("projection is incomplete");
});

test("TASK-540 adapter projects the shared repository identity into the legacy guard", () => {
  const projected = projectTask540LegacySnapshot({
    files: Object.freeze([
      Object.freeze({ path: "a.txt", kind: "file" as const, sha256: "a".repeat(64) }),
      Object.freeze({ path: "shot.png", kind: "absent" as const, sha256: "absent" }),
    ]),
    sha256: "b".repeat(64),
  });
  expect(projected).toEqual({
    paths: ["a.txt", "shot.png"],
    hashes: { "a.txt": "a".repeat(64), "shot.png": "absent" },
  });
});

test("TASK-540 safe evidence assertion fails closed on configured secrets", () => {
  const assertSafe = createTask540SafeEvidenceAssertion({
    DATABASE_URL: "postgres://smoke:private-pass@localhost/smoke",
    PUBLIC_KEY: "safe-public-value",
  });
  expect(() =>
    assertSafe(
      { output: "postgres://smoke:private-pass@localhost/smoke" },
      "TASK-540 test evidence"
    )
  ).toThrow("configured secret");
  expect(assertSafe({ output: "safe-public-value" }, "TASK-540 test evidence")).toEqual({
    output: "safe-public-value",
  });
});
