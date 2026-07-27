import { constants as fsConstants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  realpath,
  rmdir,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "./foundation.mjs";
import {
  BROWSER_OPTIONAL_INHERITED_ENV,
  applyFixedBrowserTimeoutEnvironment,
  ownString,
} from "./environment.mjs";
import { decodeBoundedUtf8 } from "./output-parser.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";

const PRIVATE_WORKSPACE_LEDGER = new WeakMap();

async function readStrictRepoEnvironment(root, expectedIdentity) {
  const bytes = await readOwnedRegularFileNoFollow(
    path.join(root, ".env"),
    expectedIdentity,
    1024 * 1024
  );
  const text = decodeBoundedUtf8(bytes, "repo environment", 1024 * 1024);
  invariant(!text.includes("\0"), "repo environment contains NUL");
  const seen = new Set();
  for (const line of text.split(/\r?\n/u)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/u.exec(line);
    if (!match) continue;
    invariant(!seen.has(match[1]), "repo environment repeats a key");
    seen.add(match[1]);
  }
  const parsed = parseEnv(text);
  const result = Object.create(null);
  for (const key of Reflect.ownKeys(parsed)) {
    invariant(
      typeof key === "string" && !["__proto__", "prototype", "constructor"].includes(key),
      "unsafe repo environment key"
    );
    const value = ownString(parsed, key, { required: true });
    result[key] = value;
  }
  return Object.freeze(result);
}

async function requireMissingPath(target, label) {
  try {
    await lstat(target);
    invariant(false, label + " already exists");
  } catch (error) {
    invariant(error && error.code === "ENOENT", label + " could not be proven absent");
  }
}

function artifactType(info) {
  if (info.isDirectory()) return "directory";
  if (info.isFile()) return "file";
  return "unsupported";
}

function projectArtifactIdentity(info) {
  return Object.freeze({
    dev: String(info.dev),
    ino: String(info.ino),
    type: artifactType(info),
    mode: info.mode & 0o777,
    size: info.size,
  });
}

function sameArtifactIdentity(left, right, { includeSize = false } = {}) {
  return Boolean(
    left &&
    right &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.type === right.type &&
    left.mode === right.mode &&
    (!includeSize || left.size === right.size)
  );
}

async function readStableArtifactIdentity(
  target,
  { expectedType = null, expectedMode = null, expectedDev = null } = {}
) {
  const first = await lstat(target, { bigint: false });
  invariant(!first.isSymbolicLink(), "private artifact is a symbolic link");
  const firstIdentity = projectArtifactIdentity(first);
  invariant(firstIdentity.type !== "unsupported", "private artifact type is unsupported");
  await realpath(target);
  const second = await lstat(target, { bigint: false });
  const secondIdentity = projectArtifactIdentity(second);
  invariant(
    sameArtifactIdentity(firstIdentity, secondIdentity, { includeSize: true }),
    "private artifact identity changed during observation"
  );
  if (expectedType !== null)
    invariant(secondIdentity.type === expectedType, "private artifact type drift");
  if (expectedMode !== null)
    invariant(secondIdentity.mode === expectedMode, "private artifact mode drift");
  if (expectedDev !== null)
    invariant(secondIdentity.dev === expectedDev, "private artifact device drift");
  return secondIdentity;
}

async function assertNoSymlinkAncestors(target) {
  invariant(
    path.isAbsolute(target) && path.resolve(target) === target,
    "ancestor path is not canonical"
  );
  const parsed = path.parse(target);
  let current = parsed.root;
  const segments = target.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const identities = [];
  for (const segment of segments) {
    current = path.join(current, segment);
    const info = await lstat(current);
    invariant(!info.isSymbolicLink(), "canonical path has a symbolic-link ancestor");
    identities.push(projectArtifactIdentity(info));
  }
  return deepFreezeExact(identities);
}

function createPrivateWorkspaceLedger(root, parentIdentity) {
  const ledger = Object.freeze({});
  PRIVATE_WORKSPACE_LEDGER.set(ledger, {
    root,
    parentPath: path.dirname(root),
    parentIdentity,
    rootIdentity: null,
    entries: new Map(),
    removed: false,
  });
  return ledger;
}

function privateWorkspaceRootDevice(ledger) {
  const state = PRIVATE_WORKSPACE_LEDGER.get(ledger);
  invariant(state && state.rootIdentity !== null, "private workspace root identity is unavailable");
  return state.rootIdentity.dev;
}

function registerWorkspaceArtifact(ledger, target, identity) {
  const state = PRIVATE_WORKSPACE_LEDGER.get(ledger);
  invariant(state && state.removed === false, "private workspace ledger is unavailable");
  const relative = path.relative(state.root, target);
  invariant(
    target === state.root ||
      (relative.length > 0 &&
        !relative.startsWith(".." + path.sep) &&
        relative !== ".." &&
        !path.isAbsolute(relative)),
    "private artifact escaped the workspace root"
  );
  const existing = state.entries.get(target);
  if (existing !== undefined) {
    invariant(
      sameArtifactIdentity(existing, identity, { includeSize: existing.type === "file" }),
      "private artifact identity was rebound"
    );
    return;
  }
  state.entries.set(target, identity);
}

function assignWorkspaceRootIdentity(ledger, identity) {
  const state = PRIVATE_WORKSPACE_LEDGER.get(ledger);
  invariant(state.rootIdentity === null, "private workspace root identity was assigned twice");
  state.rootIdentity = identity;
  registerWorkspaceArtifact(ledger, state.root, identity);
}

async function createOwnedWorkspaceDirectory(ledger, target, rootDev) {
  await mkdir(target, { mode: 0o700 });
  await chmod(target, 0o700);
  const identity = await readStableArtifactIdentity(target, {
    expectedType: "directory",
    expectedMode: 0o700,
    expectedDev: rootDev,
  });
  registerWorkspaceArtifact(ledger, target, identity);
  return identity;
}

async function writeOwnedWorkspaceFile(ledger, target, bytes) {
  invariant(Buffer.isBuffer(bytes), "private workspace file bytes are invalid");
  const flags =
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW;
  const handle = await open(target, flags, 0o600);
  let descriptorIdentity;
  try {
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.chmod(0o600);
    descriptorIdentity = projectArtifactIdentity(await handle.stat());
    invariant(
      descriptorIdentity.type === "file" && descriptorIdentity.mode === 0o600,
      "private workspace file descriptor identity drift"
    );
  } finally {
    await handle.close();
  }
  const identity = await readStableArtifactIdentity(target, {
    expectedType: "file",
    expectedMode: 0o600,
    expectedDev: descriptorIdentity.dev,
  });
  invariant(
    sameArtifactIdentity(descriptorIdentity, identity, { includeSize: true }),
    "private workspace file path and descriptor identity mismatch"
  );
  registerWorkspaceArtifact(ledger, target, identity);
  return identity;
}

async function readOwnedRegularFileNoFollow(target, expectedIdentity, maximumBytes) {
  const handle = await open(target, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const before = projectArtifactIdentity(await handle.stat());
    invariant(
      before.type === "file" &&
        sameArtifactIdentity(before, expectedIdentity, { includeSize: true }) &&
        before.size <= maximumBytes,
      "private file read identity drift"
    );
    const bytes = await handle.readFile();
    const after = projectArtifactIdentity(await handle.stat());
    invariant(
      sameArtifactIdentity(before, after, { includeSize: true }) && bytes.length === after.size,
      "private file changed during no-follow read"
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

async function inventoryPrivateWorkspace(ledger) {
  const state = PRIVATE_WORKSPACE_LEDGER.get(ledger);
  invariant(
    state && state.rootIdentity !== null && state.removed === false,
    "private workspace root is unowned"
  );
  const rootIdentity = await readStableArtifactIdentity(state.root, {
    expectedType: "directory",
    expectedDev: state.rootIdentity.dev,
  });
  invariant(
    sameArtifactIdentity(rootIdentity, state.rootIdentity),
    "private workspace root identity drift"
  );
  const walk = async (directory) => {
    const names = (await readdir(directory)).sort();
    invariant(names.length <= 4096, "private workspace directory entry bound exceeded");
    for (const name of names) {
      invariant(
        name !== "." && name !== ".." && !name.includes(path.sep),
        "private workspace entry name is unsafe"
      );
      const target = path.join(directory, name);
      const identity = await readStableArtifactIdentity(target, {
        expectedDev: state.rootIdentity.dev,
      });
      registerWorkspaceArtifact(ledger, target, identity);
      if (identity.type === "directory") await walk(target);
    }
  };
  await walk(state.root);
}

async function removePrivateWorkspaceLedger(ledger) {
  const state = PRIVATE_WORKSPACE_LEDGER.get(ledger);
  invariant(state !== undefined, "private workspace ledger is unknown");
  if (state.removed) return;
  if (state.rootIdentity === null) {
    const parentIdentity = await readStableArtifactIdentity(state.parentPath, {
      expectedType: "directory",
      expectedDev: state.parentIdentity.dev,
    });
    invariant(
      sameArtifactIdentity(parentIdentity, state.parentIdentity),
      "private workspace parent identity drift"
    );
    const discoveredRoot = await readStableArtifactIdentity(state.root, {
      expectedType: "directory",
      expectedDev: state.parentIdentity.dev,
    });
    assignWorkspaceRootIdentity(ledger, discoveredRoot);
  }
  await inventoryPrivateWorkspace(ledger);
  const ordered = [...state.entries.entries()].sort((left, right) => {
    const depthDelta = right[0].split(path.sep).length - left[0].split(path.sep).length;
    return depthDelta !== 0 ? depthDelta : right[0].localeCompare(left[0]);
  });
  for (const [target, expectedIdentity] of ordered) {
    const current = await readStableArtifactIdentity(target, {
      expectedDev: state.rootIdentity.dev,
    });
    invariant(
      sameArtifactIdentity(current, expectedIdentity, { includeSize: current.type === "file" }),
      "private workspace cleanup identity drift"
    );
    if (current.type === "directory") await rmdir(target);
    else await unlink(target);
    await requireMissingPath(target, "removed private artifact");
  }
  state.removed = true;
}

function serializeExactBrowserSecrets(adminEmail, adminPassword) {
  const values = { ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword };
  invariant(
    Object.values(values).every((value) => typeof value === "string" && value.length > 0),
    "browser secret value is invalid"
  );
  return Buffer.from(
    "ADMIN_EMAIL=" +
      JSON.stringify(values.ADMIN_EMAIL) +
      "\n" +
      "ADMIN_PASSWORD=" +
      JSON.stringify(values.ADMIN_PASSWORD) +
      "\n"
  );
}

function parseExactBrowserSecrets(bytes) {
  const text = decodeBoundedUtf8(bytes, "browser secrets readback", 64 * 1024);
  invariant(!text.includes("\r") && text.endsWith("\n"), "browser secrets frame drift");
  const assignmentNames = text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = /^([A-Z_]+)=/u.exec(line);
      invariant(match !== null, "browser secrets assignment is malformed");
      return match[1];
    });
  invariant(
    deepEqualJson(assignmentNames, ["ADMIN_EMAIL", "ADMIN_PASSWORD"]) &&
      new Set(assignmentNames).size === 2,
    "browser secrets assignments drift"
  );
  const parsed = parseEnv(text);
  exactOwnKeys(parsed, ["ADMIN_EMAIL", "ADMIN_PASSWORD"], "browser secrets readback");
  return parsed;
}

async function createPrivateBrowserWorkspace(
  root,
  plan,
  repoEnvironment,
  constructionCleanupAuthority
) {
  for (const relative of plan.requiredScreenshotPaths) {
    const absolute = path.resolve(root, relative);
    invariant(
      absolute.startsWith(root + path.sep) && path.relative(root, absolute) === relative,
      "screenshot path escaped the canonical repository root"
    );
    await requireMissingPath(absolute, "screenshot path " + relative);
  }
  const canonicalTmp = await realpath(tmpdir());
  await assertNoSymlinkAncestors(canonicalTmp);
  const tmpIdentity = await readStableArtifactIdentity(canonicalTmp, { expectedType: "directory" });
  const privateRoot = await mkdtemp(path.join(canonicalTmp, "wf540smoke-"));
  const ledger = createPrivateWorkspaceLedger(privateRoot, tmpIdentity);
  constructionCleanupAuthority.registerWorkspaceLedger(ledger);
  await chmod(privateRoot, 0o700);
  const rootIdentity = await readStableArtifactIdentity(privateRoot, {
    expectedType: "directory",
    expectedMode: 0o700,
    expectedDev: tmpIdentity.dev,
  });
  const rootRelativeToRepo = path.relative(root, privateRoot);
  const repoRelativeToRoot = path.relative(privateRoot, root);
  invariant(
    privateRoot.startsWith(canonicalTmp + path.sep) &&
      (rootRelativeToRepo.startsWith(".." + path.sep) || rootRelativeToRepo === "..") &&
      (repoRelativeToRoot.startsWith(".." + path.sep) || repoRelativeToRoot === ".."),
    "private workspace overlaps the repository"
  );
  assignWorkspaceRootIdentity(ledger, rootIdentity);
  const names = [
    "cwd",
    "cwd/.playwright",
    "home",
    "tmp",
    "xdg",
    "xdg/config",
    "xdg/cache",
    "xdg/data",
    "config",
    "output",
  ];
  for (const name of names) {
    const target = path.join(privateRoot, name);
    await createOwnedWorkspaceDirectory(ledger, target, rootIdentity.dev);
  }
  const cwd = path.join(privateRoot, "cwd");
  const configPath = path.join(privateRoot, "config", "playwright.json");
  const secretsPath = path.join(privateRoot, "config", "secrets.env");
  const outputDir = path.join(privateRoot, "output");
  const config = {
    browser: {
      browserName: "chromium",
      launchOptions: { args: ["--no-sandbox"] },
    },
    codegen: "none",
    outputDir,
  };
  const configBytes = Buffer.from(canonicalJson(config) + "\n");
  const configIdentity = await writeOwnedWorkspaceFile(ledger, configPath, configBytes);
  const adminEmail = ownString(repoEnvironment, "ADMIN_EMAIL", { required: true });
  const adminPassword = ownString(repoEnvironment, "ADMIN_PASSWORD", { required: true });
  const secretsBytes = serializeExactBrowserSecrets(adminEmail, adminPassword);
  const secretsIdentity = await writeOwnedWorkspaceFile(ledger, secretsPath, secretsBytes);
  const configReadback = await readOwnedRegularFileNoFollow(configPath, configIdentity, 64 * 1024);
  invariant(configReadback.equals(configBytes), "browser config bytes changed after write");
  const parsedConfig = JSON.parse(configReadback.toString("utf8"));
  invariant(deepEqualJson(parsedConfig, config), "browser config semantic readback drift");
  const secretsReadback = await readOwnedRegularFileNoFollow(
    secretsPath,
    secretsIdentity,
    64 * 1024
  );
  const parsedSecrets = parseExactBrowserSecrets(secretsReadback);
  invariant(
    parsedSecrets.ADMIN_EMAIL === adminEmail && parsedSecrets.ADMIN_PASSWORD === adminPassword,
    "browser secrets readback value drift"
  );
  const browserRoot = await realpath("/ms-playwright");
  invariant(browserRoot === "/ms-playwright", "browser runtime root is not canonical");
  await assertNoSymlinkAncestors(browserRoot);
  await readStableArtifactIdentity(browserRoot, { expectedType: "directory" });
  const environment = Object.create(null);
  environment.PATH = ownString(process.env, "PATH", { required: true });
  for (const key of BROWSER_OPTIONAL_INHERITED_ENV) {
    const value = ownString(process.env, key);
    if (value !== null) environment[key] = value;
  }
  applyFixedBrowserTimeoutEnvironment(environment, repoEnvironment, process.env);
  Object.assign(environment, {
    HOME: path.join(privateRoot, "home"),
    TMPDIR: path.join(privateRoot, "tmp"),
    TMP: path.join(privateRoot, "tmp"),
    TEMP: path.join(privateRoot, "tmp"),
    XDG_CONFIG_HOME: path.join(privateRoot, "xdg", "config"),
    XDG_CACHE_HOME: path.join(privateRoot, "xdg", "cache"),
    XDG_DATA_HOME: path.join(privateRoot, "xdg", "data"),
    PLAYWRIGHT_MCP_CONFIG: configPath,
    PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
    PLAYWRIGHT_MCP_SECRETS_FILE: secretsPath,
    PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright",
    CI: "1",
    NO_UPDATE_NOTIFIER: "1",
  });
  return {
    root: privateRoot,
    cwd,
    configPath,
    secretsPath,
    outputDir,
    ledger,
    environment: Object.freeze(environment),
  };
}

export {
  assertNoSymlinkAncestors,
  createPrivateBrowserWorkspace,
  privateWorkspaceRootDevice,
  projectArtifactIdentity,
  readOwnedRegularFileNoFollow,
  readStableArtifactIdentity,
  readStrictRepoEnvironment,
  registerWorkspaceArtifact,
  removePrivateWorkspaceLedger,
  requireMissingPath,
  sameArtifactIdentity,
};
