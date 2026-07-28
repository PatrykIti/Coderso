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
 * WHAT IT CANNOT COVER
 * --------------------
 * Dynamic imports with a computed specifier -- `import(someVariable)` -- are
 * not statically discoverable and do not appear in the metafile at all. This
 * script finds them by source scan and prints them on every run, so the
 * boundary is visible to whoever reads the build log rather than buried in a
 * report. See the "cannot be verified" section of the output.
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

const fail = (message) => {
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
let metafile;
try {
  process.stdout.write(
    `${NAME}: bundling the runtime graph from ${entrypoints.length} entrypoints\n`
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
    { cwd: root, encoding: "utf8" }
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
  fs.rmSync(outDir, { recursive: true, force: true });
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
  `\n${NAME}: graph = ${inputs.length} modules, ${firstParty.length} of them first-party\n`
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

/*
 * Printed on every run, pass or fail: this is the honest edge of the check.
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

process.stdout.write(
  `\n${NAME}: OK -- every statically discoverable import resolves in this tree.\n`
);
