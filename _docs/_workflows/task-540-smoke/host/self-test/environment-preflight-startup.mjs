import path from "node:path";

import {
  crossCheckRawEnvironment,
  parseNulEnvironment,
  validateEnvironmentProjection,
} from "../environment-preflight.mjs";
import {
  collectOwnedDescendants,
  freezeReadyProjection,
  freezeStartupProof,
  parseProcStat,
  PORTS,
} from "../process-identity.mjs";
import {
  validateCanonicalRootAndToolchain,
  validateViteCacheAuthorities,
} from "../preflight.mjs";
import { exactOrderedDataObject, invariant } from "../validation.mjs";

export async function runEnvironmentPreflightStartupSelfTest(configuration, support) {
  exactOrderedDataObject(
    configuration,
    ["root"],
    "environment/preflight/startup self-test configuration"
  );
  const { root } = configuration;
  const {
    buildSelfTestEnvironment,
    clonePlain,
    createPreflightFake,
    expectAsyncFailure,
    expectFailure,
  } = support;

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

  return Object.freeze({
    environment,
    ports: PORTS.length,
    environmentKeys: Object.keys(environment).length,
    processProofChildren: proof.children.length,
    environmentNegativeCases: 5 + rawEnvironmentNegatives.length + 2,
    preflightNegativeCases: preflightNegatives.length,
    startupNegativeCases: startupProofNegatives.length + readyNegatives.length + 1,
    viteCacheAuthorityNegativeCases: cacheAuthorityFaults.length + 3,
  });
}
