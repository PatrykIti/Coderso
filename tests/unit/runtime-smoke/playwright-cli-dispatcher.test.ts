import { expect, test } from "bun:test";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { PlaywrightCliDispatcher } from "../../../scripts/runtime-smoke/browser/playwright-cli-dispatcher";
import type { RuntimeSmokeContext } from "../../../scripts/runtime-smoke/lifecycle";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import type {
  ProcessResult,
  ProcessSpec,
  ProcessSupervisor,
} from "../../../scripts/runtime-smoke/process-supervisor";
import type { RepositoryGuard } from "../../../scripts/runtime-smoke/repository-guard";
import { TimingRecorder } from "../../../scripts/runtime-smoke/timing";

interface RecordedRun {
  readonly args: readonly string[];
  readonly environmentKeys: readonly string[];
  readonly family: string | undefined;
  readonly sourceMode?: number;
  readonly stateBasename?: string;
}

class FakeProcesses {
  readonly runs: RecordedRun[] = [];
  failOpen = false;

  async run(spec: ProcessSpec): Promise<ProcessResult> {
    const sourceIndex = spec.args?.indexOf("--filename") ?? -1;
    const stateIndex = spec.args?.indexOf("state-load") ?? -1;
    const sourcePath = sourceIndex >= 0 ? spec.args?.[sourceIndex + 1] : undefined;
    const statePath = stateIndex >= 0 ? spec.args?.[stateIndex + 1] : undefined;
    this.runs.push({
      args: Object.freeze([...(spec.args ?? [])]),
      environmentKeys: Object.freeze(Object.keys(spec.env ?? {}).sort()),
      family: spec.family,
      ...(sourcePath === undefined ? {} : { sourceMode: (await stat(sourcePath)).mode & 0o777 }),
      ...(statePath === undefined ? {} : { stateBasename: statePath.split("/").at(-1) }),
    });
    if (this.failOpen && spec.args?.includes("open")) {
      throw new Error("open failed");
    }
    const stdout = spec.args?.includes("run-code")
      ? Buffer.from(`${JSON.stringify('{"actionId":"proof"}\n')}\n`)
      : spec.args?.includes("route-list")
        ? Buffer.from("No active routes\n")
        : Buffer.alloc(0);
    return {
      stdout,
      stderr: Buffer.alloc(0),
      receipt: {
        family: spec.family ?? "test",
        pid: 123,
        exitCode: 0,
        signal: null,
        elapsedMs: 1,
        stdoutBytes: stdout.byteLength,
        stderrBytes: 0,
        stdoutSha256: "a".repeat(64),
        stderrSha256: "b".repeat(64),
        absent: true,
      },
    };
  }
}

async function fixture(): Promise<{
  readonly root: string;
  readonly workspace: string;
  readonly executable: string;
  readonly processes: FakeProcesses;
  readonly context: RuntimeSmokeContext;
}> {
  const root = await mkdtemp(join(tmpdir(), "coderso-playwright-dispatcher-"));
  const workspace = join(root, "workspace");
  await mkdir(workspace, { mode: 0o700 });
  await chmod(workspace, 0o700);
  const executable = await realpath(process.execPath);
  const processes = new FakeProcesses();
  const context: RuntimeSmokeContext = {
    input: {
      command: "run",
      suite: "widget-contract",
      profile: "fast",
      session: "wf552-dispatcher",
    },
    root,
    lifecycle: new RuntimeLifecycle(),
    timing: new TimingRecorder(),
    processes: processes as unknown as ProcessSupervisor,
    repository: {} as RepositoryGuard,
  };
  return { root, workspace, executable, processes, context };
}

function createDispatcher(input: Awaited<ReturnType<typeof fixture>>) {
  return new PlaywrightCliDispatcher({
    context: input.context,
    session: "wf552-dispatcher",
    workspace: input.workspace,
    segments: ["segment-one", "segment-two"],
    environmentPath: dirname(input.executable),
    runtimeEnvironment: {},
    resolveExecutable: async () => input.executable,
  });
}

