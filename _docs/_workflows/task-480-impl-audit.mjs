export const meta = {
  name: "task-480-impl-audit",
  description:
    "READ-ONLY implementation audit of the STAGED TASK-480 dashboard-widgets code (implemented by a limit-interrupted agent — find what is broken/incomplete). Parallel lens agents (build/run, backend, frontend+prototype-fidelity, security/model, tests/docs/closure) + a completeness critic. Reports findings only; no edits.",
  phases: [{ title: "Audit" }, { title: "Critic" }],
};

const WT = "/home/coder/project/Coderso";

const COMMON = `
You are a READ-ONLY implementation auditor for TASK-480 (Dashboard Widgets & Configurable Panels) inside ${WT} (branch feature/tasks). The implementation is STAGED (git index), authored by an agent that HIT A SESSION LIMIT mid-way, so parts may be broken, half-done, or inconsistent. DO NOT EDIT ANY FILE — only read + report.
Ground everything against real files + real command output. rg misdetects large TSX as binary — use grep -an / Read.
Context: the acute dashboard 404 was a STALE dev-server process (already fixed — routes now return 401/auth); the migration 0066_dashboard_layouts is applied and dashboard_layouts table exists. So focus on DEEPER completeness/correctness, not the 404.
The task tree is TASK-480* in ${WT}/_docs/_TASKS/ (parent + subtasks 01 audit/spec, 02 widget+data-source contract, 03 layout persistence/API, 04 widget renderers, 05 builder UI, 06 docs/gates/closure) + spec _docs/DASHBOARD_WIDGETS_SPEC.md. Staged code touches: core/db/schema.ts (dashboard_layouts) + 0066 migration, core/services/dashboard/*, core/server/routes/dashboardRoutes.ts + validation/dashboardSchemas.ts, core/admin/services/dashboardClient.ts + cachePolicy.ts, core/admin/ui/dashboard/* (DashboardBuilder, DashboardWidgetHost, DashboardPage), tests/integration/routes/dashboard.test.ts, docs.
Report evidence-backed findings (file:line) via structured output, severity-ordered. A finding is HIGH if it breaks build/runtime/security or leaves a contracted deliverable non-functional; MEDIUM = incomplete/incorrect vs the TASK-480 contract or prototype; LOW = polish.
`;

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "summary", "findings"],
  properties: {
    lens: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const LENSES = [
  {
    key: "build-run",
    prompt: `Lens = BUILD & RUNTIME. Run \`bun --cwd core lint:types\` and \`bun --cwd core lint\` and report EVERY failure (file:line) — the limit-interrupted agent likely left type/lint errors. Then assess runtime: does the dashboard page render without console errors, do GET /dashboard/layout, PUT /dashboard/layout, POST /dashboard/layout/reset, GET+POST /dashboard/widget-data behave (they now require auth — verify they are registered and the handlers are complete, not stubs)? Note any half-written function, TODO, throw-not-implemented, or dangling import.`,
  },
  {
    key: "backend",
    prompt: `Lens = BACKEND COMPLETENESS. Verify per TASK-480-02/03: dashboard_layouts schema + 0066 migration artifacts COMPLETE (SQL + meta/0066_snapshot.json + _journal.json idx entry, no gap/collision); the widget + layout types + data-source REGISTRY + dashboardService are fully implemented (all 9 spec widgets have a data source, not stubbed); layout persistence is per-user; routes delegate to services with map*Error, machine-readable errors, reject-unknown validation. Flag any missing/stub piece.`,
  },
  {
    key: "frontend-fidelity",
    prompt: `Lens = FRONTEND COMPLETENESS + PROTOTYPE FIDELITY. Verify per TASK-480-04/05 + _docs/DASHBOARD_WIDGETS_SPEC.md: all 9 widget renderers exist AND render real data (not placeholder shells); the DashboardBuilder edit-mode (grid add/arrange/resize + floating configure panel) is functional with dirty-state + cache; DashboardWidgetHost/registry wires renderers. Compare against the prototype dashboard (http://localhost:5180/#/ — the dashboard/home screen) for layout/structure/token fidelity (open with playwright-cli -s=wf480audit, screenshot to _docs/_workflows/_smoke/). Flag cosmetic shells, missing renderers, non-functional builder controls, or prototype-fidelity gaps.`,
  },
  {
    key: "security-model",
    prompt: `Lens = SECURITY & MODEL. Verify: dashboard routes are internal /admin/api/*, RBAC (dashboard:write for layout mutations / read for gets — or the contract's chosen buckets), CSRF on writes, per-user layout isolation (a user cannot read/write another user's layout), schema-first reject-unknown + normalize*, no secrets/privileged data leaked into widget-data or cache/localStorage. Flag any authz gap, missing CSRF, cross-user leakage, or unvalidated payload.`,
  },
  {
    key: "tests-closure",
    prompt: `Lens = TESTS + DOCS + CLOSURE INTEGRITY. Are the tests the subtasks promised actually present and REAL (route registration + map*Error + service + renderer + builder tests, not weakened/absent)? Run the dashboard test file (tests/integration/routes/dashboard.test.ts) and report pass/fail. Is _docs/DASHBOARD_WIDGETS_SPEC.md complete? Are the changelog entry (note: 480 uses 1223) + board rows + task statuses consistent with what was actually implemented? Given the agent hit the limit — enumerate what is INCOMPLETE vs the closure checklist.`,
  },
];

phase("Audit");
const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(`${COMMON}\n${l.prompt}`, {
        label: "audit:" + l.key,
        phase: "Audit",
        schema: AUDIT_SCHEMA,
      })
  )
);
const valid = audits.filter(Boolean);
const allFindings = valid.flatMap((a) => a.findings || []);
const hm = allFindings.filter((f) => f.severity !== "LOW");

phase("Critic");
const critic = await agent(
  `${COMMON}
You are the COMPLETENESS CRITIC. Here are the lens audit findings so far: ${JSON.stringify(valid.map((a) => ({ lens: a.lens, summary: a.summary, findings: a.findings })))}.
Identify what the lenses MISSED: any TASK-480 subtask deliverable with NO corresponding staged code, any contracted widget/route/renderer/test that is absent, any half-applied edit from the limit-interrupted agent, and the single biggest risk to shipping 480. Also give a clear VERDICT: is the staged 480 implementation (a) essentially complete + fixable with small edits, (b) substantially incomplete (needs a resumed implementation workflow), or (c) broken/should be reset. Return your findings (schema) with the verdict in summary.`,
  { label: "critic", phase: "Critic", schema: AUDIT_SCHEMA }
);

return {
  task: "480",
  lensCount: valid.length,
  highMedCount: hm.length,
  findingsBySeverity: {
    high: allFindings.filter((f) => f.severity === "HIGH").length,
    medium: allFindings.filter((f) => f.severity === "MEDIUM").length,
    low: allFindings.filter((f) => f.severity === "LOW").length,
  },
  findings: allFindings,
  criticVerdict: critic ? critic.summary : "critic returned null",
  criticFindings: critic ? critic.findings : [],
};
