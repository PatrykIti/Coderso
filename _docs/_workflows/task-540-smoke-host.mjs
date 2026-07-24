import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const PORTS = Object.freeze([3000, 5173, 5174]);
const READY_TIMEOUT_MS = 360_000;
const STOP_TIMEOUT_MS = 15_000;
const MAX_CHILD_STREAM_BYTES = 4 * 1024 * 1024;
const CHILD_READY_MARKERS = Object.freeze({
  backend: "WF540_BACKEND_READY_V1\n",
  admin: "WF540_ADMIN_READY_V1\n",
  site: "WF540_SITE_READY_V1\n",
});

const REQUIRED_INHERITED_ENV = Object.freeze(["PATH"]);
const OPTIONAL_INHERITED_ENV = Object.freeze([
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
]);
const REQUIRED_REPO_ENV = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
]);
const OPTIONAL_REPO_ENV = Object.freeze([
  "CORE_VERSION",
  "DB_POOL_MAX",
  "AUTH_PASSWORD_PEPPER",
  "ANALYTICS_IP_HASH_SECRET",
  "FORM_SUBMIT_NONCE_SECRET",
  "FORM_SUBMIT_NONCE_TTL_MINUTES",
  "ANALYTICS_BEACON_NONCE_SECRET",
  "ANALYTICS_BEACON_NONCE_TTL_MINUTES",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "EMAIL_TRANSPORT",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
  "PLUGINS_SAFE_MODE",
  "PLUGIN_UPDATE_MODE",
  "PLUGIN_ERROR_THRESHOLD",
  "PLUGIN_TIMEOUT_MS",
  "PLUGIN_DOWNLOAD_TIMEOUT_MS",
  "PLUGIN_MAX_SIZE_MB",
  "STORE_BASE_URL",
  "STORE_PUBLIC_KEY",
]);
const FIXED_ENV = Object.freeze({
  PORT: "3000",
  PUBLIC_BASE_URL: "http://coderso-a.localhost:3000",
  NODE_ENV: "development",
  COOKIE_SECURE: "false",
  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  VITE_SITE_DEV_SERVER_URL: "http://127.0.0.1:5174",
  VITE_API_ORIGIN: "http://127.0.0.1:3000",
  VITE_ADMIN_STRICT_MODE: "false",
  CODERSO_PUBLIC_VITE_DEV_URL: "http://coderso-a.localhost:5173",
  CI: "true",
});
const ALLOWED_ENV_KEYS = Object.freeze([
  ...REQUIRED_INHERITED_ENV,
  ...OPTIONAL_INHERITED_ENV,
  ...REQUIRED_REPO_ENV,
  ...OPTIONAL_REPO_ENV,
  ...Object.keys(FIXED_ENV),
]);

