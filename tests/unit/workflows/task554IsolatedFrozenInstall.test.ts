import { expect, test } from "bun:test";
import {
  constants,
  existsSync,
  fstatSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  TASK_554_FROZEN_INSTALL_INPUTS,
  runTask554IsolatedFrozenInstall,
} from "../../../scripts/task-554-isolated-frozen-install.mjs";

interface RunnerOptions {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly inheritedDirectoryDescriptors: readonly number[];
  readonly stdio: "inherit";
}

function descriptorFromAnchor(anchor: string) {
  expect(anchor).toMatch(/^\/proc\/self\/fd\/\d+$/);
  const descriptor = Number(path.basename(anchor));
  expect(Number.isInteger(descriptor)).toBe(true);
  return descriptor;
}

function expectDescriptorAnchor(anchor: string, descriptor: number) {
  expect(anchor).toBe(`/proc/self/fd/${descriptor}`);
  const opened = fstatSync(descriptor);
  const anchored = statSync(anchor);
  expect({ dev: anchored.dev, ino: anchored.ino, mode: anchored.mode }).toEqual({
    dev: opened.dev,
    ino: opened.ino,
    mode: opened.mode,
  });
  return opened;
}

function createProject() {
  const root = mkdtempSync(path.join(os.tmpdir(), "task-554-frozen-install-project-"));
  for (const [index, relativePath] of TASK_554_FROZEN_INSTALL_INPUTS.entries()) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
    writeFileSync(absolutePath, `task-554-input-${index}\n`, { mode: 0o600 });
  }
  mkdirSync(path.join(root, ".tmp"), { mode: 0o700 });
  writeFileSync(path.join(root, ".tmp", "fingerprint.txt"), "unchanged\n", { mode: 0o600 });
  return root;
}

function removeProject(root: string) {
  rmSync(root, { recursive: true, force: true });
}

function task554TemporaryDirectories() {
  return new Set(
    readdirSync(os.tmpdir())
      .filter((name) => name.startsWith("task-554-frozen-install-"))
      .sort()
  );
}

