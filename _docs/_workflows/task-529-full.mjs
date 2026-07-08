export const meta = {
  name: "task-529-full",
  description:
    "TASK-529 Cursor spotlight uses VIEWPORT coords: the fixed overlay's radial-gradient must position with clientX/clientY, not page coords. Fixes owner bug: after scrolling down, the spotlight glow drops below the viewport and stops following the cursor (runtime subtracts the full-page root rect → adds scrollY → pageY).",
  phases: [
    { title: "Ground", detail: "confirm the spotlight handler subtracts sp rect (page coords)" },
    { title: "Implement", detail: "use ev.clientX/clientY (drop -r.left/-r.top); update tests" },
    {
      title: "Post-audit",
      detail: "regression + fidelity (glow follows cursor after scroll) → fix",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-529";
const TASKS = `${WT}/_docs/_TASKS`;

const GROUNDING = `
OWNER BUG (confirmed on live DOM): after scrolling down to the 3rd section, the cursor spotlight glow "falls to the bottom" and no longer follows the mouse. LIVE evidence: at scrollY=577, mousemove(640,500) set --spotlight-y="1077px" (=500+577). The overlay [data-page-spotlight-overlay] is position:fixed inset:0 (viewport 0..innerHeight), so a gradient at y=1077 paints BELOW the visible viewport → glow off-screen. (Latent since 521; invisible while the overlay sat at z-0 behind opaque sections; TASK-523's screen-blend z-30 overlay exposed it.)
ROOT: core/services/pages/pageEffectsRuntime.ts spotlight handler (~line 88-89): \`var r=sp.getBoundingClientRect(); sx=Math.round(ev.clientX-r.left); sy=Math.round(ev.clientY-r.top);\` where sp = [data-page-spotlight] = the ROOT/main element (full page height; after scrolling r.top = -scrollY). Subtracting the negative r.top ADDS scrollY → page coordinates. But the vars feed a FIXED (viewport-relative) overlay's radial-gradient, so they MUST be viewport coords.
FIX: use pure viewport coords — \`sx=Math.round(ev.clientX); sy=Math.round(ev.clientY);\` and remove the now-unused \`var r=sp.getBoundingClientRect();\`. (Equivalently subtract the OVERLAY's rect, which is always 0,0 when fixed — but clientX/clientY is simpler and correct.) Keep the rAF batching + pointer:fine gate + present-only emit unchanged.
TESTS: tests/vitest/content/cursorSpotlight.test.tsx + tests/vitest/pages/pageEffectsRuntime.test.ts. The existing spotlight behavioral test likely asserts --spotlight-x/y after a synthetic pointermove at scrollY=0 (where page==client, so it passed either way). UPDATE/ADD a test that simulates a NON-zero scroll (e.g. set the root rect top negative / window.scrollY) + pointermove, and asserts --spotlight-y === clientY (viewport), NOT clientY+scrollY. If the harness can't scroll, at least assert the handler source no longer subtracts the root rect (source-substring) OR mock getBoundingClientRect to return top:-500 and assert the var ignores it.
INVARIANTS: present-only byte-identity (spotlight-off page emits nothing) unchanged; reduced-motion + pointer:fine gates unchanged; NO migration/schemaVersion/dep. Changelog greps next-free.
`;

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
  required: ["done", "gatesGreen", "summary"],
  properties: {
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `Read-only on worktree ${WT}. Confirm the spotlight handler in core/services/pages/pageEffectsRuntime.ts subtracts sp.getBoundingClientRect() (page coords) and identify the exact edit + every existing spotlight test. Use this grounding:\n${GROUNDING}\nReturn the exact line + affected tests + confirmation.`,
  { label: "ground:529", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 250)}`);

phase("Implement");
const impl = await agent(
  `Implement TASK-529 on ${WT} per this grounding:\n${GROUNDING}\nGround: ${ground.slice(0, 500)}\nChange the spotlight handler to use ev.clientX/ev.clientY (viewport) and drop the unused root-rect subtraction. Add/update a test proving the spotlight var is viewport-relative under non-zero scroll (mock the root rect top negative OR set scrollY). Keep present-only + gates. Run: bun --cwd core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  { label: "impl:529", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${impl?.done} gates=${impl?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "regression",
    p: "REGRESSION lens: does the change keep the rAF batching, pointer:fine gate, present-only emit, reduced-motion behavior? Do the existing cursorSpotlight + pageEffectsRuntime + page-renderer spotlight tests still pass (updated where owned)? Run the relevant vitest on the worktree.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does the spotlight now follow the cursor CORRECTLY after scrolling (var = clientY viewport, independent of scrollY), so the fixed overlay's glow stays under the cursor in every section — the owner's exact bug? Flag if page coords still leak.",
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
    `Fix these BLOCKING post-audit findings in the code on ${WT}, re-run gates. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${pr}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-529 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed files + broad run, gates:coderso). Update PAGE_MODEL.md/DESIGN_TOKENS.md if a spotlight coord note fits. Changelog: grep next-free in ${WT}/_docs/_CHANGELOG + create it + README pointer/row. Board: add TASK-529 to Done, Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual.`,
  { label: "closure:529", phase: "Closure" }
);

return { task: "TASK-529", ground: ground.slice(0, 200), impl, postResidualLow: residual, closure };
