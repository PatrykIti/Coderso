export const meta = {
  name: "task-520-impl",
  description:
    "Implement TASK-520 (menu Design: scrolled/floating-state colors + menu-bar card radius + custom box-shadow + brand icon & graphic-with-text) on its worktree: 4 strictly-sequential subtasks (model → CSS → design editor → front render) + closure, each gated green, then parallel adversarial audits (request-fidelity + security + regression), fix real findings, closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-520";
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

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-520, off ${BASE} which ALREADY INCLUDES TASK-519's alpha-capable color input). This is TASK-520 (menu Design: scrolled/floating-state colors + menu-bar card radius + custom box-shadow + brand icon & graphic-with-text).
ALWAYS read first: ${WT}/_docs/_TASKS/TASK-520_Menu_Scrolled_State_Card_Radius_Custom_Shadow_And_Brand_Icon.md (parent) AND your subtask's file(s) INCLUDING its NN-LNN leaves (execution-ready pseudocode + test shapes). Edit ONLY the files your subtask owns (single-writer per the parent map). GREP TRAP: menuDocumentV2.ts / menuDocumentCss.ts / MenuDesignEditor.tsx / siteShell.tsx read as binary to rg — use grep -an or Read.
GOAL: (1) scrolled/floating-state color variants (surfaceColorScrolled/borderColorScrolled/shadowScrolled) so a sticky menu shows DIFFERENT bg/border/shadow once scrolled vs at rest, unset falls back to base (back-compat); the ADMIN scrolled color controls reuse TASK-519's alpha-capable ColorSwatchControl (owner tokens: bg #0812209e→rgba(8,17,31,.84), border #ffffff1f→rgba(255,255,255,.18)). (2) menu-bar (level-0) container border-RADIUS (present-only) + CUSTOM box-shadow value (beyond the none/sm/md enum; owner example 0 18px 50px rgba(0,0,0,.24)). (3) brand ICON mode (allowlisted lucide icon with color[via 519 alpha]/size) + graphic-with-text combo — admin control + PUBLIC render (siteShell BrandRender renders img XOR text today → extend to icon + combo).
HARD INVARIANTS: new bar keys are PRESENT-ONLY with NO seeded resolver default (they must NOT be added to MENU_BAR_LAYOUT_KEYS/SHELL_APPEARANCE_DEFAULTS; their admin controls show no resolved-default hint, per the audited contract). box-shadow validator is BRACKET-AWARE (a space-containing color like rgba(0,0,0,.24) is ONE token, split whitespace only at bracket-depth 0) + canonicalizes leading-dot alpha consistent with 519. brand icon name is an ALLOWLIST (fixed lucide subset), not arbitrary. All new keys reject-unknown allowlisted + present-only + round-trip test; legacy menu docs byte-identical. Scroll-state machine (data-scrolled toggle) is a dependency-free idempotent IIFE that respects prefers-reduced-motion; NO new npm dependency; NO DB migration (menu doc is jsonb).
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

// Land order: 520-01 (model) -> 520-02 (CSS) -> 520-03 (admin editor) -> 520-04 (front) -> (520-05 closure).
const SUBTASKS = [
  {
    id: "520-01",
    file: "TASK-520-01-Menu-Bar-And-Brand-Model.md",
    owns: "core/services/menus/menuDocumentV2.ts (present-only scrolled/radius/shadowCustom bar keys + brand icon+combo; box-shadow validator + brand-icon allowlist validator; L01 bar keys / L02 box-shadow validator / L03 brand — disjoint intra-file regions)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the menu model tests (present-only round-trip, reject-unknown, box-shadow bracket-aware validate, icon allowlist, legacy byte-identical)",
  },
  {
    id: "520-02",
    file: "TASK-520-02-Menu-Bar-CSS-Scrolled-Radius-Custom-Shadow.md",
    owns: "core/site/menuDocumentCss.ts (emit menu-bar radius + custom shadow + [data-scrolled] scrolled-variant rules)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun for the menu CSS emission tests (radius/custom-shadow/scrolled variants; no-override doc byte-identical)",
  },
  {
    id: "520-03",
    file: "TASK-520-03-Design-Editor-Bar-And-Brand-Controls.md",
    owns: "core/admin/ui/menus/MenuDesignEditor.tsx (L01 bar scrolled-color group [alpha via 519 ColorSwatchControl] + radius + custom-shadow controls; L02 brand icon picker/style + combo toggle + preview scrolled toggle — disjoint regions)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:vitest for the menu design editor tests (scrolled controls, radius/shadow, brand icon/combo; new keys show no resolved-default hint)",
  },
  {
    id: "520-04",
    file: "TASK-520-04-Front-Render-Scroll-Machine-And-Brand.md",
    owns: "core/site/siteShell.tsx (L01 BrandRender icon/combo — extend img XOR text to icon + image+text; L02 scroll-state machine inline script toggling data-scrolled, reduced-motion-aware, dependency-free — disjoint regions)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun for the front render tests (brand icon/combo render, scroll-state machine script emitted, scrolled variants apply, reduced-motion honored)",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} + ALL its NN-LNN leaf files for the execution-ready pseudocode + test shapes. Follow them PRECISELY. Edit ONLY this subtask's owned files.
OWNED FILES (single writer): ${st.owns}.
${prevNote ? `PRIOR SUBTASK CONTEXT: ${prevNote}` : "This is the foundation subtask (the model the CSS/editor/front consume)."}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line each.

Return the structured result. In notes, include what the NEXT subtask needs (new key names + types, validator/allowlist export names, resolved-layout fields the CSS reads, data-scrolled contract, brand shape).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(`STOP: ${st.id} not green — halting (resume via resumeFromRunId).`);
    return { task: "TASK-520", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 800)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "request-fidelity",
    prompt: `Adversarial REQUEST-FIDELITY audit of TASK-520 in worktree ${WT}. Review \`cd ${WT} && git diff ${BASE}...feature/task-520\` (grep -an/Read for the big menu files). Verify the contract delivers the owner's exact asks: (1) a STICKY/floating menu shows DIFFERENT bg/border/shadow when scrolled vs at rest, driven by a front data-scrolled machine, with the owner tokens surviving to render (bg #0812209e→rgba(8,17,31,.84), border #ffffff1f→rgba(255,255,255,.18), shadow 0 18px 50px rgba(0,0,0,.24)); (2) menu-bar (level 0) container border-radius (menu-as-card) + custom box-shadow value; (3) brand ICON mode (styled) + graphic-WITH-text combo, rendered on the PUBLIC front (not just admin). Flag anything under-delivered or that would not actually apply on the front. isReal only if defensible.`,
  },
  {
    key: "security",
    prompt: `Adversarial SECURITY audit of TASK-520 in worktree ${WT}. PROVE: (a) the custom box-shadow value validator whitelists a real box-shadow grammar (lengths + a whitelisted color) and REJECTS injection — no ';', '}', 'url(', 'expression(', '</style>', or arbitrary text can survive into the emitted <style> block; it is bracket-aware so a valid rgba(0,0,0,.24) passes but 'red;}#x{color:red' is rejected; (b) the brand icon name is a fixed ALLOWLIST (not an arbitrary component/name → no dynamic import / no XSS via icon id); (c) the scrolled color values route through the reject-unknown menu color normalizer (no CSS injection); (d) the scroll-state machine inline script is dependency-free + cannot be influenced by attacker data (no eval, no innerHTML of user data). Flag any injection path. isReal only if defensible with file:line.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + BACK-COMPAT audit of TASK-520 in worktree ${WT}. Verify: (1) new bar keys are PRESENT-ONLY with NO seeded resolver default (NOT added to MENU_BAR_LAYOUT_KEYS / SHELL_APPEARANCE_DEFAULTS) — a legacy menu with no scrolled/radius/shadowCustom/brand-icon renders byte-identical (buildMenuDocumentCss on a no-override doc unchanged); (2) unset scrolled variant falls back to the base value; (3) existing brand text/image modes still render; (4) NO migration, NO new dependency (package.json diff empty); (5) single-writer held (each file one owner; the intra-file leaf regions disjoint). Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:bun\` (menu model/CSS/site render) + \`${ENV} && bun run test:vitest\` (menu editor) and report exact pass/fail counts. Flag real regressions. isReal only if defensible.`,
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
    `${COMMON}\n\nFix these REAL audit findings on the TASK-520 implementation in worktree ${WT}. Respect single-writer ownership; do NOT weaken tests. Security findings fully closed (validator/allowlist). After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected bun/vitest tests. Findings:\n${fixList}\n\nReport changes + re-run gates.`,
    { label: "fix:520", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else log("Fix: no real HIGH/MEDIUM — skipping.");

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 520-05 (Tests, Docs, Closure) — read ${WT}/_docs/_TASKS/TASK-520-05-Tests-Docs-Closure.md. The 4 implementation subtasks are applied + audited; do NOT edit their owned production files. Your job:
1) TESTS — complete the closure-specified tests (correct LANE: menu model/CSS/site-render render tests use the BUN lane tests/unit/*; admin editor uses Vitest tests/vitest/*). Ensure gates green.
2) DOCS — update the menu/appearance spec + DESIGN_TOKENS or menu docs the contract names (scrolled-state colors, menu-bar radius, custom shadow, brand icon/combo).
3) CHANGELOG — the contract pins 1233; verify next-free (\`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\`; 1232 is TASK-519, 1229-1231 reserved for 511/517/518) and use 1233 if free else the actual next-free; create _docs/_CHANGELOG/<N>-2026-07-07-task-520-menu-design.md; bump README next-pointer; fix stale pins in 520 files.
4) BOARD — _docs/_TASKS/README.md: add parent TASK-520 + all children rows to Done; bump Statistics.
5) TASK FILES — Status ✅ Done in parent + all subtask + leaf files.
6) FINAL GATES (run in ${WT}, capture each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: LIVE playwright smoke (menu scrolled colors + card radius + brand icon vs prototype) is run by the ORCHESTRATOR post-merge — do NOT restart the dev host.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(menus): TASK-520 menu Design scrolled-state colors + card radius + custom shadow + brand icon/combo" with a body summarizing the model/CSS/editor/front work + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nPrecommit hook runs lint+typecheck — fix + re-commit if it blocks. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:520-05", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-520",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
