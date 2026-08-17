export const meta = {
  name: "task-517-author",
  description:
    "Author + drift-audit the TASK-517 (Entry Visibility — Public Front Enforcement) contract: ground vs real code, decompose into executable leaves, audit until clean",
  phases: [
    {
      title: "Ground",
      detail:
        "map the REAL render path / visibility model / verifyPassword / HMAC-cookie / cache / rate-limit symbols",
    },
    {
      title: "Decompose",
      detail:
        "write parent + 3 subtasks + executable leaves with pseudocode, grounded names, fixed changelog pin",
    },
    {
      title: "Drift-audit",
      detail:
        "parallel lenses (security-gating, grounding, cross-file reconcile) → fixers, loop until clean",
    },
    { title: "Finalize", detail: "verdict + residual list" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;

const GROUND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "renderPath",
    "visibilityModel",
    "passwordHelper",
    "hmacCookiePattern",
    "publicCache",
    "rateLimit",
    "openDecisions",
  ],
  properties: {
    renderPath: {
      type: "string",
      description:
        "exact file:symbol(s) that render a public entry detail body + where the dispatch chooses the branch (post-content-type + generic). Real names only.",
    },
    visibilityModel: {
      type: "string",
      description:
        "exact column names + TS field for visibility + access_password, the entries repo/service file:symbol that loads an entry for public render, and whether visibility/access_password are already selected there",
    },
    passwordHelper: {
      type: "string",
      description:
        "exact verifyPassword import path + signature (and the hashPassword counterpart)",
    },
    hmacCookiePattern: {
      type: "string",
      description:
        "the REAL existing HMAC-signed cookie/token/nonce pattern to reuse (forms/booking/preview) — file:symbol + how it signs/verifies + cookie flags",
    },
    publicCache: {
      type: "string",
      description:
        "the public HTML/render cache layer file:symbol + how to exclude a response from it (real API)",
    },
    rateLimit: {
      type: "string",
      description:
        "the public_write rate-limit bucket + reject-unknown validation helper used by existing public POST endpoints (e.g. forms uploads) — file:symbol",
    },
    openDecisions: {
      type: "string",
      description:
        "resolved recommendations: private-anon → 404 (no existence leak); unlock token stateless HMAC cookie scoped to entry id; exact new public route path for password submit; cache policy",
    },
  },
};

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

phase("Ground");
const grounding = await agent(
  `You are grounding the TASK-517 contract against the REAL current code at ${ROOT} (branch feature/tasks-fixes). TASK-517 enforces per-entry visibility (public|private|password) on the PUBLIC front render path — 514 shipped the model + admin, front enforcement was deferred to 517. The EXISTING contract cites some STALE names (e.g. it references core/site/publicSite.tsx which does NOT exist; the real renderer is core/site/renderPublicEntry.tsx). Do NOT trust the contract's file names — VERIFY every one against disk with rg/grep/Read.

Produce an exact grounding map so the decomposition uses real file:symbol names. Investigate and report, for each field:
- renderPath: read core/site/renderPublicEntry.tsx and find the public entry-detail render + the dispatch that picks post-content-type vs generic-entry-detail branches (find the real dispatcher file, whatever it is now). Cite exact function/component names + the point where a visibility gate must slot in.
- visibilityModel: find the content_entries visibility + access_password columns (db schema) AND the entries service/repo function that loads an entry for PUBLIC render — confirm whether it already selects visibility + access_password (if not, note that the loader must be widened). Exact file:symbol.
- passwordHelper: verifyPassword — exact import path (core/services/auth/password.ts?) + signature.
- hmacCookiePattern: find the REAL signed-cookie/token/nonce HMAC pattern already in the codebase (forms nonce, booking, preview token, CSRF) to reuse for the unlock cookie — exact file:symbol + sign/verify calls + cookie flags (httpOnly/secure/sameSite/maxAge).
- publicCache: find the public HTML/render cache (if any) + the real way to mark a response non-cacheable / exclude it. If there is no shared public cache, say so explicitly.
- rateLimit: find the public_write rate-limit bucket + reject-unknown body validation used by an existing PUBLIC POST endpoint (e.g. the 516 forms upload route) to mirror for the password-submit endpoint. Exact file:symbol.
- openDecisions: resolve the contract's open choices with a concrete recommendation (private-anon → 404 uniform, no existence leak; stateless HMAC unlock cookie scoped to entry id; the exact new public route path for the password submit; cache exclusion policy).

Return ONLY the structured object. Be precise — real names, real signatures, verified against disk.`,
  { label: "ground:517", phase: "Ground", schema: GROUND_SCHEMA }
);

log(`grounded: renderPath=${grounding.renderPath.slice(0, 80)}…`);

phase("Decompose");
const decompose = await agent(
  `Author the FULL granular TASK-517 contract per the AGENTS.md Multi-Agent Workflow Process (like 519-522 were authored). Edit the files under ${TASKS}: the parent TASK-517_Entry_Visibility_Front_Enforcement.md and CREATE per-subtask + per-leaf files (TASK-517-01*.md, TASK-517-01-L01*.md, …) following the EXACT format/frontmatter of the existing TASK-52x leaf files in ${TASKS} (read one first, e.g. an existing TASK-521-*-L*.md, to copy the structure: header, FileName, Priority/Effort/Dependencies/Status, execution-ready pseudocode, Security Contract restatement for route-touching leaves, correct TEST LANE, regression-test shape, shared-DB safety).

Use ONLY these REAL grounded names (verified against disk — the old contract has stale names, do NOT reuse them):
${JSON.stringify(grounding, null, 2)}

Decomposition (land order strictly sequential 01→02→03; each leaf single-writer + documented additive seams):
- 517-01 Visibility resolver + private auth-gate on the public render path: a pure resolver (visibility → gate decision), widen the public-entry loader to select visibility+access_password if needed, slot the gate into renderPublicEntry's dispatch, private-anon → uniform 404 (no existence leak), preview/admin authenticated render BYPASSES the gate. Leaves for: resolver + unit tests, loader widening, render-path gate insertion, 404 fail-closed.
- 517-02 Password gate: a new PUBLIC password-submit endpoint (exact route path from grounding) verifying against access_password via verifyPassword server-side (hash NEVER sent to client), on success set a short-lived HMAC-signed unlock cookie scoped to entry id (reuse the grounded HMAC pattern — no weaker one-off), a prompt UI when locked + not-yet-unlocked, public_write rate-limit + reject-unknown validation + bot/DNT-neutral. Leaves for: unlock-cookie sign/verify util + tests, submit endpoint + validation + rate-limit, prompt UI + locked-body withholding, wrong→right→unlocked flow.
- 517-03 Cache exclusion + gate-matrix tests + docs & closure: exclude private/password from any shared public cache (or per-unlocked-session only), the full gate matrix Bun tests (public renders to all; private 404-anon / renders-authed; password prompt → wrong rejected → right unlocks → unlocked serves body; unlock cookie tamper rejected), docs (SECURITY_SPEC public entry-visibility gate boundary + PAGE/ENTRY model note), and closure.

PINNED FACTS (correct the stale ones):
- Changelog number: closure creates _docs/_CHANGELOG/1236-*.md (1235 is TAKEN by 522; 1236 is next-free — the old contract's 1230 pin is STALE, fix it).
- Branch/worktree: dedicated feature/task-517 worktree branched from feature/tasks-fixes HEAD.
- No DB migration of its own — reuse 514's visibility + access_password columns; unlock token = stateless HMAC signed cookie (no new table).
- Shared REMOTE test DB — scoped fixtures, no truncation; render/route tests seed + clean their own rows; test lane = BUN for render/route path.

Set every authored file Status to '⏳ To Do' and keep the parent's subtask table in sync with the real leaf ids you create. Return a concise plain-text summary: the files created/edited (paths), the leaf count per subtask, and any assumption you had to make. Do NOT implement production code — this is the CONTRACT only.`,
  { label: "decompose:517", phase: "Decompose" }
);

log(`decomposed: ${decompose.slice(0, 200)}`);

phase("Drift-audit");
const LENSES = [
  {
    key: "security-gating",
    prompt:
      "SECURITY-GATING lens: audit the authored TASK-517 contract for fail-closed correctness. Does EVERY path refuse to render a private/password body without passing the gate? Is private-anon a UNIFORM 404 (no existence leak via status/timing/redirect)? Is the password hash never sent to the client? Is the unlock cookie HMAC-signed + scoped to entry id + tamper-rejected + short-lived, reusing the real grounded pattern (not a weaker one-off)? Is the submit endpoint public_write rate-limited + reject-unknown validated? Are private/password bodies excluded from shared public cache? Flag any gap ≥MEDIUM.",
  },
  {
    key: "grounding",
    prompt:
      "GROUNDING lens: verify EVERY file:symbol the contract cites actually exists in the code at the cited path (rg/Read). The old contract had stale names (publicSite.tsx does not exist). Flag any leaf that references a non-existent file/function/column/route, or a helper signature that does not match reality, or a loader that is assumed to already select visibility/access_password when it does not. ≥MEDIUM for any ungrounded reference.",
  },
  {
    key: "reconcile",
    prompt:
      "CROSS-FILE / CROSS-SUBTASK RECONCILE lens: check the 3 subtasks + their leaves for contradictions (e.g. 01 and 02 both editing the same symbol region without a documented seam; the resolver contract in 01 not matching how 02/03 consume it; the unlock-cookie name/shape differing between the util leaf and the endpoint leaf; changelog/migration/route pins inconsistent across files; test-lane mismatches). Also confirm land order 01→02→03 is truly sequential-safe. Return findings, not just counts.",
  },
];

let round = 0;
let residual = [];
while (round < 4) {
  round++;
  const audits = await parallel(
    LENSES.map(
      (l) => () =>
        agent(
          `${l.prompt}\n\nRead the authored contract files under ${TASKS} (TASK-517*.md, all subtasks + leaves) and ground against real code at ${ROOT}. Return the structured audit (lens="${l.key}").`,
          { label: `audit:${l.key}#${round}`, phase: "Drift-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const real = audits
    .filter(Boolean)
    .flatMap((a) => (a.findings || []).map((f) => ({ ...f, lens: a.lens })));
  const blocking = real.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`round ${round}: ${real.length} findings, ${blocking.length} blocking (HIGH/MED)`);
  if (blocking.length === 0) {
    residual = real;
    break;
  }
  // Fix the blocking findings (one fixer, sees the whole set → avoids per-file oscillation)
  await agent(
    `Fix these BLOCKING drift-audit findings in the TASK-517 contract files under ${TASKS} (edit the .md contract only — NOT production code). For each, apply the stated fix, keeping the parent subtask table + leaf ids + pinned facts (changelog 1236, no migration, feature/task-517 worktree, Bun test lane) consistent across all files. Re-ground any corrected reference against real code at ${ROOT}.\n\nFINDINGS:\n${JSON.stringify(blocking, null, 2)}\n\nReturn a concise summary of the edits applied.`,
    { label: `fix#${round}`, phase: "Drift-audit" }
  );
  residual = real.filter((f) => f.severity === "LOW");
}

phase("Finalize");
const finalVerdict =
  round < 4 || residual.every((f) => f.severity === "LOW") ? "clean" : "residual-blocking";
log(
  `517 author complete after ${round} round(s): ${finalVerdict}, ${residual.length} residual (LOW)`
);

return {
  task: "TASK-517",
  rounds: round,
  finalVerdict,
  residualLow: residual,
  grounding,
  decomposeSummary: decompose.slice(0, 600),
};