async function settleViteReadiness(server, readinessUrls, failureCode) {
  const fail = () => {
    throw new Error(failureCode);
  };
  try {
    if (
      (typeof server !== "object" && typeof server !== "function") ||
      server === null ||
      typeof server.transformRequest !== "function" ||
      typeof server.waitForRequestsIdle !== "function" ||
      !Array.isArray(readinessUrls) ||
      Object.getPrototypeOf(readinessUrls) !== Array.prototype ||
      readinessUrls.length === 0 ||
      new Set(readinessUrls).size !== readinessUrls.length ||
      readinessUrls.some(
        (url) => typeof url !== "string" || url.length < 2 || !url.startsWith("/")
      ) ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }

    const optimizer = server.environments?.client?.depsOptimizer;
    if (!optimizer || typeof optimizer !== "object") fail();

    const inspectMetadata = () => {
      const metadata = optimizer.metadata;
      if (
        !metadata ||
        typeof metadata !== "object" ||
        typeof metadata.browserHash !== "string" ||
        metadata.browserHash.length === 0 ||
        !Array.isArray(metadata.depInfoList) ||
        Object.getPrototypeOf(metadata.depInfoList) !== Array.prototype
      ) {
        fail();
      }
      const ids = new Set();
      const processing = new Set();
      const depIdentity = [];
      for (const dep of metadata.depInfoList) {
        if (
          !dep ||
          typeof dep !== "object" ||
          typeof dep.id !== "string" ||
          dep.id.length === 0 ||
          typeof dep.file !== "string" ||
          dep.file.length === 0 ||
          ids.has(dep.id) ||
          (dep.browserHash !== undefined &&
            (typeof dep.browserHash !== "string" || dep.browserHash.length === 0)) ||
          (dep.fileHash !== undefined &&
            (typeof dep.fileHash !== "string" || dep.fileHash.length === 0))
        ) {
          fail();
        }
        ids.add(dep.id);
        if (dep.processing !== undefined) {
          if (!(dep.processing instanceof Promise)) fail();
          processing.add(dep.processing);
        }
        depIdentity.push([dep.id, dep.file, dep.browserHash ?? null, dep.fileHash ?? null]);
      }
      depIdentity.sort((left, right) => {
        const leftKey = JSON.stringify(left);
        const rightKey = JSON.stringify(right);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      return {
        identity: metadata,
        browserHash: metadata.browserHash,
        depIdentity: JSON.stringify(depIdentity),
        processing: [...processing],
      };
    };

    let previousStableMetadata = null;
    for (let round = 0; round < 8; round += 1) {
      for (const url of readinessUrls) {
        const transformed = await server.transformRequest(url);
        if (!transformed || typeof transformed.code !== "string" || transformed.code.length === 0) {
          fail();
        }
      }
      await server.waitForRequestsIdle();
      const scanProcessing = optimizer.scanProcessing;
      if (scanProcessing !== undefined) {
        if (!(scanProcessing instanceof Promise)) fail();
        await scanProcessing;
      }

      let current = inspectMetadata();
      await Promise.all(current.processing);
      await new Promise((resolve) => setImmediate(resolve));
      current = inspectMetadata();
      if (optimizer.scanProcessing !== undefined || current.processing.length !== 0) continue;
      if (
        previousStableMetadata !== null &&
        previousStableMetadata.identity === current.identity &&
        previousStableMetadata.browserHash === current.browserHash &&
        previousStableMetadata.depIdentity === current.depIdentity
      ) {
        return;
      }
      previousStableMetadata = current;
    }
    fail();
  } catch {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_readiness_failed"
    );
  }
}

const VITE_READINESS_SOURCE = Function.prototype.toString.call(settleViteReadiness);

function requireExactViteOptionsClone(owner, candidate, failureCode) {
  const fail = () => {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_options_clone_invalid"
    );
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const rootKeys = [
    "configFile",
    "configLoader",
    "cacheDir",
    "envDir",
    "clearScreen",
    "logLevel",
    "server",
  ];
  const serverKeys = ["host", "port", "strictPort", "open"];
  requireExactDataObject(owner, rootKeys);
  requireExactDataObject(owner.server, serverKeys);
  requireExactDataObject(candidate, rootKeys);
  requireExactDataObject(candidate.server, serverKeys);
  if (
    !Object.isFrozen(owner) ||
    !Object.isFrozen(owner.server) ||
    Object.isFrozen(candidate) ||
    Object.isFrozen(candidate.server) ||
    candidate === owner ||
    candidate.server === owner.server ||
    rootKeys.some((key) => key !== "server" && !Object.is(candidate[key], owner[key])) ||
    serverKeys.some((key) => !Object.is(candidate.server[key], owner.server[key]))
  ) {
    fail();
  }
  return candidate;
}

const VITE_OPTIONS_CLONE_VALIDATOR_SOURCE = Function.prototype.toString.call(
  requireExactViteOptionsClone
);

async function startViteWithWarmRestart(
  createServer,
  options,
  readinessUrls,
  expectedCacheDir,
  failureCode
) {
  const fail = () => {
    throw new Error(failureCode);
  };
  let currentServer = null;
  let currentCloseAttempted = false;
  const closeCurrentOnce = async () => {
    if (currentServer === null || currentCloseAttempted) return;
    currentCloseAttempted = true;
    if (typeof currentServer.close !== "function") fail();
    await currentServer.close();
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const validateOwner = () => {
    requireExactDataObject(options, [
      "configFile",
      "configLoader",
      "cacheDir",
      "envDir",
      "clearScreen",
      "logLevel",
      "server",
    ]);
    requireExactDataObject(options.server, ["host", "port", "strictPort", "open"]);
    if (!Object.isFrozen(options) || !Object.isFrozen(options.server)) fail();
    const commonValid =
      options.configLoader === "native" &&
      options.envDir === false &&
      options.clearScreen === false &&
      options.logLevel === "silent" &&
      options.server.host === "127.0.0.1" &&
      options.server.strictPort === true &&
      options.server.open === false;
    const adminValid =
      options.configFile === "./vite.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-admin" &&
      options.server.port === 5173 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-admin";
    const siteValid =
      options.configFile === "./vite.site.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-site" &&
      options.server.port === 5174 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-site";
    if (!commonValid || (!adminValid && !siteValid)) fail();
  };
  const cloneOptions = () => ({
    configFile: options.configFile,
    configLoader: options.configLoader,
    cacheDir: options.cacheDir,
    envDir: options.envDir,
    clearScreen: options.clearScreen,
    logLevel: options.logLevel,
    server: {
      host: options.server.host,
      port: options.server.port,
      strictPort: options.server.strictPort,
      open: options.server.open,
    },
  });

  try {
    if (
      typeof createServer !== "function" ||
      typeof expectedCacheDir !== "string" ||
      expectedCacheDir.length === 0 ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }
    validateOwner();
    let previousClone = null;
    let previousServer = null;
    for (let start = 0; start < 2; start += 1) {
      validateOwner();
      const inlineConfig = cloneOptions();
      requireExactDataObject(inlineConfig, [
        "configFile",
        "configLoader",
        "cacheDir",
        "envDir",
        "clearScreen",
        "logLevel",
        "server",
      ]);
      requireExactDataObject(inlineConfig.server, ["host", "port", "strictPort", "open"]);
      if (
        Object.isFrozen(inlineConfig) ||
        Object.isFrozen(inlineConfig.server) ||
        inlineConfig === options ||
        inlineConfig.server === options.server ||
        (previousClone !== null &&
          (inlineConfig === previousClone || inlineConfig.server === previousClone.server))
      ) {
        fail();
      }
      requireExactViteOptionsClone(options, inlineConfig, failureCode);
      previousClone = inlineConfig;
      const createdServer = await createServer(inlineConfig);
      if (previousServer !== null && createdServer === previousServer) fail();
      currentServer = createdServer;
      currentCloseAttempted = false;
      if (
        !currentServer ||
        (typeof currentServer !== "object" && typeof currentServer !== "function") ||
        typeof currentServer.listen !== "function" ||
        typeof currentServer.close !== "function" ||
        !currentServer.config ||
        typeof currentServer.config !== "object"
      ) {
        fail();
      }
      const cacheDescriptor = Object.getOwnPropertyDescriptor(currentServer.config, "cacheDir");
      if (
        !cacheDescriptor ||
        !Object.hasOwn(cacheDescriptor, "value") ||
        Object.hasOwn(cacheDescriptor, "get") ||
        Object.hasOwn(cacheDescriptor, "set") ||
        cacheDescriptor.value !== expectedCacheDir
      ) {
        fail();
      }
      await currentServer.listen();
      await settleViteReadiness(currentServer, readinessUrls, failureCode);
      if (start === 0) {
        previousServer = currentServer;
        await closeCurrentOnce();
        currentServer = null;
      }
    }
    return currentServer;
  } catch {
    try {
      await closeCurrentOnce();
    } catch {
      // A failed close remains a single bounded cleanup attempt.
    }
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_warm_restart_failed"
    );
  }
}

const VITE_WARM_RESTART_SOURCE = Function.prototype.toString.call(startViteWithWarmRestart);

const BACKEND_SOURCE = String.raw`import { startHttpServer } from "./server/httpServer";
const server = startHttpServer({ port: 3000, adminDevUrl: process.env.VITE_DEV_SERVER_URL });
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  try { server.stop(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_BACKEND_READY_V1\n");
await new Promise(() => {});`;

const ADMIN_VITE_SOURCE = String.raw`import { createServer } from "vite";
${VITE_READINESS_SOURCE}
${VITE_OPTIONS_CLONE_VALIDATOR_SOURCE}
${VITE_WARM_RESTART_SOURCE}
const options = Object.freeze({
  configFile: "./vite.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-admin",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: Object.freeze({ host: "127.0.0.1", port: 5173, strictPort: true, open: false }),
});
const server = await startViteWithWarmRestart(createServer, options, [
  "/main.tsx",
  "/app/AdminApp.tsx",
  "/app/adminRouteComponents.tsx",
  "/ui/dashboard/DashboardPage.tsx",
  "/ui/dashboard/DashboardBuilder.tsx",
  "/ui/custom-screens/CustomScreenListPage.tsx",
], process.cwd() + "/node_modules/.vite/wf540-admin", "admin_vite_readiness_failed");
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try { await server.close(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_ADMIN_READY_V1\n");
await new Promise(() => {});`;

const SITE_VITE_SOURCE = String.raw`import { createServer } from "vite";
${VITE_READINESS_SOURCE}
${VITE_OPTIONS_CLONE_VALIDATOR_SOURCE}
${VITE_WARM_RESTART_SOURCE}
const options = Object.freeze({
  configFile: "./vite.site.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-site",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: Object.freeze({ host: "127.0.0.1", port: 5174, strictPort: true, open: false }),
});
const server = await startViteWithWarmRestart(createServer, options, ["/main.ts"], process.cwd() + "/node_modules/.vite/wf540-site", "site_vite_readiness_failed");
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try { await server.close(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_SITE_READY_V1\n");
await new Promise(() => {});`;

// These independent byte pins make source drift observable even when the descriptor
// constants and their consumers are edited together.
const CHILD_SOURCE_BYTE_PINS = Object.freeze({
  backend: String.raw`import { startHttpServer } from "./server/httpServer";
const server = startHttpServer({ port: 3000, adminDevUrl: process.env.VITE_DEV_SERVER_URL });
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  try { server.stop(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_BACKEND_READY_V1\n");
await new Promise(() => {});`,
  admin: String.raw`import { createServer } from "vite";
async function settleViteReadiness(server, readinessUrls, failureCode) {
  const fail = () => {
    throw new Error(failureCode);
  };
  try {
    if (
      (typeof server !== "object" && typeof server !== "function") ||
      server === null ||
      typeof server.transformRequest !== "function" ||
      typeof server.waitForRequestsIdle !== "function" ||
      !Array.isArray(readinessUrls) ||
      Object.getPrototypeOf(readinessUrls) !== Array.prototype ||
      readinessUrls.length === 0 ||
      new Set(readinessUrls).size !== readinessUrls.length ||
      readinessUrls.some(
        (url) => typeof url !== "string" || url.length < 2 || !url.startsWith("/")
      ) ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }

    const optimizer = server.environments?.client?.depsOptimizer;
    if (!optimizer || typeof optimizer !== "object") fail();

    const inspectMetadata = () => {
      const metadata = optimizer.metadata;
      if (
        !metadata ||
        typeof metadata !== "object" ||
        typeof metadata.browserHash !== "string" ||
        metadata.browserHash.length === 0 ||
        !Array.isArray(metadata.depInfoList) ||
        Object.getPrototypeOf(metadata.depInfoList) !== Array.prototype
      ) {
        fail();
      }
      const ids = new Set();
      const processing = new Set();
      const depIdentity = [];
      for (const dep of metadata.depInfoList) {
        if (
          !dep ||
          typeof dep !== "object" ||
          typeof dep.id !== "string" ||
          dep.id.length === 0 ||
          typeof dep.file !== "string" ||
          dep.file.length === 0 ||
          ids.has(dep.id) ||
          (dep.browserHash !== undefined &&
            (typeof dep.browserHash !== "string" || dep.browserHash.length === 0)) ||
          (dep.fileHash !== undefined &&
            (typeof dep.fileHash !== "string" || dep.fileHash.length === 0))
        ) {
          fail();
        }
        ids.add(dep.id);
        if (dep.processing !== undefined) {
          if (!(dep.processing instanceof Promise)) fail();
          processing.add(dep.processing);
        }
        depIdentity.push([dep.id, dep.file, dep.browserHash ?? null, dep.fileHash ?? null]);
      }
      depIdentity.sort((left, right) => {
        const leftKey = JSON.stringify(left);
        const rightKey = JSON.stringify(right);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      return {
        identity: metadata,
        browserHash: metadata.browserHash,
        depIdentity: JSON.stringify(depIdentity),
        processing: [...processing],
      };
    };

    let previousStableMetadata = null;
    for (let round = 0; round < 8; round += 1) {
      for (const url of readinessUrls) {
        const transformed = await server.transformRequest(url);
        if (!transformed || typeof transformed.code !== "string" || transformed.code.length === 0) {
          fail();
        }
      }
      await server.waitForRequestsIdle();
      const scanProcessing = optimizer.scanProcessing;
      if (scanProcessing !== undefined) {
        if (!(scanProcessing instanceof Promise)) fail();
        await scanProcessing;
      }

      let current = inspectMetadata();
      await Promise.all(current.processing);
      await new Promise((resolve) => setImmediate(resolve));
      current = inspectMetadata();
      if (optimizer.scanProcessing !== undefined || current.processing.length !== 0) continue;
      if (
        previousStableMetadata !== null &&
        previousStableMetadata.identity === current.identity &&
        previousStableMetadata.browserHash === current.browserHash &&
        previousStableMetadata.depIdentity === current.depIdentity
      ) {
        return;
      }
      previousStableMetadata = current;
    }
    fail();
  } catch {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_readiness_failed"
    );
  }
}
function requireExactViteOptionsClone(owner, candidate, failureCode) {
  const fail = () => {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_options_clone_invalid"
    );
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const rootKeys = [
    "configFile",
    "configLoader",
    "cacheDir",
    "envDir",
    "clearScreen",
    "logLevel",
    "server",
  ];
  const serverKeys = ["host", "port", "strictPort", "open"];
  requireExactDataObject(owner, rootKeys);
  requireExactDataObject(owner.server, serverKeys);
  requireExactDataObject(candidate, rootKeys);
  requireExactDataObject(candidate.server, serverKeys);
  if (
    !Object.isFrozen(owner) ||
    !Object.isFrozen(owner.server) ||
    Object.isFrozen(candidate) ||
    Object.isFrozen(candidate.server) ||
    candidate === owner ||
    candidate.server === owner.server ||
    rootKeys.some((key) => key !== "server" && !Object.is(candidate[key], owner[key])) ||
    serverKeys.some((key) => !Object.is(candidate.server[key], owner.server[key]))
  ) {
    fail();
  }
  return candidate;
}
async function startViteWithWarmRestart(
  createServer,
  options,
  readinessUrls,
  expectedCacheDir,
  failureCode
) {
  const fail = () => {
    throw new Error(failureCode);
  };
  let currentServer = null;
  let currentCloseAttempted = false;
  const closeCurrentOnce = async () => {
    if (currentServer === null || currentCloseAttempted) return;
    currentCloseAttempted = true;
    if (typeof currentServer.close !== "function") fail();
    await currentServer.close();
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const validateOwner = () => {
    requireExactDataObject(options, [
      "configFile",
      "configLoader",
      "cacheDir",
      "envDir",
      "clearScreen",
      "logLevel",
      "server",
    ]);
    requireExactDataObject(options.server, ["host", "port", "strictPort", "open"]);
    if (!Object.isFrozen(options) || !Object.isFrozen(options.server)) fail();
    const commonValid =
      options.configLoader === "native" &&
      options.envDir === false &&
      options.clearScreen === false &&
      options.logLevel === "silent" &&
      options.server.host === "127.0.0.1" &&
      options.server.strictPort === true &&
      options.server.open === false;
    const adminValid =
      options.configFile === "./vite.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-admin" &&
      options.server.port === 5173 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-admin";
    const siteValid =
      options.configFile === "./vite.site.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-site" &&
      options.server.port === 5174 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-site";
    if (!commonValid || (!adminValid && !siteValid)) fail();
  };
  const cloneOptions = () => ({
    configFile: options.configFile,
    configLoader: options.configLoader,
    cacheDir: options.cacheDir,
    envDir: options.envDir,
    clearScreen: options.clearScreen,
    logLevel: options.logLevel,
    server: {
      host: options.server.host,
      port: options.server.port,
      strictPort: options.server.strictPort,
      open: options.server.open,
    },
  });

  try {
    if (
      typeof createServer !== "function" ||
      typeof expectedCacheDir !== "string" ||
      expectedCacheDir.length === 0 ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }
    validateOwner();
    let previousClone = null;
    let previousServer = null;
    for (let start = 0; start < 2; start += 1) {
      validateOwner();
      const inlineConfig = cloneOptions();
      requireExactDataObject(inlineConfig, [
        "configFile",
        "configLoader",
        "cacheDir",
        "envDir",
        "clearScreen",
        "logLevel",
        "server",
      ]);
      requireExactDataObject(inlineConfig.server, ["host", "port", "strictPort", "open"]);
      if (
        Object.isFrozen(inlineConfig) ||
        Object.isFrozen(inlineConfig.server) ||
        inlineConfig === options ||
        inlineConfig.server === options.server ||
        (previousClone !== null &&
          (inlineConfig === previousClone || inlineConfig.server === previousClone.server))
      ) {
        fail();
      }
      requireExactViteOptionsClone(options, inlineConfig, failureCode);
      previousClone = inlineConfig;
      const createdServer = await createServer(inlineConfig);
      if (previousServer !== null && createdServer === previousServer) fail();
      currentServer = createdServer;
      currentCloseAttempted = false;
      if (
        !currentServer ||
        (typeof currentServer !== "object" && typeof currentServer !== "function") ||
        typeof currentServer.listen !== "function" ||
        typeof currentServer.close !== "function" ||
        !currentServer.config ||
        typeof currentServer.config !== "object"
      ) {
        fail();
      }
      const cacheDescriptor = Object.getOwnPropertyDescriptor(currentServer.config, "cacheDir");
      if (
        !cacheDescriptor ||
        !Object.hasOwn(cacheDescriptor, "value") ||
        Object.hasOwn(cacheDescriptor, "get") ||
        Object.hasOwn(cacheDescriptor, "set") ||
        cacheDescriptor.value !== expectedCacheDir
      ) {
        fail();
      }
      await currentServer.listen();
      await settleViteReadiness(currentServer, readinessUrls, failureCode);
      if (start === 0) {
        previousServer = currentServer;
        await closeCurrentOnce();
        currentServer = null;
      }
    }
    return currentServer;
  } catch {
    try {
      await closeCurrentOnce();
    } catch {
      // A failed close remains a single bounded cleanup attempt.
    }
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_warm_restart_failed"
    );
  }
}
const options = Object.freeze({
  configFile: "./vite.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-admin",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: Object.freeze({ host: "127.0.0.1", port: 5173, strictPort: true, open: false }),
});
const server = await startViteWithWarmRestart(createServer, options, [
  "/main.tsx",
  "/app/AdminApp.tsx",
  "/app/adminRouteComponents.tsx",
  "/ui/dashboard/DashboardPage.tsx",
  "/ui/dashboard/DashboardBuilder.tsx",
  "/ui/custom-screens/CustomScreenListPage.tsx",
], process.cwd() + "/node_modules/.vite/wf540-admin", "admin_vite_readiness_failed");
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try { await server.close(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_ADMIN_READY_V1\n");
await new Promise(() => {});`,
  site: String.raw`import { createServer } from "vite";
async function settleViteReadiness(server, readinessUrls, failureCode) {
  const fail = () => {
    throw new Error(failureCode);
  };
  try {
    if (
      (typeof server !== "object" && typeof server !== "function") ||
      server === null ||
      typeof server.transformRequest !== "function" ||
      typeof server.waitForRequestsIdle !== "function" ||
      !Array.isArray(readinessUrls) ||
      Object.getPrototypeOf(readinessUrls) !== Array.prototype ||
      readinessUrls.length === 0 ||
      new Set(readinessUrls).size !== readinessUrls.length ||
      readinessUrls.some(
        (url) => typeof url !== "string" || url.length < 2 || !url.startsWith("/")
      ) ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }

    const optimizer = server.environments?.client?.depsOptimizer;
    if (!optimizer || typeof optimizer !== "object") fail();

    const inspectMetadata = () => {
      const metadata = optimizer.metadata;
      if (
        !metadata ||
        typeof metadata !== "object" ||
        typeof metadata.browserHash !== "string" ||
        metadata.browserHash.length === 0 ||
        !Array.isArray(metadata.depInfoList) ||
        Object.getPrototypeOf(metadata.depInfoList) !== Array.prototype
      ) {
        fail();
      }
      const ids = new Set();
      const processing = new Set();
      const depIdentity = [];
      for (const dep of metadata.depInfoList) {
        if (
          !dep ||
          typeof dep !== "object" ||
          typeof dep.id !== "string" ||
          dep.id.length === 0 ||
          typeof dep.file !== "string" ||
          dep.file.length === 0 ||
          ids.has(dep.id) ||
          (dep.browserHash !== undefined &&
            (typeof dep.browserHash !== "string" || dep.browserHash.length === 0)) ||
          (dep.fileHash !== undefined &&
            (typeof dep.fileHash !== "string" || dep.fileHash.length === 0))
        ) {
          fail();
        }
        ids.add(dep.id);
        if (dep.processing !== undefined) {
          if (!(dep.processing instanceof Promise)) fail();
          processing.add(dep.processing);
        }
        depIdentity.push([dep.id, dep.file, dep.browserHash ?? null, dep.fileHash ?? null]);
      }
      depIdentity.sort((left, right) => {
        const leftKey = JSON.stringify(left);
        const rightKey = JSON.stringify(right);
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      return {
        identity: metadata,
        browserHash: metadata.browserHash,
        depIdentity: JSON.stringify(depIdentity),
        processing: [...processing],
      };
    };

    let previousStableMetadata = null;
    for (let round = 0; round < 8; round += 1) {
      for (const url of readinessUrls) {
        const transformed = await server.transformRequest(url);
        if (!transformed || typeof transformed.code !== "string" || transformed.code.length === 0) {
          fail();
        }
      }
      await server.waitForRequestsIdle();
      const scanProcessing = optimizer.scanProcessing;
      if (scanProcessing !== undefined) {
        if (!(scanProcessing instanceof Promise)) fail();
        await scanProcessing;
      }

      let current = inspectMetadata();
      await Promise.all(current.processing);
      await new Promise((resolve) => setImmediate(resolve));
      current = inspectMetadata();
      if (optimizer.scanProcessing !== undefined || current.processing.length !== 0) continue;
      if (
        previousStableMetadata !== null &&
        previousStableMetadata.identity === current.identity &&
        previousStableMetadata.browserHash === current.browserHash &&
        previousStableMetadata.depIdentity === current.depIdentity
      ) {
        return;
      }
      previousStableMetadata = current;
    }
    fail();
  } catch {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_readiness_failed"
    );
  }
}
function requireExactViteOptionsClone(owner, candidate, failureCode) {
  const fail = () => {
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_options_clone_invalid"
    );
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const rootKeys = [
    "configFile",
    "configLoader",
    "cacheDir",
    "envDir",
    "clearScreen",
    "logLevel",
    "server",
  ];
  const serverKeys = ["host", "port", "strictPort", "open"];
  requireExactDataObject(owner, rootKeys);
  requireExactDataObject(owner.server, serverKeys);
  requireExactDataObject(candidate, rootKeys);
  requireExactDataObject(candidate.server, serverKeys);
  if (
    !Object.isFrozen(owner) ||
    !Object.isFrozen(owner.server) ||
    Object.isFrozen(candidate) ||
    Object.isFrozen(candidate.server) ||
    candidate === owner ||
    candidate.server === owner.server ||
    rootKeys.some((key) => key !== "server" && !Object.is(candidate[key], owner[key])) ||
    serverKeys.some((key) => !Object.is(candidate.server[key], owner.server[key]))
  ) {
    fail();
  }
  return candidate;
}
async function startViteWithWarmRestart(
  createServer,
  options,
  readinessUrls,
  expectedCacheDir,
  failureCode
) {
  const fail = () => {
    throw new Error(failureCode);
  };
  let currentServer = null;
  let currentCloseAttempted = false;
  const closeCurrentOnce = async () => {
    if (currentServer === null || currentCloseAttempted) return;
    currentCloseAttempted = true;
    if (typeof currentServer.close !== "function") fail();
    await currentServer.close();
  };
  const requireExactDataObject = (value, expectedKeys) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      !expectedKeys.every((key, index) => Reflect.ownKeys(value)[index] === key)
    ) {
      fail();
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, "value") ||
        Object.hasOwn(descriptor, "get") ||
        Object.hasOwn(descriptor, "set") ||
        descriptor.enumerable !== true
      ) {
        fail();
      }
    }
  };
  const validateOwner = () => {
    requireExactDataObject(options, [
      "configFile",
      "configLoader",
      "cacheDir",
      "envDir",
      "clearScreen",
      "logLevel",
      "server",
    ]);
    requireExactDataObject(options.server, ["host", "port", "strictPort", "open"]);
    if (!Object.isFrozen(options) || !Object.isFrozen(options.server)) fail();
    const commonValid =
      options.configLoader === "native" &&
      options.envDir === false &&
      options.clearScreen === false &&
      options.logLevel === "silent" &&
      options.server.host === "127.0.0.1" &&
      options.server.strictPort === true &&
      options.server.open === false;
    const adminValid =
      options.configFile === "./vite.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-admin" &&
      options.server.port === 5173 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-admin";
    const siteValid =
      options.configFile === "./vite.site.config.ts" &&
      options.cacheDir === "../node_modules/.vite/wf540-site" &&
      options.server.port === 5174 &&
      expectedCacheDir === process.cwd() + "/node_modules/.vite/wf540-site";
    if (!commonValid || (!adminValid && !siteValid)) fail();
  };
  const cloneOptions = () => ({
    configFile: options.configFile,
    configLoader: options.configLoader,
    cacheDir: options.cacheDir,
    envDir: options.envDir,
    clearScreen: options.clearScreen,
    logLevel: options.logLevel,
    server: {
      host: options.server.host,
      port: options.server.port,
      strictPort: options.server.strictPort,
      open: options.server.open,
    },
  });

  try {
    if (
      typeof createServer !== "function" ||
      typeof expectedCacheDir !== "string" ||
      expectedCacheDir.length === 0 ||
      typeof failureCode !== "string" ||
      failureCode.length === 0
    ) {
      fail();
    }
    validateOwner();
    let previousClone = null;
    let previousServer = null;
    for (let start = 0; start < 2; start += 1) {
      validateOwner();
      const inlineConfig = cloneOptions();
      requireExactDataObject(inlineConfig, [
        "configFile",
        "configLoader",
        "cacheDir",
        "envDir",
        "clearScreen",
        "logLevel",
        "server",
      ]);
      requireExactDataObject(inlineConfig.server, ["host", "port", "strictPort", "open"]);
      if (
        Object.isFrozen(inlineConfig) ||
        Object.isFrozen(inlineConfig.server) ||
        inlineConfig === options ||
        inlineConfig.server === options.server ||
        (previousClone !== null &&
          (inlineConfig === previousClone || inlineConfig.server === previousClone.server))
      ) {
        fail();
      }
      requireExactViteOptionsClone(options, inlineConfig, failureCode);
      previousClone = inlineConfig;
      const createdServer = await createServer(inlineConfig);
      if (previousServer !== null && createdServer === previousServer) fail();
      currentServer = createdServer;
      currentCloseAttempted = false;
      if (
        !currentServer ||
        (typeof currentServer !== "object" && typeof currentServer !== "function") ||
        typeof currentServer.listen !== "function" ||
        typeof currentServer.close !== "function" ||
        !currentServer.config ||
        typeof currentServer.config !== "object"
      ) {
        fail();
      }
      const cacheDescriptor = Object.getOwnPropertyDescriptor(currentServer.config, "cacheDir");
      if (
        !cacheDescriptor ||
        !Object.hasOwn(cacheDescriptor, "value") ||
        Object.hasOwn(cacheDescriptor, "get") ||
        Object.hasOwn(cacheDescriptor, "set") ||
        cacheDescriptor.value !== expectedCacheDir
      ) {
        fail();
      }
      await currentServer.listen();
      await settleViteReadiness(currentServer, readinessUrls, failureCode);
      if (start === 0) {
        previousServer = currentServer;
        await closeCurrentOnce();
        currentServer = null;
      }
    }
    return currentServer;
  } catch {
    try {
      await closeCurrentOnce();
    } catch {
      // A failed close remains a single bounded cleanup attempt.
    }
    throw new Error(
      typeof failureCode === "string" && failureCode.length > 0
        ? failureCode
        : "vite_warm_restart_failed"
    );
  }
}
const options = Object.freeze({
  configFile: "./vite.site.config.ts",
  configLoader: "native",
  cacheDir: "../node_modules/.vite/wf540-site",
  envDir: false,
  clearScreen: false,
  logLevel: "silent",
  server: Object.freeze({ host: "127.0.0.1", port: 5174, strictPort: true, open: false }),
});
const server = await startViteWithWarmRestart(createServer, options, ["/main.ts"], process.cwd() + "/node_modules/.vite/wf540-site", "site_vite_readiness_failed");
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  try { await server.close(); } finally { process.exit(0); }
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
process.stdout.write("WF540_SITE_READY_V1\n");
await new Promise(() => {});`,
});

function invariant(condition, message) {
  if (!condition) throw new Error("TASK-540 smoke host: " + message);
}

function deepFreezeExact(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreezeExact(value[key], seen);
  return Object.freeze(value);
}

function exactDataObject(value, expectedKeys, label, { nullPrototype = false } = {}) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  invariant(
    nullPrototype
      ? Object.getPrototypeOf(value) === null
      : Object.getPrototypeOf(value) === Object.prototype,
    label + " prototype drift"
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(value);
  invariant(
    keys.length === expectedKeys.length && expectedKeys.every((key) => keys.includes(key)),
    label + " key drift"
  );
  for (const key of keys) {
    const descriptor = descriptors[key];
    invariant(
      typeof key === "string" &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable,
      label + " must contain enumerable data properties only"
    );
  }
}

function exactOrderedDataObject(value, expectedKeys, label) {
  exactDataObject(value, expectedKeys, label);
  invariant(
    Reflect.ownKeys(value).every((key, index) => key === expectedKeys[index]),
    label + " key order drift"
  );
}

function exactDenseArray(value, label) {
  invariant(
    Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype,
    label + " must be a plain array"
  );
  const expectedKeys = [...value.keys()].map(String).concat("length");
  const keys = Reflect.ownKeys(value);
  invariant(
    keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]),
    label + " key drift"
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    invariant(
      descriptor &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable,
      label + " element descriptor drift"
    );
  }
  invariant(
    Object.hasOwn(descriptors.length, "value") && !descriptors.length.enumerable,
    label + " length descriptor drift"
  );
}

