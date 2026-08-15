export const meta = {
  name: "task-532-impl",
  description:
    "Implement TASK-532 Typography Fidelity (fluid font-size clamp/rem + font-weight >bold + text-transform + eyebrow rule/divider + textColor on TEXT block) from the GO contract: ground → gated subtasks → post-audit → closure.",
  phases: [
    { title: "Ground", detail: "confirm typography seams" },
    { title: "Implement", detail: "gated subtasks per contract" },
    {
      title: "Post-audit",
      detail:
        "security(no arbitrary CSS) + regression + present-only + the .prose textColor live check",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};
const WT = args?.wt || "/home/coder/project/Coderso-task-532";
const TASKS = `${WT}/_docs/_TASKS`;
const COMMON = `Worktree ${WT} (off feature/tasks-fixes post-535). Implement the GO TASK-532 contract under ${TASKS} (parent + all 532 leaves). Invariants: present-only byte-identity, reject-unknown (allowlist+JSON schema additionalProperties:false+round-trip), colors ONLY via sanitizeAuthoringCssColor, fluid font-size ONLY via a strict validated clamp/rem grammar (NO arbitrary CSS), NO migration/schemaVersion/dep. Ground symbols before editing. Gates after each subtask: bun --cwd core lint, lint:types, root tsc, changed vitest. NOTE: the DoD was corrected to enumerate ALL rebaselined tests incl. page-document-v2.test.ts:787 (use the still-invalid token).`;
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
  `${COMMON}\nRead-only: confirm the typography seams — font-size token control + how to add a fluid clamp/rem value (strict grammar); font-weight enum extension; a present-only style.textTransform enum; textColor on the TEXT block (t()/text render at pageRendererV2 — the .prose inherited-var override fix); the eyebrow rule/divider primitive. Read the 532 contract + list the subtasks/leaves in land order + the owned breaking tests. Return a symbol→location map.`,
  { label: "ground:532", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 250)}`);

phase("Implement");
const leaves = await agent(
  `${COMMON}\nList the 532 subtasks/leaves from the contract under ${TASKS} in land order, then IMPLEMENT them ALL sequentially (each: model+schema+normalize present-only, render/CSS wiring, control, tests), grounding each symbol. Cover: (1) fluid font-size clamp/rem strict grammar; (2) font-weight >bold enum; (3) textTransform enum; (4) eyebrow rule/divider; (5) textColor on TEXT block + the .prose inherit-forcing fix. Update owned breaking tests (incl. page-document-v2.test.ts:787 still-invalid token). Run gates after each. Return an overall gate result + per-leaf done/gates.`,
  { label: "impl:532-all", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${leaves?.done} gates=${leaves?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "security",
    p: "SECURITY lens: the fluid font-size clamp/rem grammar + textTransform + textColor — can any reach the DOM as arbitrary CSS (injection via clamp() args, a crafted rem string, semicolon escape)? Is font-size custom validated to a STRICT numeric-unit grammar (not passthrough)? Is textColor sanitized at write+render? Try to break each. ≥MEDIUM for injection.",
  },
  {
    key: "regression-fidelity",
    p: "REGRESSION + FIDELITY lens: present-only byte-identity for a doc with no new typography field? Do existing typography tests + the 522-535 renderer stay green? Are owned rebaselines correct (DoD-enumerated, incl. :787)? CRITICAL: does the textColor-on-TEXT fix ACTUALLY win over Tailwind .prose descendant color (the contract's empirical concern) — verify via a render test asserting the inherit-forcing class/inline color reaches the child <p>/<span>, and flag that a live-smoke computed-color check is needed at closure. Run the relevant vitest.",
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
  `Close TASK-532 on ${WT}. ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed + broad pages run, gates:coderso). Docs (PAGE_MODEL/DESIGN_TOKENS typography). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG + README pointer/row. Board: TASK-532 + children Done + stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual (note the .prose textColor live-smoke is orchestrator-run post-merge).`,
  { label: "closure:532", phase: "Closure" }
);
return {
  task: "TASK-532",
  ground: ground.slice(0, 200),
  impl: leaves,
  postResidualLow: residual,
  closure,
};
