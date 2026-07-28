#!/usr/bin/env bun
/**
 * Build-time proof that the runner stage's pruned dependency tree is complete.
 *
 * Run from the Dockerfile's runner stage against /app. Exits non-zero, with the
 * offending specifier and its importer named, if anything the runtime import
 * graph reaches cannot be resolved in the tree that is about to ship.
 *
 * WHY THIS IS NOT JUST `bun build`
 * --------------------------------
 * `bun build` alone is not sufficient, and the way it is insufficient is silent.
 * When an import cannot be resolved, Bun's bundler reports it as an error --
 * UNLESS the import sits inside a try/catch, in which case the bundler
 * downgrades it to an external and exits 0 with no diagnostic at all. Measured
 * on bun 1.3.14:
 *
 *   import x from "missing"                                -> error, exit 1
 *   await import("./missing.ts")                           -> error, exit 1
 *   await import("missing")                                -> error, exit 1
 *   try { await import("missing") } catch { ... }          -> exit 0, SILENT
 *   try { await import("./missing.ts") } catch { ... }     -> exit 0, SILENT
 *
 * That last shape is exactly `core/services/email/emailProvider.ts`, which does
 * `try { return await import("nodemailer") } catch { throw ... }`. Deleting
 * nodemailer from a pruned tree left a bare `bun build` exiting 0 -- so the
 * check passed on precisely the failure it was added to catch.
 *
 * The fix is to stop relying on the bundler's exit code alone and read the
 * module graph it produces. `--metafile` records every edge, and marks the
 * silently-dropped ones `"external": true`. This script fails on any such edge
 * whose importer is first-party code and whose specifier is not a Node/Bun
 * builtin -- which catches the guarded case regardless of try/catch.
 *
 * THE SECOND CHECK: NATIVE BINDINGS
 * ---------------------------------
 * The metafile rule above is scoped to FIRST-PARTY importers, and that scope has
 * a hole with teeth. A package can fail to resolve its own platform binary
 * through a try/catch `require` inside its own code, which is a third-party edge
 * and therefore ignored by design. @node-rs/argon2 is exactly that: deleting
 * @node-rs/argon2-linux-arm64-gnu and -musl left the metafile check exiting 0 in
 * every configuration, while `hashPassword` died with
 * `Error: Failed to load native binding` -- so nobody could log in.
 *
 * Covering every third-party try/catch require is not attempted; that surface is
 * large and mostly not ours. What IS enumerable, and what actually breaks, is the
 * narrow class this one belongs to: packages IN the runtime graph that ship their
 * binary as a platform-specific optional dependency. Those are found by reading
 * each graph package's own `optionalDependencies`, and each one is then LOADED in
 * a subprocess, which lets the package's own loader answer instead of guessing at
 * its resolution order. Measured on the current tree that is exactly one package.
 * The check prints the list it probed on every run, so its reach is visible.
 *
 * WHAT IT CANNOT COVER
 * --------------------
 * 1. Dynamic imports with a computed specifier -- `import(someVariable)` -- are
 *    not statically discoverable and do not appear in the metafile at all. This
 *    script finds them by source scan and prints them on every run that reaches
 *    the reporting stage, so the boundary is visible to whoever reads the build
 *    log rather than buried in a report. A bundler-resolution failure aborts
 *    before this point, so on that path the list is not printed at all. See the
 *    "cannot be verified" section of the output.
 * 2. Guarded third-party requires of ordinary (non-platform) packages -- an
 *    optional peer backend a dependency probes for with try/catch. Those are not
 *    enumerable from metadata and are NOT covered by either rule here.
 */

/* global process */
// The repo's flat ESLint config only declares Node globals for *.ts/*.tsx, so
// `process` is undeclared for a .mjs. Declared here rather than widening the
// shared config for one file.

import { spawnSync } from "node:child_process";
import { builtinModules } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NAME = "docker-resolve-check";

/**
 * Entrypoints of the runtime import graph.
 *
 * The two fixed files are what CMD actually executes: the server entry and the
 * --preload. The template glob is not reachable statically -- the two
 * renderPublic* modules load templates by filesystem path at request time (see
 * the computed-import report below) -- so the templates are named as
 * entrypoints to bring everything THEY import under the same check. A glob
 * rather than a fixed list so a newly added template is covered automatically.
 */
