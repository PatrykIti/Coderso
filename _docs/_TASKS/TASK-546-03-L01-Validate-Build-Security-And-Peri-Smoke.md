# TASK-546-03-L01: Validate Build, Security, and Peri Smoke

# FileName: TASK-546-03-L01-Validate-Build-Security-And-Peri-Smoke.md

**Parent Task:** TASK-546
**Parent Subtask:** TASK-546-03
**Priority:** High
**Category:** Runtime Validation / Security / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-546-04-L03
**Status:** ✅ Done
**Completed:** 2026-07-22
**Changelog:** 1259 (pinned; closure only)

---

## Scope and exclusive ownership

Run the final integrated validation in dependency order, perform a fresh built
server smoke including literal `/peri`, and close TASK-546 only after all three
TASK-546-04 leaves have landed. This leaf exclusively owns:

- `_docs/_CHANGELOG/1259-2026-07-22-task-546-node-26-full-dependency-upgrade.md`;
- the TASK-546 parent and ten descendant status/completion fields (four
  children plus six leaves);
- the TASK-546 umbrella row/statistics in `_docs/_TASKS/README.md`;
- only the changelog 1259 index row in `_docs/_CHANGELOG/README.md`;
- task-scoped smoke evidence under `_docs/_workflows/_smoke/` when durable
  evidence is needed.

Read both indexes fresh immediately before editing. Do not edit manifests,
locks, Docker, CI, production source/config/tests, L01 version docs, TASK-545,
TASK-546-04 workflow/test remediation, other task/changelog rows, or
`_TMP-pr-feature-tasks-fixes.md`. Validation may identify a blocker; any required
source/dependency/CodeQL repair returns to its sole writer instead of being made
by this closure leaf.

## Runtime smoke contract

Use the built Bun production entrypoint through `bun run start:prod` after fresh
Admin/site builds. Bun 1.3.14 runtime TSX emitted `jsxDEV` while React 19.2.8
leaves that export undefined in production, so this canonical command carries
the production preload that delegates the emitted call to React's production
JSX factory. Perform the Docker-equivalent site-manifest placement (`dist/site/.vite/manifest.json`
to `dist/site/manifest.json` only when the latter is absent), and explicitly
unset `VITE_DEV_SERVER_URL`, `VITE_SITE_DEV_SERVER_URL`, and the corresponding
public `CODERSO_PUBLIC_VITE_DEV_URL` override so the smoke cannot pass through
development servers. Require the stored `assistant.docs.reindexOnBoot` setting
to be non-true, then load
repo environment without printing it, reserve/verify the selected local port,
start one owned process, capture its PID and log path, and poll a known public
request for readiness with a bounded timeout. Immediately before start, resolve
the configured public/Admin hosts without recording their values and send each
request with the corresponding `Host` header. Require an empty IP allowlist or
an isolated smoke database; if the shared database has active allowlist entries,
do not spoof a trusted IP and do not claim the full Admin smoke. Then request:

1. `/` as a public runtime control, accepting `200` with a configured homepage
   or the current controlled `404` when none exists;
2. the admin path returned by the repo's `resolveAdminPath()` helper: the bare
   path must redirect `307` to its slash form and the slash form must return
   built HTML with `200`;
3. `${adminPath}/api/auth/install/status`, requiring `200` and a JSON
   `{ available: boolean }` shape;
4. one `/site/assets/*` URL read from the built site manifest, requested with
   the public Host and requiring `200` plus its
   expected JavaScript/CSS content type;
5. literal `/peri` exactly as requested.

`/peri` has no known registered route at authoring. Therefore its smoke passes
when it returns the controlled framework `404` response and fails on `5xx`,
connection reset, hang, uncaught stack/error leakage, or accidental redirect to
an unrelated success page. If implementation evidence shows a real `/peri`
route now exists, assert that route's documented status/body instead and record
the discovered owner; do not add a route merely to make the smoke return 2xx.

After requests, inspect startup/runtime logs for uncaught exceptions and
unexpected errors. Stop and `wait` for the exact captured process; prove the PID
and listening port are gone. Never use broad `pkill` or terminate an unrelated
server.

## Implementation Pseudocode

