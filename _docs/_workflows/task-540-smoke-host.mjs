import path from "node:path";
import { pathToFileURL } from "node:url";

import { FIXED_ENV, REQUIRED_REPO_ENV } from "./task-540-smoke/host/environment.mjs";
import {
  createChildDescriptorContract,
  parseCliArgs,
} from "./task-540-smoke/host/child-descriptors.mjs";
import { createChildSourceContract } from "./task-540-smoke/host/child-sources.mjs";
import {
  requireExactViteOptionsClone,
  settleViteReadiness,
  startViteWithWarmRestart,
  VITE_OPTIONS_CLONE_VALIDATOR_SOURCE,
  VITE_READINESS_SOURCE,
  VITE_WARM_RESTART_SOURCE,
} from "./task-540-smoke/host/vite-source-runtime.mjs";
import {
  crossCheckRawEnvironment,
  parseNulEnvironment,
  validateEnvironmentProjection,
} from "./task-540-smoke/host/environment-preflight.mjs";
import {
  deepFreezeExact,
  invariant,
} from "./task-540-smoke/host/validation.mjs";
import {
  collectOwnedDescendants,
  freezeReadyProjection,
  freezeStartupProof,
  parseProcStat,
  PORTS,
  validateReadyProjection,
} from "./task-540-smoke/host/process-identity.mjs";
import {
  validateCanonicalRootAndToolchain,
  validateViteCacheAuthorities,
  viteCacheAuthorityTargets,
} from "./task-540-smoke/host/preflight.mjs";
import { createServeRuntime } from "./task-540-smoke/host/serve-runtime.mjs";
import { createStopRuntime } from "./task-540-smoke/host/stop-runtime.mjs";

const READY_TIMEOUT_MS = 360_000;
const STOP_TIMEOUT_MS = 15_000;
const MAX_CHILD_STREAM_BYTES = 4 * 1024 * 1024;
const CHILD_READY_MARKERS = Object.freeze({
  backend: "WF540_BACKEND_READY_V1\n",
  admin: "WF540_ADMIN_READY_V1\n",
  site: "WF540_SITE_READY_V1\n",
});

const CHILD_SOURCES = createChildSourceContract({
  VITE_READINESS_SOURCE,
  VITE_OPTIONS_CLONE_VALIDATOR_SOURCE,
  VITE_WARM_RESTART_SOURCE,
});
const { BACKEND_SOURCE, ADMIN_VITE_SOURCE, SITE_VITE_SOURCE } = CHILD_SOURCES;
const { childDescriptors, validateChildDescriptors } =
  createChildDescriptorContract(CHILD_SOURCES);

const { createBoundedDrain, createDescendantStopController, freezeStopProof } =
  createStopRuntime({ MAX_CHILD_STREAM_BYTES, STOP_TIMEOUT_MS });

const {
  createRuntimeDependencies,
  createStartupDeadline,
  runHostCli,
  serve,
  waitForDirectChildIdentity,
} = createServeRuntime({
  CHILD_READY_MARKERS,
  READY_TIMEOUT_MS,
  childDescriptors,
  createBoundedDrain,
  createDescendantStopController,
  validateChildDescriptors,
});

function isDirectModuleExecution(moduleUrl, argvEntry, cwd) {
  if (
    typeof moduleUrl !== "string" ||
    moduleUrl.length === 0 ||
    typeof argvEntry !== "string" ||
    argvEntry.length === 0 ||
    typeof cwd !== "string" ||
    cwd.length === 0
  ) {
    return false;
  }
  return pathToFileURL(path.resolve(cwd, argvEntry)).href === moduleUrl;
}