const FIXED_ENTRYPOINTS = ["core/server/dockerStart.ts", "core/server/productionReactRuntime.ts"];
const TEMPLATE_DIR = "core/templates";
const TEMPLATE_EXT = ".tsx";

const isBuiltin = (specifier) => {
  if (specifier.startsWith("node:") || specifier.startsWith("bun:")) return true;
  if (specifier === "bun") return true;
  return builtinModules.includes(specifier);
};

const isFirstParty = (inputPath) => !inputPath.split(path.sep).includes("node_modules");

/**
 * The package name owning a node_modules path, scope included.
 * `node_modules/@node-rs/argon2/index.js` -> `@node-rs/argon2`.
 */
const packageOf = (inputPath) => {
  const parts = inputPath.split(path.sep);
  const at = parts.lastIndexOf("node_modules");
  if (at < 0) return null;
  const first = parts[at + 1];
  if (!first) return null;
  return first.startsWith("@") ? (parts[at + 2] ? `${first}/${parts[at + 2]}` : null) : first;
};

/*
 * Temp directories this run created, so fail() can remove them.
 *
 * fail() ends the process with process.exit(), which does NOT run pending
 * `finally` blocks. The bundle's temp dir was removed only in a `finally`, so
 * every failing run -- the two fail() calls inside that try, an unresolvable
 * import and a missing metafile -- left a full bundle behind in the build's /tmp,
 * while the Dockerfile said the script "removes it itself". Registering the
 * directory here makes that claim hold on the failure paths too, which are the
 * paths that matter: a failing build is exactly when a check gets re-run.
 */
const tempDirs = new Set();
const removeTempDirs = () => {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best effort: a temp dir we cannot remove must not mask the real failure.
    }
  }
  tempDirs.clear();
};

const fail = (message) => {
  removeTempDirs();
  process.stderr.write(`${NAME}: ${message}\n`);
  process.exit(1);
};

/** Strip comments so a commented-out or prose "import (" is not mistaken for code. */
const stripComments = (source) => {
  let out = "";
  let state = "code";
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line";
        out += "  ";
        i += 1;
      } else if (c === "/" && next === "*") {
        state = "block";
        out += "  ";
        i += 1;
      } else if (c === '"' || c === "'" || c === "`") {
        state = c;
        out += c;
      } else {
        out += c;
      }
    } else if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += c;
      } else {
        out += " ";
      }
    } else if (state === "block") {
      if (c === "*" && next === "/") {
        state = "code";
        out += "  ";
        i += 1;
      } else {
        out += c === "\n" ? c : " ";
      }
    } else {
      // inside a string literal opened by `state`
      out += c;
      if (c === "\\") {
        out += source[i + 1] ?? "";
        i += 1;
      } else if (c === state) {
        state = "code";
      }
    }
  }
  return out;
};

/**
 * Classify every `import(...)` call site in a source file as literal (the
 * bundler can see it) or computed (nothing can see it at build time).
 */
