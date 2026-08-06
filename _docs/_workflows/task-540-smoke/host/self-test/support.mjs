import path from "node:path";

import { FIXED_ENV, REQUIRED_REPO_ENV } from "../environment.mjs";
import { viteCacheAuthorityTargets } from "../preflight.mjs";
import { exactOrderedDataObject, invariant } from "../validation.mjs";

export function createSelfTestSupport(configuration) {
  exactOrderedDataObject(
    configuration,
    ["CHILD_READY_MARKERS", "READY_TIMEOUT_MS", "createDescendantStopController"],
    "self-test support configuration"
  );
  const { CHILD_READY_MARKERS, READY_TIMEOUT_MS, createDescendantStopController } = configuration;
  invariant(
    Number.isSafeInteger(READY_TIMEOUT_MS) &&
      READY_TIMEOUT_MS > 0 &&
      typeof createDescendantStopController === "function",
    "self-test support dependency drift"
  );

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

  return Object.freeze({
    buildSelfTestEnvironment,
    clonePlain,
    createPreflightFake,
    createServeSelfTestHarness,
    createStopSelfTestHarness,
    expectAsyncFailure,
    expectFailure,
  });
}
