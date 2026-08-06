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

test("static registry reserves exactly three fixed adapters", async () => {
  expect(staticSmokeRegistry.ids()).toEqual(["task-540", "widget-contract", "production-boundary"]);
  expect(staticSmokeRegistry.require("task-540").adapterPath).toBe(
    "scripts/runtime-smoke/adapters/task-540.ts"
  );
  const adapter = await staticSmokeRegistry.require("task-540").loadFixedAdapter(process.cwd());
  expect(adapter.suiteId).toBe("task-540");
  expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
});
