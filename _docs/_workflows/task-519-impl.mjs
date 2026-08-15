export const meta = {
  name: "task-519-impl",
  description:
    "Implement TASK-519 (advanced alpha-capable color input across all admin editors) on its worktree: 6 strictly-sequential subtasks (shared color-value helper → ColorSwatchControl alpha upgrade → SharedColorControl+ClearableFields alpha upgrade → menu rollout verify → widget rollout verify → closure), each gated green, then parallel adversarial audits, fix real findings, closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-519";
const BASE = (typeof args === "string" ? JSON.parse(args) : args)?.base || "feature/tasks-fixes";
const ENV = `cd ${WT} && set -a && { [ -f .env ] || cp /home/coder/project/Coderso/.env .env 2>/dev/null; }; . ./.env 2>/dev/null; set +a`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "filesEdited", "gates", "notes"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    filesEdited: { type: "array", items: { type: "string" } },
    gates: { type: "string" },
    notes: { type: "string" },
  },
};
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "findings", "verdict"],
  properties: {
    lens: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const CLOSURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "done",
    "changelogFile",
    "docsUpdated",
    "boardUpdated",
    "gates",
    "committed",
    "commitSha",
    "notes",
  ],
  properties: {
    done: { type: "boolean" },
    changelogFile: { type: "string" },
    docsUpdated: { type: "boolean" },
    boardUpdated: { type: "boolean" },
    gates: { type: "string" },
    committed: { type: "boolean" },
    commitSha: { type: "string" },
    notes: { type: "string" },
  },
};

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-519, off ${BASE}). This is TASK-519 (advanced alpha-capable color input across all admin editors).
ALWAYS read first: ${WT}/_docs/_TASKS/TASK-519_Advanced_Alpha_Capable_Color_Input.md (parent) AND your subtask's file(s) INCLUDING its NN-LNN leaves (they carry the execution-ready pseudocode + regression-test shape). Edit ONLY the files your subtask owns (single-writer per the parent's ownership map).
GOAL: everywhere a color is authored in the admin, the user can enter + round-trip alpha-capable values (8-digit hex #rrggbbaa like #0812209e, rgba(), hsla()) with an alpha channel/slider, keep 'transparent', and keep the palette/token swatch UX. The STORAGE layer already accepts these formats; this is a shared-UI-control upgrade + rollout.
CRITICAL (audited HIGH): the render boundary resolveClearableCssColorValue (core/widgets/core/clearableStyle.ts) REJECTS bare leading-dot alpha '.84' — it needs '0.84'. So normalizeAdminColorValue (519-01) MUST CANONICALIZE leading-dot alpha '.84'->'0.84' on emit, and BOTH ColorSwatchControl (519-02, menu/page) AND SharedColorControl free-text (519-03, widget) must route their committed value through it so the owner's exact token rgba(8,17,31,.84) survives to front render as rgba(8,17,31,0.84). Do NOT loosen resolveClearableCssColorValue.
519-03 also RE-BASELINES 4 existing assertions to the new alpha behavior (tests/vitest/ui/clearable-fields.test.tsx:102/109 + tests/vitest/ui/shared-color-control.test.tsx:239-241/309-326) — this is an INTENDED contract change (rgba-with-alpha becomes picker-representable → base color extracted; state selected_swatch), NOT weakening.
Present-only, NO schema change, NO DB migration, NO new npm dependency. Test import specifiers: use RELATIVE paths (../../../core/...) NOT '@/...' aliases; render tests use createRoot from react-dom/client (NOT @testing-library/react).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

// Land order: 519-01 -> 519-02 -> 519-03 -> 519-04 -> 519-05 -> (519-06 closure).
const SUBTASKS = [
  {
    id: "519-01",
    file: "TASK-519-01-Shared-Admin-Color-Value-Helper.md",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the new color-value module tests (parse/compose/canonicalize incl. leading-dot .84->0.84, whitelist-parity subset of resolveClearableCssColorValue + normalizeMenuColorValue)",
  },
  {
    id: "519-02",
    file: "TASK-519-02-ColorSwatchControl-Alpha-Upgrade.md",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the ColorSwatchControl tests (alpha slider + hex8/rgba round-trip + canonical emit)",
  },
  {
    id: "519-03",
    file: "TASK-519-03-SharedColorControl-Alpha-Upgrade.md",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for SharedColorControl + ClearableFields tests INCLUDING the 4 re-baselined existing assertions (clearable-fields.test.tsx, shared-color-control.test.tsx) — confirm they now pass against the new alpha behavior",
  },
  {
    id: "519-04",
    file: "TASK-519-04-Menu-Rollout-Verification.md",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the menu editor tests (verify alpha propagates through the upgraded ColorSwatchControl; persisted menu color values stay schema-valid)",
  },
  {
    id: "519-05",
    file: "TASK-519-05-Widget-Editor-Rollout-Verification.md",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit (MANDATORY — covers all widget editor test renders); bun run test:vitest for the widget-editor tests across the 5 clusters (verify each editor's color controls accept alpha + persist valid values)",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} + ALL its NN-LNN leaf files for the execution-ready pseudocode + test shapes. Follow them PRECISELY. Edit ONLY this subtask's owned files.
${prevNote ? `PRIOR SUBTASK CONTEXT: ${prevNote}` : "This is the foundation subtask (the shared color-value helper the later subtasks import)."}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line for each in the gates field.

Return the structured result. In notes, include what the NEXT subtask needs (new helper/export names + signatures e.g. normalizeAdminColorValue/parseColorValue, control prop additions, the canonical-emit contract).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(`STOP: ${st.id} not green — halting (resume via resumeFromRunId).`);
    return { task: "TASK-519", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 700)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "canonicalization",
    prompt: `Adversarial CORRECTNESS audit of TASK-519 in worktree ${WT}, focused on the leading-dot alpha canonicalization + round-trip. Review \`cd ${WT} && git diff ${BASE}...feature/task-519\`. PROVE: (1) normalizeAdminColorValue rewrites leading-dot '.84'->'0.84' (and '.06'->'0.06') on emit; (2) ColorSwatchControl (menu/page) AND SharedColorControl free-text (widget) BOTH route committed values through it so an authored rgba(8,17,31,.84) emits rgba(8,17,31,0.84); (3) resolveClearableCssColorValue (unchanged) accepts the emitted canonical form (so the owner token survives to front render); (4) the alpha slider + hex8/rgba text round-trip correctly (decompose #rrggbbaa <-> {hex,alpha}); (5) 'transparent' + palette/token swatch UX preserved. Flag any path where an authored alpha value would be dropped at render. isReal only if defensible with file:line.`,
  },
  {
    key: "security",
    prompt: `Adversarial SECURITY audit of TASK-519 in worktree ${WT}. The widened color inputs now accept more formats — PROVE the admin normalize/validate WHITELISTS formats (hex3/6/8, rgb/rgba, hsl/hsla, transparent, var()) and REJECTS/clamps anything else, so a crafted color string cannot inject CSS/HTML/JS into an inline style attribute or a <style> block (no ';', no '}', no 'expression(', no 'url(javascript:' etc. surviving). Confirm the accepted-set is a strict subset of BOTH the render boundary (resolveClearableCssColorValue) and the menu boundary (normalizeMenuColorValue) in canonical form. Flag any injection or over-permissive passthrough. isReal only if defensible.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION audit of TASK-519 in worktree ${WT}. Verify: (1) the 4 re-baselined existing assertions (clearable-fields.test.tsx:102/109, shared-color-control.test.tsx:239-241/309-326) were updated to the NEW intended alpha behavior (not deleted/weakened) and pass; (2) existing 6-digit-hex values still work (back-compat); (3) NO schema change / NO migration / NO new dependency (check package.json diff is empty); (4) the ~31 widget editors + menu still compile + their color controls render. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:vitest\` (color + editor files) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
  },
];
const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(l.prompt, { label: `audit:${l.key}`, phase: "Audit", schema: AUDIT_SCHEMA }).then(
        (a) => ({ ...a, key: l.key })
      )
  )
);
const realFindings = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key })));
const realHighMed = realFindings.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
log(
  `Audit: ${audits
    .filter(Boolean)
    .map((a) => `${a.key}=${a.verdict}`)
    .join(
      " "
    )} | real HIGH/MED=${realHighMed.length} LOW=${realFindings.length - realHighMed.length}`
);

phase("Fix");
if (realHighMed.length > 0) {
  const fixList = realHighMed
    .map((f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file} — ${f.title}: ${f.detail}`)
    .join("\n");
  const fix = await agent(
    `${COMMON}\n\nFix these REAL audit findings on the TASK-519 implementation in worktree ${WT}. Respect single-writer ownership; do NOT weaken tests. Security findings fully closed. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest files. Findings:\n${fixList}\n\nReport changes + re-run gates.`,
    { label: "fix:519", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else log("Fix: no real HIGH/MEDIUM — skipping.");

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 519-06 (Tests, Docs, Closure) — read ${WT}/_docs/_TASKS/TASK-519-06-Tests-Docs-Closure.md. The 5 implementation subtasks are applied + audited; do NOT edit their owned production files. Your job:
1) TESTS — complete any closure-specified tests; ensure gates green (the re-baselined existing tests are owned by 519-03 — do not re-touch).
2) DOCS — update DESIGN_TOKENS.md / the color-control docs the contract names (alpha-capable color input; canonicalization note).
3) CHANGELOG — pinned 1232; verify next-free (\`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\`) and use the actual next-free if 1232 is taken; create _docs/_CHANGELOG/<N>-2026-07-07-task-519-alpha-color-input.md; bump README next-pointer; fix stale pins in the 519 files.
4) BOARD — _docs/_TASKS/README.md: add parent TASK-519 + all children rows (or flip to Done if present); bump Statistics.
5) TASK FILES — Status ✅ Done in parent + all subtask + leaf files.
6) FINAL GATES (run in ${WT}, capture each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: LIVE playwright smoke (alpha color authoring across editors) is run by the ORCHESTRATOR post-merge — do NOT restart the dev host.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(admin): TASK-519 alpha-capable color input across all admin editors" with a body summarizing the shared helper + control upgrades + rollout + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nPrecommit hook runs lint+typecheck — fix + re-commit if it blocks. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:519-06", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-519",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
