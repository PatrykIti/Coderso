import { constants as fsConstants } from "node:fs";
import path from "node:path";

import { deepFreezeExact, invariant } from "./validation.mjs";

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
  } catch {
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

export function viteCacheAuthorityTargets(root) {
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

export async function validateViteCacheAuthorities(root, deps, required) {
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

export async function validateCanonicalRootAndToolchain(root, environment, deps) {
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
