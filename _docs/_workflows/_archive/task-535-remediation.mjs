export const meta = {
  name: "task-535-remediation",
  description:
    "Remediate the ultra-audit findings for TASK-522..530 (1 HIGH + 7 MED + functional LOWs + defence-in-depth + doc/test integrity). Standard pipeline: ground → gated sequential subtasks → adversarial post-audit → closure.",
  phases: [
    { title: "Ground", detail: "confirm each finding's location on the worktree" },
    {
      title: "Implement",
      detail:
        "535-01 HIGH tilt+layer, 02 runtime double-bind, 03 full-bleed cluster, 04 revealDelay emit, 05 svg-sanitizer hygiene, 06 doc/test integrity",
    },
    {
      title: "Post-audit",
      detail: "adversarial regression + security + present-only on the fixes",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-535";
const TASKS = `${WT}/_docs/_TASKS`;

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

const COMMON = `Worktree ${WT} (branched from feature/tasks-fixes HEAD = post-530). These are CONFIRMED findings from an adversarial ultra-audit of TASK-522..530 (each survived ≥2/3 skeptics). Ground each against the real code before fixing (line numbers may drift — trust the symbol). Preserve ALL invariants: present-only byte-identity, reject-unknown, sanitizers at write+render, reduced-motion gates, NO migration/schemaVersion/dep. Update owned tests. Run gates after each subtask: bun --cwd core lint, lint:types, root tsc, changed vitest.`;

phase("Ground");
const ground = await agent(
  `${COMMON}\nRead-only: confirm the location + mechanism of these audit findings on ${WT}:\n1. HIGH — pageRendererV2.tsx withTiltParent (~2382) wraps the frame in <div data-tilt-parent style=perspective:1200px>; that perspective creates a CONTAINING BLOCK, so a block with BOTH tilt AND layer (data-layer/--layer-* absolute inside a layered ancestor) positions against the WRAPPER, not the layered section → broken layer placement.\n2. MED — the page-effects runtime <script> (data-coderso-runtime-script, ~3102) + spotlight overlay + reveal/composition <style> can be emitted TWICE when a page has a footer that is a SECOND PageDocumentRender (site-shell footer) → double-binds reveal/parallax/spotlight/tilt + double overlay.\n3. MED — 525 full-bleed emits width:100vw with no overflow-x guard → horizontal scrollbar; and the full-bleed className predicate (~638) diverges from isPageSectionFullBleed (style vs class mismatch → different padding).\n4. LOW/functional — anyMotion predicate (~3014 = spotlightOn||hasSectionEffect||compositionTilt) does NOT include per-block revealDelay; assess whether a revealDelay-only page fails to animate.\n5. LOW — svgSanitizer.ts: valueless boolean attrs bypass the attr allowlist (regex needs =value); case-insensitive root gate vs case-sensitive lowercase tag-walk (uppercase <SVG> → unwrapped fragment); self-closing <svg/> rejected; unknown child in <title>/<desc>/<text> stripped.\n6. LOW/INFO — glow custom props (--surface-glow etc) not re-sanitized at render (parity gap); dead CSS [data-tilt-parent]{perspective} now that inline style is used; board changelog numbers wrong (523=1237/524=1239/525=1238/528=1241); DESIGN_TOKENS/PAGE_MODEL z-clamp 0..40 vs code 0..20; stale full-width responsive test; stale test titles; resolveSliderStep comment.\nReturn a symbol→location map + the safest fix approach for the HIGH (move data-layer/--layer-* onto the perspective wrapper so the wrapper is the layered child) and the double-emit (IIFE self-guard via a window flag keyed on the runtime id + dedupe the once-per-document <style>/overlay).`,
  { label: "ground:535", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Implement");
const SUBTASKS = [
  {
    id: "535-01",
    prompt: `HIGH — tilt+layer containing-block. On ${WT}, fix pageRendererV2.tsx so a block with BOTH tilt AND layer positions correctly: move the layer placement (data-layer + --layer-x/y/z + data-layer-anchor) onto the data-tilt-parent perspective WRAPPER (which becomes the absolutely-positioned layered child), keeping the tilt transform on the inner frame — OR an equivalent that makes the perspective wrapper NOT clobber layer positioning. Preserve the whole-card-tilt (528) + present-only (no wrapper when no tilt). ADD a regression test asserting a tilt+layer block's computed/structural position is the layer anchor, not reset by the wrapper. ${COMMON}`,
  },
  {
    id: "535-02",
    prompt: `MED — runtime double-bind. On ${WT}, make the page-effects runtime idempotent: add a self-guard in the IIFE (pageEffectsRuntime.ts) so a second copy (emitted by a footer/second PageDocumentRender) NO-OPs (e.g. window flag keyed on PAGE_EFFECTS_RUNTIME_ID; return early if already initialized), AND dedupe the once-per-document emits (reveal-CSS <style>, reveal <noscript>, composition-CSS <style>, spotlight overlay+CSS) so a footer render does not double them (guard by id / emit only on the primary document render). Verify no double overlay (brightness) + no double listeners. Tests: assert the guard (second script run is a no-op) + no duplicate overlay. ${COMMON}`,
  },
  {
    id: "535-03",
    prompt: `MED — full-bleed cluster. On ${WT}: (a) add overflow-x guard so 100vw full-bleed sections never cause a horizontal scrollbar (overflow-x:clip on the page root/wrapper or the bleed box — choose the correct scope); (b) make the full-bleed className predicate (~pageRendererV2.tsx:638) use isPageSectionFullBleed(...) so the fullBleed FLAG (not just the full-width variant) drops the px-4 py-6 gutter consistently with the style path; (c) reconcile the STALE full-width responsive test (page-responsive-css.test.ts) + its false comment to the 525 model. Tests updated. ${COMMON}`,
  },
  {
    id: "535-04",
    prompt: `LOW/functional — revealDelay emit coverage. On ${WT}, assess pageRendererV2.tsx anyMotion (~3014) + the reveal wiring: a page whose ONLY authored effect is per-block revealDelay (no section scrollEffect) — does it correctly emit the runtime + reveal CSS so the block animates, or is revealDelay inert without a section reveal? If revealDelay is meaningful only inside a revealing section, ensure that is the intended+documented behavior; if a block revealDelay SHOULD trigger reveal, widen the emit predicate + gating so it works. Also fix the revealDelay INHERITANCE issue (a nested child without its own revealDelay inheriting the ancestor's --reveal-delay) if it causes wrong cascade. Tests. ${COMMON}`,
  },
  {
    id: "535-05",
    prompt: `LOW/INFO — SVG sanitizer hygiene + glow parity (defence-in-depth). On ${WT} svgSanitizer.ts: (a) strip surviving VALUELESS/boolean attributes so the allowlist invariant holds (only allowlisted attrs remain); (b) normalize tag case (lowercase the matched tag before the allowlist check + re-emit canonical) OR make the root gate case-sensitive — so uppercase <SVG> does not emit an unwrapped fragment; (c) accept a valid self-closing <svg/>; (d) keep unknown children in text containers handled fail-closed/consistently. In pageCompositionEffects.tsx: re-run sanitizeAuthoringCssColor on the glow custom props (--surface-glow/--deco-ring/--orb-color) at render for parity with spotlight/canvas-bg (defence-in-depth). All confirmed non-exploitable — this is hardening; keep behavior identical for valid input. Extend the svg-sanitizer XSS test corpus. ${COMMON}`,
  },
  {
    id: "535-06",
    prompt: `Doc/test integrity. On ${WT}: (a) fix the task-board changelog numbers in _docs/_TASKS/README.md to the actual merged values (523=1237, 524=1239, 525=1238, 528=1241, 529=1240, 530=1242, 522=1235, 526=1236); (b) fix DESIGN_TOKENS.md + PAGE_MODEL.md PAGE_LAYER_Z_CLAMP 0..40 → 0..20 (matches 523's code); (c) remove the now-dead CSS rule [data-tilt-parent]{perspective:1200px} in pageCompositionEffects.tsx IF the wrapper now uses inline perspective (verify — after 535-01 the wrapper may again rely on the CSS rule; keep whichever is actually used, remove the truly-dead one); (d) fix stale test titles (customSvg '11 sections plus 19 blocks' / '19→20'); (e) fix the resolveSliderStep comment (line-height stays fine via explicit registry step, not the max<=1 branch — opacity is the max<=1 case). Docs/comments/tests only. ${COMMON}`,
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
    key: "regression",
    p: "REGRESSION lens: do the 535 fixes preserve every 522-530 behavior? Whole-card tilt (528) still works after the tilt+layer wrapper change? Spotlight/reveal/parallax still bind (once) after the idempotency guard? Full-bleed still bleeds + content centered after the predicate/overflow change? Present-only byte-identity intact? Run the relevant vitest on the worktree + read the diff.",
  },
  {
    key: "security",
    p: "SECURITY lens: the svgSanitizer hygiene changes (boolean-attr strip, case normalize, self-close) — do they keep ALL XSS tripwires intact (no new bypass introduced) + still fail-closed? The glow re-sanitize parity — correct? Try to break the sanitizer post-fix.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: is the HIGH (tilt+layer) ACTUALLY fixed — a block with tilt+layer now positions at its anchor AND tilts as a whole card? Is the double-bind ACTUALLY gone (one script, one overlay)? Are the docs/board now truthful? Flag any fix that is cosmetic or misses the root.",
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
  `Close TASK-535 (audit remediation for 522-530) on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed files + broad pages run, gates:coderso). Create a TASK-535 board entry + changelog (grep next-free in ${WT}/_docs/_CHANGELOG, likely 1243) summarizing the fixes (1 HIGH tilt+layer, MED double-bind/overflow/predicate/stale-test, doc-truth, svg hygiene). Update README pointer/row + board Done + stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual follow-ups (any deferred INFO).`,
  { label: "closure:535", phase: "Closure" }
);

return {
  task: "TASK-535",
  ground: ground.slice(0, 200),
  implResults,
  postResidualLow: residual,
  closure,
};
