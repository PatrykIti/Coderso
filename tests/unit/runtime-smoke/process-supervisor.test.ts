import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import { ProcessSupervisor } from "../../../scripts/runtime-smoke/process-supervisor";

const root = process.cwd();
const executable = await realpath(process.execPath);

test("process supervisor captures bounded safe receipts and exact counters", async () => {
  const supervisor = new ProcessSupervisor(root);
  const result = await supervisor.run({
    executable,
    args: ["-e", 'process.stdout.write("ok")'],
    cwd: root,
    env: {},
    family: "bun-test-child",
  });
  expect(new TextDecoder().decode(result.stdout)).toBe("ok");
  expect(result.receipt).toMatchObject({
    family: "bun-test-child",
    exitCode: 0,
    stderrBytes: 0,
    stdoutBytes: 2,
    absent: true,
  });
  expect(result.receipt.stdoutSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(supervisor.counters()).toEqual({ "bun-test-child": 1 });
  expect(await supervisor.proveAbsent()).toBe(true);
});

test("process supervisor fails closed on stderr, timeout, and output overflow", async () => {
  const supervisor = new ProcessSupervisor(root);
  await expect(
    supervisor.run({
      executable,
      args: ["-e", 'process.stderr.write("private")'],
      cwd: root,
      env: {},
      family: "stderr-child",
    })
  ).rejects.toMatchObject({ code: "smoke_process_failed" });
  await expect(
    supervisor.run({
      executable,
      args: ["-e", "await new Promise((resolve) => setTimeout(resolve, 10000))"],
      cwd: root,
      env: {},
      timeoutMs: 20,
      family: "timeout-child",
    })
  ).rejects.toMatchObject({ code: "smoke_process_timeout" });
  await expect(
    supervisor.run({
      executable,
      args: ["-e", 'process.stdout.write("12345")'],
      cwd: root,
      env: {},
      maxOutputBytes: 4,
      family: "overflow-child",
    })
  ).rejects.toMatchObject({ code: "smoke_output_invalid" });
  await supervisor.close();
  expect(await supervisor.proveAbsent()).toBe(true);
});