const scanDynamicImports = (file, source) => {
  const literal = [];
  const computed = [];
  const stripped = stripComments(source);
  const strippedLines = stripped.split("\n");
  const rawLines = source.split("\n");
  strippedLines.forEach((line, index) => {
    const re = /(^|[^.\w$])import\s*\(/g;
    let match;
    while ((match = re.exec(line)) !== null) {
      const rest = line.slice(match.index + match[0].length).trimStart();
      const quote = rest[0];
      const site = { file, line: index + 1, text: (rawLines[index] ?? "").trim() };
      if (quote === '"' || quote === "'") {
        literal.push({ ...site, specifier: rest.slice(1, rest.indexOf(quote, 1)) });
      } else if (quote === "`") {
        const end = rest.indexOf("`", 1);
        const inner = rest.slice(1, end < 0 ? undefined : end);
        if (inner.includes("${")) computed.push(site);
        else literal.push({ ...site, specifier: inner });
      } else {
        computed.push(site);
      }
    }
  });
  return { literal, computed };
};

const root = path.resolve(process.argv[2] ?? "/app");
if (!fs.existsSync(path.join(root, "package.json"))) {
  fail(`no package.json under ${root} -- pass the application root as argv[1]`);
}

/*
 * The configuration this check measures in is pinned, because it was not, and
 * every number the check reported described a module graph the container never
 * loads. NODE_ENV drives conditional exports: React resolves its development
 * builds when NODE_ENV is unset and its production builds when it is
 * "production". Measured on the pruned tree, same tree, same bun:
 *
 *   NODE_ENV unset       3131 modules  react/jsx-dev-runtime.js,
 *                                      react-dom/cjs/react-dom-server.bun.development.js, ...
 *   NODE_ENV=production  3129 modules  react-dom/cjs/react-dom-server.bun.production.js, ...
 *
 * Seven dev-only modules in one, five production modules in the other. So an
 * unpinned run verifies files the image will never open and does NOT verify the
 * ones it will. The runner stage sets ENV NODE_ENV=production before this runs;
 * requiring that exact value here means the two cannot drift apart silently --
 * change the Dockerfile's ENV and this check fails until it is changed too.
 */
const REQUIRED_NODE_ENV = "production";
if (process.env.NODE_ENV !== REQUIRED_NODE_ENV) {
  fail(
    `NODE_ENV is ${process.env.NODE_ENV === undefined ? "unset" : `"${process.env.NODE_ENV}"`}, ` +
      `this check only measures NODE_ENV="${REQUIRED_NODE_ENV}".\n` +
      `  NODE_ENV selects conditional exports, so it changes the module graph: unset, the\n` +
      `  graph pulls React's development builds, which the runner stage never loads. The\n` +
      `  runner sets ENV NODE_ENV=${REQUIRED_NODE_ENV}; if that changed, change this too.`
  );
}

/** Passed explicitly to every subprocess so the pinned value cannot be lost. */
const childEnv = { ...process.env, NODE_ENV: REQUIRED_NODE_ENV };

const templateDir = path.join(root, TEMPLATE_DIR);
const templates = fs.existsSync(templateDir)
  ? fs
      .readdirSync(templateDir)
      .filter((f) => f.endsWith(TEMPLATE_EXT))
      .sort()
      .map((f) => `${TEMPLATE_DIR}/${f}`)
  : [];
if (templates.length === 0) {
  fail(
    `no ${TEMPLATE_EXT} entrypoints under ${TEMPLATE_DIR}. They are loaded by path at\n` +
      `  request time, so an empty glob would silently shrink this check rather than fail it.`
  );
}

const entrypoints = [...FIXED_ENTRYPOINTS, ...templates];
for (const entry of entrypoints) {
  if (!fs.existsSync(path.join(root, entry))) fail(`entrypoint not found: ${entry}`);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-check-"));
tempDirs.add(outDir);
let metafile;
try {
  process.stdout.write(
    `${NAME}: bundling the runtime graph from ${entrypoints.length} entrypoints ` +
      `(NODE_ENV=${REQUIRED_NODE_ENV})\n`
  );
  for (const entry of entrypoints) process.stdout.write(`  ${entry}\n`);

  const build = spawnSync(
    "bun",
    [
      "build",
      "--target=bun",
      `--outdir=${outDir}`,
      `--metafile=${path.join(outDir, "meta.json")}`,
      ...entrypoints,
    ],
    { cwd: root, encoding: "utf8", env: childEnv }
  );

  if (build.status !== 0) {
    process.stderr.write(build.stdout ?? "");
    process.stderr.write(build.stderr ?? "");
    fail(
      "FAIL -- the bundler could not resolve an import (see above).\n" +
        "  Something the runtime graph reaches is missing from this tree. If it is a\n" +
        "  package, it is probably declared in devDependencies but needed at runtime."
    );
  }

  const metaPath = path.join(outDir, "meta.json");
  if (!fs.existsSync(metaPath)) fail("bun build produced no metafile -- cannot verify the graph");
  metafile = JSON.parse(fs.readFileSync(metaPath, "utf8"));
} finally {
  // Covers the success path and any thrown error; fail() covers its own exits.
  removeTempDirs();
}

const inputs = Object.entries(metafile.inputs ?? {});
const firstParty = inputs.filter(([file]) => isFirstParty(file));

/*
 * Edges the bundler dropped. `external: true` on a default (bundling) build
 * means Bun did not pull the module in: either it is a builtin, or it could not
 * be resolved and the try/catch let that pass quietly. Builtins are filtered
 * out; whatever is left is a module that will be missing at runtime.
 *
 * Scoped to first-party importers on purpose. Third-party packages carry their
 * own guarded optional requires by the hundred -- platform-specific .node
 * binaries, optional peer backends -- and those are their business, not a
 * defect in our pruning.
 */
const unresolved = [];
const verifiedLazyPackages = [];
for (const [file, input] of firstParty) {
  for (const edge of input.imports ?? []) {
    const specifier = edge.original ?? edge.path;
    if (edge.external) {
      if (!isBuiltin(edge.path) && !isBuiltin(specifier)) {
        unresolved.push({ file, specifier, kind: edge.kind });
      }
    } else if (edge.kind === "dynamic-import" && !specifier.startsWith(".")) {
      verifiedLazyPackages.push({ file, specifier });
    }
  }
}

/*
 * Native bindings: the class the rule above ignores by design, and the one that
 * took down password hashing.
 *
 * Every third-party package the graph actually reaches is inspected for
 * `optionalDependencies`. That is the napi-rs/prebuild convention for shipping a
 * platform binary as a separate package, and it is the only part of this failure
 * mode that is enumerable from metadata -- the require that consumes it lives in
 * third-party code inside a try/catch, so no static rule here can see it.
 *
 * Each candidate is then LOADED in a subprocess with this process's environment,
 * so the package's own loader decides, and its error chain (which names the exact
 * .node file and package it looked for) is what gets reported. A subprocess so a
 * hard native crash fails the check instead of killing it, and so any import side
 * effects stay out of this process.
 */
const graphPackages = new Set();
for (const [file] of inputs) {
  if (isFirstParty(file)) continue;
  const name = packageOf(file);
  if (name) graphPackages.add(name);
}

const nativeCandidates = [];
for (const name of [...graphPackages].sort()) {
  const manifestPath = path.join(root, "node_modules", name, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }
  const optional = Object.keys(manifest.optionalDependencies ?? {});
  if (optional.length === 0) continue;
  nativeCandidates.push({ name, optional });
}

const bindingFailures = [];
const bindingOk = [];
for (const { name, optional } of nativeCandidates) {
  const present = optional.filter((dep) => fs.existsSync(path.join(root, "node_modules", dep)));
  const probe = spawnSync(
    "bun",
    [
      "-e",
      `const spec = ${JSON.stringify(name)};\n` +
        `try { await import(spec); process.stdout.write("PROBE-OK"); }\n` +
        `catch (err) {\n` +
        `  const parts = [];\n` +
        `  const walk = (e, d) => {\n` +
        `    if (!e || d > 4) return;\n` +
        `    parts.push(String(e?.message ?? e));\n` +
        `    if (Array.isArray(e?.cause)) e.cause.forEach((c) => walk(c, d + 1));\n` +
        `    else if (e?.cause) walk(e.cause, d + 1);\n` +
        `  };\n` +
        `  walk(err, 0);\n` +
        `  process.stdout.write("PROBE-ERR " + parts.join("\\n      "));\n` +
        `  process.exit(3);\n` +
        `}\n`,
    ],
    { cwd: root, encoding: "utf8", env: childEnv }
  );
  const detail = `${probe.stdout ?? ""}${probe.stderr ?? ""}`
    .replace(/^PROBE-(OK|ERR) ?/, "")
    .trim();
  if (probe.status === 0) bindingOk.push({ name, present, optional });
  else bindingFailures.push({ name, present, optional, detail });
}

const computedSites = [];
let literalCount = 0;
for (const [file] of firstParty) {
  const abs = path.join(root, file);
  let source;
  try {
    source = fs.readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  const { literal, computed } = scanDynamicImports(file, source);
  literalCount += literal.length;
  computedSites.push(...computed);
}

process.stdout.write(
  `\n${NAME}: graph = ${inputs.length} modules, ${firstParty.length} of them first-party ` +
    `(NODE_ENV=${REQUIRED_NODE_ENV})\n`
);

process.stdout.write(
  `\n${NAME}: ${literalCount} dynamic import(s) with a literal specifier in first-party code; ` +
    `all are covered by the check below.\n`
);
if (verifiedLazyPackages.length > 0) {
  process.stdout.write(
    `${NAME}: lazily-imported PACKAGES verified present in this tree ` +
      `(the class that used to slip through):\n`
  );
  const seen = new Set();
  for (const { file, specifier } of verifiedLazyPackages) {
    const key = `${specifier} ${file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    process.stdout.write(`  ${specifier.padEnd(34)} <- ${file}\n`);
  }
}

process.stdout.write(
  `\n${NAME}: native bindings -- ${graphPackages.size} third-party package(s) in the graph, ` +
    `${nativeCandidates.length} ship a platform binary as an optional dependency:\n`
);
if (nativeCandidates.length === 0) {
  process.stdout.write("  (none)\n");
} else {
  for (const { name, present, optional } of [...bindingOk, ...bindingFailures]) {
    const verdict = bindingFailures.some((f) => f.name === name) ? "FAILED TO LOAD" : "loads";
    process.stdout.write(
      `  ${name.padEnd(34)} ${verdict}  (${present.length}/${optional.length} platform package(s) present)\n`
    );
  }
}

/*
 * Printed on every run that reaches this point, pass or fail: this is the honest
 * edge of the check. A bundler-resolution failure exits earlier and never gets
 * here, which is why the claim is scoped rather than absolute.
 */
process.stdout.write(`\n${NAME}: NOT verifiable at build time -- computed specifiers:\n`);
if (computedSites.length === 0) {
  process.stdout.write("  (none)\n");
} else {
  for (const site of computedSites) {
    process.stdout.write(`  ${site.file}:${site.line}\n      ${site.text}\n`);
  }
  process.stdout.write(
    `  The specifier is built at runtime, so no static tool can confirm the target\n` +
      `  exists. These load ${TEMPLATE_DIR}/*${TEMPLATE_EXT} by filesystem path per request; those\n` +
      `  files are named as entrypoints above, so everything THEY import IS checked --\n` +
      `  but the path itself is only proven by actually serving a page. That is the\n` +
      `  CI image-boot gate's job, not this check's.\n`
  );
}

if (unresolved.length > 0) {
  process.stderr.write(
    `\n${NAME}: FAIL -- ${unresolved.length} import(s) in the runtime graph do not resolve in this tree:\n\n`
  );
  for (const { file, specifier, kind } of unresolved) {
    process.stderr.write(`  ${specifier}\n`);
    process.stderr.write(`      imported by  ${file}\n`);
    process.stderr.write(`      kind         ${kind}\n`);
  }
  process.stderr.write(
    `\n  These did NOT fail the bundler: an unresolvable import inside a try/catch is\n` +
      `  downgraded to an external and \`bun build\` still exits 0. They would fail at\n` +
      `  runtime instead -- for a lazily-imported module, only once the feature that\n` +
      `  needs it is first used, which can be weeks after the image ships.\n\n` +
      `  Add the package to core's dependencies (not devDependencies), or copy the\n` +
      `  missing path into the runner stage.\n`
  );
  process.exit(1);
}

if (bindingFailures.length > 0) {
  process.stderr.write(
    `\n${NAME}: FAIL -- ${bindingFailures.length} package(s) in the runtime graph cannot load ` +
      `their native binding in this tree:\n\n`
  );
  for (const { name, present, optional, detail } of bindingFailures) {
    process.stderr.write(`  ${name}\n`);
    process.stderr.write(
      `      platform packages  ${present.length} of ${optional.length} declared are present\n`
    );
    process.stderr.write(`      loader said        ${detail || "(no output)"}\n`);
    const missing = optional.filter((dep) => !present.includes(dep));
    if (missing.length > 0) {
      process.stderr.write(`      absent             ${missing.length}: ${missing.join(", ")}\n`);
    }
  }
  process.stderr.write(
    `\n  The bundler cannot see this: the binary is loaded by a try/catch \`require\` inside\n` +
      `  the package's own code, so it is a third-party edge and the metafile rule above\n` +
      `  ignores it by design. It fails at runtime the first time the feature is used --\n` +
      `  for @node-rs/argon2 that is any password hash or verify, so nobody can log in.\n\n` +
      `  Restore the platform package for this image's os/cpu. Note that\n` +
      `  \`bun install --production\` KEEPS optionalDependencies, so a tree that reaches\n` +
      `  this message has had them removed by something other than the prune.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `\n${NAME}: OK -- every statically discoverable import resolves in this tree, and ` +
    `${bindingOk.length} native binding(s) load.\n`
);