function expectFailure(callback, label) {
  let failed = false;
  try {
    callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

async function expectAsyncFailure(callback, label) {
  let failed = false;
  try {
    await callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildSelfTestEnvironment() {
  const environment = Object.create(null);
  environment.PATH = "/usr/bin";
  for (const key of REQUIRED_REPO_ENV) environment[key] = "self-test-value-" + key;
  Object.assign(environment, FIXED_ENV);
  return environment;
}

function createPreflightFake(root, options = {}) {
  const coreRoot = path.join(root, "core");
  const cacheAuthority = viteCacheAuthorityTargets(root);
  const [adminCache, siteCache] = cacheAuthority.targets;
  const directories = new Set([
    root,
    coreRoot,
    cacheAuthority.nodeModules,
    path.join(root, "node_modules"),
    path.join(root, "node_modules/vite"),
    cacheAuthority.base,
    adminCache.cache,
    adminCache.deps,
    siteCache.cache,
    siteCache.deps,
  ]);
  const removeTaskCacheChildren = () => {
    directories.delete(adminCache.cache);
    directories.delete(adminCache.deps);
    directories.delete(siteCache.cache);
    directories.delete(siteCache.deps);
  };
  if (options.cacheFault === "missing-base") {
    directories.delete(cacheAuthority.base);
    removeTaskCacheChildren();
  }
  if (options.cacheFault === "missing-base-with-children") {
    directories.delete(cacheAuthority.base);
  }
  if (["base-symlink", "base-noncanonical", "base-escape"].includes(options.cacheFault)) {
    removeTaskCacheChildren();
  }
  if (options.cacheFault === "node-modules-symlink") {
    directories.delete(cacheAuthority.base);
    removeTaskCacheChildren();
  }
  if (options.cacheFault === "missing-node-modules") {
    directories.delete(cacheAuthority.nodeModules);
    directories.delete(cacheAuthority.base);
    removeTaskCacheChildren();
  }
  if (options.cacheFault === "missing-admin-cache") {
    directories.delete(adminCache.cache);
    directories.delete(adminCache.deps);
  }
  if (options.cacheFault === "missing-admin-deps") directories.delete(adminCache.deps);
  if (options.cacheFault === "missing-site-cache") {
    directories.delete(siteCache.cache);
    directories.delete(siteCache.deps);
  }
  if (options.cacheFault === "missing-site-deps") directories.delete(siteCache.deps);
  if (options.viteShadow) directories.add(path.join(coreRoot, "node_modules/vite"));
  const files = new Map([
    [path.join(root, "package.json"), JSON.stringify({ devDependencies: { vite: "^8.0.16" } })],
    [
      path.join(root, "bun.lock"),
      JSON.stringify({
        lockfileVersion: 1,
        workspaces: {
          "": { devDependencies: { vite: "^8.0.16" } },
          core: { devDependencies: { vite: "^8.0.10" } },
        },
        packages: { vite: [`vite@${options.lockViteVersion ?? "8.1.5"}`] },
      }),
    ],
    [path.join(coreRoot, "package.json"), JSON.stringify({ devDependencies: { vite: "^8.0.10" } })],
    [path.join(coreRoot, "server/httpServer.ts"), "export const startHttpServer = true;"],
    [path.join(coreRoot, "vite.config.ts"), "export default {};"],
    [path.join(coreRoot, "vite.site.config.ts"), "export default {};"],
    [path.join(coreRoot, "admin/main.tsx"), "export {};"],
    [path.join(coreRoot, "site/main.ts"), "export {};"],
    [
      path.join(root, "node_modules/vite/package.json"),
      JSON.stringify({
        name: "vite",
        version: options.installedViteVersion ?? "8.1.5",
      }),
    ],
    [path.join(root, "node_modules/vite/dist/node/index.js"), "export {};"],
    ["/usr/bin/bun", "ELF"],
  ]);
  if (options.missingPath) files.delete(options.missingPath);
  let calls = 0;
  const missing = () => Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  const statsFor = (target, { lstatMode = false } = {}) => {
    if (directories.has(target)) {
      return {
        isDirectory: () => true,
        isFile: () => false,
        isSymbolicLink: () =>
          Boolean(
            lstatMode &&
            ((options.symlinkRoot && target === root) ||
              (options.cacheFault === "node-modules-symlink" &&
                target === cacheAuthority.nodeModules) ||
              (options.cacheFault === "base-symlink" && target === cacheAuthority.base) ||
              (options.cacheFault === "admin-cache-symlink" && target === adminCache.cache) ||
              (options.cacheFault === "site-cache-symlink" && target === siteCache.cache) ||
              (options.cacheFault === "admin-deps-symlink" && target === adminCache.deps) ||
              (options.cacheFault === "site-deps-symlink" && target === siteCache.deps))
          ),
      };
    }
    if (files.has(target)) {
      return {
        isDirectory: () => false,
        isFile: () => true,
        isSymbolicLink: () => false,
      };
    }
    throw missing();
  };
  const dependencies = {
    async access(target) {
      calls += 1;
      if (!files.has(target) && !directories.has(target)) throw missing();
      if (options.bunUnavailable && target === "/usr/bin/bun") throw new Error("EACCES");
    },
    async lstat(target) {
      calls += 1;
      return statsFor(target, { lstatMode: true });
    },
    async readFile(target) {
      calls += 1;
      if (!files.has(target)) throw missing();
      return files.get(target);
    },
    async realpath(target) {
      calls += 1;
      if (!files.has(target) && !directories.has(target)) throw missing();
      if (options.nonCanonicalRoot && target === root) return root + "-elsewhere";
      if (options.cacheFault === "base-noncanonical" && target === cacheAuthority.base) {
        return path.join(cacheAuthority.nodeModules, ".vite-elsewhere");
      }
      if (options.cacheFault === "base-escape" && target === cacheAuthority.base) {
        return path.join(root, "escaped-vite-authority");
      }
      if (options.cacheFault === "admin-cache-noncanonical" && target === adminCache.cache) {
        return path.join(cacheAuthority.base, "elsewhere-admin");
      }
      if (options.cacheFault === "admin-cache-escape" && target === adminCache.cache) {
        return path.join(root, "escaped-vite-cache");
      }
      if (options.cacheFault === "shared-cache-realpath" && target === siteCache.cache) {
        return adminCache.cache;
      }
      if (options.cacheFault === "admin-deps-escape" && target === adminCache.deps) {
        return path.join(cacheAuthority.base, "escaped-deps");
      }
      if (options.cacheFault === "shared-deps-realpath" && target === siteCache.deps) {
        return adminCache.deps;
      }
      return target;
    },
    async stat(target) {
      calls += 1;
      return statsFor(target);
    },
  };
  return { dependencies, calls: () => calls };
}

function createStopSelfTestHarness(mode) {
  const runner = { pid: 100, ppid: 1, pgid: 100, startTicks: "1000" };
  const children = [
    { pid: 101, ppid: 100, pgid: 100, startTicks: "1001" },
    { pid: 102, ppid: 100, pgid: 100, startTicks: "1002" },
    { pid: 103, ppid: 100, pgid: 100, startTicks: "1003" },
  ];
  const live = new Map(
    [runner, ...children].map((identity) => [identity.pid, clonePlain(identity)])
  );
  const signals = [];
  const dependencies = {
    async listIdentities() {
      return [...live.values()].map(clonePlain);
    },
    async readIdentity(pid) {
      const identity = live.get(pid);
      if (!identity) throw new Error("ESRCH");
      return clonePlain(identity);
    },
    async signalPid(pid, signal) {
      signals.push({ pid, signal });
      if (mode === "pid-reuse" && signal === "SIGTERM" && pid === 101) {
        live.set(101, { pid: 101, ppid: 100, pgid: 100, startTicks: "9001" });
        return;
      }
      if ((mode === "term-only" || mode === "persistent-port") && signal === "SIGTERM") {
        live.delete(pid);
      }
      if (mode === "term-kill" && signal === "SIGKILL") live.delete(pid);
    },
    async portsAbsent() {
      return mode !== "persistent-port";
    },
    async delay() {},
  };
  return {
    runner,
    children,
    signals,
    controller: createDescendantStopController({
      runnerIdentity: runner,
      retainedIdentities: () => children,
      dependencies,
    }),
  };
}

function createServeSelfTestHarness(
  root,
  environment,
  {
    listenerFault = null,
    shutdownAfterFirstSpawn = false,
    cacheFault = null,
    startupTimeout = false,
    alternatingSecondProofDrift = false,
  } = {}
) {
  const preflight = createPreflightFake(root, { cacheFault });
  const identities = [
    { pid: 100, ppid: 1, pgid: 100, startTicks: "1000" },
    { pid: 101, ppid: 100, pgid: 100, startTicks: "1001" },
    { pid: 102, ppid: 100, pgid: 100, startTicks: "1002" },
    { pid: 103, ppid: 100, pgid: 100, startTicks: "1003" },
  ];
  const identityTemplates = new Map(identities.map((identity) => [identity.pid, identity]));
  identityTemplates.set(104, { pid: 104, ppid: 1, pgid: 104, startTicks: "1004" });
  identityTemplates.set(105, { pid: 105, ppid: 101, pgid: 105, startTicks: "1005" });
  const live = new Map([[100, clonePlain(identityTemplates.get(100))]]);
  const children = new Map();
  const spawnCalls = [];
  const signals = [];
  const output = [];
  const delayRequests = [];
  const proofCycles = {
    calls: 0,
    successfulFirst: 0,
    failedSecond: 0,
    recoveredFirst: 0,
    observationDelays: [],
    recoveryDelays: [],
  };
  let lastFirstProofAt = null;
  let lastFailedSecondAt = null;
  let inventoryStatReadsRemaining = 0;
  let monotonicMs = 0;
  let firstCleanupSignalAt = null;
  let spawnedEnvironment = null;
  const signalHandlers = new Map();
  const inodes = new Map([
    [100, "5000"],
    [101, "5001"],
    [102, "5002"],
    [103, "5003"],
    [104, "5004"],
    [105, "5005"],
  ]);
  const ports = new Map([
    [3000, 101],
    [5173, listenerFault === "foreign" ? 104 : 102],
    [5174, 103],
  ]);
  const extraListenerInode = "5999";
  const extraListenerOwnerPid = listenerFault === "runner-extra-port" ? 100 : 102;
  const rawEnvironment = Buffer.from(
    Object.entries(environment)
      .map(([key, value]) => `${key}=${value}`)
      .join("\0") + "\0"
  );
  const procStat = (identity) =>
    `${identity.pid} (wf540-fake) S ${[
      String(identity.ppid),
      String(identity.pgid),
      ...Array(16).fill("0"),
      identity.startTicks,
    ].join(" ")}`;
  const tcpTable = () => {
    const rows = [
      "  sl  local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode",
    ];
    for (const [port, pid] of ports) {
      if (!live.has(pid)) continue;
      if (listenerFault === "missing" && port === 5173) continue;
      const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
      rows.push(`0: 0100007F:${hexPort} 00000000:0000 0A 0 0 0 0 0 ${inodes.get(pid)}`);
      if (listenerFault === "duplicate" && port === 5173) {
        rows.push(`1: 0100007F:${hexPort} 00000000:0000 0A 0 0 0 0 0 5999`);
      }
    }
    if (
      ["extra-port", "runner-extra-port"].includes(listenerFault) &&
      live.has(extraListenerOwnerPid)
    ) {
      rows.push(`9: 0100007F:270F 00000000:0000 0A 0 0 0 0 0 ${extraListenerInode}`);
    }
    if (listenerFault === "escaped-extra-listener" && live.has(105)) {
      rows.push(`10: 0100007F:270F 00000000:0000 0A 0 0 0 0 0 ${inodes.get(105)}`);
    }
    return rows.join("\n") + "\n";
  };
  const makeStream = (kind, isStdout) => ({
    on(event, callback) {
      invariant(event === "data", "fake child stream event drift");
      if (isStdout && !(startupTimeout && kind === "admin")) {
        callback(Buffer.from(CHILD_READY_MARKERS[kind]));
      }
    },
  });
  const makeChild = (kind, pid) => {
    const handlers = new Map();
    const child = {
      pid,
      exitCode: null,
      signalCode: null,
      stdout: makeStream(kind, true),
      stderr: makeStream(kind, false),
      once(event, callback) {
        invariant(["error", "exit"].includes(event), "fake child event drift");
        handlers.set(event, callback);
      },
      emitExit(signal) {
        child.exitCode = signal === "SIGTERM" ? 0 : null;
        child.signalCode = signal === "SIGKILL" ? "SIGKILL" : null;
        handlers.get("exit")?.();
      },
    };
    return child;
  };
  const dependencies = {
    pid: 100,
    environment,
    stdoutWrite(value) {
      output.push(value);
      signalHandlers.get("SIGTERM")?.();
    },
    onceSignal(signal, callback) {
      signalHandlers.set(signal, callback);
    },
    spawn(file, args, options) {
      const index = spawnCalls.length;
      const kind = ["backend", "admin", "site"][index];
      const pid = 101 + index;
      invariant(file === "bun", "fake spawn executable drift");
      invariant(
        args.length === 5 &&
          args[0] === "--no-env-file" &&
          args[1] === "--cwd" &&
          args[2] === path.join(root, "core") &&
          args[3] === "--eval" &&
          args[4].includes(CHILD_READY_MARKERS[kind].trim()),
        "fake spawn argv/source drift"
      );
      if (spawnedEnvironment === null) spawnedEnvironment = options.env;
      invariant(
        options.cwd === root &&
          options.env === spawnedEnvironment &&
          Object.getPrototypeOf(options.env) === null &&
          JSON.stringify(Object.entries(options.env)) ===
            JSON.stringify(Object.entries(environment)) &&
          options.shell === false &&
          options.detached === false &&
          JSON.stringify(options.stdio) === JSON.stringify(["ignore", "pipe", "pipe"]),
        "fake spawn options drift"
      );
      const child = makeChild(kind, pid);
      live.set(pid, clonePlain(identityTemplates.get(pid)));
      if (listenerFault === "foreign" && index === 2) {
        live.set(104, clonePlain(identityTemplates.get(104)));
      }
      if (["escaped-extra-listener", "escaped-member"].includes(listenerFault) && index === 2) {
        live.set(105, clonePlain(identityTemplates.get(105)));
      }
      children.set(pid, child);
      spawnCalls.push({ kind, file, args: [...args], options: { ...options } });
      if (shutdownAfterFirstSpawn && index === 0) signalHandlers.get("SIGTERM")?.();
      return child;
    },
    access: preflight.dependencies.access,
    lstat: preflight.dependencies.lstat,
    async readFile(target, encoding) {
      if (target === "/proc/self/environ") return rawEnvironment;
      if (target === "/proc/net/tcp") return tcpTable();
      if (target === "/proc/net/tcp6") return tcpTable().split("\n")[0] + "\n";
      const statMatch = /^\/proc\/([1-9][0-9]*)\/stat$/u.exec(target);
      if (statMatch) {
        const pid = Number(statMatch[1]);
        const identity = live.get(pid);
        if (!identity) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        const inventoryRead = inventoryStatReadsRemaining > 0;
        if (inventoryRead) inventoryStatReadsRemaining -= 1;
        if (
          alternatingSecondProofDrift &&
          !inventoryRead &&
          pid === 100 &&
          spawnCalls.length === 3 &&
          monotonicMs < READY_TIMEOUT_MS
        ) {
          proofCycles.calls += 1;
          if (proofCycles.calls % 2 === 1) {
            if (proofCycles.calls > 1) {
              proofCycles.recoveredFirst += 1;
              proofCycles.recoveryDelays.push(monotonicMs - lastFailedSecondAt);
            }
            lastFirstProofAt = monotonicMs;
          } else {
            proofCycles.successfulFirst += 1;
            proofCycles.failedSecond += 1;
            proofCycles.observationDelays.push(monotonicMs - lastFirstProofAt);
            lastFailedSecondAt = monotonicMs;
            return procStat({ ...identity, startTicks: "9999" });
          }
        }
        return procStat(identity);
      }
      return preflight.dependencies.readFile(target, encoding);
    },
    async readdir(target, options) {
      if (target === "/proc") {
        invariant(options?.withFileTypes === true, "fake /proc enumeration options drift");
        const entries = [...live.keys()].map((pid) => ({
          name: String(pid),
          isDirectory: () => true,
        }));
        inventoryStatReadsRemaining = entries.length;
        return entries;
      }
      const fdMatch = /^\/proc\/([1-9][0-9]*)\/fd$/u.exec(target);
      if (fdMatch) {
        const pid = Number(fdMatch[1]);
        if (!live.has(pid) || !inodes.has(pid)) return [];
        return ["extra-port", "runner-extra-port"].includes(listenerFault) &&
          pid === extraListenerOwnerPid
          ? ["1", "2"]
          : ["1"];
      }
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    },
    async readlink(target) {
      const match = /^\/proc\/([1-9][0-9]*)\/fd\/([12])$/u.exec(target);
      if (!match || !live.has(Number(match[1])) || !inodes.has(Number(match[1]))) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      if (match[2] === "2") {
        invariant(
          ["extra-port", "runner-extra-port"].includes(listenerFault) &&
            Number(match[1]) === extraListenerOwnerPid,
          "fake extra socket drift"
        );
        return `socket:[${extraListenerInode}]`;
      }
      return `socket:[${inodes.get(Number(match[1]))}]`;
    },
    realpath: preflight.dependencies.realpath,
    stat: preflight.dependencies.stat,
    monotonicNow() {
      return monotonicMs;
    },
    async delay(requestedMs) {
      invariant(
        typeof requestedMs === "number" && Number.isFinite(requestedMs) && requestedMs > 0,
        "fake monotonic delay drift"
      );
      delayRequests.push(requestedMs);
      monotonicMs += requestedMs;
    },
    signalPid(pid, signal) {
      if (firstCleanupSignalAt === null) firstCleanupSignalAt = monotonicMs;
      signals.push({ pid, signal });
      if (pid === 105 && live.has(pid)) {
        live.delete(pid);
        return;
      }
      const child = children.get(pid);
      invariant(child && live.has(pid), "fake signal target drift");
      live.delete(pid);
      child.emitExit(signal);
    },
  };
  return {
    dependencies,
    spawnCalls,
    signals,
    output,
    preflightCalls: preflight.calls,
    clock: {
      now: () => monotonicMs,
      firstCleanupSignalAt: () => firstCleanupSignalAt,
      delayRequests,
    },
    proofCycles,
  };
}

export async function runTask540SmokeHostSelfTest() {
  const root = "/canonical/task540-root";
  const descriptors = childDescriptors(root);
  validateChildDescriptors(descriptors, root);
  for (const descriptor of descriptors) {
    invariant(
      !descriptor.args[4].includes("bunx") &&
        !descriptor.args[4].includes("coderso-dev-core-host") &&
        !descriptor.args[4].includes("dotenv") &&
        !descriptor.args[4].includes("fetch(") &&
        !descriptor.args[4].includes("http://") &&
        !descriptor.args[4].includes("https://") &&
        Object.isFrozen(descriptor) &&
        Object.isFrozen(descriptor.args),
      descriptor.kind + " child descriptor drift"
    );
  }
  const descriptorNegatives = [
    (value) => {
      value.extra = true;
    },
    (value) => {
      value[0].args[4] += " ";
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace("port: 5173", "port: 5172");
    },
    (value) => {
      value[2].args[4] = value[2].args[4].replace("envDir: false", "envDir: true");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replaceAll("wf540-admin", "wf540-site");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace('  "/ui/dashboard/DashboardPage.tsx",\n', "");
    },
    (value) => {
      value[1].args[4] = value[1].args[4].replace('  "/ui/dashboard/DashboardBuilder.tsx",\n', "");
    },
    (value) => {
      value[2].args[4] = value[2].args[4].replaceAll("wf540-site", "wf540-admin");
    },
    (value) => {
      value[0].args.push("extra");
    },
    (value) => {
      value[1].args[1] = "--eval";
    },
    (value) => {
      value[2].extra = true;
    },
    (value) => {
      [value[0], value[1]] = [value[1], value[0]];
    },
  ];
  for (const [index, mutation] of descriptorNegatives.entries()) {
    const candidate = clonePlain(descriptors);
    mutation(candidate);
    expectFailure(
      () => validateChildDescriptors(candidate, root),
      "descriptor byte negative " + index
    );
  }
  invariant(
    BACKEND_SOURCE.includes("server.stop();") && !BACKEND_SOURCE.includes("server.stop(true)"),
    "backend graceful-stop source drift"
  );
  invariant(READY_TIMEOUT_MS === 360_000, "host warm-restart timeout drift");
  invariant(
    VITE_WARM_RESTART_SOURCE.includes("for (let start = 0; start < 2; start += 1)") &&
      (VITE_WARM_RESTART_SOURCE.match(/await createServer\(inlineConfig\)/gu) ?? []).length === 1 &&
      VITE_WARM_RESTART_SOURCE.indexOf(
        "requireExactViteOptionsClone(options, inlineConfig, failureCode);"
      ) < VITE_WARM_RESTART_SOURCE.indexOf("await createServer(inlineConfig)") &&
      VITE_WARM_RESTART_SOURCE.includes("createdServer === previousServer") &&
      !VITE_WARM_RESTART_SOURCE.includes("start < 3"),
    "Vite warm-restart start cardinality drift"
  );
  invariant(
    ADMIN_VITE_SOURCE.includes('configFile: "./vite.config.ts"') &&
      ADMIN_VITE_SOURCE.includes('configLoader: "native"') &&
      ADMIN_VITE_SOURCE.includes('cacheDir: "../node_modules/.vite/wf540-admin"') &&
      ADMIN_VITE_SOURCE.includes("envDir: false") &&
      ADMIN_VITE_SOURCE.includes('host: "127.0.0.1"') &&
      !ADMIN_VITE_SOURCE.includes('host: "localhost"') &&
      ADMIN_VITE_SOURCE.includes("port: 5173") &&
      ADMIN_VITE_SOURCE.includes(VITE_READINESS_SOURCE) &&
      ADMIN_VITE_SOURCE.includes(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE) &&
      ADMIN_VITE_SOURCE.split(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE).length === 2 &&
      ADMIN_VITE_SOURCE.includes(VITE_WARM_RESTART_SOURCE) &&
      ADMIN_VITE_SOURCE.split(VITE_WARM_RESTART_SOURCE).length === 2 &&
      ADMIN_VITE_SOURCE.includes("const options = Object.freeze({") &&
      ADMIN_VITE_SOURCE.includes("server: Object.freeze({") &&
      ADMIN_VITE_SOURCE.split('"/ui/dashboard/DashboardPage.tsx"').length === 2 &&
      ADMIN_VITE_SOURCE.split('"/ui/dashboard/DashboardBuilder.tsx"').length === 2 &&
      ADMIN_VITE_SOURCE.indexOf('"/ui/dashboard/DashboardPage.tsx"') <
        ADMIN_VITE_SOURCE.indexOf('"/ui/dashboard/DashboardBuilder.tsx"') &&
      ADMIN_VITE_SOURCE.includes(
        '], process.cwd() + "/node_modules/.vite/wf540-admin", "admin_vite_readiness_failed");'
      ) &&
      ADMIN_VITE_SOURCE.indexOf(
        "const server = await startViteWithWarmRestart(createServer, options, ["
      ) < ADMIN_VITE_SOURCE.indexOf('process.stdout.write("WF540_ADMIN_READY_V1\\n")'),
    "Admin Vite source drift"
  );
  invariant(
    SITE_VITE_SOURCE.includes('configFile: "./vite.site.config.ts"') &&
      SITE_VITE_SOURCE.includes('configLoader: "native"') &&
      SITE_VITE_SOURCE.includes('cacheDir: "../node_modules/.vite/wf540-site"') &&
      SITE_VITE_SOURCE.includes("envDir: false") &&
      SITE_VITE_SOURCE.includes('host: "127.0.0.1"') &&
      !SITE_VITE_SOURCE.includes('host: "localhost"') &&
      SITE_VITE_SOURCE.includes("port: 5174") &&
      SITE_VITE_SOURCE.includes(VITE_READINESS_SOURCE) &&
      SITE_VITE_SOURCE.includes(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE) &&
      SITE_VITE_SOURCE.split(VITE_OPTIONS_CLONE_VALIDATOR_SOURCE).length === 2 &&
      SITE_VITE_SOURCE.includes(VITE_WARM_RESTART_SOURCE) &&
      SITE_VITE_SOURCE.split(VITE_WARM_RESTART_SOURCE).length === 2 &&
      SITE_VITE_SOURCE.includes("const options = Object.freeze({") &&
      SITE_VITE_SOURCE.includes("server: Object.freeze({") &&
      SITE_VITE_SOURCE.includes(
        '["/main.ts"], process.cwd() + "/node_modules/.vite/wf540-site", "site_vite_readiness_failed");'
      ) &&
      SITE_VITE_SOURCE.indexOf(
        'const server = await startViteWithWarmRestart(createServer, options, ["/main.ts"]'
      ) < SITE_VITE_SOURCE.indexOf('process.stdout.write("WF540_SITE_READY_V1\\n")'),
    "site Vite source drift"
  );

  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  };
  const readinessMetadata = (suffix, processing) => ({
    browserHash: "browser-" + suffix,
    depInfoList: [
      {
        id: "react",
        file: "/deps/react-" + suffix + ".js",
        browserHash: "dep-browser-" + suffix,
        fileHash: "file-" + suffix,
        ...(processing === undefined ? {} : { processing }),
      },
    ],
  });
  const stableReadinessServer = (calls, optimizer) => ({
    environments: { client: { depsOptimizer: optimizer } },
    async transformRequest(url) {
      calls.push("transform:" + url);
      return { code: "export {};" };
    },
    async waitForRequestsIdle() {
      calls.push("idle");
    },
  });
  const rejectedReadinessPromise = (message) => {
    const promise = Promise.reject(new Error(message));
    void promise.catch(() => {});
    return promise;
  };

  const adminUrls = [
    "/main.tsx",
    "/app/AdminApp.tsx",
    "/app/adminRouteComponents.tsx",
    "/ui/custom-screens/CustomScreenListPage.tsx",
  ];
  const adminCalls = [];
  const adminScan = deferred();
  const adminProcessing = deferred();
  const adminOptimizer = {
    metadata: readinessMetadata("pending", adminProcessing.promise),
    scanProcessing: adminScan.promise,
  };
  const adminServer = stableReadinessServer(adminCalls, adminOptimizer);
  let adminReadyContinuations = 0;
  const adminReadiness = (async () => {
    await settleViteReadiness(adminServer, adminUrls, "admin_vite_readiness_failed");
    adminCalls.push("ready");
    adminReadyContinuations += 1;
  })();
  await new Promise((resolve) => setImmediate(resolve));
  invariant(adminReadyContinuations === 0, "Admin readiness escaped before scan completion");
  adminCalls.push("scan");
  adminOptimizer.scanProcessing = undefined;
  adminScan.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  invariant(adminReadyContinuations === 0, "Admin readiness escaped before dependency publication");
  adminCalls.push("publish");
  adminOptimizer.metadata = readinessMetadata("stable");
  adminProcessing.resolve();
  await adminReadiness;
  invariant(
    adminReadyContinuations === 1 &&
      JSON.stringify(adminCalls) ===
        JSON.stringify([
          ...adminUrls.map((url) => "transform:" + url),
          "idle",
          "scan",
          "publish",
          ...adminUrls.map((url) => "transform:" + url),
          "idle",
          "ready",
        ]),
    "Admin readiness publication order drift"
  );

  const siteCalls = [];
  const siteOptimizer = { metadata: readinessMetadata("site") };
  const siteServer = stableReadinessServer(siteCalls, siteOptimizer);
  let siteReadyContinuations = 0;
  await settleViteReadiness(siteServer, ["/main.ts"], "site_vite_readiness_failed");
  siteCalls.push("ready");
  siteReadyContinuations += 1;
  invariant(
    siteReadyContinuations === 1 &&
      JSON.stringify(siteCalls) ===
        JSON.stringify(["transform:/main.ts", "idle", "transform:/main.ts", "idle", "ready"]),
    "site readiness stable-transform order drift"
  );

  const readinessNegatives = [
    {
      label: "missing optimizer",
      server: {
        environments: { client: {} },
        async transformRequest() {
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {},
      },
    },
    {
      label: "malformed metadata",
      server: stableReadinessServer([], {
        metadata: { browserHash: "browser-malformed", depInfoList: {} },
      }),
    },
    {
      label: "non-native processing thenable",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("thenable", { then() {} }),
      }),
    },
    {
      label: "non-native scan thenable",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("scan-thenable"),
        scanProcessing: { then() {} },
      }),
    },
    {
      label: "rejected scan",
      server: stableReadinessServer([], {
        metadata: readinessMetadata("rejected-scan"),
        scanProcessing: rejectedReadinessPromise("private scan failure"),
      }),
    },
    {
      label: "rejected processing",
      server: stableReadinessServer([], {
        metadata: readinessMetadata(
          "rejected-processing",
          rejectedReadinessPromise("private processing failure")
        ),
      }),
    },
    {
      label: "null transform",
      server: {
        ...stableReadinessServer([], { metadata: readinessMetadata("null-transform") }),
        async transformRequest() {
          return null;
        },
      },
    },
    {
      label: "empty transform",
      server: {
        ...stableReadinessServer([], { metadata: readinessMetadata("empty-transform") }),
        async transformRequest() {
          return { code: "" };
        },
      },
    },
  ];
  for (const { label, server } of readinessNegatives) {
    let readyContinuations = 0;
    await expectAsyncFailure(async () => {
      await settleViteReadiness(server, ["/main.ts"], "site_vite_readiness_failed");
      readyContinuations += 1;
    }, "Vite readiness " + label);
    invariant(readyContinuations === 0, label + " emitted a READY continuation");
  }
  let unstableTransforms = 0;
  const unstableOptimizer = { metadata: readinessMetadata("unstable-0") };
  const unstableServer = stableReadinessServer([], unstableOptimizer);
  unstableServer.transformRequest = async () => {
    unstableTransforms += 1;
    unstableOptimizer.metadata = readinessMetadata("unstable-" + unstableTransforms);
    return { code: "export {};" };
  };
  let unstableReadyContinuations = 0;
  await expectAsyncFailure(async () => {
    await settleViteReadiness(unstableServer, ["/main.ts"], "site_vite_readiness_failed");
    unstableReadyContinuations += 1;
  }, "Vite readiness non-convergence");
  invariant(
    unstableTransforms === 8 && unstableReadyContinuations === 0,
    "Vite readiness non-convergence bound drift"
  );

  const makeViteOptionsOwner = (kind) => {
    const admin = kind === "admin";
    return Object.freeze({
      configFile: admin ? "./vite.config.ts" : "./vite.site.config.ts",
      configLoader: "native",
      cacheDir: admin ? "../node_modules/.vite/wf540-admin" : "../node_modules/.vite/wf540-site",
      envDir: false,
      clearScreen: false,
      logLevel: "silent",
      server: Object.freeze({
        host: "127.0.0.1",
        port: admin ? 5173 : 5174,
        strictPort: true,
        open: false,
      }),
    });
  };
  const expectedViteCache = (kind) => process.cwd() + "/node_modules/.vite/wf540-" + kind;
  const warmRestartPositive = async (kind, readinessUrls) => {
    const options = makeViteOptionsOwner(kind);
    const expectedCacheDir = expectedViteCache(kind);
    const failureCode = kind + "_vite_readiness_failed";
    const calls = [];
    const clones = [];
    const optionProjections = [];
    const closes = [0, 0];
    let starts = 0;
    const createServerFake = async (inlineConfig) => {
      const index = starts;
      starts += 1;
      calls.push("create:" + (index + 1));
      clones.push(inlineConfig);
      optionProjections.push(clonePlain(inlineConfig));
      if (index === 0) {
        inlineConfig.cacheDir = "vite-mutated-cache";
        inlineConfig.server.port = 1;
      }
      const configTarget = {};
      Object.defineProperty(configTarget, "cacheDir", {
        value: expectedCacheDir,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      const config = new Proxy(configTarget, {
        getOwnPropertyDescriptor(target, property) {
          if (property === "cacheDir") calls.push("cache:" + (index + 1));
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      });
      const optimizer = { metadata: readinessMetadata(kind + "-" + index) };
      return {
        config,
        environments: { client: { depsOptimizer: optimizer } },
        async listen() {
          calls.push("listen:" + (index + 1));
        },
        async transformRequest(url) {
          calls.push("transform:" + (index + 1) + ":" + url);
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {
          calls.push("idle:" + (index + 1));
        },
        async close() {
          closes[index] += 1;
          calls.push("close:" + (index + 1));
        },
        instance: index + 1,
      };
    };
    const finalServer = await startViteWithWarmRestart(
      createServerFake,
      options,
      readinessUrls,
      expectedCacheDir,
      failureCode
    );
    calls.push("ready");
    const expectedCalls = [];
    for (let index = 1; index <= 2; index += 1) {
      expectedCalls.push("create:" + index, "cache:" + index, "listen:" + index);
      for (let round = 0; round < 2; round += 1) {
        expectedCalls.push(
          ...readinessUrls.map((url) => "transform:" + index + ":" + url),
          "idle:" + index
        );
      }
      if (index === 1) expectedCalls.push("close:1");
    }
    expectedCalls.push("ready");
    invariant(
      starts === 2 &&
        finalServer.instance === 2 &&
        JSON.stringify(closes) === JSON.stringify([1, 0]) &&
        JSON.stringify(calls) === JSON.stringify(expectedCalls),
      kind + " warm-restart lifecycle order drift"
    );
    invariant(
      clones.length === 2 &&
        clones[0] !== clones[1] &&
        clones[0].server !== clones[1].server &&
        clones.every(
          (clone) =>
            clone !== options &&
            clone.server !== options.server &&
            !Object.isFrozen(clone) &&
            !Object.isFrozen(clone.server)
        ) &&
        JSON.stringify(optionProjections) ===
          JSON.stringify([clonePlain(options), clonePlain(options)]) &&
        options.cacheDir === "../node_modules/.vite/wf540-" + kind &&
        options.server.port === (kind === "admin" ? 5173 : 5174),
      kind + " warm-restart clone isolation drift"
    );
    return { options, expectedCacheDir };
  };
  const adminWarmRestart = await warmRestartPositive("admin", adminUrls);
  const siteWarmRestart = await warmRestartPositive("site", ["/main.ts"]);

  const warmRestartFailure = async (stage) => {
    const options = makeViteOptionsOwner("site");
    const expectedCacheDir = expectedViteCache("site");
    const closes = [0, 0];
    const listens = [0, 0];
    let starts = 0;
    const createServerFake = async () => {
      const index = starts;
      starts += 1;
      if (stage === "create-" + (index + 1)) throw new Error("private create failure");
      const cacheDir =
        stage === "cache-" + (index + 1) ? expectedCacheDir + "-wrong" : expectedCacheDir;
      const optimizer = { metadata: readinessMetadata("failure-" + index) };
      return {
        config: { cacheDir },
        environments: { client: { depsOptimizer: optimizer } },
        async listen() {
          listens[index] += 1;
          if (stage === "listen-" + (index + 1)) {
            throw new Error("private listen failure");
          }
        },
        async transformRequest() {
          if (
            stage === "readiness-" + (index + 1) ||
            (stage === "readiness-2-close-failure" && index === 1)
          ) {
            return null;
          }
          return { code: "export {};" };
        },
        async waitForRequestsIdle() {},
        async close() {
          closes[index] += 1;
          if (
            stage === "close-" + (index + 1) ||
            (stage === "readiness-2-close-failure" && index === 1)
          ) {
            throw new Error("private close failure");
          }
        },
      };
    };
    let observedCode = null;
    try {
      await startViteWithWarmRestart(
        createServerFake,
        options,
        ["/main.ts"],
        expectedCacheDir,
        "site_vite_readiness_failed"
      );
    } catch (error) {
      observedCode = error instanceof Error ? error.message : null;
    }
    invariant(observedCode === "site_vite_readiness_failed", stage + " failure-code drift");
    const expected = {
      "create-1": { starts: 1, closes: [0, 0], listens: [0, 0] },
      "cache-1": { starts: 1, closes: [1, 0], listens: [0, 0] },
      "listen-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "readiness-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "close-1": { starts: 1, closes: [1, 0], listens: [1, 0] },
      "create-2": { starts: 2, closes: [1, 0], listens: [1, 0] },
      "cache-2": { starts: 2, closes: [1, 1], listens: [1, 0] },
      "listen-2": { starts: 2, closes: [1, 1], listens: [1, 1] },
      "readiness-2": { starts: 2, closes: [1, 1], listens: [1, 1] },
      "readiness-2-close-failure": { starts: 2, closes: [1, 1], listens: [1, 1] },
    }[stage];
    invariant(
      expected &&
        starts === expected.starts &&
        JSON.stringify(closes) === JSON.stringify(expected.closes) &&
        JSON.stringify(listens) === JSON.stringify(expected.listens) &&
        closes.every((count) => count <= 1),
      stage + " warm-restart cleanup drift"
    );
  };
  const warmRestartFailureStages = [
    "create-1",
    "cache-1",
    "listen-1",
    "readiness-1",
    "close-1",
    "create-2",
    "cache-2",
    "listen-2",
    "readiness-2",
    "readiness-2-close-failure",
  ];
  for (const stage of warmRestartFailureStages) await warmRestartFailure(stage);

  const warmRestartOwnerNegatives = [
    () => ({ ...clonePlain(siteWarmRestart.options), extra: true }),
    () => {
      const value = clonePlain(siteWarmRestart.options);
      delete value.cacheDir;
      return value;
    },
    () => clonePlain(siteWarmRestart.options),
    () => {
      const value = clonePlain(siteWarmRestart.options);
      Object.freeze(value);
      return value;
    },
    () => {
      const value = clonePlain(siteWarmRestart.options);
      value.cacheDir = "../node_modules/.vite/wf540-admin";
      return value;
    },
  ];
  for (const [index, buildOwner] of warmRestartOwnerNegatives.entries()) {
    const candidate = buildOwner();
    if (index !== 2 && index !== 3) {
      Object.freeze(candidate.server);
      Object.freeze(candidate);
    }
    let createCalls = 0;
    await expectAsyncFailure(
      () =>
        startViteWithWarmRestart(
          async () => {
            createCalls += 1;
            throw new Error("owner validation escaped");
          },
          candidate,
          ["/main.ts"],
          siteWarmRestart.expectedCacheDir,
          "site_vite_readiness_failed"
        ),
      "warm-restart owner negative " + index
    );
    invariant(createCalls === 0, "invalid warm-restart owner reached Vite");
  }
  const cloneValidatorNegatives = [
    {
      label: "root value drift",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.configLoader = "bundle";
        return candidate;
      },
    },
    {
      label: "nested value drift",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.server.port = 5173;
        return candidate;
      },
    },
    {
      label: "shared root identity",
      build() {
        return siteWarmRestart.options;
      },
    },
    {
      label: "shared nested server identity",
      build() {
        const candidate = clonePlain(siteWarmRestart.options);
        candidate.server = siteWarmRestart.options.server;
        return candidate;
      },
    },
  ];
  for (const { label, build } of cloneValidatorNegatives) {
    const candidate = build();
    let observedCode = null;
    let createCalls = 0;
    let readyContinuations = 0;
    try {
      requireExactViteOptionsClone(
        siteWarmRestart.options,
        candidate,
        "site_vite_readiness_failed"
      );
      createCalls += 1;
      readyContinuations += 1;
    } catch (error) {
      observedCode = error instanceof Error ? error.message : null;
    }
    invariant(
      observedCode === "site_vite_readiness_failed" &&
        createCalls === 0 &&
        readyContinuations === 0,
      "pre-create Vite clone negative: " + label
    );
  }

  let sameServerCreates = 0;
  let sameServerListens = 0;
  let sameServerCloses = 0;
  let sameServerReadyContinuations = 0;
  const sameServerExpectedCache = expectedViteCache("site");
  const sameServer = {
    ...stableReadinessServer([], { metadata: readinessMetadata("same-server") }),
    config: { cacheDir: sameServerExpectedCache },
    async listen() {
      sameServerListens += 1;
    },
    async close() {
      sameServerCloses += 1;
    },
  };
  let sameServerFailureCode = null;
  try {
    await startViteWithWarmRestart(
      async () => {
        sameServerCreates += 1;
        return sameServer;
      },
      makeViteOptionsOwner("site"),
      ["/main.ts"],
      sameServerExpectedCache,
      "site_vite_readiness_failed"
    );
    sameServerReadyContinuations += 1;
  } catch (error) {
    sameServerFailureCode = error instanceof Error ? error.message : null;
  }
  invariant(
    sameServerFailureCode === "site_vite_readiness_failed" &&
      sameServerCreates === 2 &&
      sameServerListens === 1 &&
      sameServerCloses === 1 &&
      sameServerReadyContinuations === 0,
    "same Vite server instance was reused after the warm close"
  );
  invariant(
    Object.isFrozen(adminWarmRestart.options) &&
      Object.isFrozen(adminWarmRestart.options.server) &&
      Object.isFrozen(siteWarmRestart.options) &&
      Object.isFrozen(siteWarmRestart.options.server),
    "warm-restart exact owners are not recursively frozen"
  );

  let drainData = null;
  const drainState = createBoundedDrain(
    {
      on(event, callback) {
        invariant(event === "data" && drainData === null, "self-test drain subscription drift");
        drainData = callback;
      },
    },
    CHILD_READY_MARKERS.admin
  );
  drainData(Buffer.from(CHILD_READY_MARKERS.admin.slice(0, 9)));
  invariant(drainState().readyCount === 0, "split readiness marker matched early");
  drainData(Buffer.from(CHILD_READY_MARKERS.admin.slice(9)));
  invariant(
    drainState().readyCount === 1 && !drainState().exceeded,
    "split readiness marker was not observed exactly once"
  );
  invariant(parseCliArgs(["--self-test"]).mode === "self-test", "self-test CLI drift");
  invariant(parseCliArgs(["--serve", root]).root === root, "serve CLI drift");
  let selfTestDispatchCalls = 0;
  let runtimeTrapCalls = 0;
  const runtimeTrap = new Proxy(Object.create(null), {
    get() {
      runtimeTrapCalls += 1;
      throw new Error("self-test touched a runtime capability");
    },
  });
  const selfTestSentinel = deepFreezeExact({ branch: "self-test" });
  const dispatchedSelfTest = await runHostCli(["--self-test"], {
    async runSelfTest() {
      selfTestDispatchCalls += 1;
      return selfTestSentinel;
    },
    createRuntimeDependencies() {
      runtimeTrapCalls += 1;
      return runtimeTrap;
    },
  });
  invariant(
    dispatchedSelfTest === selfTestSentinel &&
      selfTestDispatchCalls === 1 &&
      runtimeTrapCalls === 0,
    "self-test CLI runtime-isolation drift"
  );
  await expectAsyncFailure(
    () =>
      runHostCli(["--self-test"], {
        async runSelfTest() {},
        createRuntimeDependencies() {
          return runtimeTrap;
        },
        extra: true,
      }),
    "self-test CLI adapter unknown key"
  );
  invariant(runtimeTrapCalls === 0, "self-test CLI adapter rejection touched runtime");
  const directEntryPath = path.join(root, "task-540 smoke host.mjs");
  const directEntryUrl = pathToFileURL(directEntryPath).href;
  invariant(
    isDirectModuleExecution(directEntryUrl, directEntryPath, root) &&
      isDirectModuleExecution(directEntryUrl, path.basename(directEntryPath), root) &&
      !isDirectModuleExecution(
        directEntryUrl,
        path.join(root, "task-540-smoke-host-copy.mjs"),
        root
      ) &&
      !isDirectModuleExecution(directEntryUrl, undefined, root),
    "Node 22.14-compatible direct-entry guard drift"
  );
  let serveRuntimeFactoryCalls = 0;
  await expectAsyncFailure(
    () =>
      runHostCli(["--serve", root], {
        async runSelfTest() {
          invariant(false, "serve dispatch entered self-test branch");
        },
        createRuntimeDependencies() {
          serveRuntimeFactoryCalls += 1;
          throw new Error("serve runtime factory trap");
        },
      }),
    "serve CLI runtime factory trap"
  );
  invariant(
    serveRuntimeFactoryCalls === 1,
    "serve CLI did not invoke the injected runtime factory once"
  );
  const invalidCli = [
    [],
    ["--serve"],
    ["--self-test", root],
    ["--self-test", "--serve", root],
    ["--self-test", "--self-test"],
    ["--serve", root, "--serve", root],
    ["--serve", root, "extra"],
    ["--serve", "relative"],
    ["--serve", "/canonical/../task540-root"],
    ["--serve", root + "\0suffix"],
    ["--unknown"],
  ];
  invalidCli.forEach((args, index) =>
    expectFailure(() => parseCliArgs(args), "invalid CLI " + index)
  );

  const environment = buildSelfTestEnvironment();
  validateEnvironmentProjection(environment);
  for (const mutation of [
    (value) => {
      value.UNKNOWN = "x";
    },
    (value) => {
      delete value.PATH;
    },
    (value) => {
      value.PORT = "9";
    },
    (value) => {
      value.ADMIN_PASSWORD = "secret";
    },
    (value) => {
      value.DATABASE_URL = 1;
    },
    (value) => {
      value.__proto__ = "pollution";
    },
  ]) {
    const candidate = Object.assign(Object.create(null), environment);
    mutation(candidate);
    expectFailure(() => validateEnvironmentProjection(candidate), "invalid environment");
  }
  const accessorEnvironment = Object.assign(Object.create(null), environment);
  let accessorReads = 0;
  Object.defineProperty(accessorEnvironment, "UNKNOWN", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return "x";
    },
  });
  expectFailure(() => validateEnvironmentProjection(accessorEnvironment), "environment accessor");
  invariant(accessorReads === 0, "environment accessor was invoked");
  const symbolEnvironment = Object.assign(Object.create(null), environment);
  symbolEnvironment[Symbol("unknown")] = "x";
  expectFailure(() => validateEnvironmentProjection(symbolEnvironment), "environment symbol");

  const rawEnvironmentBytes = Buffer.from(
    Object.entries(environment)
      .map(([key, value]) => `${key}=${value}`)
      .join("\0") + "\0"
  );
  const crossChecked = await crossCheckRawEnvironment({
    environment,
    async readFile(target) {
      invariant(target === "/proc/self/environ", "raw environment fake path drift");
      return rawEnvironmentBytes;
    },
  });
  invariant(
    Object.getPrototypeOf(crossChecked) === null,
    "cross-checked environment prototype drift"
  );
  const rawEnvironmentNegatives = [
    Buffer.from("PATH=/usr/bin\0PATH=/bin\0"),
    Buffer.from("not-canonical=value\0"),
    Buffer.from("PATH=/usr/bin"),
    Uint8Array.from([0xff, 0]),
  ];
  for (const [index, bytes] of rawEnvironmentNegatives.entries()) {
    expectFailure(() => parseNulEnvironment(bytes), "raw environment negative " + index);
  }

  const validPreflight = createPreflightFake(root);
  const preflight = await validateCanonicalRootAndToolchain(
    root,
    environment,
    validPreflight.dependencies
  );
  invariant(
    preflight.root === root &&
      preflight.coreRoot === path.join(root, "core") &&
      preflight.bun.resolved === "/usr/bin/bun" &&
      preflight.viteVersion === "8.1.5" &&
      preflight.lockfileVersion === 1 &&
      validPreflight.calls() > 0,
    "toolchain preflight projection drift"
  );
  const cacheAuthority = await validateViteCacheAuthorities(
    root,
    validPreflight.dependencies,
    true
  );
  invariant(
    Object.isFrozen(cacheAuthority) &&
      Object.isFrozen(cacheAuthority.observed) &&
      cacheAuthority.nodeModulesRealpath === path.join(root, "core/node_modules") &&
      cacheAuthority.baseRealpath === path.join(root, "core/node_modules/.vite") &&
      cacheAuthority.observed.length === 2 &&
      cacheAuthority.observed[0].cacheRealpath ===
        path.join(root, "core/node_modules/.vite/wf540-admin") &&
      cacheAuthority.observed[0].depsRealpath ===
        path.join(root, "core/node_modules/.vite/wf540-admin/deps") &&
      cacheAuthority.observed[1].cacheRealpath ===
        path.join(root, "core/node_modules/.vite/wf540-site") &&
      cacheAuthority.observed[1].depsRealpath ===
        path.join(root, "core/node_modules/.vite/wf540-site/deps"),
    "Vite cache authority projection drift"
  );
  const optionalMissingBase = createPreflightFake(root, {
    cacheFault: "missing-base",
  });
  await validateCanonicalRootAndToolchain(root, environment, optionalMissingBase.dependencies);
  await expectAsyncFailure(
    () => validateViteCacheAuthorities(root, optionalMissingBase.dependencies, true),
    "missing post-ready Vite authority base"
  );
  const optionalMissingCache = createPreflightFake(root, {
    cacheFault: "missing-admin-cache",
  });
  await validateCanonicalRootAndToolchain(root, environment, optionalMissingCache.dependencies);
  await expectAsyncFailure(
    () => validateViteCacheAuthorities(root, optionalMissingCache.dependencies, true),
    "missing post-ready Vite cache"
  );
  const optionalMissingDeps = createPreflightFake(root, {
    cacheFault: "missing-site-deps",
  });
  await validateCanonicalRootAndToolchain(root, environment, optionalMissingDeps.dependencies);
  await expectAsyncFailure(
    () => validateViteCacheAuthorities(root, optionalMissingDeps.dependencies, true),
    "missing post-ready Vite optimizer"
  );
  const cacheAuthorityFaults = [
    "missing-base-with-children",
    "base-symlink",
    "base-noncanonical",
    "base-escape",
    "node-modules-symlink",
    "missing-node-modules",
    "admin-cache-symlink",
    "site-cache-symlink",
    "admin-cache-noncanonical",
    "admin-cache-escape",
    "shared-cache-realpath",
    "admin-deps-symlink",
    "site-deps-symlink",
    "admin-deps-escape",
    "shared-deps-realpath",
  ];
  for (const fault of cacheAuthorityFaults) {
    const fake = createPreflightFake(root, { cacheFault: fault });
    await expectAsyncFailure(
      () => validateCanonicalRootAndToolchain(root, environment, fake.dependencies),
      "Vite cache preflight " + fault
    );
    await expectAsyncFailure(
      () => validateViteCacheAuthorities(root, fake.dependencies, true),
      "Vite cache post-ready " + fault
    );
  }
  const preflightNegatives = [
    { nonCanonicalRoot: true },
    { symlinkRoot: true },
    { missingPath: path.join(root, "node_modules/vite/dist/node/index.js") },
    { lockViteVersion: "8.1.4" },
    { lockViteVersion: "8.1.6", installedViteVersion: "8.1.6" },
    { installedViteVersion: "9.0.0" },
    { bunUnavailable: true },
    { viteShadow: true },
  ];
  for (const [index, options] of preflightNegatives.entries()) {
    const fake = createPreflightFake(root, options);
    await expectAsyncFailure(
      () => validateCanonicalRootAndToolchain(root, environment, fake.dependencies),
      "toolchain preflight negative " + index
    );
  }

  const runnerStat = "100 (node) S " + ["1", "100", ...Array(16).fill("0"), "123"].join(" ");
  const runner = parseProcStat(runnerStat, 100);
  invariant(
    runner.pid === 100 && runner.pgid === 100 && runner.startTicks === "123",
    "proc parser drift"
  );
  expectFailure(
    () => parseProcStat("100 (node) S " + ["1", "99", ...Array(16).fill("0"), "0"].join(" "), 100),
    "invalid proc start ticks"
  );
  const proof = freezeStartupProof({
    schemaVersion: 1,
    runner: { pid: 100, ppid: 1, pgid: 100, startTicks: "123" },
    children: [
      { kind: "backend", identity: { pid: 101, ppid: 100, pgid: 100, startTicks: "124" } },
      { kind: "admin", identity: { pid: 102, ppid: 100, pgid: 100, startTicks: "125" } },
      { kind: "site", identity: { pid: 103, ppid: 100, pgid: 100, startTicks: "126" } },
    ],
    listeners: PORTS.map((port, index) => ({
      kind: ["backend", "admin", "site"][index],
      port,
      identity: { pid: 101 + index, ppid: 100, pgid: 100, startTicks: String(124 + index) },
    })),
    ports: [...PORTS],
  });
  invariant(
    Object.isFrozen(proof) && Object.isFrozen(proof.children[0].identity),
    "proof freeze drift"
  );
  const startupProofNegatives = [
    (value) => {
      value.runner.pgid = 99;
    },
    (value) => {
      value.children[0].identity.ppid = 99;
    },
    (value) => {
      value.children[1].identity.pgid = 99;
    },
    (value) => {
      value.children[2].identity.startTicks = "0";
    },
    (value) => {
      value.listeners.pop();
    },
    (value) => {
      value.listeners[1].identity = clonePlain(value.children[0].identity);
    },
    (value) => {
      value.children[1].identity = clonePlain(value.children[0].identity);
      value.listeners[1].identity = clonePlain(value.children[0].identity);
    },
    (value) => {
      value.extra = true;
    },
    (value) => {
      value.children[0].extra = true;
    },
  ];
  for (const [index, mutation] of startupProofNegatives.entries()) {
    const candidate = clonePlain(proof);
    mutation(candidate);
    expectFailure(() => freezeStartupProof(candidate), "startup proof negative " + index);
  }

  const inventory = [proof.runner, ...proof.children.map(({ identity }) => identity)];
  const owned = collectOwnedDescendants(
    proof.runner,
    proof.children.map(({ identity }) => identity),
    inventory
  );
  invariant(owned.length === 3, "owned descendant inventory drift");
  const escapedOwned = collectOwnedDescendants(
    proof.runner,
    proof.children.map(({ identity }) => identity),
    [...inventory, { pid: 104, ppid: 101, pgid: 104, startTicks: "127" }]
  );
  invariant(
    escapedOwned.length === 4 && escapedOwned.some(({ pid, pgid }) => pid === 104 && pgid === 104),
    "full descendant tree omitted an escaped child group"
  );
  expectFailure(
    () =>
      collectOwnedDescendants(
        proof.runner,
        proof.children.map(({ identity }) => identity),
        [...inventory, { pid: 104, ppid: 1, pgid: 100, startTicks: "127" }]
      ),
    "foreign group member"
  );
  const reusedInventory = clonePlain(inventory);
  reusedInventory[1].startTicks = "999";
  expectFailure(
    () =>
      collectOwnedDescendants(
        proof.runner,
        proof.children.map(({ identity }) => identity),
        reusedInventory
      ),
    "retained child PID reuse"
  );

  const ready = freezeReadyProjection({
    schemaVersion: 1,
    runnerPid: 100,
    children: [
      { kind: "backend", pid: 101 },
      { kind: "admin", pid: 102 },
      { kind: "site", pid: 103 },
    ],
    ports: [...PORTS],
  });
  invariant(
    Object.isFrozen(ready) && Object.isFrozen(ready.children),
    "ready projection freeze drift"
  );
  const readyNegatives = [
    (value) => {
      value.extra = true;
    },
    (value) => {
      value.children.extra = true;
    },
    (value) => {
      value.children[0].pid = value.runnerPid;
    },
    (value) => {
      value.children[2].pid = value.children[1].pid;
    },
    (value) => {
      value.children[0].extra = true;
    },
  ];
  for (const [index, mutation] of readyNegatives.entries()) {
    const candidate = clonePlain(ready);
    mutation(candidate);
    expectFailure(() => freezeReadyProjection(candidate), "ready projection negative " + index);
  }

  const termOnlyHarness = createStopSelfTestHarness("term-only");
  const concurrentFirst = termOnlyHarness.controller.stop("signal");
  const concurrentSecond = termOnlyHarness.controller.stop("signal");
  invariant(concurrentFirst === concurrentSecond, "concurrent stop did not share one promise");
  const termOnly = await concurrentFirst;
  invariant(
    termOnly.descendantsAbsent &&
      termOnly.term.targets.length === 3 &&
      termOnly.term.survivors.length === 0 &&
      !termOnly.kill.attempted &&
      termOnly.portsAbsent.length === 3 &&
      termOnlyHarness.signals.every(({ signal }) => signal === "SIGTERM"),
    "TERM-only cleanup drift"
  );
  invariant(
    Object.isFrozen(termOnly) && Object.isFrozen(termOnly.term.targets[0]),
    "stop proof freeze drift"
  );

  const termKillHarness = createStopSelfTestHarness("term-kill");
  const termKill = await termKillHarness.controller.stop("child_exit");
  invariant(
    termKill.descendantsAbsent &&
      termKill.term.survivors.length === 3 &&
      termKill.kill.targets.length === 3 &&
      termKill.kill.survivors.length === 0 &&
      termKillHarness.signals.filter(({ signal }) => signal === "SIGKILL").length === 3,
    "TERM-to-KILL cleanup drift"
  );

  const timeoutHarness = createStopSelfTestHarness("timeout");
  const timeout = await timeoutHarness.controller.stop("startup_failure");
  invariant(
    !timeout.descendantsAbsent && timeout.kill.survivors.length === 3,
    "cleanup timeout did not fail closed"
  );
  const persistentPortHarness = createStopSelfTestHarness("persistent-port");
  const persistentPort = await persistentPortHarness.controller.stop("signal");
  invariant(
    persistentPort.descendantsAbsent && persistentPort.portsAbsent.length === 0,
    "persistent port did not fail closed"
  );
  const pidReuseHarness = createStopSelfTestHarness("pid-reuse");
  await expectAsyncFailure(() => pidReuseHarness.controller.stop("signal"), "cleanup PID reuse");
  const stopProofNegatives = [
    {
      base: termOnly,
      mutate(value) {
        value.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets.extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets[0].extra = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets[1] = clonePlain(value.term.targets[0]);
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.term.targets.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors[1] = clonePlain(value.term.survivors[0]);
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors[0].startTicks = "9001";
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.term.survivors.reverse();
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.attempted = false;
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets.pop();
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets[0].startTicks = "9001";
      },
    },
    {
      base: termKill,
      mutate(value) {
        value.kill.targets.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.kill.survivors[0].pid = 999;
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.kill.survivors.reverse();
      },
    },
    {
      base: timeout,
      mutate(value) {
        value.descendantsAbsent = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.descendantsAbsent = false;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.kill.attempted = true;
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.reason = "unknown";
      },
    },
    {
      base: termOnly,
      mutate(value) {
        value.portsAbsent = [3000, 5173];
      },
    },
  ];
  for (const [index, { base, mutate }] of stopProofNegatives.entries()) {
    const candidate = clonePlain(base);
    mutate(candidate);
    expectFailure(() => freezeStopProof(candidate), "stop proof negative " + index);
  }

  const serveHarness = createServeSelfTestHarness(root, environment);
  await serve(root, serveHarness.dependencies);
  invariant(
    serveHarness.spawnCalls.length === 3 &&
      JSON.stringify(serveHarness.spawnCalls.map(({ kind }) => kind)) ===
        JSON.stringify(["backend", "admin", "site"]) &&
      serveHarness.signals.length === 3 &&
      serveHarness.signals.every(({ signal }) => signal === "SIGTERM") &&
      serveHarness.output.length === 1 &&
      serveHarness.preflightCalls() > 0,
    "fully injected serve success path drift"
  );
  const serveReady = JSON.parse(serveHarness.output[0]);
  validateReadyProjection(serveReady);
  const missingPostReadyCache = createServeSelfTestHarness(root, environment, {
    cacheFault: "missing-admin-cache",
  });
  await expectAsyncFailure(
    () => serve(root, missingPostReadyCache.dependencies),
    "fully injected serve missing post-ready cache"
  );
  invariant(
    missingPostReadyCache.spawnCalls.length === 3 &&
      missingPostReadyCache.output.length === 0 &&
      missingPostReadyCache.signals.length === 3,
    "missing post-ready cache did not fail before public readiness"
  );
  const missingPostReadyBase = createServeSelfTestHarness(root, environment, {
    cacheFault: "missing-base",
  });
  await expectAsyncFailure(
    () => serve(root, missingPostReadyBase.dependencies),
    "fully injected serve missing post-ready cache base"
  );
  invariant(
    missingPostReadyBase.spawnCalls.length === 3 &&
      missingPostReadyBase.output.length === 0 &&
      missingPostReadyBase.signals.length === 3,
    "missing post-ready cache base did not fail before public readiness"
  );
  const cachePreflightFaults = [
    "missing-base-with-children",
    "base-symlink",
    "base-noncanonical",
    "base-escape",
    "node-modules-symlink",
    "missing-node-modules",
  ];
  for (const cacheFault of cachePreflightFaults) {
    const harness = createServeSelfTestHarness(root, environment, { cacheFault });
    await expectAsyncFailure(
      () => serve(root, harness.dependencies),
      "fully injected serve cache preflight " + cacheFault
    );
    invariant(
      harness.spawnCalls.length === 0 &&
        harness.output.length === 0 &&
        harness.signals.length === 0,
      cacheFault + " escaped cache preflight before spawn"
    );
  }
  const startupTimeoutHarness = createServeSelfTestHarness(root, environment, {
    startupTimeout: true,
  });
  await expectAsyncFailure(
    () => serve(root, startupTimeoutHarness.dependencies),
    "fully injected serve monotonic startup timeout"
  );
  invariant(
    startupTimeoutHarness.spawnCalls.length === 3 &&
      startupTimeoutHarness.output.length === 0 &&
      startupTimeoutHarness.signals.length === 3 &&
      startupTimeoutHarness.clock.firstCleanupSignalAt() === READY_TIMEOUT_MS &&
      startupTimeoutHarness.clock.delayRequests.every(
        (requestedMs) => requestedMs > 0 && requestedMs <= 200
      ) &&
      !Function.prototype.toString.call(serve).includes("READY_TIMEOUT_MS / 200") &&
      startupTimeoutHarness.clock.firstCleanupSignalAt() < 2 * READY_TIMEOUT_MS,
    "monotonic startup timeout boundary or cleanup drift"
  );
  const twoObservationTimeoutHarness = createServeSelfTestHarness(root, environment, {
    alternatingSecondProofDrift: true,
  });
  await expectAsyncFailure(
    () => serve(root, twoObservationTimeoutHarness.dependencies),
    "fully injected serve second-observation monotonic timeout"
  );
  invariant(
    twoObservationTimeoutHarness.spawnCalls.length === 3 &&
      twoObservationTimeoutHarness.output.length === 0 &&
      twoObservationTimeoutHarness.signals.length === 3 &&
      twoObservationTimeoutHarness.clock.firstCleanupSignalAt() === READY_TIMEOUT_MS &&
      twoObservationTimeoutHarness.proofCycles.successfulFirst > 0 &&
      twoObservationTimeoutHarness.proofCycles.failedSecond > 0 &&
      twoObservationTimeoutHarness.proofCycles.recoveredFirst > 0 &&
      twoObservationTimeoutHarness.proofCycles.successfulFirst ===
        twoObservationTimeoutHarness.proofCycles.failedSecond &&
      twoObservationTimeoutHarness.proofCycles.observationDelays.length ===
        twoObservationTimeoutHarness.proofCycles.failedSecond &&
      twoObservationTimeoutHarness.proofCycles.observationDelays.every(
        (elapsedMs) => elapsedMs === 200
      ) &&
      twoObservationTimeoutHarness.proofCycles.recoveryDelays.length ===
        twoObservationTimeoutHarness.proofCycles.recoveredFirst &&
      twoObservationTimeoutHarness.proofCycles.recoveryDelays.every(
        (elapsedMs) => elapsedMs === 200
      ) &&
      twoObservationTimeoutHarness.signals.every(({ signal }) => signal === "SIGTERM") &&
      twoObservationTimeoutHarness.clock.firstCleanupSignalAt() < 2 * READY_TIMEOUT_MS,
    "second-observation timeout did not cover the prior two-delay regression"
  );
  for (const listenerFault of [
    "missing",
    "duplicate",
    "foreign",
    "extra-port",
    "runner-extra-port",
    "escaped-extra-listener",
    "escaped-member",
  ]) {
    const harness = createServeSelfTestHarness(root, environment, { listenerFault });
    await expectAsyncFailure(
      () => serve(root, harness.dependencies),
      `fully injected serve ${listenerFault} listener`
    );
    invariant(harness.output.length === 0, `${listenerFault} listener emitted readiness`);
    invariant(
      harness.signals.every(({ pid }) => pid !== 104),
      `${listenerFault} cleanup signalled a foreign non-descendant`
    );
    if (["escaped-extra-listener", "escaped-member"].includes(listenerFault)) {
      invariant(
        harness.signals.some(({ pid, signal }) => pid === 105 && signal === "SIGTERM") &&
          harness.signals.every(({ pid }) => [101, 102, 103, 105].includes(pid)),
        `${listenerFault} cleanup did not remain scoped to the complete owned lineage`
      );
    }
  }
  const shutdownDuringSpawn = createServeSelfTestHarness(root, environment, {
    shutdownAfterFirstSpawn: true,
  });
  await expectAsyncFailure(
    () => serve(root, shutdownDuringSpawn.dependencies),
    "shutdown after first child acquisition"
  );
  invariant(
    shutdownDuringSpawn.spawnCalls.length === 1 &&
      shutdownDuringSpawn.spawnCalls[0].kind === "backend" &&
      shutdownDuringSpawn.output.length === 0 &&
      shutdownDuringSpawn.signals.length === 1 &&
      shutdownDuringSpawn.signals[0].pid === 101 &&
      shutdownDuringSpawn.signals[0].signal === "SIGTERM",
    "shutdown boundary acquired a later child or missed partial cleanup"
  );

  return deepFreezeExact({
    pass: true,
    cliForms: 2,
    negativeCliCases: invalidCli.length,
    childDescriptors: descriptors.length,
    ports: PORTS.length,
    environmentKeys: Object.keys(environment).length,
    processProofChildren: proof.children.length,
    environmentNegativeCases: 5 + rawEnvironmentNegatives.length + 2,
    preflightNegativeCases: preflightNegatives.length,
    startupNegativeCases: startupProofNegatives.length + readyNegatives.length + 1,
    shutdownCases: 6,
    stopProofNegativeCases: stopProofNegatives.length,
    descriptorNegativeCases: descriptorNegatives.length,
    viteReadinessPositiveCases: 2,
    viteReadinessNegativeCases: readinessNegatives.length + 1,
    viteWarmRestartPositiveCases: 2,
    viteWarmRestartNegativeCases:
      warmRestartFailureStages.length +
      warmRestartOwnerNegatives.length +
      cloneValidatorNegatives.length +
      1,
    viteCacheAuthorityNegativeCases: cacheAuthorityFaults.length + 3,
    startupDeadlineCases: 2,
    secondObservationCycles: twoObservationTimeoutHarness.proofCycles.failedSecond,
    injectedServeCases: 19,
    runtimeTrapCalls,
    directEntryCases: 4,
    serveRuntimeFactoryCalls,
  });
}

if (isDirectModuleExecution(import.meta.url, process.argv[1], process.cwd())) {
  await runHostCli(process.argv.slice(2), {
    async runSelfTest() {
      process.stdout.write(JSON.stringify(await runTask540SmokeHostSelfTest()));
    },
    createRuntimeDependencies,
  });
}