test("TASK-554 isolated frozen install copies only the pinned graph and leaves project state untouched", () => {
  const root = createProject();
  const expected = new Map(
    TASK_554_FROZEN_INSTALL_INPUTS.map((relativePath) => [
      relativePath,
      readFileSync(path.join(root, relativePath)),
    ])
  );
  const tmpBefore = readFileSync(path.join(root, ".tmp", "fingerprint.txt"));
  let invocation:
    | {
        command: string;
        args: string[];
        cache: string;
        cwd: string;
        descriptors: readonly number[];
        env: Readonly<Record<string, string>>;
      }
    | undefined;
  try {
    expect(
      runTask554IsolatedFrozenInstall(root, {
        runner: (command: string, args: string[], options: RunnerOptions) => {
          const sandboxDescriptor = descriptorFromAnchor(options.cwd);
          const cacheAnchor = args[6];
          const cacheDescriptor = descriptorFromAnchor(cacheAnchor);
          expect(options.inheritedDirectoryDescriptors).toEqual([
            sandboxDescriptor,
            cacheDescriptor,
          ]);
          expectDescriptorAnchor(options.cwd, sandboxDescriptor);
          expectDescriptorAnchor(cacheAnchor, cacheDescriptor);
          invocation = {
            command,
            args,
            cache: cacheAnchor,
            cwd: options.cwd,
            descriptors: options.inheritedDirectoryDescriptors,
            env: options.env,
          };
          expect(statSync(cacheAnchor).isDirectory()).toBe(true);
          for (const [relativePath, bytes] of expected)
            expect(readFileSync(path.join(options.cwd, relativePath))).toEqual(bytes);
          return { status: 0 };
        },
      })
    ).toEqual({ pass: true, inputs: TASK_554_FROZEN_INSTALL_INPUTS });
    expect(invocation).toEqual({
      command: "bun",
      args: [
        "install",
        "--frozen-lockfile",
        "--ignore-scripts",
        "--registry",
        "https://registry.npmjs.org",
        "--cache-dir",
        invocation!.cache,
        "--no-progress",
      ],
      cache: invocation!.cache,
      cwd: invocation!.cwd,
      descriptors: invocation!.descriptors,
      env: { CI: "1", NO_COLOR: "1", PATH: "/usr/local/bin:/usr/bin:/bin" },
    });
    expect(existsSync(invocation!.cwd)).toBe(false);
    expect(existsSync(invocation!.cache)).toBe(false);
    expect(readFileSync(path.join(root, ".tmp", "fingerprint.txt"))).toEqual(tmpBefore);
    expect(existsSync(path.join(root, "node_modules"))).toBe(false);
  } finally {
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install rejects unsafe source inputs and a project npmrc before invoking Bun", () => {
  const mutations: Array<(root: string) => void> = [
    (root) => unlinkSync(path.join(root, "bunfig.toml")),
    (root) => {
      const target = path.join(root, "safe-target");
      writeFileSync(target, "target\n");
      unlinkSync(path.join(root, "bunfig.toml"));
      symlinkSync(target, path.join(root, "bunfig.toml"));
    },
    (root) => linkSync(path.join(root, "bunfig.toml"), path.join(root, "bunfig-copy.toml")),
    (root) => {
      unlinkSync(path.join(root, "bunfig.toml"));
      mkdirSync(path.join(root, "bunfig.toml"));
    },
    (root) => writeFileSync(path.join(root, ".npmrc"), "registry=https://example.invalid\n"),
  ];
  for (const mutate of mutations) {
    const root = createProject();
    let invoked = false;
    try {
      mutate(root);
      expect(() =>
        runTask554IsolatedFrozenInstall(root, {
          runner: () => {
            invoked = true;
            return { status: 0 };
          },
        })
      ).toThrow();
      expect(invoked).toBe(false);
      expect(readFileSync(path.join(root, ".tmp", "fingerprint.txt"), "utf8")).toBe("unchanged\n");
    } finally {
      removeProject(root);
    }
  }
});

test("TASK-554 isolated frozen install rejects a source replacement during its nofollow copy", () => {
  const root = createProject();
  const packagePath = path.join(root, "package.json");
  let mutated = false;
  let invoked = false;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        readFileSync: (target: number | string) => {
          const bytes = readFileSync(target);
          if (!mutated && typeof target === "number") {
            writeFileSync(packagePath, "changed-package-input\n");
            mutated = true;
          }
          return bytes;
        },
        runner: () => {
          invoked = true;
          return { status: 0 };
        },
      })
    ).toThrow("task_554_frozen_install_input_changed:package.json");
    expect(invoked).toBe(false);
    expect(readFileSync(path.join(root, ".tmp", "fingerprint.txt"), "utf8")).toBe("unchanged\n");
  } finally {
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install rejects a raw project-root replacement before runner", () => {
  const root = createProject();
  const retainedRoot = `${root}-retained`;
  const replacementSecret = "HOSTILE_PROJECT_REPLACEMENT_SECRET";
  const copiedBytes: Buffer[] = [];
  let swapped = false;
  let runnerInvocations = 0;
  let failure: unknown;
  try {
    try {
      runTask554IsolatedFrozenInstall(root, {
        readFileSync: (target: number | string) => {
          if (!swapped && typeof target === "number") {
            renameSync(root, retainedRoot);
            mkdirSync(root, { mode: 0o700 });
            writeFileSync(path.join(root, "package.json"), `${replacementSecret}\n`, {
              mode: 0o600,
            });
            writeFileSync(path.join(root, "replacement-marker.txt"), "untouched\n", {
              mode: 0o600,
            });
            swapped = true;
          }
          return readFileSync(target);
        },
        runner: () => {
          runnerInvocations += 1;
          return { status: 0 };
        },
        writeFileSync: (descriptor: number, bytes: Uint8Array) => {
          copiedBytes.push(Buffer.from(bytes));
          writeFileSync(descriptor, bytes);
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(swapped).toBe(true);
    expect(runnerInvocations).toBe(0);
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toMatchObject([
      { message: "task_554_frozen_install_project_root_identity_changed" },
      { message: "task_554_frozen_install_project_root_final_validation_failed" },
    ]);
    expect(copiedBytes).toHaveLength(TASK_554_FROZEN_INSTALL_INPUTS.length);
    expect(copiedBytes.map((bytes) => bytes.toString("utf8"))).toEqual(
      TASK_554_FROZEN_INSTALL_INPUTS.map((_relativePath, index) => `task-554-input-${index}\n`)
    );
    expect(Buffer.concat(copiedBytes).toString("utf8")).not.toContain(replacementSecret);
    expect(readFileSync(path.join(root, "package.json"), "utf8")).toBe(`${replacementSecret}\n`);
    expect(readFileSync(path.join(root, "replacement-marker.txt"), "utf8")).toBe("untouched\n");
  } finally {
    removeProject(root);
    rmSync(retainedRoot, { recursive: true, force: true });
  }
});

test("TASK-554 isolated frozen install preserves the primary failure when owned cleanup also fails", () => {
  const root = createProject();
  let sandbox: string | undefined;
  let rawSandbox: string | undefined;
  let cleanupRoot: string | undefined;
  let quarantine: string | undefined;
  let cleanupStarted = false;
  const cleanupFailure = new Error("cleanup failed");
  try {
    let failure: unknown;
    try {
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: (prefix: string) => {
          const directory = mkdtempSync(prefix);
          const physical = realpathSync(directory);
          if (prefix.includes("task-554-frozen-install-cleanup-")) cleanupRoot = physical;
          else rawSandbox = physical;
          return directory;
        },
        runner: (_command: string, _args: string[], options: RunnerOptions) => {
          sandbox = options.cwd;
          return { status: 9 };
        },
        renameSync: (source: string, destination: string) => {
          quarantine = path.join(cleanupRoot!, path.basename(destination));
          renameSync(source, destination);
          cleanupStarted = true;
        },
        readdirSync: (target: string, options: { encoding: "utf8" }) => {
          if (cleanupStarted) throw cleanupFailure;
          return readdirSync(target, options);
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors[0]).toMatchObject({
      message: "task_554_frozen_install_failed:exit_9",
    });
    expect((failure as AggregateError).errors[1]).toBe(cleanupFailure);
    expect(existsSync(sandbox!)).toBe(false);
    expect(existsSync(quarantine!)).toBe(true);
  } finally {
    if (cleanupRoot) rmSync(cleanupRoot, { recursive: true, force: true });
    if (rawSandbox) rmSync(rawSandbox, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install emits only a safe token for runner errors", () => {
  const root = createProject();
  let failure: unknown;
  try {
    try {
      runTask554IsolatedFrozenInstall(root, {
        runner: () => ({ error: new Error("TOP_SECRET_RUNNER_ERROR") }),
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ message: "task_554_frozen_install_failed:spawn_failed" });
    expect(String(failure)).not.toContain("TOP_SECRET_RUNNER_ERROR");
  } finally {
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install maps a synchronously throwing runner to a safe token", () => {
  const root = createProject();
  const secret = "TOP_SECRET_SYNCHRONOUS_THROW";
  let failure: unknown;
  try {
    try {
      runTask554IsolatedFrozenInstall(root, {
        runner: () => {
          throw new Error(secret);
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ message: "task_554_frozen_install_failed:spawn_failed" });
    expect(String(failure)).not.toContain(secret);
  } finally {
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install safely maps hostile result property getters", () => {
  const properties = ["error", "signal", "status"] as const;
  for (const property of properties) {
    const root = createProject();
    const secret = `TOP_SECRET_${property.toUpperCase()}_GETTER`;
    let failure: unknown;
    try {
      try {
        runTask554IsolatedFrozenInstall(root, {
          runner: () =>
            Object.defineProperty({}, property, {
              configurable: false,
              enumerable: true,
              get() {
                throw new Error(secret);
              },
            }),
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe("task_554_frozen_install_failed:spawn_failed");
      expect(String(failure)).not.toContain(secret);
    } finally {
      removeProject(root);
    }
  }
});

test("TASK-554 isolated frozen install strictly validates runner result fields", () => {
  const cases: Array<[unknown, string | null]> = [
    [undefined, "invalid_result"],
    [null, "invalid_result"],
    [{ error: false, status: 0 }, "invalid_result"],
    [{ error: "", status: 0 }, "invalid_result"],
    [{ signal: "", status: 0 }, "invalid_result"],
    [{ signal: "TERM", status: 0 }, "invalid_result"],
    [{}, "invalid_result"],
    [{ status: null }, "invalid_result"],
    [{ error: null, signal: null }, "invalid_result"],
    [{ signal: "SIGTERM", status: null }, "terminated"],
    [{ status: 0 }, null],
    [{ error: null, signal: null, status: 0 }, null],
  ];
  for (const [result, expected] of cases) {
    const root = createProject();
    try {
      if (expected === null)
        expect(
          runTask554IsolatedFrozenInstall(root, {
            runner: () => result as { status: number },
          })
        ).toMatchObject({ pass: true });
      else
        expect(() =>
          runTask554IsolatedFrozenInstall(root, {
            runner: () => result as { status: number },
          })
        ).toThrow(`task_554_frozen_install_failed:${expected}`);
    } finally {
      removeProject(root);
    }
  }
});

test("TASK-554 isolated frozen install rejects injected pre-run sandbox state", () => {
  const mutations = [
    (sandbox: string) => writeFileSync(path.join(sandbox, "extra.txt"), "extra\n"),
    (sandbox: string) => writeFileSync(path.join(sandbox, ".npmrc"), "unsafe\n"),
    (sandbox: string) => writeFileSync(path.join(sandbox, "package.json"), "replaced\n"),
  ];
  for (const mutate of mutations) {
    const root = createProject();
    let injected = false;
    let runnerInvocations = 0;
    try {
      expect(() =>
        runTask554IsolatedFrozenInstall(root, {
          openSync: (target: string, flags: number, mode?: number) => {
            if (!injected && path.basename(target) === ".bun-cache") {
              mutate(path.dirname(target));
              injected = true;
            }
            return openSync(target, flags, mode);
          },
          runner: () => {
            runnerInvocations += 1;
            return { status: 0 };
          },
        })
      ).toThrow();
      expect(injected).toBe(true);
      expect(runnerInvocations).toBe(0);
    } finally {
      removeProject(root);
    }
  }
});

test("TASK-554 isolated frozen install rejects a destination symlink race without touching its target", () => {
  const root = createProject();
  const outsideRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-destination-race-"));
  const outsideFile = path.join(outsideRoot, "outside.txt");
  writeFileSync(outsideFile, "outside-unchanged\n", { mode: 0o600 });
  let injected = false;
  let invoked = false;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        openSync: (target: string, flags: number, mode?: number) => {
          if (!injected && (flags & constants.O_CREAT) !== 0) {
            symlinkSync(outsideFile, target);
            injected = true;
          }
          return openSync(target, flags, mode);
        },
        runner: () => {
          invoked = true;
          return { status: 0 };
        },
      })
    ).toThrow();
    expect(injected).toBe(true);
    expect(invoked).toBe(false);
    expect(readFileSync(outsideFile, "utf8")).toBe("outside-unchanged\n");
  } finally {
    removeProject(root);
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("TASK-554 runner remains anchored after hostile raw sandbox and cache replacement", () => {
  const root = createProject();
  const outsideRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-runner-anchor-outside-"));
  const outsideFile = path.join(outsideRoot, "outside.txt");
  writeFileSync(outsideFile, "outside-unchanged\n", { mode: 0o600 });
  let rawSandbox: string | undefined;
  let retainedSandbox: string | undefined;
  let retainedCache: string | undefined;
  let invoked = false;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: (prefix: string) => {
          const directory = mkdtempSync(prefix);
          rawSandbox ??= realpathSync(directory);
          return directory;
        },
        runner: (_command: string, args: string[], options: RunnerOptions) => {
          invoked = true;
          const sandboxDescriptor = descriptorFromAnchor(options.cwd);
          const cacheAnchor = args[6];
          const cacheDescriptor = descriptorFromAnchor(cacheAnchor);
          expect(options.inheritedDirectoryDescriptors).toEqual([
            sandboxDescriptor,
            cacheDescriptor,
          ]);
          const sandboxIdentity = expectDescriptorAnchor(options.cwd, sandboxDescriptor);
          const cacheIdentity = expectDescriptorAnchor(cacheAnchor, cacheDescriptor);

          retainedSandbox = `${rawSandbox}-retained`;
          renameSync(rawSandbox!, retainedSandbox);
          retainedCache = path.join(retainedSandbox, ".bun-cache-retained");
          renameSync(path.join(retainedSandbox, ".bun-cache"), retainedCache);
          symlinkSync(outsideRoot, path.join(retainedSandbox, ".bun-cache"));
          mkdirSync(rawSandbox!, { mode: 0o700 });
          writeFileSync(path.join(rawSandbox!, "replacement.txt"), "replacement-unchanged\n", {
            mode: 0o600,
          });
          symlinkSync(outsideRoot, path.join(rawSandbox!, ".bun-cache"));

          expectDescriptorAnchor(options.cwd, sandboxDescriptor);
          expectDescriptorAnchor(cacheAnchor, cacheDescriptor);
          expect(fstatSync(sandboxDescriptor).ino).toBe(sandboxIdentity.ino);
          expect(fstatSync(cacheDescriptor).ino).toBe(cacheIdentity.ino);
          expect(readFileSync(path.join(options.cwd, "package.json"), "utf8")).toBe(
            "task-554-input-0\n"
          );
          writeFileSync(path.join(cacheAnchor, "descriptor-proof.txt"), "original-cache\n", {
            mode: 0o600,
          });
          return { status: 0 };
        },
      })
    ).toThrow("task_554_frozen_install_sandbox_identity_changed_invalid");
    expect(invoked).toBe(true);
    expect(readFileSync(path.join(rawSandbox!, "replacement.txt"), "utf8")).toBe(
      "replacement-unchanged\n"
    );
    expect(lstatSync(path.join(rawSandbox!, ".bun-cache")).isSymbolicLink()).toBe(true);
    expect(lstatSync(path.join(retainedSandbox!, ".bun-cache")).isSymbolicLink()).toBe(true);
    expect(readFileSync(path.join(retainedCache!, "descriptor-proof.txt"), "utf8")).toBe(
      "original-cache\n"
    );
    expect(readFileSync(outsideFile, "utf8")).toBe("outside-unchanged\n");
    expect(existsSync(path.join(outsideRoot, "descriptor-proof.txt"))).toBe(false);
  } finally {
    if (rawSandbox) rmSync(rawSandbox, { recursive: true, force: true });
    if (retainedSandbox) rmSync(retainedSandbox, { recursive: true, force: true });
    rmSync(outsideRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 cleanup quarantine stays descriptor-anchored after raw cleanup-root replacement", () => {
  const root = createProject();
  const outsideRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-cleanup-root-outside-"));
  let rawSandbox: string | undefined;
  let rawCleanupRoot: string | undefined;
  let retainedCleanupRoot: string | undefined;
  let swapped = false;
  let cleanupUnlinks = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: (prefix: string) => {
          const directory = mkdtempSync(prefix);
          const physical = realpathSync(directory);
          if (prefix.includes("task-554-frozen-install-cleanup-")) rawCleanupRoot = physical;
          else rawSandbox = physical;
          return directory;
        },
        renameSync: (source: string, destination: string) => {
          if (!swapped && rawCleanupRoot) {
            retainedCleanupRoot = `${rawCleanupRoot}-retained`;
            renameSync(rawCleanupRoot, retainedCleanupRoot);
            symlinkSync(outsideRoot, rawCleanupRoot);
            swapped = true;
          }
          renameSync(source, destination);
        },
        runner: () => ({ status: 0 }),
        unlinkSync: (target: string) => {
          cleanupUnlinks += 1;
          unlinkSync(target);
        },
      })
    ).toThrow("task_554_frozen_install_cleanup_root_identity_changed_invalid");
    expect(swapped).toBe(true);
    expect(cleanupUnlinks).toBeGreaterThan(0);
    expect(existsSync(rawSandbox!)).toBe(false);
    expect(lstatSync(rawCleanupRoot!).isSymbolicLink()).toBe(true);
    expect(readlinkSync(rawCleanupRoot!)).toBe(outsideRoot);
    expect(readdirSync(outsideRoot)).toEqual([]);
    expect(readdirSync(retainedCleanupRoot!)).toEqual([]);
  } finally {
    if (rawCleanupRoot && existsSync(rawCleanupRoot)) unlinkSync(rawCleanupRoot);
    if (retainedCleanupRoot) rmSync(retainedCleanupRoot, { recursive: true, force: true });
    if (rawSandbox) rmSync(rawSandbox, { recursive: true, force: true });
    rmSync(outsideRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install rejects an initially symlinked temp root", () => {
  const root = createProject();
  const outsideRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-temp-symlink-outside-"));
  const tempLink = path.join(os.tmpdir(), `task-554-temp-symlink-${path.basename(outsideRoot)}`);
  symlinkSync(outsideRoot, tempLink);
  let mkdtempInvocations = 0;
  let runnerInvocations = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: () => {
          mkdtempInvocations += 1;
          return outsideRoot;
        },
        runner: () => {
          runnerInvocations += 1;
          return { status: 0 };
        },
        tmpdir: () => tempLink,
      })
    ).toThrow("task_554_frozen_install_temp_root_invalid");
    expect(mkdtempInvocations).toBe(0);
    expect(runnerInvocations).toBe(0);
    expect(readdirSync(outsideRoot)).toEqual([]);
  } finally {
    unlinkSync(tempLink);
    rmSync(outsideRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install rejects a symlinked temp-root ancestor", () => {
  const root = createProject();
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-temp-ancestor-"));
  const retainedTarget = path.join(fixtureRoot, "retained");
  const linkedAncestor = path.join(fixtureRoot, "linked");
  const tempRoot = path.join(linkedAncestor, "nested");
  mkdirSync(path.join(retainedTarget, "nested"), { recursive: true, mode: 0o700 });
  symlinkSync(retainedTarget, linkedAncestor);
  let mkdtempInvocations = 0;
  let runnerInvocations = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: () => {
          mkdtempInvocations += 1;
          return tempRoot;
        },
        runner: () => {
          runnerInvocations += 1;
          return { status: 0 };
        },
        tmpdir: () => tempRoot,
      })
    ).toThrow("task_554_frozen_install_temp_root_invalid");
    expect(mkdtempInvocations).toBe(0);
    expect(runnerInvocations).toBe(0);
    expect(readdirSync(path.join(retainedTarget, "nested"))).toEqual([]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install rejects a resolved temp root inside the project", () => {
  const root = createProject();
  const tempRoot = path.join(root, "private-temp");
  mkdirSync(tempRoot, { mode: 0o700 });
  let mkdtempInvocations = 0;
  let runnerInvocations = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: () => {
          mkdtempInvocations += 1;
          return tempRoot;
        },
        runner: () => {
          runnerInvocations += 1;
          return { status: 0 };
        },
        tmpdir: () => tempRoot,
      })
    ).toThrow("task_554_frozen_install_temp_root_invalid");
    expect(mkdtempInvocations).toBe(0);
    expect(runnerInvocations).toBe(0);
    expect(readdirSync(tempRoot)).toEqual([]);
  } finally {
    removeProject(root);
  }
});

test("TASK-554 temp descriptors resist a mid-run raw temp-root replacement", () => {
  const root = createProject();
  const rawTempRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-pinned-temp-root-"));
  const retainedTempRoot = `${rawTempRoot}-retained`;
  const projectEntries = readdirSync(root).sort();
  let tmpdirInvocations = 0;
  let runnerInvocations = 0;
  let failure: unknown;
  try {
    try {
      runTask554IsolatedFrozenInstall(root, {
        runner: () => {
          runnerInvocations += 1;
          renameSync(rawTempRoot, retainedTempRoot);
          symlinkSync(root, rawTempRoot);
          return { status: 0 };
        },
        tmpdir: () => {
          tmpdirInvocations += 1;
          return rawTempRoot;
        },
      });
    } catch (error) {
      failure = error;
    }
    expect(tmpdirInvocations).toBe(1);
    expect(runnerInvocations).toBe(1);
    expect(failure).toBeInstanceOf(AggregateError);
    expect(lstatSync(rawTempRoot).isSymbolicLink()).toBe(true);
    expect(readlinkSync(rawTempRoot)).toBe(root);
    expect(readdirSync(root).sort()).toEqual(projectEntries);
    expect(readdirSync(retainedTempRoot)).toEqual([]);
  } finally {
    if (existsSync(rawTempRoot)) unlinkSync(rawTempRoot);
    rmSync(retainedTempRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 isolated frozen install deletes through its retained descriptor and leaves a swapped quarantine", () => {
  const root = createProject();
  let cleanupRoot: string | undefined;
  let quarantine: string | undefined;
  let retainedDirectory: string | undefined;
  let swapped = false;
  let cleanupReads = 0;
  let cleanupUnlinks = 0;
  let quarantineRootRemovals = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: (prefix: string) => {
          const directory = mkdtempSync(prefix);
          if (prefix.includes("task-554-frozen-install-cleanup-"))
            cleanupRoot = realpathSync(directory);
          return directory;
        },
        renameSync: (source: string, destination: string) => {
          quarantine = path.join(cleanupRoot!, path.basename(destination));
          renameSync(source, destination);
        },
        readdirSync: (target: string, options: { encoding: "utf8" }) => {
          cleanupReads += 1;
          if (!swapped && quarantine) {
            retainedDirectory = `${quarantine}-retained`;
            renameSync(quarantine, retainedDirectory);
            mkdirSync(quarantine, { mode: 0o700 });
            writeFileSync(path.join(quarantine, "hostile.txt"), "replacement\n", {
              mode: 0o600,
            });
            swapped = true;
          }
          return readdirSync(target, options);
        },
        rmdirSync: (target: string) => {
          if (quarantine && path.basename(target) === path.basename(quarantine))
            quarantineRootRemovals += 1;
          rmdirSync(target);
        },
        unlinkSync: (target: string) => {
          cleanupUnlinks += 1;
          unlinkSync(target);
        },
        runner: () => ({ status: 0 }),
      })
    ).toThrow("task_554_frozen_install_quarantine_identity_changed_invalid");
    expect(swapped).toBe(true);
    expect(cleanupReads).toBeGreaterThan(0);
    expect(cleanupUnlinks).toBeGreaterThan(0);
    expect(quarantineRootRemovals).toBe(0);
    expect(readdirSync(retainedDirectory!)).toEqual([]);
    expect(readFileSync(path.join(quarantine!, "hostile.txt"), "utf8")).toBe("replacement\n");
  } finally {
    if (cleanupRoot) rmSync(cleanupRoot, { recursive: true, force: true });
    removeProject(root);
  }
});

