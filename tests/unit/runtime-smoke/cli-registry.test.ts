import { expect, test } from "bun:test";
import { parseRuntimeSmokeArgs } from "../../../scripts/runtime-smoke/cli";
import { SmokeError } from "../../../scripts/runtime-smoke/contracts";
import { staticSmokeRegistry } from "../../../scripts/runtime-smoke/registry";

test("runtime smoke CLI accepts only the exact public shape", () => {
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--session",
      "wf552-fast",
      "--suite",
      "task-540",
      "--profile",
      "fast",
    ])
  ).toEqual({ command: "run", suite: "task-540", profile: "fast", session: "wf552-fast" });
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-547",
      "--profile",
      "certification",
      "--session",
      "wf547-certification",
    ])
  ).toEqual({
    command: "run",
    suite: "task-547",
    profile: "certification",
    session: "wf547-certification",
  });
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-554",
      "--profile",
      "fast",
      "--session",
      "task-554-fast",
    ])
  ).toEqual({ command: "run", suite: "task-554", profile: "fast", session: "task-554-fast" });
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-493",
      "--profile",
      "fast",
      "--session",
      "task-493-fast",
    ])
  ).toEqual({ command: "run", suite: "task-493", profile: "fast", session: "task-493-fast" });
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-493",
      "--profile",
      "certification",
      "--session",
      "task-493-certification",
    ])
  ).toEqual({
    command: "run",
    suite: "task-493",
    profile: "certification",
    session: "task-493-certification",
  });

  const invalid = [
    ["start", "--suite", "task-540", "--profile", "fast", "--session", "wf552-fast"],
    ["run", "--target", "task-540", "--profile", "fast", "--session", "wf552-fast"],
    ["run", "--suite", "task-540", "--suite", "task-540", "--session", "wf552-fast"],
    ["run", "--suite", "task-540", "--profile", "certify", "--session", "wf552-fast"],
    ["run", "--suite", "widget-contract", "--profile", "certification", "--session", "wf552-fast"],
    ["run", "--suite", "production-boundary", "--profile", "fast", "--session", "wf552-fast"],
    ["run", "--suite", "task-540", "--profile", "fast", "--session", "../escape"],
    ["run", "--suite", "task-540", "--profile", "fast", "--session", "bad\nname"],
  ];
  for (const argv of invalid) {
    expect(() => parseRuntimeSmokeArgs(argv)).toThrow(SmokeError);
  }
});

test("static registry reserves exactly fifteen fixed adapters", async () => {
  expect(staticSmokeRegistry.ids()).toEqual([
    "task-540",
    "task-547",
    "task-554",
    "widget-contract",
    "production-boundary",
    "task-487",
    "task-488",
    "task-490",
    "task-491",
    "task-492",
    "task-511",
    "task-517",
    "task-493",
    "detail-page-v2",
    "task-105-l05",
  ]);
  expect(staticSmokeRegistry.require("task-540").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/task-540.ts"
  );
  const adapter = await staticSmokeRegistry.require("task-540").loadFixedAdapter(process.cwd());
  expect(adapter.suiteId).toBe("task-540");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
  const task547 = await staticSmokeRegistry.require("task-547").loadFixedAdapter(process.cwd());
  expect(task547.suiteId).toBe("task-547");
  expect(task547.supportedProfiles).toEqual(["fast", "certification"]);
  expect(staticSmokeRegistry.require("task-554").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/task-554.ts"
  );
  const task554 = await staticSmokeRegistry.require("task-554").loadFixedAdapter(process.cwd());
  expect(task554.suiteId).toBe("task-554");
  expect(task554.supportedProfiles).toEqual(["fast", "certification"]);
  expect(staticSmokeRegistry.require("detail-page-v2").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/detail-page-v2.ts"
  );
  const detailPageV2 = await staticSmokeRegistry
    .require("detail-page-v2")
    .loadFixedAdapter(process.cwd());
  expect(detailPageV2.suiteId).toBe("detail-page-v2");
  expect(detailPageV2.supportedProfiles).toEqual(["fast"]);
  expect(staticSmokeRegistry.require("task-493").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/task-493.ts"
  );
  const task493 = await staticSmokeRegistry.require("task-493").loadFixedAdapter(process.cwd());
  expect(task493.suiteId).toBe("task-493");
  expect(task493.supportedProfiles).toEqual(["fast", "certification"]);
  // TASK-105-08-05-L04: the shared-runtime suite identity is task-105-l05;
  // no task-105-l04 alias exists.
  expect(staticSmokeRegistry.ids()).not.toContain("task-105-l04");
  expect(() =>
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-105-l04",
      "--profile",
      "fast",
      "--session",
      "task105-fast",
    ])
  ).toThrow(SmokeError);
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-105-l05",
      "--profile",
      "fast",
      "--session",
      "task105-l05-fast",
    ])
  ).toEqual({
    command: "run",
    suite: "task-105-l05",
    profile: "fast",
    session: "task105-l05-fast",
  });
  expect(
    parseRuntimeSmokeArgs([
      "run",
      "--suite",
      "task-105-l05",
      "--profile",
      "certification",
      "--session",
      "task105-l05-cert",
    ])
  ).toEqual({
    command: "run",
    suite: "task-105-l05",
    profile: "certification",
    session: "task105-l05-cert",
  });
  expect(staticSmokeRegistry.require("task-105-l05").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/task-105-l05.ts"
  );
  const task105L05 = await staticSmokeRegistry
    .require("task-105-l05")
    .loadFixedAdapter(process.cwd());
  expect(task105L05.suiteId).toBe("task-105-l05");
  expect(task105L05.supportedProfiles).toEqual(["fast", "certification"]);
  expect(task105L05.evidenceSessionPolicy).toBe("exclusive");
});