function validateIdentity(identity, label) {
  exactOrderedDataObject(identity, ["pid", "ppid", "pgid", "startTicks"], label);
  invariant(Number.isSafeInteger(identity.pid) && identity.pid > 0, label + " PID drift");
  invariant(Number.isSafeInteger(identity.ppid) && identity.ppid >= 0, label + " PPID drift");
  invariant(Number.isSafeInteger(identity.pgid) && identity.pgid > 0, label + " PGID drift");
  invariant(/^[1-9][0-9]*$/u.test(identity.startTicks), label + " start identity drift");
}

function sameIdentity(left, right) {
  return (
    left.pid === right.pid &&
    left.ppid === right.ppid &&
    left.pgid === right.pgid &&
    left.startTicks === right.startTicks
  );
}

function cloneIdentity(identity) {
  validateIdentity(identity, "process identity");
  return deepFreezeExact({
    pid: identity.pid,
    ppid: identity.ppid,
    pgid: identity.pgid,
    startTicks: identity.startTicks,
  });
}

function parseCliArgs(args) {
  invariant(
    Array.isArray(args) && args.every((value) => typeof value === "string"),
    "CLI args drift"
  );
  if (args.length === 1 && args[0] === "--self-test") {
    return deepFreezeExact({ mode: "self-test", root: null });
  }
  if (args.length === 2 && args[0] === "--serve") {
    invariant(
      path.isAbsolute(args[1]) && path.resolve(args[1]) === args[1] && !args[1].includes("\0"),
      "serve root must be canonical lexical absolute"
    );
    return deepFreezeExact({ mode: "serve", root: args[1] });
  }
  invariant(false, "expected exactly --self-test or --serve <canonical-root>");
}