test("TASK-554 real isolated frozen installer leaves no task-scoped temporary directories", () => {
  const repositoryRoot = path.resolve(import.meta.dir, "../../..");
  const before = task554TemporaryDirectories();
  expect(runTask554IsolatedFrozenInstall(repositoryRoot)).toEqual({
    pass: true,
    inputs: TASK_554_FROZEN_INSTALL_INPUTS,
  });
  expect(task554TemporaryDirectories()).toEqual(before);
// Bounded 120s budget: the real frozen install downloads 745 packages into a
// fresh sandbox-local cache on every run; cold-cache runs measured 56.8s in
// the full suite versus 15.8s warm, and the previous 50s budget flaked the
// first-try full `bun run test:bun` gate without any assertion weakening.
}, 120_000);

test("TASK-554 isolated frozen install never cleans a hostile mkdtemp result outside an owned sandbox", () => {
  const root = createProject();
  let cleanupCalls = 0;
  try {
    expect(() =>
      runTask554IsolatedFrozenInstall(root, {
        mkdtempSync: () => root,
        unlinkSync: () => {
          cleanupCalls += 1;
        },
        runner: () => ({ status: 0 }),
      })
    ).toThrow("task_554_frozen_install_sandbox_invalid");
    expect(cleanupCalls).toBe(0);
    expect(lstatSync(root).isDirectory()).toBe(true);
  } finally {
    removeProject(root);
  }
});
