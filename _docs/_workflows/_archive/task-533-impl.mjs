export const meta = {
  name: "task-533-impl",
  description:
    "Implement TASK-533 Layout (grid row/col span + asymmetric column ratios + per-edge border + native timeline axis/dots) from the GO contract: ground → gated subtasks → post-audit → closure. Branched post-531 (shares the ...rest mutation seam + toPageSectionStyle).",
  phases: [
    {
      title: "Ground",
      detail: "confirm layout/grid + border + timeline seams; the post-531 ...rest mutation form",
    },
    { title: "Implement", detail: "gated subtasks per contract" },
    {
      title: "Post-audit",
      detail:
        "security(border color sanitize) + regression + present-only + fidelity(span/asym/timeline)",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};
const WT = args?.wt || "/home/coder/project/Coderso-task-533";
const TASKS = `${WT}/_docs/_TASKS`;
const COMMON = `Worktree ${WT} (off feature/tasks-fixes POST-531 — the pageEditorMutationActions destructure is ALREADY [group,key,...rest] from 531; 533 ADDS its border.*.color handling onto that same form, additively, NOT reverting to [group,key]). Implement the GO TASK-533 contract under ${TASKS} (parent + all 533 leaves). Invariants: present-only byte-identity, reject-unknown (allowlist+JSON schema additionalProperties:false in ALL section-style schema mirrors + round-trip), colors ONLY via sanitizeAuthoringCssColor, NO migration/schemaVersion/dep. Ground symbols before editing (esp. the TWO section-style schema mirrors the contract pins). Gates after each subtask.`;
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
  `${COMMON}\nRead-only: confirm the seams — (1) section grid layout (columns/align/justify) + how to add block colSpan/rowSpan (clamped present-only) + asymmetric column ratios (a section ratio field or template); (2) per-edge section border (color via sanitizeAuthoringCssColor + numeric width, top/bottom or per-edge) + the pageEditorMutationActions [group,key,...rest] border.*.color routing (add onto 531's form); (3) the "timeline" section type — does it already render a vertical axis+dots, or must the render be added? Read the 533 contract + list subtasks/leaves in land order + the TWO section-style schema mirrors + owned breaking tests. Return a symbol→location map.`,
  { label: "ground:533", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 250)}`);

phase("Implement");
const impl = await agent(
  `${COMMON}\nList the 533 subtasks/leaves in land order, then IMPLEMENT them ALL sequentially, grounding each symbol: (1) grid row/col SPAN + asymmetric column ratios (present-only, clamped) reproducing project-card.large span-2 + hero 1/1.2fr; (2) per-edge border (border-block) via sanitizeAuthoringCssColor + numeric width + the [group,key,...rest] border.*.color mutation routing (additive onto 531's form); (3) timeline axis+dots (use existing "timeline" type if it delivers, else add the render). Update BOTH section-style schema mirrors + owned layout tests. Run gates after each. Return overall gate result + per-leaf done/gates.`,
  { label: "impl:533-all", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${impl?.done} gates=${impl?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "security-regression",
    p: "SECURITY + REGRESSION lens: border color sanitized at write+render (no CSS injection)? The [group,key,...rest] border.*.color routing works AND does NOT break 531's glow.color routing (both on the same destructure)? Present-only byte-identity for a doc with no span/border/timeline? Reject-unknown intact across BOTH section-style schema mirrors (a bogus field rejected)? 522-531 renderer still green? Run the relevant vitest.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does grid col/row SPAN actually make a block span (project-card.large 2-tall reproducible)? Asymmetric column ratios render (hero 1/1.2fr)? Per-edge border paints per edge? Timeline renders a vertical axis with dots? Flag if any is cosmetic or the timeline type doesn't deliver the axis.",
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
  `Close TASK-533 on ${WT}. ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed + broad pages run, gates:coderso). Docs (PAGE_MODEL layout/border/timeline). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG + README pointer/row. Board: TASK-533 + children Done + stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual.`,
  { label: "closure:533", phase: "Closure" }
);
return { task: "TASK-533", ground: ground.slice(0, 200), impl, postResidualLow: residual, closure };