```ts
const baseline = fingerprintOwnedManifestsLocksAndSource();
loadDotEnvWithoutPrintingValues();
requireNonEmptyDatabaseUrl();
requireRepoPostgresSelectOneWithinBoundedTimeout();
requireSettingNotTrue("assistant.docs.reindexOnBoot");
const requestHosts = await resolveConfiguredSmokeHostsWithoutLogging();
requireEmptyIpAllowlistOrIsolatedDatabase();

runFrozenInstallProofs();
runCompileAndProductionBuildMatrix();
runTask546CodeQlLocalRegressionMatrix();
runFullTestPrecommitReleaseAndStrictSecurityGates();

const server = startOwnedBuiltBunServer({
  cwd: "core",
  command: ["bun", "run", "start:prod"],
  env: loadRepoEnvWithoutLogging({
    NODE_ENV: "production",
    BACKUP_SCHEDULER_ENABLED: "false",
    unset: ["VITE_DEV_SERVER_URL", "VITE_SITE_DEV_SERVER_URL", "CODERSO_PUBLIC_VITE_DEV_URL"],
  }),
  port: chooseFreePort(),
});
try {
  const adminPath = await resolveAdminPath();
  await poll(`${adminPath}/api/auth/install/status`, {
    port: server.port,
    host: requestHosts.admin,
    timeoutMs: bounded,
  });
  const root = await request(server, "/", { host: requestHosts.public });
  const adminRedirect = await request(server, adminPath, {
    host: requestHosts.admin,
    redirect: "manual",
  });
  const adminHtml = await request(server, `${adminPath}/`, { host: requestHosts.admin });
  const api = await request(server, `${adminPath}/api/auth/install/status`, {
    host: requestHosts.admin,
  });
  const asset = await requestSiteManifestDerivedBuiltAsset(server, {
    host: requestHosts.public,
  });
  const peri = await request(server, "/peri", { host: requestHosts.public });

  assertExpectedControlStatuses({ root, adminRedirect, adminHtml, api, asset });
  const periOwner = await discoverPeriOwner({
    staticRoutes: true,
    persistedRedirects: true,
    persistedPages: true,
    configuredContentRoutes: true,
  });
  if (periOwner) assertDocumentedPeriContract(peri, periOwner);
  else assertControlledNotFound(peri); // exact 404/Not Found, never redirect/5xx/stack
  assertNoUnexpectedServerErrors(server.logs);
} finally {
  stopAndWaitExactPid(server.pid);
  assertPortAndPidReleased(server);
}

assertFingerprintUnchanged(baseline);
recordPrCodeQlStatusForExactPushedCommitOrNotRun();
writeEvidenceAndCloseDescendantsThenParent();
```

## Security Contract

- **Endpoint visibility:** smoke only; no route is added or visibility changed.
- **Auth/RBAC:** Admin/API controls retain their existing unauthenticated
  behavior; do not use or log privileged sessions/API keys for a liveness probe.
- **CSRF/rate limit/anti-abuse:** no write request is needed; current CSRF,
  bucket, nonce/signature/HMAC, captcha, and replay behavior remains untouched.
- **Validation:** `/peri` absence is handled by the existing bounded 404 path;
  no broad fallback or unknown-field relaxation is introduced.
- Redact secrets and environment values from logs/evidence. No scanner ignore,
  allowlist, suppression, dependency downgrade, or exception may be added.
- A strict-scan failure in TASK-545-owned `_docs/_workflows/task-522-author.mjs`
  blocks closure but does not authorize this leaf to edit that external file.
- The TASK-546-04 CodeQL fixes are immutable inputs to closure. Require their
  focused local regressions and strict scan to pass, but do not equate those
  results with GitHub's remote alert state. Only a PR CodeQL rerun bound to the
  exact pushed commit is authoritative; without a push, record **NOT RUN** and
  make no remote-closure claim.

## Final validation

```bash
node --version
bun --version
bun install --frozen-lockfile
bun --cwd _docs/_PROTOTYPE install --frozen-lockfile

bun --cwd core lint
bun --cwd core lint:types
bun --cwd store lint
./node_modules/.bin/tsc -p packages/sdk/tsconfig.json --noEmit
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bun --cwd _docs/_PROTOTYPE typecheck

bun --cwd core build:admin
bun --cwd core build:site
bun --cwd _docs/_PROTOTYPE build
bun run check:admin-boundary
bun run check:admin-bundle

node --check _docs/_workflows/task-540-smoke-executor.mjs
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node --check _docs/_workflows/task-543-implement.mjs
node --check _docs/_workflows/task-536-implement.mjs
bun test tests/unit/workflows/task540SmokeExecutorSecurity.test.ts \
  tests/unit/workflows/task543ImplementSecurity.test.ts
NODE_ENV=test bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/validation-field-schema.test.ts \
  tests/vitest/forms/validation-patterns.test.ts \
  tests/vitest/forms/validation-submission.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts

set -a && source .env && set +a
bun -e "const { default: postgres } = await import('postgres'); if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing'); const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, idle_timeout: 1 }); try { await sql\`select 1\`; } finally { await sql.end({ timeout: 1 }); }"
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict

bun outdated --recursive
bun why fast-uri
bun audit --audit-level high
(cd _docs/_PROTOTYPE && bun outdated)
(cd _docs/_PROTOTYPE && bun audit --audit-level high)
git diff --check
```