function childDescriptors(root) {
  const coreRoot = path.join(root, "core");
  return deepFreezeExact([
    {
      kind: "backend",
      file: "bun",
      args: ["--no-env-file", "--cwd", coreRoot, "--eval", BACKEND_SOURCE],
      cwd: root,
    },
    {
      kind: "admin",
      file: "bun",
      args: ["--no-env-file", "--cwd", coreRoot, "--eval", ADMIN_VITE_SOURCE],
      cwd: root,
    },
    {
      kind: "site",
      file: "bun",
      args: ["--no-env-file", "--cwd", coreRoot, "--eval", SITE_VITE_SOURCE],
      cwd: root,
    },
  ]);
}

function validateChildDescriptors(descriptors, root) {
  exactDenseArray(descriptors, "host descriptors");
  invariant(
    Array.isArray(descriptors) && descriptors.length === 3,
    "host descriptor cardinality drift"
  );
  const expectedKinds = ["backend", "admin", "site"];
  for (const [index, descriptor] of descriptors.entries()) {
    const kind = expectedKinds[index];
    exactOrderedDataObject(descriptor, ["kind", "file", "args", "cwd"], kind + " descriptor");
    invariant(descriptor.kind === kind, "host descriptor order drift");
    invariant(
      descriptor.file === "bun" && descriptor.cwd === root,
      kind + " descriptor executable drift"
    );
    invariant(
      Array.isArray(descriptor.args) &&
        Object.getPrototypeOf(descriptor.args) === Array.prototype &&
        Reflect.ownKeys(descriptor.args).length === 6 &&
        Reflect.ownKeys(descriptor.args).every(
          (key, keyIndex) => key === (keyIndex === 5 ? "length" : String(keyIndex))
        ),
      kind + " descriptor argv shape drift"
    );
    const expectedArgs = [
      "--no-env-file",
      "--cwd",
      path.join(root, "core"),
      "--eval",
      CHILD_SOURCE_BYTE_PINS[kind],
    ];
    invariant(
      descriptor.args.every((value, argIndex) => value === expectedArgs[argIndex]),
      kind + " descriptor argv/source byte drift"
    );
  }
  invariant(BACKEND_SOURCE === CHILD_SOURCE_BYTE_PINS.backend, "backend source byte pin drift");
  invariant(ADMIN_VITE_SOURCE === CHILD_SOURCE_BYTE_PINS.admin, "Admin source byte pin drift");
  invariant(SITE_VITE_SOURCE === CHILD_SOURCE_BYTE_PINS.site, "site source byte pin drift");
}

function validateEnvironmentProjection(environment) {
  exactDataObject(environment, Reflect.ownKeys(environment), "host environment", {
    nullPrototype: true,
  });
  const keys = Object.keys(environment);
  invariant(new Set(keys).size === keys.length, "host environment repeats a key");
  invariant(
    keys.every((key) => ALLOWED_ENV_KEYS.includes(key)),
    "host environment contains an unknown key"
  );
  for (const key of [...REQUIRED_INHERITED_ENV, ...REQUIRED_REPO_ENV]) {
    invariant(
      typeof environment[key] === "string" && environment[key].length > 0,
      "missing required host env " + key
    );
  }
  for (const [key, value] of Object.entries(FIXED_ENV)) {
    invariant(environment[key] === value, "fixed host env conflict " + key);
  }
  for (const [key, value] of Object.entries(environment)) {
    invariant(typeof value === "string", "host env value must be a string: " + key);
  }
  invariant(
    !["ADMIN_EMAIL", "ADMIN_PASSWORD", "MEDIA_STORAGE", "MEDIA_DIR"].some((key) =>
      Object.hasOwn(environment, key)
    ),
    "forbidden host secret/storage key"
  );
}

function parseNulEnvironment(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  invariant(text.endsWith("\0"), "raw environment must end with NUL");
  const result = Object.create(null);
  for (const entry of text.slice(0, -1).split("\0")) {
    const equals = entry.indexOf("=");
    invariant(equals > 0, "raw environment entry is malformed");
    const key = entry.slice(0, equals);
    invariant(/^[A-Z_][A-Z0-9_]*$/u.test(key), "raw environment key is non-canonical");
    invariant(!Object.hasOwn(result, key), "raw environment contains duplicate key");
    result[key] = entry.slice(equals + 1);
  }
  return result;
}