test("Playwright dispatcher opens once, dispatches bounded private files, and closes twice", async () => {
  const input = await fixture();
  try {
    const dispatcher = createDispatcher(input);
    const first = await dispatcher.dispatch({
      session: "wf552-dispatcher",
      segmentId: "segment-one",
      source: "async () => 'first'",
      maximumOutputBytes: 1024,
    });
    const second = await dispatcher.dispatch({
      session: "wf552-dispatcher",
      segmentId: "segment-two",
      source: "async () => 'second'",
      maximumOutputBytes: 1024,
    });
    expect(new TextDecoder().decode(first)).toBe(`${JSON.stringify('{"actionId":"proof"}\n')}\n`);
    expect(second).toEqual(first);
    expect(input.processes.runs.map(({ family }) => family)).toEqual([
      "playwright-open",
      "playwright-run-code",
      "playwright-run-code",
    ]);
    expect(input.processes.runs.filter(({ family }) => family === "playwright-open")).toHaveLength(
      1
    );
    expect(
      input.processes.runs
        .filter(({ family }) => family === "playwright-run-code")
        .map(({ sourceMode }) => sourceMode)
    ).toEqual([0o600, 0o600]);
    expect(
      await access(join(input.workspace, "playwright-wf552-dispatcher-0001-segment-one.mjs")).then(
        () => false,
        () => true
      )
    ).toBe(true);
    await dispatcher.close();
    await dispatcher.close();
    expect(input.processes.runs.at(-1)?.args).toEqual(["-s=wf552-dispatcher", "close"]);
    expect(input.processes.runs.filter(({ family }) => family === "playwright-close")).toHaveLength(
      1
    );
    expect(await dispatcher.proveAbsent()).toBe(true);
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher closes the exact session after a partial open failure", async () => {
  const input = await fixture();
  try {
    input.processes.failOpen = true;
    const dispatcher = createDispatcher(input);
    await expect(
      dispatcher.dispatch({
        session: "wf552-dispatcher",
        segmentId: "segment-one",
        source: "async () => true",
        maximumOutputBytes: 1024,
      })
    ).rejects.toThrow("open failed");
    input.processes.failOpen = false;
    await dispatcher.close();
    expect(input.processes.runs.map(({ args }) => args)).toEqual([
      ["-s=wf552-dispatcher", "open", "about:blank"],
      ["-s=wf552-dispatcher", "close"],
    ]);
    expect(await dispatcher.proveAbsent()).toBe(true);
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher maps only the fixed native tab and route-list commands", async () => {
  const input = await fixture();
  try {
    const dispatcher = createDispatcher(input);
    await dispatcher.dispatchNative({
      operation: "tab-new",
      url: "http://127.0.0.1:5173/admin/advanced/entries/example",
    });
    await dispatcher.dispatchNative({ operation: "tab-select", index: 0 });
    await dispatcher.dispatchNative({ operation: "tab-close", index: 1 });
    expect(
      new TextDecoder().decode(await dispatcher.dispatchNative({ operation: "route-list" }))
    ).toBe("No active routes\n");
    expect(input.processes.runs.map(({ args }) => args)).toEqual([
      ["-s=wf552-dispatcher", "open", "about:blank"],
      [
        "-s=wf552-dispatcher",
        "--raw",
        "tab-new",
        "http://127.0.0.1:5173/admin/advanced/entries/example",
      ],
      ["-s=wf552-dispatcher", "--raw", "tab-select", "0"],
      ["-s=wf552-dispatcher", "--raw", "tab-close", "1"],
      ["-s=wf552-dispatcher", "--raw", "route-list"],
    ]);
    await expect(dispatcher.dispatchNative({ operation: "tab-select", index: 32 })).rejects.toThrow(
      "tab index is invalid"
    );
    await expect(
      dispatcher.dispatchNative({ operation: "tab-new", url: "https://user:secret@example.com/" })
    ).rejects.toThrow("tab URL is invalid");
    await dispatcher.close();
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher projects only validated Playwright runtime paths", async () => {
  const input = await fixture();
  try {
    const config = join(input.root, "playwright-config.json");
    const browsers = join(input.root, "playwright-browsers");
    await writeFile(
      config,
      '{"browser":{"browserName":"chromium","launchOptions":{"args":["--no-sandbox"]}}}',
      { mode: 0o600 }
    );
    await mkdir(browsers, { mode: 0o700 });
    const dispatcher = new PlaywrightCliDispatcher({
      context: input.context,
      session: "wf552-dispatcher",
      workspace: input.workspace,
      segments: ["segment-one"],
      environmentPath: dirname(input.executable),
      runtimeEnvironment: {
        PLAYWRIGHT_MCP_CONFIG: config,
        PLAYWRIGHT_BROWSERS_PATH: browsers,
        SHOULD_NOT_BE_INHERITED: "private",
      },
      resolveExecutable: async () => input.executable,
    });
    await dispatcher.dispatchNative({ operation: "route-list" });
    expect(input.processes.runs.map(({ environmentKeys }) => environmentKeys)).toEqual([
      ["PATH", "PLAYWRIGHT_BROWSERS_PATH", "PLAYWRIGHT_MCP_CONFIG"],
      ["PATH", "PLAYWRIGHT_BROWSERS_PATH", "PLAYWRIGHT_MCP_CONFIG"],
    ]);
    expect(JSON.stringify(input.processes.runs)).not.toContain("SHOULD_NOT_BE_INHERITED");
    await dispatcher.close();
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher rejects missing or malformed runtime paths before spawn", async () => {
  const input = await fixture();
  try {
    const malformedConfig = join(input.root, "malformed.json");
    const browserFile = join(input.root, "not-a-browser-directory");
    await writeFile(malformedConfig, "[]", { mode: 0o600 });
    await writeFile(browserFile, "not a directory", { mode: 0o600 });
    const makeDispatcher = (runtimeEnvironment: NodeJS.ProcessEnv) =>
      new PlaywrightCliDispatcher({
        context: input.context,
        session: "wf552-dispatcher",
        workspace: input.workspace,
        segments: ["segment-one"],
        environmentPath: dirname(input.executable),
        runtimeEnvironment,
        resolveExecutable: async () => input.executable,
      });
    await expect(
      makeDispatcher({ PLAYWRIGHT_MCP_CONFIG: join(input.root, "missing.json") }).dispatchNative({
        operation: "route-list",
      })
    ).rejects.toThrow("configuration is unavailable");
    await expect(
      makeDispatcher({ PLAYWRIGHT_MCP_CONFIG: malformedConfig }).dispatchNative({
        operation: "route-list",
      })
    ).rejects.toThrow("configuration is invalid");
    await expect(
      makeDispatcher({ PLAYWRIGHT_BROWSERS_PATH: browserFile }).dispatchNative({
        operation: "route-list",
      })
    ).rejects.toThrow("browser path is invalid");
    expect(input.processes.runs).toHaveLength(0);
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher rejects unknown and remote browser configuration authority", async () => {
  const input = await fixture();
  try {
    const unknownConfig = join(input.root, "unknown-config.json");
    const remoteConfig = join(input.root, "remote-config.json");
    await writeFile(
      unknownConfig,
      '{"browser":{"browserName":"chromium","launchOptions":{"args":["--no-sandbox"]}},"secrets":{"token":"private"}}',
      { mode: 0o600 }
    );
    await writeFile(
      remoteConfig,
      '{"browser":{"browserName":"chromium","launchOptions":{"args":["--no-sandbox"],"executablePath":"/tmp/browser"}}}',
      { mode: 0o600 }
    );
    const makeDispatcher = (config: string) =>
      new PlaywrightCliDispatcher({
        context: input.context,
        session: "wf552-dispatcher",
        workspace: input.workspace,
        segments: ["segment-one"],
        environmentPath: dirname(input.executable),
        runtimeEnvironment: { PLAYWRIGHT_MCP_CONFIG: config },
        resolveExecutable: async () => input.executable,
      });
    await expect(
      makeDispatcher(unknownConfig).dispatchNative({ operation: "route-list" })
    ).rejects.toThrow("configuration is invalid");
    await expect(
      makeDispatcher(remoteConfig).dispatchNative({ operation: "route-list" })
    ).rejects.toThrow("configuration is invalid");
    expect(input.processes.runs).toHaveLength(0);
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright storage-state load uses an owned bounded private copy without returning contents", async () => {
  const input = await fixture();
  try {
    const state = join(input.workspace, "auth-state.json");
    await writeFile(state, '{"cookies":[],"origins":[],"private":"do-not-report"}', {
      mode: 0o600,
    });
    await chmod(state, 0o600);
    const dispatcher = createDispatcher(input);
    expect(await dispatcher.loadStorageState(state)).toBeUndefined();
    const load = input.processes.runs.find(({ family }) => family === "playwright-state-load");
    expect(load?.args.slice(0, 2)).toEqual(["-s=wf552-dispatcher", "state-load"]);
    expect(load?.stateBasename).toMatch(/^playwright-wf552-dispatcher-state-/u);
    expect(JSON.stringify(input.processes.runs)).not.toContain("do-not-report");
    expect(await readFile(state, "utf8")).toContain("do-not-report");
    const privateStatePath = join(input.workspace, load?.stateBasename ?? "missing");
    expect(
      await access(privateStatePath).then(
        () => false,
        () => true
      )
    ).toBe(true);
    await dispatcher.close();
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});

test("Playwright dispatcher rejects unsafe sessions, segments, and storage-state paths", async () => {
  const input = await fixture();
  try {
    expect(
      () =>
        new PlaywrightCliDispatcher({
          context: input.context,
          session: "../escape",
          workspace: input.workspace,
          segments: ["segment-one"],
        })
    ).toThrow("session is invalid");
    const dispatcher = createDispatcher(input);
    await expect(
      dispatcher.dispatch({
        session: "wf552-dispatcher",
        segmentId: "unknown",
        source: "async () => true",
        maximumOutputBytes: 1024,
      })
    ).rejects.toThrow("dispatch is invalid");
    const outside = join(input.root, "outside.json");
    await writeFile(outside, "{}", { mode: 0o600 });
    await chmod(outside, 0o600);
    await expect(dispatcher.loadStorageState(outside)).rejects.toThrow("ownership is invalid");
    const target = join(input.workspace, "target.json");
    const link = join(input.workspace, "link.json");
    await writeFile(target, "{}", { mode: 0o600 });
    await chmod(target, 0o600);
    await symlink(target, link);
    await expect(dispatcher.loadStorageState(link)).rejects.toThrow("not regular");
    await dispatcher.close();
  } finally {
    await rm(input.root, { recursive: true, force: true });
  }
});