The focused workflow tests must prove that password/credential-derived values
never reach a fast digest, non-secret evidence integrity remains deterministic,
and hostile selectors/URLs/keys/values containing quotes, backticks, statement
terminators, Unicode separators, shell metacharacters, and script-like text
remain bounded inert data. The Forms command must report the unchanged 218-test
baseline across the four independently runnable files; run each named file once
alone as well as the combined command and require every file to remain below
1,000 physical lines. Record the exact `bun run scan:security:strict` exit status
and Semgrep/Trivy/Gitleaks summaries without adding an exception.

If the final commit is pushed to PR 21, inspect the CodeQL result for that exact
commit and record the actual status of alerts #30, #77-102 that TASK-546-04
owns. If the tree is uncommitted or unpushed, or GitHub has not completed the
rerun, record `PR CodeQL rerun: NOT RUN` or `PENDING` as applicable. Local tests,
Semgrep, or source inspection must never be reported as proof that GitHub closed
those alerts. Agents do not commit or push unless the owner separately requests
that external state change.

Before `bun run test`, prove the database behind `DATABASE_URL` is reachable.
Never echo the URL. If the bounded probe fails, mark the DB-backed/full suites
**NOT RUN**, continue independent Bun-free/static gates, keep the task open, and
report the environmental blocker without claiming a pass.
Re-run any named failing test file once alone. Record a confirmed environmental
or upstream limitation separately; do not misreport it as a passing gate. Docker
is unavailable in the authoring container, so do not claim a local image build;
record the CI/authorized-host Docker result when available.

Check physical line counts for every touched human-authored production/test
file in the union of `git diff --name-only
d49e1027e3e8826c6a56cc967421073a5dae0e22...HEAD`, the final worktree diff,
and `git ls-files --others --exclude-standard` for untracked additions. Exclude
only the unrelated initial `_TMP-pr-feature-tasks-fixes.md`; deduplicate and run `wc -l`
for every remaining production/test path. Any result above 1,000 is a failed
gate. Lockfiles and generated build artifacts are exempt.

## Closure order

1. Verify `TASK-546-01-L01`, `TASK-546-02-L01`, and all three TASK-546-04
   leaves landed; run their final local CodeQL regressions, full gates, strict
   scan, and smoke from the unchanged integrated tree.
2. Record the PR CodeQL rerun for the exact pushed commit, or explicitly record
   **NOT RUN/PENDING** without claiming remote alert closure when no completed
   rerun exists.
3. Create changelog 1259 with selected/constrained versions, Node/Bun proof,
   CVE removal, local CodeQL regression and strict-scan evidence, truthful PR
   CodeQL status, build/test results, `/peri` status, Docker limitation, and any
   non-blocking upstream warning.
4. Mark `TASK-546-01-L01`, `TASK-546-01`, `TASK-546-02-L01`, `TASK-546-02`,
   `TASK-546-04-L01`, `TASK-546-04-L02`, `TASK-546-04-L03`, `TASK-546-04`, this
   leaf, and `TASK-546-03` terminal in that dependency order.
5. Read task/changelog indexes fresh, update the TASK-546 umbrella row plus
   task-board statistics in `_docs/_TASKS/README.md`, and add only the 1259
   index row in `_docs/_CHANGELOG/README.md`; descendants remain represented by
   their physical status files under the board's established umbrella-only
   convention. Then mark parent TASK-546 `✅ Done`.
6. Re-run `git diff --check`, status/diff scope, index statistics, descendant
   terminal-state checks, and frozen lock proof after documentation edits.

## Acceptance criteria

- Full tests, precommit, release gates, strict security scan, compilers, and all
  root/core/prototype production builds pass on the final graph.
- `/peri` returns its real registered contract or, while absent, a controlled
  non-5xx `404`; server logs are clean and the exact owned process is gone.
- Both reported `fast-uri` CVEs are absent with no HIGH/CRITICAL replacement.
- TASK-546-04's local CodeQL regressions and the complete strict scan pass. The
  PR CodeQL result is bound to the exact pushed commit or truthfully recorded
  **NOT RUN/PENDING**; no GitHub alert closure is inferred from local evidence.
- All ten descendants and parent close consistently; changelog 1259 and only
  TASK-546 index/statistics deltas are synchronized.
- No Docker-build or TASK-545 strict-scan claim is overstated.