function parseProcStat(text, expectedPid = null) {
  const close = text.lastIndexOf(")");
  invariant(close > 1, "proc stat comm is malformed");
  const pid = Number(text.slice(0, text.indexOf(" ")));
  const fields = text
    .slice(close + 2)
    .trim()
    .split(/\s+/u);
  invariant(Number.isSafeInteger(pid) && pid > 0 && fields.length >= 20, "proc stat is malformed");
  if (expectedPid !== null) invariant(pid === expectedPid, "proc stat PID mismatch");
  const identity = {
    pid,
    ppid: Number(fields[1]),
    pgid: Number(fields[2]),
    startTicks: fields[19],
  };
  invariant(
    Number.isSafeInteger(identity.ppid) &&
      identity.ppid >= 0 &&
      Number.isSafeInteger(identity.pgid) &&
      identity.pgid > 0 &&
      /^[1-9][0-9]*$/u.test(identity.startTicks),
    "proc identity drift"
  );
  return deepFreezeExact(identity);
}

async function readIdentity(pid, deps) {
  return parseProcStat(await deps.readFile(`/proc/${pid}/stat`, "utf8"), pid);
}

function isProcessGoneError(error) {
  return Boolean(
    error && typeof error === "object" && (error.code === "ENOENT" || error.code === "ESRCH")
  );
}

async function listProcessIdentities(deps) {
  const entries = await deps.readdir("/proc", { withFileTypes: true });
  const identities = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[1-9][0-9]*$/u.test(entry.name)) continue;
    const pid = Number(entry.name);
    try {
      identities.push(await readIdentity(pid, deps));
    } catch (error) {
      if (!isProcessGoneError(error)) throw error;
      // Processes may disappear between /proc enumeration and stat read.
    }
  }
  return identities;
}

async function listenerInodesByPort(deps) {
  const result = new Map();
  const inodePorts = new Map();
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    const lines = (await deps.readFile(table, "utf8")).trim().split("\n").slice(1);
    for (const line of lines) {
      const columns = line.trim().split(/\s+/u);
      if (columns.length < 10 || columns[3] !== "0A") continue;
      const local = columns[1].split(":");
      const port = Number.parseInt(local.at(-1), 16);
      const inode = columns[9];
      invariant(Number.isSafeInteger(port) && port >= 0 && port <= 65_535, "listener port drift");
      invariant(/^[1-9][0-9]*$/u.test(inode), "listener inode drift");
      const priorPort = inodePorts.get(inode);
      invariant(
        priorPort === undefined || priorPort === port,
        "listener inode maps to multiple ports"
      );
      inodePorts.set(inode, port);
      if (!result.has(port)) result.set(port, new Set());
      result.get(port).add(inode);
    }
  }
  return result;
}

async function socketInodesForPid(pid, deps) {
  const result = new Set();
  let entries;
  try {
    entries = await deps.readdir(`/proc/${pid}/fd`);
  } catch (error) {
    return result;
  }
  for (const entry of entries) {
    try {
      const target = await deps.readlink(`/proc/${pid}/fd/${entry}`);
      const match = /^socket:\[([0-9]+)\]$/u.exec(target);
      if (match) result.add(match[1]);
    } catch {
      // Descriptors may close during the bounded observation.
    }
  }
  return result;
}

async function provePortsAbsent(deps) {
  const listeners = await listenerInodesByPort(deps);
  return PORTS.every((port) => !listeners.has(port) || listeners.get(port).size === 0);
}

async function stableStartupProof(children, retainedRunner, deps) {
  const runner = await readIdentity(retainedRunner.pid, deps);
  invariant(sameIdentity(runner, retainedRunner), "host runner start identity drift");
  invariant(runner.pid === runner.pgid, "host runner is not its process-group leader");
  const childRows = [];
  for (const child of children) {
    const identity = await readIdentity(child.process.pid, deps);
    invariant(
      identity.ppid === runner.pid && identity.pgid === runner.pgid,
      child.kind + " process identity drift"
    );
    invariant(
      child.identity && sameIdentity(identity, child.identity),
      child.kind + " retained start identity drift"
    );
    childRows.push({ kind: child.kind, identity });
  }
  const inventory = await listProcessIdentities(deps);
  const retainedChildren = childRows.map(({ identity }) => identity);
  const ownedDescendants = collectOwnedDescendants(runner, retainedChildren, inventory);
  const ownedByPid = identityMap(ownedDescendants, "startup owned descendant");
  const childRoleByPid = new Map(childRows.map((row) => [row.identity.pid, row]));
  const exactOwnedMemberSet =
    ownedByPid.size === childRows.length &&
    childRows.every(({ identity }) => {
      const owned = ownedByPid.get(identity.pid);
      return owned && sameIdentity(owned, identity);
    });
  const listeners = await listenerInodesByPort(deps);
  const listenerOwners = new Map();
  const ownedRows = ownedDescendants.map((identity) => ({
    kind: childRoleByPid.get(identity.pid)?.kind ?? "owned-descendant",
    identity,
  }));
  for (const owner of [{ kind: "runner", identity: runner }, ...ownedRows]) {
    const sockets = await socketInodesForPid(owner.identity.pid, deps);
    for (const inode of sockets) {
      invariant(!listenerOwners.has(inode), "startup socket inode has multiple retained owners");
      listenerOwners.set(inode, owner);
    }
  }
  const ownedListeners = [];
  for (const [port, inodes] of listeners) {
    for (const inode of inodes) {
      const owner = listenerOwners.get(inode);
      if (owner) ownedListeners.push({ port, inode, owner });
    }
  }
  invariant(
    exactOwnedMemberSet,
    "host runner descendant lineage contains a missing or extra member"
  );
  invariant(ownedListeners.length === PORTS.length, "host runner or child owns an extra listener");
  const listenerRows = [];
  const retainedListenerInodes = new Set();
  for (const [index, port] of PORTS.entries()) {
    const child = childRows[index];
    const portInodes = listeners.get(port) ?? new Set();
    invariant(
      portInodes.size === 1 &&
        [...portInodes].every((inode) => {
          const owner = listenerOwners.get(inode);
          return owner && owner.kind === child.kind && sameIdentity(owner.identity, child.identity);
        }),
      child.kind + " listener identity drift"
    );
    const [listenerInode] = portInodes;
    invariant(!retainedListenerInodes.has(listenerInode), "startup listener inode is duplicated");
    retainedListenerInodes.add(listenerInode);
    invariant(
      children[index].stdoutState().readyCount === 1,
      child.kind + " readiness marker drift"
    );
    listenerRows.push({ kind: child.kind, port, identity: child.identity });
  }
  return freezeStartupProof({
    schemaVersion: 1,
    runner,
    children: childRows,
    listeners: listenerRows,
    ports: [...PORTS],
  });
}

function validateStartupProof(proof) {
  exactOrderedDataObject(
    proof,
    ["schemaVersion", "runner", "children", "listeners", "ports"],
    "startup proof"
  );
  invariant(proof.schemaVersion === 1, "startup proof schema drift");
  validateIdentity(proof.runner, "startup runner");
  invariant(proof.runner.pid === proof.runner.pgid, "startup runner is not group leader");
  exactDenseArray(proof.children, "startup children");
  exactDenseArray(proof.listeners, "startup listeners");
  exactDenseArray(proof.ports, "startup ports");
  invariant(
    Array.isArray(proof.children) && proof.children.length === 3,
    "startup child cardinality drift"
  );
  invariant(
    Array.isArray(proof.listeners) && proof.listeners.length === 3,
    "startup listener cardinality drift"
  );
  invariant(
    Array.isArray(proof.ports) && JSON.stringify(proof.ports) === JSON.stringify(PORTS),
    "startup port order drift"
  );
  const kinds = ["backend", "admin", "site"];
  const childPids = new Set();
  for (const [index, row] of proof.children.entries()) {
    exactOrderedDataObject(row, ["kind", "identity"], "startup child");
    invariant(row.kind === kinds[index], "startup child order drift");
    validateIdentity(row.identity, "startup child identity");
    invariant(row.identity.pid !== proof.runner.pid, "startup child reuses runner PID");
    invariant(!childPids.has(row.identity.pid), "startup child PID is duplicated");
    childPids.add(row.identity.pid);
    invariant(
      row.identity.ppid === proof.runner.pid && row.identity.pgid === proof.runner.pgid,
      "startup child lineage drift"
    );
  }
  const listenerPids = new Set();
  for (const [index, row] of proof.listeners.entries()) {
    exactOrderedDataObject(row, ["kind", "port", "identity"], "startup listener");
    invariant(
      row.kind === kinds[index] && row.port === PORTS[index],
      "startup listener order drift"
    );
    validateIdentity(row.identity, "startup listener identity");
    invariant(!listenerPids.has(row.identity.pid), "startup listener PID is duplicated");
    listenerPids.add(row.identity.pid);
    invariant(
      sameIdentity(row.identity, proof.children[index].identity),
      "startup listener owner drift"
    );
  }
}

function freezeStartupProof(proof) {
  validateStartupProof(proof);
  return deepFreezeExact(proof);
}

function validateReadyProjection(ready) {
  exactOrderedDataObject(
    ready,
    ["schemaVersion", "runnerPid", "children", "ports"],
    "ready projection"
  );
  invariant(ready.schemaVersion === 1, "ready schema drift");
  invariant(Number.isSafeInteger(ready.runnerPid) && ready.runnerPid > 0, "ready runner PID drift");
  exactDenseArray(ready.children, "ready children");
  exactDenseArray(ready.ports, "ready ports");
  invariant(
    Array.isArray(ready.children) && ready.children.length === 3,
    "ready child cardinality drift"
  );
  const retainedPids = new Set([ready.runnerPid]);
  for (const [index, row] of ready.children.entries()) {
    exactOrderedDataObject(row, ["kind", "pid"], "ready child");
    invariant(row.kind === ["backend", "admin", "site"][index], "ready child order drift");
    invariant(Number.isSafeInteger(row.pid) && row.pid > 0, "ready child PID drift");
    invariant(!retainedPids.has(row.pid), "ready runner/child PID is duplicated");
    retainedPids.add(row.pid);
  }
  invariant(
    Array.isArray(ready.ports) && JSON.stringify(ready.ports) === JSON.stringify(PORTS),
    "ready ports drift"
  );
}

