export const meta = {
  name: "task-519-520-fix2",
  description:
    "Apply the specific real drift findings the prior verify surfaced on TASK-519/520 contracts (leading-dot alpha render-boundary asymmetry, wrong test aliases + testing-library dep, resolver-default-hint contradiction, box-shadow tokenizer, region/enumeration nits), then re-verify each contract clean. Docs-only.",
  phases: [{ title: "Fix" }, { title: "Verify" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ["TASK-519", "TASK-520"];

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "findings", "verdict"],
  properties: {
    task: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "problem", "fix", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "applied", "residual"],
  properties: {
    task: { type: "string" },
    applied: { type: "array", items: { type: "string" } },
    residual: { type: "array", items: { type: "string" } },
  },
};

const FIXES = {
  "TASK-519": `Apply these REAL findings to the TASK-519 contract files under ${ROOT}/_docs/_TASKS/ (DOCS ONLY — edit the .md files; verify each against live code with grep -an/Read):

1. [HIGH] Leading-dot alpha render-boundary asymmetry (TASK-519-01-Shared-Admin-Color-Value-Helper.md + L01 + L02, and the parent Acceptance smoke). The admin helper regexes accept leading-dot alpha (rgba(...,.84)) and every fixture uses the owner's leading-dot tokens, BUT the RENDER boundary resolveClearableCssColorValue (core/widgets/core/clearableStyle.ts:17-18, cssRgbColorPattern) does NOT accept a leading-dot '.84' — it requires '0.84'. Verify: resolveClearableCssColorValue('rgba(8,17,31,.84)') is UNDEFINED but ('rgba(8,17,31,0.84)') is defined. RESOLUTION to spec: the 519-01 admin helper's normalize step MUST CANONICALIZE alpha to render-safe form on emit — rewrite leading-dot alpha '.84'->'0.84', '.06'->'0.06' (rgba/rgba%/hsla and any 8-digit-hex path is already fine) so the STORED/emitted value passes resolveClearableCssColorValue AND normalizeMenuColorValue. State the accepted-set is a subset of BOTH boundaries IN CANONICAL FORM. Update the whitelist-parity test + the parent Acceptance smoke scenarios (2 & 5) to author the owner's '.84' input and assert the emitted/rendered value is the canonical '0.84' form that resolveClearableCssColorValue accepts (front render shows the alpha). Do NOT loosen the render boundary; canonicalize at the admin write instead.

2. [MEDIUM] Wrong test import specifiers (TASK-519-01-L02, TASK-519-02-L02, TASK-519-03-L03). vitest.config.ts:6 aliases '@' -> core/admin ONLY. Tests must use RELATIVE paths like existing sibling UI tests: '../../../core/admin/ui/...' for admin modules and '../../../core/widgets/core/clearableStyle' for the widgets module (which is OUTSIDE core/admin so '@/widgets/...' is unreachable). Replace all '@/admin/...' and '@/widgets/...' specifiers in the test-shape pseudocode with the correct relative paths.

3. [MEDIUM] Do NOT prescribe @testing-library/react (TASK-519-02-L02, TASK-519-03-L03) — it is NOT a repo dependency; all ~192 tests/vitest/ui/ tests render via createRoot from 'react-dom/client'. Rewrite the test-shape pseudocode to use createRoot (mirror tests/vitest/ui/page-editor-control-primitives.test.tsx) — no new dependency.

4. [LOW] Enumeration precision (TASK-519-04 + TASK-519-04-L01): there are 9 literal <ColorSwatchControl> JSX sites in MenuDesignEditor.tsx (990,1000,1383,1526,1924,2193,2207,2221,2236) + import :134; line :1622 is a swatch() HELPER call, not a literal site. Correct the enumeration and note that many menu colors route through the swatch() wrapper (so the alpha upgrade propagates via that one helper) vs the direct sites.

5. [LOW] Split the mutually-exclusive render-mode assertions (TASK-519-03-L03): the opacity slider renders only in showValueInput=TRUE; data-shared-color-state / 'Selected color' label render only in showValueInput=FALSE. Separate the round-trip (slider) assertion and the true-swatch/state-label assertion into TWO render cases so a single render is not asked to show both.`,

  "TASK-520": `Apply these REAL findings to the TASK-520 contract files under ${ROOT}/_docs/_TASKS/ (DOCS ONLY; verify vs live code with grep -an/Read):

1. [MEDIUM] Resolver-default-hint contradiction (TASK-520-01-Menu-Bar-And-Brand-Model.md + L01 + TASK-520-03-L01). The parent claims the new radius/borderWidthScrolled/shadowScrolled hints surface via resolveMenuControlDefault/SHELL_APPEARANCE_DEFAULTS 'like shadow/borderWidth today', but the new keys are deliberately NOT in MENU_BAR_LAYOUT_KEYS (Hard Invariant) and NOT in SHELL_APPEARANCE_DEFAULTS, so resolveMenuControlDefault falls through to 'Not set' and the 507 ControlDefaultHint HIDES it — while TASK-520-03-L01's test asserts the hint RENDERS. RESOLUTION: these new keys are PRESENT-ONLY with NO seeded resolution default (AGENTS.md present-only rule), so the correct behavior is NO default hint. Remove the false 'hints resolve like shadow/borderWidth via SHELL_APPEARANCE_DEFAULTS' claim; state the new controls show no resolved-default hint (or an explicit 'Off/None' literal only if a control needs one, NOT via resolveMenuControlDefault); and FIX the 520-03-L01 test to assert the hint is ABSENT for the new keys (not that it renders). Do NOT invent a resolver-default path for keys held out of MENU_BAR_LAYOUT_KEYS.

2. [LOW] Region-boundary straddle (TASK-520-04-L01 vs L02): L01 claims region 'ONLY BrandRender @490-536' but its pseudocode also edits the caller at @599 (adding breakpoint={breakpoint} to <BrandRender>), and @599 sits inside SiteHeaderMenuDocumentRender @555-621 which L02 owns. Reassign the @599 caller edit to L02 (or widen L01's declared region to include exactly that one caller line with a documented note) so the disjoint-region claim holds.

3. [LOW] Box-shadow tokenizer (TASK-520-01-L02-Custom-Box-Shadow-Value-Validator.md): the main pseudocode uses rest.split(/\\s+/), which splits a space-containing color 'rgba(8, 17, 31, .84)' and wrongly rejects it. Promote the bracket-aware tokenizer from prose INTO the executable pseudocode: scan chars, treat a run inside balanced (...) as part of the current token, split on whitespace only at bracket-depth 0. Also accept the owner example '0 18px 50px rgba(0,0,0,.24)' and canonicalize its leading-dot alpha consistently with 519.

4. [LOW] Apply any remaining consistency nit surfaced (changelog pin 1233 consistent across all files; naming/H1/FileName/parent/Status canonical; land order model->admin->front->closure). Fix if present.`,
};

phase("Fix");
await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `You are fixing the authored contract ${t} (edit .md files under ${ROOT}/_docs/_TASKS/ — DOCUMENTATION ONLY, no production code). Keep the granular parent+NN+NN-LNN structure. Verify each finding against live code before editing (grep -an/Read for large tsx). If a finding is genuinely wrong, justify in residual instead of applying.\n\n${FIXES[t]}\n\nReturn applied vs residual.`,
        { label: `fix2:${t}`, phase: "Fix", schema: FIX_SCHEMA }
      )
  )
);

