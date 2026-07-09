export const meta = {
  name: "task-534-impl",
  description:
    "Implement TASK-534 Declarative Interactivity (tabs/switcher block + filterable gallery + polish: noise/scroll-hint/magnetic) from the GO contract: ground → gated subtasks → adversarial post-audit (runtime XSS + a11y + present-only) → closure.",
  phases: [
    { title: "Ground", detail: "confirm the new block type surfaces + runtime IIFE seam" },
    { title: "Implement", detail: "gated subtasks per contract" },
    {
      title: "Post-audit",
      detail: "runtime-static/XSS + a11y/keyboard + reduced-motion + present-only + regression",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};
const WT = args?.wt || "/home/coder/project/Coderso-task-534";
const TASKS = `${WT}/_docs/_TASKS`;
const COMMON = `Worktree ${WT} (off feature/tasks-fixes post-535). Implement the GO TASK-534 contract under ${TASKS} (parent + all 534 leaves). This adds a new declarative TABS/switcher block type + filterable gallery + polish (noise texture, scroll-hint, magnetic button). Invariants: present-only byte-identity, reject-unknown (allowlist+JSON schema additionalProperties:false+round-trip), a new pageBlockType is introduced ATOMICALLY across ALL exhaustive Record<PageBlockType,…> surfaces (like 522's customSvg); ALL runtime rides the SINGLE existing pageEffectsRuntime <script> as a STATIC dependency-free IIFE (NO interpolation of stored data, NO eval/Function/innerHTML of dynamic values, self-guard idempotent per 535), reduced-motion + keyboard + aria-tablist safe; NO migration/schemaVersion/dep. Ground symbols first. Gates after each subtask.`;
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "verdict", "findings"],
  properties: {
    lens: { type: "string" },
    verdict: { type: "string", enum: ["clean", "issues"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "fix"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
  },
};
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "gatesGreen", "summary"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `${COMMON}\nRead-only: confirm the seams — the exhaustive Record<PageBlockType,…> surfaces a new block type must be added to (grep the 522 customSvg addition as the template); the pageEffectsRuntime.ts single-<script> IIFE + the 535 idempotency self-guard (new clauses append to the SAME source); the emit predicate (anyMotion) + how a tabs/filter/scroll-hint/magnetic clause is gated; the noise-texture present-only page/section option. Read the 534 contract + list subtasks/leaves in land order + owned breaking tests. Return a symbol→location map.`,
  { label: "ground:534", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 250)}`);

phase("Implement");
const impl = await agent(
  `${COMMON}\nList the 534 subtasks/leaves from the contract in land order, then IMPLEMENT them ALL sequentially, grounding each symbol: (1) TABS/switcher block type (N labelled panels) atomically across all PageBlockType surfaces + render + runtime click-toggle (aria-tablist, keyboard arrows, reduced-motion) + controls; (2) filterable gallery (data-category chips + runtime show/hide); (3) polish — noise/grain texture overlay option, scroll-hint block, magnetic-button hover runtime. All runtime = static clauses appended to the ONE pageEffectsRuntime source, idempotent, present-only. Behavioral tests (run the IIFE + simulate click/scroll/pointer/keyboard). Update owned tests. Run gates after each. Return overall gate result + per-leaf done/gates.`,
  { label: "impl:534-all", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${impl?.done} gates=${impl?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "runtime-security",
    p: "RUNTIME-SECURITY lens: are ALL new runtime clauses (tabs toggle, filter, scroll-hint, magnetic) STATIC strings with NO interpolation of stored data (no eval/Function/innerHTML of dynamic values, no user string in a selector/handler)? Is the tabs panel content sanitized (labels/panels through the normal block sanitizers)? Is the single-<script> still emitted once + idempotent (535 self-guard preserved)? Try to find a script-injection or a stored-value-into-runtime path. ≥HIGH for any.",
  },
  {
    key: "a11y-motion",
    p: "A11Y + REDUCED-MOTION lens: is the tabs block a proper aria-tablist (roles, aria-selected, keyboard arrow/Home/End, focus management)? Filter chips accessible? Do scroll-hint + magnetic + tab transitions respect prefers-reduced-motion (no motion for reduce users, content still reachable)? Flag a11y gaps ≥MEDIUM.",
  },
  {
    key: "regression-presentonly",
    p: "REGRESSION + PRESENT-ONLY lens: new block type added to EVERY exhaustive Record<PageBlockType,…> surface (no missing case → no runtime crash)? A doc with no tabs/filter/noise/scroll-hint/magnetic byte-identical to pre-534 (present-only)? 522-535 effects + the runtime still work (one script)? Reject-unknown intact? Owned tests correct? Run the relevant vitest.",
  },
];
let residual = [];
let pr = 0;
while (pr < 3) {
  pr++;
  const audits = await parallel(
    POST.map(
      (l) => () =>
        agent(`${l.p}\nWorktree ${WT}. Structured audit (lens="${l.key}").`, {
          label: `postaudit:${l.key}#${pr}`,
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        })
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blk = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`post-audit ${pr}: ${all.length} findings, ${blk.length} blocking`);
  if (!blk.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these BLOCKING findings in the code on ${WT}, re-run gates. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${pr}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-534 on ${WT}. ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed + broad pages run, gates:coderso). Docs (PAGE_MODEL/WIDGETS/SECURITY_SPEC — tabs/filter/polish + runtime). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG + README pointer/row. Board: TASK-534 + children Done + stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual (note the live interactive smoke is orchestrator-run post-merge).`,
  { label: "closure:534", phase: "Closure" }
);
return { task: "TASK-534", ground: ground.slice(0, 200), impl, postResidualLow: residual, closure };