function freezeReadyProjection(ready) {
  validateReadyProjection(ready);
  return deepFreezeExact(ready);
}

function createBoundedDrain(stream, readyMarker) {
  let byteCount = 0;
  let exceeded = false;
  let readyCount = 0;
  let tail = "";
  stream.on("data", (chunk) => {
    byteCount += Buffer.byteLength(chunk);
    if (byteCount > MAX_CHILD_STREAM_BYTES) exceeded = true;
    const text = tail + Buffer.from(chunk).toString("utf8");
    let offset = 0;
    while (true) {
      const found = text.indexOf(readyMarker, offset);
      if (found < 0) break;
      readyCount += 1;
      offset = found + readyMarker.length;
    }
    tail = text.slice(-Math.max(0, readyMarker.length - 1));
  });
  return () => ({ byteCount, exceeded, readyCount });
}

function identityMap(identities, label) {
  invariant(Array.isArray(identities), label + " must be an array");
  const result = new Map();
  for (const identity of identities) {
    validateIdentity(identity, label + " identity");
    invariant(!result.has(identity.pid), label + " repeats a PID");
    result.set(identity.pid, identity);
  }
  return result;
}

function collectOwnedDescendants(runnerIdentity, retainedIdentities, inventory) {
  validateIdentity(runnerIdentity, "retained runner");
  invariant(runnerIdentity.pid === runnerIdentity.pgid, "retained runner is not group leader");
  const allByPid = identityMap(inventory, "process inventory");
  const currentRunner = allByPid.get(runnerIdentity.pid);
  invariant(
    currentRunner && sameIdentity(currentRunner, runnerIdentity),
    "runner PID/start identity drift"
  );
  const retainedByPid = identityMap(retainedIdentities, "retained descendant");
  for (const retained of retainedByPid.values()) {
    const current = allByPid.get(retained.pid);
    invariant(!current || sameIdentity(current, retained), "descendant PID reuse detected");
  }
  const descendants = [];
  for (const member of allByPid.values()) {
    if (member.pid === runnerIdentity.pid) continue;
    const visited = new Set([member.pid]);
    let cursor = member;
    let owned = false;
    while (cursor.ppid > 0) {
      if (cursor.ppid === runnerIdentity.pid) {
        owned = true;
        break;
      }
      invariant(!visited.has(cursor.ppid), "descendant ancestry cycle");
      visited.add(cursor.ppid);
      const parent = allByPid.get(cursor.ppid);
      if (!parent) break;
      cursor = parent;
    }
    if (owned) descendants.push(cloneIdentity(member));
  }
  const descendantPids = new Set(descendants.map(({ pid }) => pid));
  for (const member of allByPid.values()) {
    if (
      member.pgid === runnerIdentity.pgid &&
      member.pid !== runnerIdentity.pid &&
      !descendantPids.has(member.pid)
    ) {
      invariant(false, "foreign process-group member");
    }
  }
  descendants.sort((left, right) => left.pid - right.pid);
  return deepFreezeExact(descendants);
}

function validateStopStage(stage, label) {
  exactOrderedDataObject(stage, ["attempted", "targets", "survivors"], label);
  invariant(typeof stage.attempted === "boolean", label + " attempted drift");
  exactDenseArray(stage.targets, label + " targets");
  exactDenseArray(stage.survivors, label + " survivors");
  invariant(
    Array.isArray(stage.targets) && Array.isArray(stage.survivors),
    label + " identities drift"
  );
  const targetByPid = new Map();
  let priorTargetPid = 0;
  for (const identity of stage.targets) {
    validateIdentity(identity, label + " target");
    invariant(!targetByPid.has(identity.pid), label + " target PID is duplicated");
    invariant(identity.pid > priorTargetPid, label + " target order drift");
    targetByPid.set(identity.pid, identity);
    priorTargetPid = identity.pid;
  }
  let priorTargetIndex = -1;
  const survivorPids = new Set();
  for (const identity of stage.survivors) {
    validateIdentity(identity, label + " survivor");
    invariant(!survivorPids.has(identity.pid), label + " survivor PID is duplicated");
    survivorPids.add(identity.pid);
    const target = targetByPid.get(identity.pid);
    invariant(target && sameIdentity(target, identity), label + " survivor is not an exact target");
    const targetIndex = stage.targets.indexOf(target);
    invariant(targetIndex > priorTargetIndex, label + " survivor order drift");
    priorTargetIndex = targetIndex;
  }
  invariant(stage.attempted === stage.targets.length > 0, label + " attempted/target mismatch");
}

function validateStopProof(proof) {
  exactOrderedDataObject(
    proof,
    ["schemaVersion", "reason", "term", "kill", "descendantsAbsent", "portsAbsent"],
    "descendant-stop proof"
  );
  invariant(proof.schemaVersion === 1, "descendant-stop schema drift");
  invariant(
    ["signal", "child_exit", "startup_failure"].includes(proof.reason),
    "descendant-stop reason drift"
  );
  validateStopStage(proof.term, "TERM proof");
  validateStopStage(proof.kill, "KILL proof");
  invariant(
    proof.kill.attempted === proof.term.survivors.length > 0,
    "KILL attempted/TERM-survivor mismatch"
  );
  invariant(
    proof.kill.targets.length === proof.term.survivors.length &&
      proof.kill.targets.every((identity, index) =>
        sameIdentity(identity, proof.term.survivors[index])
      ),
    "KILL targets differ from exact TERM survivors"
  );
  invariant(typeof proof.descendantsAbsent === "boolean", "descendant absence drift");
  exactDenseArray(proof.portsAbsent, "port-absence proof");
  invariant(
    Array.isArray(proof.portsAbsent) &&
      (proof.portsAbsent.length === 0 ||
        JSON.stringify(proof.portsAbsent) === JSON.stringify(PORTS)),
    "port-absence proof drift"
  );
  const finalSurvivors = proof.kill.attempted ? proof.kill.survivors : proof.term.survivors;
  invariant(
    proof.descendantsAbsent === (finalSurvivors.length === 0),
    "descendant survivor/absence mismatch"
  );
}

function freezeStopProof(proof) {
  validateStopProof(proof);
  return deepFreezeExact(proof);
}

function mergeRetainedIdentities(retained, observed) {
  const merged = new Map();
  for (const identity of [...retained, ...observed]) {
    const prior = merged.get(identity.pid);
    invariant(!prior || sameIdentity(prior, identity), "retained descendant identity changed");
    merged.set(identity.pid, cloneIdentity(identity));
  }
  return [...merged.values()].sort((left, right) => left.pid - right.pid);
}

function createDescendantStopController({ runnerIdentity, retainedIdentities, dependencies }) {
  validateIdentity(runnerIdentity, "stop-controller runner");
  invariant(typeof retainedIdentities === "function", "retained identity accessor drift");
  exactDataObject(
    dependencies,
    ["listIdentities", "readIdentity", "signalPid", "portsAbsent", "delay"],
    "stop dependencies"
  );
  let stopPromise = null;

  const inventory = async (retained) =>
    collectOwnedDescendants(runnerIdentity, retained, await dependencies.listIdentities());

  const signalOne = async (identity, signal) => {
    let current;
    try {
      current = await dependencies.readIdentity(identity.pid);
    } catch (error) {
      if (isProcessGoneError(error)) return false;
      throw error;
    }
    invariant(sameIdentity(current, identity), "refusing to signal a reused process identity");
    invariant(current.pid !== runnerIdentity.pid, "refusing to signal the host runner");
    invariant(current.pgid === identity.pgid, "refusing to signal after PGID drift");
    await dependencies.signalPid(identity.pid, signal);
    return true;
  };

  const boundedStage = async (signal, retained, initialTargets) => {
    let owned = mergeRetainedIdentities(retained, initialTargets);
    const signalled = new Map();
    const fixedKillTargets =
      signal === "SIGKILL" ? identityMap(initialTargets, "KILL target") : null;
    for (let attempt = 0; attempt <= STOP_TIMEOUT_MS / 100; attempt += 1) {
      const observed = await inventory(owned);
      owned = mergeRetainedIdentities(owned, observed);
      for (const identity of observed) {
        if (fixedKillTargets !== null) {
          const authorized = fixedKillTargets.get(identity.pid);
          invariant(
            authorized && sameIdentity(authorized, identity),
            "refusing to KILL a descendant outside the exact TERM-survivor set"
          );
        }
        if (!signalled.has(identity.pid)) {
          if (await signalOne(identity, signal)) signalled.set(identity.pid, identity);
        }
      }
      if (observed.length === 0) {
        return {
          targets:
            fixedKillTargets === null
              ? [...signalled.values()].sort((left, right) => left.pid - right.pid)
              : initialTargets.map(cloneIdentity),
          survivors: [],
          retained: owned,
        };
      }
      if (attempt < STOP_TIMEOUT_MS / 100) await dependencies.delay(100);
    }
    const survivors = await inventory(owned);
    return {
      targets:
        fixedKillTargets === null
          ? [...signalled.values()].sort((left, right) => left.pid - right.pid)
          : initialTargets.map(cloneIdentity),
      survivors,
      retained: owned,
    };
  };

  const run = async (reason) => {
    invariant(["signal", "child_exit", "startup_failure"].includes(reason), "stop reason drift");
    let retained = mergeRetainedIdentities([], retainedIdentities());
    const initial = await inventory(retained);
    retained = mergeRetainedIdentities(retained, initial);
    const term = await boundedStage("SIGTERM", retained, initial);
    retained = term.retained;
    const kill = await boundedStage("SIGKILL", retained, term.survivors);
    let portsAbsent = false;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      if (await dependencies.portsAbsent()) {
        await dependencies.delay(100);
        if (await dependencies.portsAbsent()) {
          portsAbsent = true;
          break;
        }
      }
      await dependencies.delay(100);
    }
    return freezeStopProof({
      schemaVersion: 1,
      reason,
      term: {
        attempted: term.targets.length > 0,
        targets: term.targets,
        survivors: term.survivors,
      },
      kill: {
        attempted: kill.targets.length > 0,
        targets: kill.targets,
        survivors: kill.survivors,
      },
      descendantsAbsent: kill.survivors.length === 0,
      portsAbsent: portsAbsent ? [...PORTS] : [],
    });
  };

  return deepFreezeExact({
    stop(reason) {
      if (stopPromise === null) stopPromise = run(reason);
      return stopPromise;
    },
  });
}