phase("Verify");
const verify = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `FINAL fresh read-only reconcile of ${t} (parent + ALL NN + NN-LNN files under ${ROOT}/_docs/_TASKS/) after fixes. Verify vs live code (grep -an/Read for large tsx). Confirm 0 HIGH/MEDIUM drift across: grounding (citations real), granularity (every executable leaf has implementation pseudocode + regression-test shape + lane), completeness (full owner ask incl. FRONT render + the owner's exact alpha tokens rgba(8,17,31,.84) surviving to render in CANONICAL form), single-writer + land order + naming + changelog pin, security (color whitelist / brand icon allowlist). Specifically re-check: (a) the leading-dot alpha is canonicalized so resolveClearableCssColorValue accepts it; (b) test shapes use relative imports + createRoot (no @-alias, no @testing-library/react); (c) 520 new-key default-hint expectation is consistent with resolveMenuControlDefault reality; (d) box-shadow tokenizer is bracket-aware in pseudocode. Return remaining REAL findings — empty + verdict 'clean' = implementation-ready.`,
        { label: `verify2:${t}`, phase: "Verify", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, task: a?.task || t }))
  )
);

return {
  verify: verify.filter(Boolean).map((v) => ({
    task: v.task,
    verdict: v.verdict,
    remainingHM: (v.findings || []).filter(
      (f) => f.isReal && (f.severity === "HIGH" || f.severity === "MEDIUM")
    ).length,
    remainingLow: (v.findings || []).filter((f) => f.isReal && f.severity === "LOW").length,
    findings: (v.findings || [])
      .filter((f) => f.isReal)
      .map((f) => `[${f.severity}] ${f.file}: ${f.problem}`),
  })),
};
