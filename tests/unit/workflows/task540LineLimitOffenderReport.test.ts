import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * `--check-task-family-line-limit` is the family's own worklist: every path it governs must
 * resolve to exactly one leaf owner and stay within 1,000 physical lines.
 *
 * It used to stop at the FIRST path that failed ownership resolution, which made the report a
 * lie by omission -- a run with six offenders named one and hid five, and a session lost two
 * rounds fixing them one re-run at a time. The offenders below are planted as untracked files,
 * a real source the gate reads (`git ls-files --others`), so the gate is held to reporting the
 * whole set from a single run.
 *
 * The probes are planted, measured and removed inside one gate run, which both tests share:
 * the gate walks the branch's history and reads every governed module, so it is far too slow
 * to run once per assertion. Each probe is a compiling module, so even a crash between
 * planting and cleanup leaves nothing that would break a type-check.
 */

const root = path.resolve(import.meta.dir, "../../..");
const workflowRelative = "_docs/_workflows/task-540-implement.mjs";
/** Governed by the gate (under `tests/`, a TypeScript extension) and owned by no leaf. */
const probeDirectory = "tests/unit/workflows/__line-limit-offender-probes";
const GATE_TIMEOUT_MS = 240_000;

const probes = Object.freeze({
  alpha: Object.freeze({ name: "ownerlessProbeAlpha", lines: 3 }),
  omega: Object.freeze({ name: "ownerlessProbeOmega", lines: 3 }),
  overLimit: Object.freeze({ name: "ownerlessProbeOverLimit", lines: 1_001 }),
});

function probePath(probe: { readonly name: string }): string {
  return probeDirectory + "/" + probe.name + ".ts";
}

function plantProbe(probe: { readonly name: string; readonly lines: number }): void {
  const filler = "// planted by task540LineLimitOffenderReport.test.ts; removed after the run\n";
  writeFileSync(
    path.join(root, probePath(probe)),
    filler.repeat(probe.lines - 1) + `export const ${probe.name} = ${probe.lines};\n`
  );
}

type GateRun = { readonly status: number | null; readonly report: string };

let cachedRun: GateRun | null = null;

/** One gate run with all three probes in place, shared by every test in this file. */
function gateRunWithProbesPlanted(): GateRun {
  if (cachedRun) return cachedRun;
  try {
    mkdirSync(path.join(root, probeDirectory), { recursive: true });
    for (const probe of Object.values(probes)) plantProbe(probe);
    const result = spawnSync("node", [workflowRelative, "--check-task-family-line-limit"], {
      cwd: root,
      encoding: "utf8",
      timeout: GATE_TIMEOUT_MS,
    });
    cachedRun = { status: result.status, report: result.stdout + result.stderr };
  } finally {
    rmSync(path.join(root, probeDirectory), { recursive: true, force: true });
  }
  return cachedRun;
}

test(
  "the family line-limit gate names every ownerless path, not just the first",
  () => {
    const { status, report } = gateRunWithProbesPlanted();

    expect(status).not.toBe(0);
    // The pre-fix gate threw on whichever path sorted first and never reached the others.
    expect(report).toContain(probePath(probes.alpha) + "=[]");
    expect(report).toContain(probePath(probes.omega) + "=[]");
    expect(report).toContain(probePath(probes.overLimit) + "=[]");
  },
  GATE_TIMEOUT_MS
);

test(
  "the family line-limit gate reports ownership and over-length from the same run",
  () => {
    const { status, report } = gateRunWithProbesPlanted();

    expect(status).not.toBe(0);
    // An unowned path's length must still be measured: giving it an owner would otherwise
    // convert one red into another the previous run had not disclosed.
    expect(report).toContain(probePath(probes.overLimit) + "=1001");
  },
  GATE_TIMEOUT_MS
);