function stripJsonTrailingCommas(text) {
  invariant(
    typeof text === "string" && text.length > 0 && !text.includes("\0"),
    "lock bytes drift"
  );
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ",") {
      let lookahead = index + 1;
      while (lookahead < text.length && /\s/u.test(text[lookahead])) lookahead += 1;
      if (text[lookahead] === "}" || text[lookahead] === "]") continue;
    }
    result += character;
  }
  invariant(!inString && !escaped, "lock string is unterminated");
  return result;
}

function parseJsonObject(text, label, { trailingCommas = false } = {}) {
  let value;
  try {
    value = JSON.parse(trailingCommas ? stripJsonTrailingCommas(text) : text);
  } catch (error) {
    invariant(false, label + " is not valid JSON");
  }
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  return value;
}

async function requireDirectoryIdentity(target, deps, label) {
  const targetLstat = await deps.lstat(target);
  invariant(
    targetLstat.isDirectory() && !targetLstat.isSymbolicLink(),
    label + " directory identity drift"
  );
  invariant((await deps.realpath(target)) === target, label + " directory is not canonical");
}

function viteCacheAuthorityTargets(root) {
  const nodeModules = path.join(root, "core", "node_modules");
  const base = path.join(nodeModules, ".vite");
  const targets = [
    {
      kind: "admin",
      cache: path.join(base, "wf540-admin"),
      deps: path.join(base, "wf540-admin", "deps"),
    },
    {
      kind: "site",
      cache: path.join(base, "wf540-site"),
      deps: path.join(base, "wf540-site", "deps"),
    },
  ];
  invariant(
    path.relative(base, targets[0].cache) === "wf540-admin" &&
      path.relative(base, targets[1].cache) === "wf540-site" &&
      targets[0].cache !== targets[1].cache &&
      targets.every(({ cache, deps }) => path.relative(cache, deps) === "deps"),
    "Vite cache lexical authority drift"
  );
  return deepFreezeExact({ nodeModules, base, targets });
}

async function inspectCanonicalDirectory(target, deps, label, required) {
  let targetLstat;
  try {
    targetLstat = await deps.lstat(target);
  } catch (error) {
    invariant(
      !required && error && typeof error === "object" && error.code === "ENOENT",
      label + " is missing"
    );
    return null;
  }
  invariant(
    targetLstat.isDirectory() && !targetLstat.isSymbolicLink(),
    label + " directory identity drift"
  );
  const resolved = await deps.realpath(target);
  invariant(resolved === target, label + " directory is not canonical");
  return resolved;
}

async function validateViteCacheAuthorities(root, deps, required) {
  invariant(typeof required === "boolean", "Vite cache required-mode drift");
  const authority = viteCacheAuthorityTargets(root);
  const nodeModulesRealpath = await inspectCanonicalDirectory(
    authority.nodeModules,
    deps,
    "core node_modules cache ancestor",
    true
  );
  const baseRealpath = await inspectCanonicalDirectory(
    authority.base,
    deps,
    "Vite cache authority base",
    required
  );
  invariant(
    baseRealpath === null || nodeModulesRealpath !== null,
    "Vite cache authority base exists without its core node_modules ancestor"
  );
  if (baseRealpath !== null) {
    invariant(
      path.relative(nodeModulesRealpath, baseRealpath) === ".vite",
      "Vite cache authority base escaped core node_modules"
    );
  }
  const observed = [];
  for (const target of authority.targets) {
    const cacheRealpath = await inspectCanonicalDirectory(
      target.cache,
      deps,
      target.kind + " Vite cache",
      required
    );
    const depsRealpath = await inspectCanonicalDirectory(
      target.deps,
      deps,
      target.kind + " Vite optimizer deps",
      required
    );
    invariant(
      depsRealpath === null || cacheRealpath !== null,
      target.kind + " Vite optimizer exists without its cache parent"
    );
    invariant(
      cacheRealpath === null || baseRealpath !== null,
      target.kind + " Vite cache exists without its authority base"
    );
    if (cacheRealpath !== null) {
      invariant(
        path.relative(baseRealpath, cacheRealpath) === path.basename(target.cache),
        target.kind + " Vite cache escaped its authority base"
      );
    }
    if (depsRealpath !== null) {
      invariant(
        path.relative(cacheRealpath, depsRealpath) === "deps",
        target.kind + " Vite optimizer escaped its cache parent"
      );
    }
    observed.push({ kind: target.kind, cacheRealpath, depsRealpath });
  }
  const presentCaches = observed.flatMap(({ cacheRealpath }) =>
    cacheRealpath === null ? [] : [cacheRealpath]
  );
  const presentDeps = observed.flatMap(({ depsRealpath }) =>
    depsRealpath === null ? [] : [depsRealpath]
  );
  invariant(
    new Set(presentCaches).size === presentCaches.length,
    "Admin and site Vite caches share a realpath"
  );
  invariant(
    new Set(presentDeps).size === presentDeps.length,
    "Admin and site Vite optimizer directories share a realpath"
  );
  if (required) {
    invariant(
      baseRealpath === authority.base &&
        nodeModulesRealpath === authority.nodeModules &&
        presentCaches.length === 2 &&
        presentDeps.length === 2,
      "post-ready Vite cache authority is incomplete"
    );
  }
  return deepFreezeExact({
    nodeModules: authority.nodeModules,
    nodeModulesRealpath,
    base: authority.base,
    baseRealpath,
    observed,
  });
}

async function requireRegularFileIdentity(target, deps, label) {
  const targetLstat = await deps.lstat(target);
  invariant(targetLstat.isFile() && !targetLstat.isSymbolicLink(), label + " file identity drift");
  invariant((await deps.realpath(target)) === target, label + " file is not canonical");
  await deps.access(target, fsConstants.R_OK);
}

async function requirePathAbsent(target, deps, label) {
  try {
    await deps.lstat(target);
  } catch (error) {
    invariant(
      error && typeof error === "object" && error.code === "ENOENT",
      label + " absence probe failed"
    );
    return;
  }
  invariant(false, label + " must be absent");
}

async function resolveBunExecutable(root, environment, deps) {
  const pathValue = environment.PATH;
  invariant(typeof pathValue === "string" && pathValue.length > 0, "Bun PATH is missing");
  const pathEntries = pathValue.split(path.delimiter);
  invariant(
    pathEntries.length > 0 &&
      pathEntries.every(
        (entry) =>
          entry.length > 0 &&
          path.isAbsolute(entry) &&
          path.resolve(entry) === entry &&
          !entry.includes("\0")
      ),
    "Bun PATH contains a non-canonical entry"
  );
  for (const directory of pathEntries) {
    const candidate = path.join(directory, "bun");
    try {
      await deps.access(candidate, fsConstants.X_OK);
    } catch {
      // Match execvp resolution: the first executable regular file wins.
      continue;
    }
    const resolved = await deps.realpath(candidate);
    const resolvedStat = await deps.stat(resolved);
    invariant(path.isAbsolute(resolved) && resolvedStat.isFile(), "Bun executable identity drift");
    invariant(
      !resolved.startsWith(root + path.sep + "node_modules" + path.sep),
      "Bun executable is a package shim"
    );
    return deepFreezeExact({ requested: candidate, resolved });
  }
  invariant(false, "Bun executable is unavailable from the exact PATH");
}

async function validateCanonicalRootAndToolchain(root, environment, deps) {
  invariant(
    typeof root === "string" &&
      path.isAbsolute(root) &&
      path.resolve(root) === root &&
      !root.includes("\0"),
    "serve root must be canonical lexical absolute"
  );
  invariant((await deps.realpath(root)) === root, "serve root is not canonical");
  await requireDirectoryIdentity(root, deps, "repository root");
  const coreRoot = path.join(root, "core");
  await requireDirectoryIdentity(coreRoot, deps, "core root");
  await validateViteCacheAuthorities(root, deps, false);
  await requireDirectoryIdentity(path.join(root, "node_modules"), deps, "root node_modules");
  await requireDirectoryIdentity(path.join(root, "node_modules/vite"), deps, "installed Vite root");
  await requirePathAbsent(
    path.join(coreRoot, "node_modules/vite"),
    deps,
    "core-local Vite shadow package"
  );

  const requiredFiles = [
    [path.join(root, "package.json"), "root package"],
    [path.join(root, "bun.lock"), "Bun lock"],
    [path.join(coreRoot, "package.json"), "core package"],
    [path.join(coreRoot, "server/httpServer.ts"), "backend source"],
    [path.join(coreRoot, "vite.config.ts"), "Admin Vite config"],
    [path.join(coreRoot, "vite.site.config.ts"), "site Vite config"],
    [path.join(coreRoot, "admin/main.tsx"), "Admin Vite entry"],
    [path.join(coreRoot, "site/main.ts"), "site Vite entry"],
    [path.join(root, "node_modules/vite/package.json"), "installed Vite package"],
    [path.join(root, "node_modules/vite/dist/node/index.js"), "installed Vite runtime"],
  ];
  for (const [target, label] of requiredFiles) {
    await requireRegularFileIdentity(target, deps, label);
  }

  const [rootPackageText, corePackageText, vitePackageText, lockText] = await Promise.all([
    deps.readFile(path.join(root, "package.json"), "utf8"),
    deps.readFile(path.join(coreRoot, "package.json"), "utf8"),
    deps.readFile(path.join(root, "node_modules/vite/package.json"), "utf8"),
    deps.readFile(path.join(root, "bun.lock"), "utf8"),
  ]);
  const rootPackage = parseJsonObject(rootPackageText, "root package");
  const corePackage = parseJsonObject(corePackageText, "core package");
  const vitePackage = parseJsonObject(vitePackageText, "installed Vite package");
  const lock = parseJsonObject(lockText, "Bun lock", { trailingCommas: true });
  invariant(vitePackage.name === "vite", "installed Vite package name drift");
  invariant(vitePackage.version === "8.1.5", "installed Vite exact version drift");
  invariant(lock.lockfileVersion === 1, "Bun lock version drift");
  invariant(
    rootPackage.devDependencies?.vite === lock.workspaces?.[""]?.devDependencies?.vite,
    "root Vite declaration differs from Bun lock"
  );
  invariant(
    corePackage.devDependencies?.vite === lock.workspaces?.core?.devDependencies?.vite,
    "core Vite declaration differs from Bun lock"
  );
  invariant(
    Array.isArray(lock.packages?.vite) && lock.packages.vite[0] === `vite@${vitePackage.version}`,
    "installed Vite version differs from Bun lock"
  );
  const bun = await resolveBunExecutable(root, environment, deps);
  return deepFreezeExact({
    root,
    coreRoot,
    bun,
    viteVersion: vitePackage.version,
    lockfileVersion: lock.lockfileVersion,
  });
}

