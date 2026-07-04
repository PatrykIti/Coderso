export const meta = {
  name: "task-509-security",
  description:
    "TASK-509 — make `bun run scan:security:strict` pass + fix the flaky bun settings test. (A) Self-isolate tests/unit/settings/settingsService.test.ts 'site shell reference keys accept nullable id strings' so smoke-DB pollution can't break it. (B) Dependency remediation: bump nodemailer 7->9.0.1 (direct core dep; clears the raw-option file-read/SSRF CVE) + root package.json overrides for the transitive high-severity CVEs (ws->8.21.0, undici->7.28.0, vite->8.0.16, sigstore-> fixed) to clear bun-audit + trivy-vuln. (C) Pin ALL GitHub Actions in .github/workflows/{coderso-pr-gates,release}.yml to 40-char commit SHAs (owner-approved; SHAs pre-resolved in args) to clear the 36 semgrep mutable-action-tag findings. Then re-run scan:security:strict GREEN + verify tests. Author board, implement (parallel where disjoint), verify, post-audit, closure (changelog 1218).",
  phases: [
    { title: "Author" },
    { title: "Implement" },
    { title: "Verify" },
    { title: "Post-audit" },
    { title: "Closure" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const BOARD = "TASK-509_Security_Strict_And_Settings_Test_Isolation.md";
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";

// Pre-resolved by the orchestrator via the public GitHub API (deref'd commit SHAs).
const SHAS = (args && args.shas) || {};
const TAGS = (args && args.tags) || {};
const SHA_TABLE = Object.keys(SHAS)
  .sort()
  .map((repo) => "  " + repo + " => " + SHAS[repo] + "  # " + (TAGS[repo] || ""))
  .join("\n");

const CONTEXT = [
  "TASK-509 makes `bun run scan:security:strict` pass and fixes the one flaky bun settings test. Branch feature/visual, IN-PLACE. AGENTS.md: for dependency/scanner-posture changes, record owner + reason + expiry + ticket in the task/changelog; do NOT add production fallbacks only to satisfy tests; keep backward compatibility. Menu/large files read as BINARY to rg — Read + grep -an.",
  "",
  "PART A — TEST ISOLATION (owns tests/unit/settings/settingsService.test.ts). The test 'site shell reference keys accept nullable id strings' (@~154) asserts at the TOP that listSettings()['site.navigationMenuId'] and ['site.footerTemplateId'] are BOTH null — a CLEAN-GLOBAL-STATE assumption. The exploratory playwright SMOKE assigns a menu as the site navigation (sets site.navigationMenuId non-null in the shared test DB), so this test flakes on every full `bun run test`. FIX per AGENTS.md (self-scoped fixtures): make the test OWN its state — reset BOTH keys to null at the START (before the initial null assertions) so it is deterministic regardless of prior pollution, WITHOUT weakening what it verifies (the nullable-id round-trip: set trimmed value -> reads trimmed -> set null/'   ' -> reads null). Do NOT touch production code. Keep the sibling tests intact.",
  "",
  "PART B — DEPENDENCY REMEDIATION (owns core/package.json + root package.json + bun.lock via `bun install`). Clear the 8 bun-audit + 6 trivy-vuln HIGH findings: (1) nodemailer is a DIRECT core dep (core/package.json '^7.0.11'); bump to '^9.0.1' (+ @types/nodemailer to '^9') — usage is standard createTransport/sendMail in core/services/email/{emailProvider,emailSettingsService}.ts with NO `raw` message option, so the 9.0 API is compatible; verify by running the email tests. (2) The rest are TRANSITIVE — add root package.json `overrides` entries pinning the fixed versions: ws '^8.21.0' (via happy-dom), undici '^7.28.0' (via semantic-release/@semantic-release/github), vite '^8.0.16' (dev), and sigstore to the minimal fixed version >4.1.0 compatible with @semantic-release/npm's pacote (resolve the exact fixed version). Run `bun install` and confirm it resolves cleanly. If an override breaks its parent's peer range, pick the nearest fixed version the parent accepts and note it. Do NOT change unrelated deps.",
  "",
  "PART C — GITHUB ACTIONS SHA PINNING (owns .github/workflows/coderso-pr-gates.yml + release.yml). Owner-approved: pin EVERY `uses:` ref to its 40-char commit SHA to clear the 36 semgrep `github-actions-mutable-action-tag` blocking findings. Use these ORCHESTRATOR-RESOLVED SHAs (deref'd commit SHAs from the public GitHub API — do NOT re-resolve):",
  SHA_TABLE,
  "For each `uses: <repo>[/subpath]@<tag>` line, replace `@<tag>` with `@<sha>` and append a trailing `  # <tag>` comment so the human-readable version stays visible (e.g. `uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4`). NOTE github/codeql-action/upload-sarif keeps its `/upload-sarif` subpath: `uses: github/codeql-action/upload-sarif@54f647...  # v4`. Pin EVERY occurrence in BOTH files (27 in coderso-pr-gates.yml + 9 in release.yml). Do not otherwise change workflow logic.",
].join("\n");

// ---------------------------------------------------------------------------
phase("Author");
await agent(
  [
    "Author the board task file " +
      TASKS +
      "/" +
      BOARD +
      " for TASK-509 per AGENTS.md (board file, underscores; H1 = TASK-509; '# FileName:' matches; **Status:** ⏳ To Do; Overview; three clearly-separated sections A/B/C with execution-ready detail citing the REAL anchors you verify (Read + grep -an); a **Security & Dependency Record** subsection with owner=patryk0741@gmail.com, reason (clear scan:security:strict), the exact version bumps/overrides + SHA pins, and expiry='revisit on next dependency-audit wave'; Testing/Validation Requirements = scan:security:strict GREEN + the settings + email test suites + precommit:check).",
    CONTEXT,
    "ALSO add a TASK-509 row to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 1 (Read README FRESH first; touch ONLY your row). Return the board path.",
  ].join("\n\n"),
  { label: "author:509", phase: "Author" }
);

// ---------------------------------------------------------------------------
phase("Implement");
const COMMON =
  "Implement a TASK-509 part on branch feature/visual IN-PLACE. Read the board " +
  TASKS +
  "/" +
  BOARD +
  " + your target files IN FULL first (Read + grep -an). Do NOT edit _docs/* (closure agent owns docs). Touch ONLY your owned file(s). Return a concise summary: exact edits (file:line), verification run, deviations.";
// A (test) and C (yaml) are disjoint files — run in parallel; B (deps + bun install) after, to keep the lockfile deterministic.
await parallel([
  () =>
    agent(
      COMMON +
        "\n\nYOUR PART = A (owns tests/unit/settings/settingsService.test.ts ONLY).\n" +
        CONTEXT.split("PART B")[0].split("PART A")[1],
      { label: "impl:A-test", phase: "Implement" }
    ),
  () =>
    agent(
      COMMON +
        "\n\nYOUR PART = C (owns .github/workflows/coderso-pr-gates.yml + .github/workflows/release.yml ONLY). Apply the pre-resolved SHAs EXACTLY as given; after editing, grep to confirm ZERO remaining `uses:.*@v` mutable refs in either file.\n\nPART C" +
        CONTEXT.split("PART C")[1],
      { label: "impl:C-sha", phase: "Implement" }
    ),
]);
await agent(
  COMMON +
    "\n\nYOUR PART = B (owns core/package.json + root package.json; you MAY run `bun install` which updates bun.lock).\n\nPART B" +
    CONTEXT.split("PART B")[1].split("PART C")[0] +
    "\n\nAfter editing manifests, run `cd " +
    ROOT +
    " && bun install 2>&1 | tail -20` and confirm clean. Then run the email tests to prove the nodemailer bump is compatible: `" +
    ENV +
    "bun test tests/unit/email tests/integration 2>&1 | grep -iE 'email|nodemailer|pass|fail' | tail -20` (adjust the path to the real email test files you find). Report the installed nodemailer/ws/undici/vite/sigstore versions from `bun pm ls 2>/dev/null | grep -iE 'nodemailer|ws@|undici|vite@|sigstore'` or bun.lock.",
  { label: "impl:B-deps", phase: "Implement" }
);

// ---------------------------------------------------------------------------
phase("Verify");
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["strictPass", "testsPass", "summary", "errors"],
  properties: {
    strictPass: { type: "boolean" },
    testsPass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};
const verifyCmd =
  "cd " +
  ROOT +
  " && echo '=== strict security scan ===' && bun run scan:security:strict 2>&1 | tail -40 && echo '=== settings+email tests ===' && " +
  ENV +
  "bun test tests/unit/settings tests/unit/email 2>&1 | tail -20 && echo '=== lint/types ===' && bun --cwd core lint:types 2>&1 | tail -8";
async function runVerify(label) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      verifyCmd +
      "\nReturn {strictPass (true iff scan:security:strict exits 0 / summary shows NO scanner reported findings), testsPass (settings+email 0 failed AND lint:types clean), summary, errors[]}. For scan:security:strict, the final line lists any scanners that failed — strictPass=true ONLY if that failure list is empty. List each real finding/failure in errors[] (cap 40).",
    { label: label, phase: "Verify", schema: GATE_SCHEMA }
  );
}
let v = await runVerify("verify:1");
let r = 1;
while (v && (!v.strictPass || !v.testsPass) && r <= 3) {
  log(
    "Verify round " +
      r +
      ": strict=" +
      (v && v.strictPass) +
      " tests=" +
      (v && v.testsPass) +
      " -> fixing " +
      v.errors.length
  );
  await agent(
    "TASK-509 verify FAILS. Fix CORRECTLY (owned files only; no _docs). If scan:security:strict still reports semgrep mutable-tag findings ⇒ a `uses:@v` ref was missed in a workflow file (grep both files, pin it to its SHA from the board). If bun-audit/trivy-vuln still HIGH ⇒ a dep/override is not at the fixed version (fix core/package.json or the root overrides + re-run bun install). If the settings/email tests fail ⇒ fix the test isolation or the nodemailer-9 compat WITHOUT weakening assertions or adding prod fallbacks. Do NOT touch _docs.\nErrors:\n" +
      v.errors.map((e) => "- " + e).join("\n"),
    { label: "fix:verify:" + r, phase: "Verify" }
  );
  r += 1;
  v = await runVerify("verify:" + r);
}
log("Verify: strict=" + (v && v.strictPass) + " tests=" + (v && v.testsPass));

// ---------------------------------------------------------------------------
phase("Post-audit");
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const audit = await agent(
  "Post-implementation audit of TASK-509 (on disk; you may run git diff + curl the GitHub API to spot-check a SHA). Verify: (A) the settings test now self-resets site.navigationMenuId + site.footerTemplateId to null at the start and still verifies the nullable-id round-trip (no weakened assertion, no prod code touched). (B) nodemailer is '^9.x' in core/package.json with @types bumped, the root overrides pin ws>=8.21.0 / undici>=7.28.0 / vite>=8.0.16 / sigstore fixed, `bun install` is clean, and NO functional email regression (createTransport/sendMail path intact, no `raw` usage introduced). (C) EVERY `uses:` in both workflow files is pinned to a real 40-char SHA with a `# vX` comment and NO `@v` mutable ref remains; spot-check 2-3 SHAs resolve to the intended tag via the GitHub API. Also confirm the AGENTS.md security record (owner/reason/expiry) exists in the board/changelog. Flag real issues only (evidence-backed, file:line). Return findings[].",
  { label: "audit:509", phase: "Post-audit", schema: AUDIT_SCHEMA }
);
const hm = (audit && audit.findings ? audit.findings : []).filter(
  (f) => f.severity === "high" || f.severity === "medium"
);
if (hm.length > 0) {
  log("Post-audit: " + hm.length + " HIGH/MED -> fixing");
  await agent(
    "TASK-509 post-audit found these HIGH/MEDIUM issues. Fix each correctly (owned files only; no _docs).\n" +
      hm
        .map(
          (f) =>
            "- [" +
            f.severity +
            "] " +
            f.area +
            ": " +
            f.finding +
            "\n  evidence: " +
            f.evidence +
            "\n  fix: " +
            f.recommendation
        )
        .join("\n"),
    { label: "audit-fix:509", phase: "Post-audit" }
  );
  const v2 = await runVerify("verify:post-audit");
  log("Post-audit re-verify: strict=" + (v2 && v2.strictPass) + " tests=" + (v2 && v2.testsPass));
}

// ---------------------------------------------------------------------------
phase("Closure");
await agent(
  "Close out TASK-509. Docs/board per AGENTS.md:\n- Add changelog _docs/_CHANGELOG/1218-2026-07-04-task-509-...md (PINNED 1218; the pointer in _docs/_CHANGELOG/README.md already reads 1218) + add the table row + bump the next-entry pointer to 1219. Record the Security & Dependency change (owner patryk0741@gmail.com, reason=clear scan:security:strict, the nodemailer 9 bump + ws/undici/vite/sigstore overrides + full GitHub Actions SHA pinning, expiry=revisit next dependency-audit wave).\n- Board: _docs/_TASKS/README.md — Read FRESH immediately before editing; move ONLY the TASK-509 row to Done + adjust Statistics by exactly 1. Set **Status:** ✅ Done + **Completed:** 2026-07-04 in " +
    TASKS +
    "/" +
    BOARD +
    ".\nOnly touch _docs + the board file. Return the changelog path + confirmation Statistics reconcile.",
  { label: "closure:509", phase: "Closure" }
);

return { strictPass: v && v.strictPass, testsPass: v && v.testsPass, postAuditHighMed: hm.length };
