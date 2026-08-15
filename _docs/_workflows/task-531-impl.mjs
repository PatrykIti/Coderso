export const meta = {
  name: "task-531-impl",
  description:
    "Implement TASK-531 (Premium Backgrounds & Glow: multi-layer background sanitizer relaxation + block gradient bg + colored glow box-shadow) from the GO contract. Security-critical: strong adversarial security post-audit on the relaxed multi-layer sanitizer + the RAW <style> second render boundary.",
  phases: [
    {
      title: "Ground",
      detail: "sanitizer relax + 2 render boundaries + glow model + all consumers + mutation seam",
    },
    {
      title: "Implement",
      detail:
        "L01 sanitizer relax, L02 glow model+render+responsive, L03 controls, L04 tests — gated",
    },
    {
      title: "Post-audit",
      detail: "ADVERSARIAL security (bypass the multi-layer sanitizer) + regression + present-only",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-531";
const TASKS = `${WT}/_docs/_TASKS`;

const COMMON = `Worktree ${WT} (off feature/tasks-fixes post-535). Implement the GO-verdict TASK-531 contract under ${TASKS} (read the parent + 531-01 + L01-L04 + 531-02). SECURITY-CRITICAL bundle. Preserve ALL invariants: present-only byte-identity (omit when unset), reject-unknown (assertKnownKeys + JSON schema additionalProperties:false + round-trip), colors/backgrounds ONLY via the sanitizers, NO migration/schemaVersion/dep. Ground every symbol before editing (line numbers drift — trust the symbol). Run gates after each subtask: bun --cwd core lint, lint:types, root tsc, changed vitest.`;

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
  `${COMMON}\nRead-only: confirm the exact seams for TASK-531: (1) pageAuthoringSanitizers.ts isSingleGradientLayer / isSafeAuthoringCssGradient / sanitizeAuthoringCssBackground + how to add isSafeAuthoringCssBackgroundLayers (top-level comma split NOT inside parens, allowlist each layer via the single-layer validator, a whole-value multiLayerTripwire pre-pass rejecting url()/javascript:/expression/data:text-html/@import/behavior/-moz-binding, cap layer count, fail-closed); (2) the TWO render boundaries — SSR inline-style (pageRendererV2.tsx toGradientBackground ~:347) AND the RAW <style> pageResponsiveCss.ts (block gradient override ~:529, section has NO gradient branch ~:372-395, renderRule raw interpolation ~:266-273); (3) the glow model target (PageBlockStyleV2 + PageSectionStyleV2 style.glow present-only + composeGlowBoxShadow) + responsive box-shadow branches (~:401-403 section, ~:564-565 block) that need glow extend-emit; (4) the nested glow.color mutation sanitizer (pageEditorMutationActions.ts:76 [group,key] → needs [group,key,...rest] + route glow.color through sanitizeAuthoringCssColor); (5) all consumers of sanitizeAuthoringCssBackground (section/block bg, settings.background write+render, editor mutation guard). Return a symbol→location map confirming the contract's decisions are implementable as written.`,
  { label: "ground:531", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Implement");
const SUBTASKS = [
  {
    id: "531-01-L01",
    prompt: `${COMMON}\nImplement TASK-531-01-L01 (multi-layer background sanitizer relaxation) per the contract. In pageAuthoringSanitizers.ts add isSafeAuthoringCssBackgroundLayers: split the value on TOP-LEVEL commas only (not inside gradient parens/rgba), run a whole-value multiLayerTripwire pre-pass that rejects url()/javascript:/vbscript:/data:text-html/expression(/behavior:/-moz-binding/@import/</> and caps the layer count, then allowlist EACH layer through the EXISTING single-layer validator (color OR single gradient), fail-closed on any failure. Wire sanitizeAuthoringCssBackground to accept single-layer OR multi-layer via this. Add the XSS/mXSS corpus tests (hostile multi-layer constructs → "" ; legit color+gradient multi-layers → preserved). Gates. Return result.`,
  },
  {
    id: "531-01-L02",
    prompt: `${COMMON}\nImplement TASK-531-01-L02 (glow model + section gradient glow render + BOTH render boundaries + mutation seam) per the contract. (a) Add present-only style.glow to PageBlockStyleV2 + PageSectionStyleV2 (color via sanitizeAuthoringCssColor + numeric blur/spread/x/y clamps) → allowlists + JSON schemas + normalizers; composeGlowBoxShadow composes a safe box-shadow string at render (NOT raw). (b) SSR: wire block backgroundType:"gradient" through sanitizeAuthoringCssBackground at toPageBlockVisualStyle (like sections); emit glow box-shadow (merge with the shadow enum). (c) SECOND BOUNDARY pageResponsiveCss.ts: relax the block gradient override + ADD a section gradient override branch, BOTH gated \`isSafeCssGradient(v) || isSafeAuthoringCssBackgroundLayers(v)\` with the tripwire, + a code-comment FORBIDDING a naive re-bind without the tripwire; extend the two responsive box-shadow branches to compose per-device glow (fire on shadow OR glow). (d) MUTATION: pageEditorMutationActions.ts change [group,key] → [group,key,...rest] and route key==="glow" && rest[0]==="color" through sanitizeAuthoringCssColor. Gates. Return result.`,
  },
  {
    id: "531-01-L03",
    prompt: `${COMMON}\nImplement TASK-531-01-L03 (glow + gradient-type controls) per the contract: add the glow controls (color + blur/spread/x/y) + the block gradient backgroundType option to pageEditorControlRegistry.ts + any new control kind in pageEditorControlUiModel.ts / editorControls component. Match the responsive:true decision from the contract (glow is responsive per L02 extend-emit). Gates + control descriptor tests. Return result.`,
  },
  {
    id: "531-01-L04",
    prompt: `${COMMON}\nImplement TASK-531-01-L04 (sanitizer + model + render tests) per the contract: round-trip/reject-unknown/present-only/byte-identity for glow + multi-layer background on block+section+settings; the multi-layer XSS corpus at BOTH boundaries (SSR + the RAW pageResponsiveCss <style>); the security-regression gate (url()-bearing multi-layer → rejected at both) with the network-clean intent noted for the smoke. Update any owned breaking tests. Gates. Return result.`,
  },
];
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(st.prompt, {
    label: `impl:${st.id}`,
    phase: "Implement",
    schema: GATE_SCHEMA,
  });
  implResults.push(r);
  log(`impl ${st.id}: done=${r?.done} gates=${r?.gatesGreen}`);
}

phase("Post-audit");
const POST = [
  {
    key: "security-a",
    p: "ADVERSARIAL SECURITY lens #1: try HARD to BYPASS the relaxed multi-layer background sanitizer. Construct hostile multi-layer values (url() hidden after a comma / inside a nested gradient / via case + whitespace tricks / data:text-html / expression() / @import / CSS comment / unbalanced parens confusing the top-level split / a layer count DoS). Verify EACH is rejected at BOTH boundaries — the SSR inline-style path AND the RAW pageResponsiveCss <style> path (the un-escaped one). Read the actual diff + run the sanitizer against your corpus. Flag ANY value that reaches the DOM ≥HIGH.",
  },
  {
    key: "security-b",
    p: "ADVERSARIAL SECURITY lens #2 (different angle): audit the glow box-shadow composition + the nested glow.color mutation sanitizer + settings.background consumer. Can a glow color/offset inject via the composed box-shadow string (semicolon/second-declaration escape)? Does the [group,key,...rest] mutation change actually sanitize glow.color (and not break border.*.color from 533 if present)? Is settings.background (now multi-layer capable) safe at write+render? Try to break each. ≥HIGH for any reachable injection.",
  },
  {
    key: "regression-presentonly",
    p: "REGRESSION + PRESENT-ONLY lens: does a doc with NO glow/multi-layer/gradient-block normalize + render byte-identical to pre-531 (present-only)? Do the 522-535 effects + the pageResponsiveCss per-device machinery still work? Are owned breaking tests correctly updated (not weakened)? Reject-unknown intact (a bogus glow subfield rejected)? Run the relevant vitest on the worktree.",
  },
];
let residual = [];
let pr = 0;
while (pr < 4) {
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
    `Fix these BLOCKING post-audit findings in the code on ${WT}, re-run gates. SECURITY findings are top priority. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${pr}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-531 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed pages files + broad pages run, gates:coderso incl. security gate). Update docs (PAGE_MODEL/DESIGN_TOKENS/SECURITY_SPEC — the multi-layer relaxation + tripwire + glow model + the two render boundaries). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG (likely 1244) + README pointer/row. Board: TASK-531 + children to Done, Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim (esp. security gate), residual follow-ups.`,
  { label: "closure:531", phase: "Closure" }
);
return {
  task: "TASK-531",
  ground: ground.slice(0, 200),
  implResults,
  postResidualLow: residual,
  closure,
};