async function crossCheckRawEnvironment(deps) {
  const raw = parseNulEnvironment(await deps.readFile("/proc/self/environ"));
  const projected = Object.create(null);
  for (const key of Reflect.ownKeys(deps.environment)) {
    invariant(typeof key === "string", "process environment symbol drift");
    invariant(
      !["__proto__", "prototype", "constructor"].includes(key),
      "process environment prototype-pollution key"
    );
    const descriptor = Object.getOwnPropertyDescriptor(deps.environment, key);
    invariant(
      descriptor &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set"),
      "process environment accessor drift"
    );
    projected[key] = descriptor.value;
  }
  validateEnvironmentProjection(projected);
  invariant(
    JSON.stringify(Object.keys(raw).sort()) === JSON.stringify(Object.keys(projected).sort()) &&
      Object.keys(raw).every((key) => raw[key] === projected[key]),
    "raw/process environment mismatch"
  );
  return projected;
}

function createRuntimeDependencies() {
  return {
    pid: process.pid,
    environment: process.env,
    stdoutWrite(value) {
      process.stdout.write(value);
    },
    onceSignal(signal, callback) {
      process.once(signal, callback);
    },
    spawn,
    access,
    lstat,
    readFile,
    readdir,
    readlink,
    realpath,
    stat,
    delay,
    monotonicNow() {
      return performance.now();
    },
    signalPid(pid, signal) {
      process.kill(pid, signal);
    },
  };
}

async function runHostCli(args, adapters) {
  exactOrderedDataObject(
    adapters,
    ["runSelfTest", "createRuntimeDependencies"],
    "host CLI adapters"
  );
  invariant(
    typeof adapters.runSelfTest === "function" &&
      typeof adapters.createRuntimeDependencies === "function",
    "host CLI adapter type drift"
  );
  const command = parseCliArgs(args);
  if (command.mode === "self-test") return adapters.runSelfTest();
  return serve(command.root, adapters.createRuntimeDependencies());
}

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

function createStartupDeadline(deps) {
  invariant(
    typeof deps.monotonicNow === "function" && typeof deps.delay === "function",
    "startup monotonic clock dependencies drift"
  );
  const startedAt = deps.monotonicNow();
  invariant(
    typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt >= 0,
    "startup monotonic epoch drift"
  );
  const expiresAt = startedAt + READY_TIMEOUT_MS;
  invariant(Number.isFinite(expiresAt), "startup monotonic deadline overflow");
  let lastObservedAt = startedAt;
  const read = () => {
    const observedAt = deps.monotonicNow();
    invariant(
      typeof observedAt === "number" && Number.isFinite(observedAt) && observedAt >= lastObservedAt,
      "startup monotonic clock regressed"
    );
    lastObservedAt = observedAt;
    return observedAt;
  };
  return Object.freeze({
    assertActive(boundary) {
      invariant(
        typeof boundary === "string" && boundary.length > 0 && read() < expiresAt,
        "startup deadline expired at " + boundary
      );
    },
    async boundedDelay(requestedMs, boundary) {
      invariant(
        Number.isSafeInteger(requestedMs) &&
          requestedMs > 0 &&
          typeof boundary === "string" &&
          boundary.length > 0,
        "startup bounded-delay contract drift"
      );
      const before = read();
      const remaining = expiresAt - before;
      invariant(remaining > 0, "startup deadline expired before " + boundary);
      await deps.delay(Math.min(requestedMs, remaining));
      const after = read();
      invariant(after <= expiresAt, "startup delay crossed its monotonic deadline");
      return after < expiresAt;
    },
  });
}

async function waitForDirectChildIdentity(child, runnerIdentity, deps, startupDeadline) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    startupDeadline.assertActive(child.kind + " identity attempt");
    invariant(!child.spawnFailed, child.kind + " failed to spawn");
    invariant(
      child.process.exitCode === null && child.process.signalCode === null,
      child.kind + " exited before identity retention"
    );
    try {
      const identity = await readIdentity(child.process.pid, deps);
      invariant(
        identity.ppid === runnerIdentity.pid && identity.pgid === runnerIdentity.pgid,
        child.kind + " initial lineage drift"
      );
      return cloneIdentity(identity);
    } catch {
      if (attempt === 49) break;
      if (!(await startupDeadline.boundedDelay(20, child.kind + " identity retry delay"))) {
        break;
      }
    }
  }
  invariant(false, child.kind + " identity retention timed out");
}

async function serve(root, deps) {
  const environment = await crossCheckRawEnvironment(deps);
  await validateCanonicalRootAndToolchain(root, environment, deps);
  const runnerIdentity = cloneIdentity(await readIdentity(deps.pid, deps));
  invariant(
    runnerIdentity.pid === runnerIdentity.pgid,
    "host runner is not its process-group leader"
  );
  const startupDeadline = createStartupDeadline(deps);
  startupDeadline.assertActive("initial port-absence proof");
  invariant(await provePortsAbsent(deps), "one or more smoke ports are already owned");
  startupDeadline.assertActive("first port-absence proof");
  invariant(
    await startupDeadline.boundedDelay(100, "stable port-absence delay"),
    "host readiness timed out before stable port proof"
  );
  invariant(await provePortsAbsent(deps), "smoke port absence is not stable");
  startupDeadline.assertActive("stable port-absence proof");
  const descriptors = childDescriptors(root);
  validateChildDescriptors(descriptors, root);
  const children = [];
  const stopController = createDescendantStopController({
    runnerIdentity,
    retainedIdentities: () => children.flatMap((child) => (child.identity ? [child.identity] : [])),
    dependencies: {
      async listIdentities() {
        return listProcessIdentities(deps);
      },
      async readIdentity(pid) {
        return readIdentity(pid, deps);
      },
      async signalPid(pid, signal) {
        deps.signalPid(pid, signal);
      },
      async portsAbsent() {
        return provePortsAbsent(deps);
      },
      delay: deps.delay,
    },
  });
  let requestedReason = null;
  let resolveReason;
  const reasonPromise = new Promise((resolve) => {
    resolveReason = resolve;
  });
  const requestStop = (reason) => {
    if (requestedReason === null) {
      requestedReason = reason;
      resolveReason(reason);
    }
  };
  const assertStartupActive = (boundary) => {
    invariant(requestedReason === null, "host stopped at startup boundary " + boundary);
    startupDeadline.assertActive(boundary);
  };
  deps.onceSignal("SIGTERM", () => requestStop("signal"));
  deps.onceSignal("SIGINT", () => requestStop("signal"));
  try {
    for (const descriptor of descriptors) {
      assertStartupActive("before-" + descriptor.kind + "-spawn");
      const child = deps.spawn(descriptor.file, descriptor.args, {
        cwd: descriptor.cwd,
        env: environment,
        shell: false,
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const row = {
        kind: descriptor.kind,
        process: child,
        identity: null,
        spawnFailed: false,
        stdoutState: null,
        stderrState: null,
      };
      children.push(row);
      assertStartupActive("after-" + descriptor.kind + "-spawn");
      row.stdoutState = createBoundedDrain(child.stdout, CHILD_READY_MARKERS[descriptor.kind]);
      row.stderrState = createBoundedDrain(child.stderr, "WF540_FORBIDDEN_STDERR_READY\n");
      child.once("error", () => {
        row.spawnFailed = true;
        requestStop("startup_failure");
      });
      child.once("exit", () => requestStop("child_exit"));
      assertStartupActive("before-" + descriptor.kind + "-identity");
      row.identity = await waitForDirectChildIdentity(row, runnerIdentity, deps, startupDeadline);
      assertStartupActive("after-" + descriptor.kind + "-identity");
    }
    let proof = null;
    while (proof === null && requestedReason === null) {
      assertStartupActive("ready-proof attempt");
      invariant(
        children.every(
          (child) =>
            !child.spawnFailed &&
            child.process.exitCode === null &&
            child.process.signalCode === null
        ),
        "child exited during startup"
      );
      try {
        assertStartupActive("before-first-ready-proof");
        const first = await stableStartupProof(children, runnerIdentity, deps);
        assertStartupActive("after-first-ready-proof");
        if (!(await startupDeadline.boundedDelay(200, "stable startup proof observation delay"))) {
          break;
        }
        assertStartupActive("before-second-ready-proof");
        const second = await stableStartupProof(children, runnerIdentity, deps);
        assertStartupActive("after-second-ready-proof");
        invariant(JSON.stringify(first) === JSON.stringify(second), "startup proof is not stable");
        proof = second;
        break;
      } catch (error) {
        if (requestedReason !== null) throw error;
        if (!(await startupDeadline.boundedDelay(200, "startup proof retry delay"))) {
          break;
        }
      }
    }
    invariant(proof !== null, "host readiness timed out");
    assertStartupActive("before-readiness-projection");
    invariant(
      children.every(
        ({ stdoutState, stderrState }) => !stdoutState().exceeded && !stderrState().exceeded
      ),
      "child output exceeded the private bound"
    );
    await validateViteCacheAuthorities(root, deps, true);
    assertStartupActive("after-cache-authority-proof");
    const ready = freezeReadyProjection({
      schemaVersion: 1,
      runnerPid: proof.runner.pid,
      children: proof.children.map(({ kind, identity }) => ({ kind, pid: identity.pid })),
      ports: [...PORTS],
    });
    deps.stdoutWrite(JSON.stringify(ready) + "\n");
    const reason = await reasonPromise;
    const stopped = await stopController.stop(reason);
    invariant(
      stopped.descendantsAbsent &&
        stopped.term.survivors.length === 0 &&
        stopped.kill.survivors.length === 0 &&
        stopped.portsAbsent.length === PORTS.length,
      "host descendant cleanup failed"
    );
  } catch {
    try {
      await stopController.stop(requestedReason ?? "startup_failure");
    } catch {
      // The executor owns the outer negative-PGID cleanup when host proof cannot finish.
    }
    throw new Error("task540_smoke_host_failed");
  }
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
