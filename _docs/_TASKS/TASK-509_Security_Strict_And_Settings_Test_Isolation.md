# TASK-509: Security Strict Pass + Settings Test Isolation

# FileName: TASK-509_Security_Strict_And_Settings_Test_Isolation.md

**Status:** ✅ Done
**Completed:** 2026-07-04
**Priority:** High
**Effort:** Medium
**Branch:** `feature/visual` (work IN-PLACE)
**Owner:** patryk0741@gmail.com

## Overview

Two independent stability defects block a clean release gate on `feature/visual`:

1. **`bun run scan:security:strict` is RED.** The strict security sweep
   (`scripts/run-security-scan.ts --strict`, wiring `scan:audit:strict` +
   `scan:trivy:*:strict` + `scan:semgrep:strict` + `scan:gitleaks:*:strict`) reports
   **8 `bun audit` HIGH findings**, **6 `trivy fs --scanners vuln` HIGH/CRITICAL
   findings**, and **36 `semgrep` `github-actions-mutable-action-tag` findings** across
   the two GitHub Actions workflows.
2. **One flaky Bun settings test.** `tests/unit/settings/settingsService.test.ts` →
   `"site shell reference keys accept nullable id strings"` (line 154) assumes clean
   global DB state and flakes on every full `bun run test` after the exploratory
   Playwright smoke assigns a site navigation menu (writes a non-null
   `site.navigationMenuId` into the shared test DB).

This task makes `scan:security:strict` GREEN and makes the settings test deterministic,
without adding production fallbacks only to satisfy tests and while keeping backward
compatibility (per `AGENTS.md` → Implementation Rules). Dependency/scanner-posture
changes are recorded in the **Security & Dependency Record** subsection (owner + reason
+ exact bumps/overrides + SHA pins + expiry) and mirrored into the changelog on closure.

The work is split into three clearly-separated, independently-verifiable sections:

- **PART A** — Test isolation (self-scoped fixtures) — owns
  `tests/unit/settings/settingsService.test.ts`.
- **PART B** — Dependency remediation (`bun audit` + `trivy` HIGH) — owns
  `core/package.json`, root `package.json`, and `bun.lock` (via `bun install`).
- **PART C** — GitHub Actions SHA pinning (`semgrep` mutable-action-tag) — owns
  `.github/workflows/coderso-pr-gates.yml` and `.github/workflows/release.yml`.

No API routes, RBAC, DB migrations, schema versions, or product behavior change. There is
therefore **no Security Contract** subsection (no endpoint touched); the dependency and
scanner-posture changes are governed by the **Security & Dependency Record** below.

---

## PART A — Test Isolation (settings nullable-id round-trip)

**Owns:** `tests/unit/settings/settingsService.test.ts`
**Do NOT touch production code.** Keep the sibling tests intact.

### Verified current state

- The suite imports `deleteSetting, getSetting, listSettings, setSetting, setSettings`
  from `core/services/settings/settingsService` (lines 6–13) and runs each case through
  `testIfDb` (line 16), which is `test` when a real DB is reachable and `test.skip`
  otherwise.
- `afterAll` (lines 58–63) deletes every key in `cleanupKeys` (lines 28–56), which
  **already includes** both `"site.navigationMenuId"` (line 36) and
  `"site.footerTemplateId"` (line 37). Cleanup runs AFTER the suite, so it does not
  protect the FIRST assertion of a case from pollution written by a prior process/run.
- The flaky case, verbatim (lines 154–172):

  ```ts
  testIfDb("site shell reference keys accept nullable id strings", async () => {
    const list = await listSettings();
    expect(list["site.navigationMenuId"]).toBeNull();   // ← FLAKY: assumes clean global state
    expect(list["site.footerTemplateId"]).toBeNull();   // ← FLAKY

    const menuId = randomUUID();
    const templateId = randomUUID();
    await setSetting("site.navigationMenuId", ` ${menuId} `);
    await setSetting("site.footerTemplateId", templateId);
    expect(await getSetting("site.navigationMenuId")).toBe(menuId);      // trim round-trip
    expect(await getSetting("site.footerTemplateId")).toBe(templateId);
    expect((await listSettings())["site.navigationMenuId"]).toBe(menuId);
    expect((await listSettings())["site.footerTemplateId"]).toBe(templateId);

    await setSetting("site.navigationMenuId", null);
    await setSetting("site.footerTemplateId", "   ");   // whitespace-only ⇒ null
    expect(await getSetting("site.navigationMenuId")).toBeNull();
    expect(await getSetting("site.footerTemplateId")).toBeNull();
  });
  ```

- **Root cause:** the exploratory Playwright smoke assigns a menu as the site navigation,
  persisting a non-null `site.navigationMenuId` in the shared test DB. On the next full
  `bun run test`, `listSettings()["site.navigationMenuId"]` at line 156 is that stored id,
  not `null`, so the two top assertions fail. Nothing in the round-trip logic is wrong —
  the case simply never established the clean precondition it asserts.

### Fix (self-scoped fixture — the test OWNS its state)

Per `AGENTS.md` testing rules and MEMORY (self-scoped fixtures, no production fallbacks),
make the case deterministic regardless of prior pollution WITHOUT weakening what it
verifies. Reset BOTH keys to `null` at the START of the case, immediately BEFORE the
initial null assertions, then keep the existing nullable-id round-trip verbatim:

```ts
testIfDb("site shell reference keys accept nullable id strings", async () => {
  // Self-scoped precondition: this test owns its state, so it is deterministic
  // regardless of prior pollution (e.g. the Playwright smoke assigning a site nav menu).
  await setSetting("site.navigationMenuId", null);
  await setSetting("site.footerTemplateId", null);

  const list = await listSettings();
  expect(list["site.navigationMenuId"]).toBeNull();
  expect(list["site.footerTemplateId"]).toBeNull();

  // ... unchanged: set trimmed id ⇒ reads trimmed, set null / "   " ⇒ reads null ...
});
```

### PART A constraints

- Reset via the SAME production setter the case already exercises
  (`setSetting(key, null)`); do NOT reach into `db`/`schema` directly, and do NOT add a
  new helper to production code.
- Do NOT weaken any assertion: the trimmed-value round-trip (` ${menuId} ` → reads
  `menuId`), the `listSettings` reflections, and the null / whitespace-only → `null`
  collapse (lines 159–171) all stay byte-for-byte.
- Do NOT modify the sibling cases, `cleanupKeys`, or `afterAll`. The reset is additive:
  the two `setSetting(..., null)` lines are the only new lines.
- `cleanupKeys` already covers both keys, so `afterAll` continues to return the DB to a
  clean baseline for other suites.

---

## PART B — Dependency Remediation (bun audit + trivy HIGH)

**Owns:** `core/package.json`, root `package.json`, `bun.lock` (regenerated by
`bun install`). Do NOT change unrelated deps.

Clears the 8 `bun audit` HIGH + 6 `trivy fs --scanners vuln` HIGH/CRITICAL findings. One
is a DIRECT dependency (needs a real version bump); the rest are TRANSITIVE (pinned via
root `overrides`).

### B1 — nodemailer (DIRECT core dependency)

- Verified: `nodemailer` is a direct dep in `core/package.json` at `"^7.0.11"`, and
  `@types/nodemailer` is `"^7.0.9"` in `core/devDependencies`.
- Verified usage is the standard API with NO `raw` message option, so the 9.0 API is
  compatible:
  - `core/services/email/emailProvider.ts:79-81` lazy-imports it
    (`return await import("nodemailer")`), `:94-105` `nodemailer.createTransport({ host,
    port, secure, auth })`, `:108-109` `transport.sendMail(message)`.
  - `core/services/email/emailSettingsService.ts:585`
    `await configured.transport.sendMail({ ... })`.
  - No `raw:` key anywhere in the email services.
- **Change:** bump `core/package.json` `nodemailer` → `"^9.0.1"` and
  `@types/nodemailer` → `"^9"`.
- **Verify:** run the email suites (see Testing/Validation). `createSmtpTransport`
  short-circuits to `mockTransport` under `NODE_ENV=test` / `EMAIL_TRANSPORT=mock`
  (`emailProvider.ts:90-92`), so the bump must not change test behavior; the version
  bump is validated by the suites still passing and `bun audit` dropping the finding.

### B2 — Transitive pins via root `package.json` `overrides`

Add/extend the root `overrides` block (currently pins `esbuild`, `fast-uri`,
`fast-xml-builder`, `fast-xml-parser`, `flatted`). Append the fixed versions:

| Package | Override | Vulnerable via | Notes |
|---------|----------|----------------|-------|
| `ws` | `^8.21.0` | `happy-dom` (root devDep `^20.9.0`) | DoS in `ws` header handling |
| `undici` | `^7.28.0` | `semantic-release` / `@semantic-release/github` (root devDeps) | |
| `vite` | `^8.0.16` | dev/build (`core` devDep `vite ^8.0.10`; root vitest) | dev-only |
| `sigstore` | nearest fixed `>4.1.0` accepted by `@semantic-release/npm`→`pacote` (resolve exact during install; candidate `^4.2.0`) | `@semantic-release/npm` → `pacote` → `sigstore` | see below |

- Keep the existing five overrides unchanged.
- **`sigstore`:** the exact fixed version must be resolved during `bun install` — pin the
  minimal fixed version strictly greater than `4.1.0` that `@semantic-release/npm`'s
  `pacote` peer/dependency range still accepts (record the resolved value in the changelog
  and in the Security & Dependency Record below).
- If any override breaks its parent's peer range, pick the nearest fixed version the
  parent accepts and note the deviation inline in `overrides` and in the changelog.

### B3 — Resolve + confirm

- Run `bun install` and confirm it resolves cleanly (no unmet-peer / resolution error).
- Confirm `bun.lock` is updated and committed as part of this task.
- Re-run `bun run scan:audit:strict` and `bun run scan:trivy:vuln:strict` — both must be
  GREEN (0 HIGH/CRITICAL) after the bump + overrides.

---

## PART C — GitHub Actions SHA Pinning (semgrep mutable-action-tag)

**Owns:** `.github/workflows/coderso-pr-gates.yml`,
`.github/workflows/release.yml`. Do NOT otherwise change workflow logic.

Owner-approved: pin EVERY `uses:` ref to its 40-char commit SHA to clear the 36
`github-actions-mutable-action-tag` blocking findings (27 in `coderso-pr-gates.yml` +
9 in `release.yml`). For each `uses: <repo>[/subpath]@<tag>`, replace `@<tag>` with
`@<sha>` and append a trailing `  # <tag>` comment so the human-readable version stays
visible. Example:

```yaml
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4
```

`github/codeql-action/upload-sarif` KEEPS its `/upload-sarif` subpath:
`uses: github/codeql-action/upload-sarif@54f647…  # v4`.

Use the ORCHESTRATOR-RESOLVED SHAs (deref'd commit SHAs from the public GitHub API) —
**do NOT re-resolve**. Pin the SAME SHA to every occurrence of the same `<repo>@<tag>`.

### Verified occurrences (grep -an "uses:")

`.github/workflows/coderso-pr-gates.yml` — 27 occurrences:

| Lines | `uses:` ref (tag) | SHA to pin |
|-------|-------------------|------------|
| 22, 61, 114, 152, 197, 288 | `actions/checkout@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5  # v4` |
| 25, 64, 117, 155, 291 | `oven-sh/setup-bun@v2` | `<orchestrator-resolved SHA>  # v2` |
| 30, 69, 122, 160, 296 | `actions/setup-node@v4` | `<orchestrator-resolved SHA>  # v4` |
| 101, 142, 180, 268, 313 | `actions/upload-artifact@v4` | `<orchestrator-resolved SHA>  # v4` |
| 202 | `actions/setup-python@v5` | `<orchestrator-resolved SHA>  # v5` |
| 222, 241 | `github/codeql-action/upload-sarif@v4` | `54f647…  # v4` (keep `/upload-sarif` subpath) |
| 227, 254 | `aquasecurity/trivy-action@v0.36.0` | `<orchestrator-resolved SHA>  # v0.36.0` |
| 246 | `gitleaks/gitleaks-action@v2` | `<orchestrator-resolved SHA>  # v2` |

`.github/workflows/release.yml` — 9 occurrences:

| Lines | `uses:` ref (tag) | SHA to pin |
|-------|-------------------|------------|
| 30, 90 | `actions/create-github-app-token@v2` | `<orchestrator-resolved SHA>  # v2` |
| 38, 98 | `actions/checkout@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5  # v4` |
| 44 | `oven-sh/setup-bun@v2` | `<orchestrator-resolved SHA>  # v2` |
| 49 | `actions/setup-node@v4` | `<orchestrator-resolved SHA>  # v4` |
| 118 | `docker/setup-buildx-action@v3` | `<orchestrator-resolved SHA>  # v3` |
| 121 | `docker/login-action@v3` | `<orchestrator-resolved SHA>  # v3` |
| 130 | `docker/build-push-action@v6` | `<orchestrator-resolved SHA>  # v6` |

`<orchestrator-resolved SHA>` = the exact 40-char commit SHA supplied by the orchestrator
for that `<repo>@<tag>` (the two shown literally — `actions/checkout` and
`github/codeql-action/upload-sarif` — are authoritative). Do not re-resolve; do not use a
tag or a short SHA.

### PART C constraints

- Replace ONLY the `@<tag>` portion + append the `  # <tag>` comment. Leave `with:`,
  `env:`, `run:`, `if:`, job names, and every other line untouched.
- The `# <tag>` comment must match the ORIGINAL tag so `bun run precommit:check` and the
  workflows stay human-legible.
- After editing, re-run `bun run scan:semgrep:strict` — the 36
  `github-actions-mutable-action-tag` findings must be gone (0 blocking).

---

## Security & Dependency Record

Per `AGENTS.md`: dependency/scanner-posture changes must record owner + reason + expiry +
ticket in the task/changelog.

- **Ticket:** TASK-509
- **Owner:** patryk0741@gmail.com
- **Reason:** clear `bun run scan:security:strict` (8 `bun audit` HIGH + 6 `trivy`
  HIGH/CRITICAL + 36 `semgrep` `github-actions-mutable-action-tag`) so the strict security
  gate on `feature/visual` is GREEN; no production behavior change, backward compatibility
  preserved.
- **Version bumps (direct):**
  - `core/package.json`: `nodemailer` `^7.0.11` → `^9.0.1`;
    `@types/nodemailer` `^7.0.9` → `^9`.
- **Overrides added to root `package.json` (transitive pins):**
  - `ws`: `^8.21.0` (via `happy-dom`)
  - `undici`: `^7.28.0` (via `semantic-release` / `@semantic-release/github`)
  - `vite`: `^8.0.16` (dev/build)
  - `sigstore`: minimal fixed `>4.1.0` accepted by `@semantic-release/npm`→`pacote`
    (exact resolved version recorded in the changelog on closure; candidate `^4.2.0`)
  - Existing overrides retained: `esbuild ^0.28.1`, `fast-uri ^3.1.2`,
    `fast-xml-builder ^1.1.7`, `fast-xml-parser ^5.5.6`, `flatted ^3.4.2`.
- **GitHub Actions SHA pins:** every `uses:` ref in
  `.github/workflows/coderso-pr-gates.yml` (27) and `.github/workflows/release.yml` (9)
  pinned to its orchestrator-resolved 40-char commit SHA with a trailing `# <tag>` comment
  (mapping table in PART C). Authoritative literals:
  - `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4`
  - `github/codeql-action/upload-sarif@54f647…  # v4` (subpath kept)
- **Expiry:** revisit on next dependency-audit wave.

---

## Testing / Validation Requirements

Run and record GREEN evidence for:

1. **`bun run scan:security:strict`** — the full strict sweep GREEN (0 `bun audit` HIGH,
   0 `trivy` HIGH/CRITICAL, 0 `semgrep` blocking findings, gitleaks clean). This is the
   primary acceptance gate.
2. **Settings suite** — `bun test tests/unit/settings/settingsService.test.ts` green,
   including the fixed `"site shell reference keys accept nullable id strings"` case run
   BOTH from a clean DB and immediately after the Playwright site-nav smoke (deterministic
   either way); sibling cases unchanged.
3. **Email suites** — `bun test tests/unit/email/emailSettingsService.test.ts` and the
   Vitest `tests/vitest/email/emailProvider.test.ts` green after the nodemailer `^9` bump.
4. **`bun run precommit:check`** — `core lint` + `core lint:types` + `store lint` +
   `packages/sdk` tsc + root `tsc -p tsconfig.json --noEmit` all clean (catches any
   type/lint fallout from the version bumps and YAML edits).

Also (sanity): `bun install` resolves cleanly and `bun.lock` is regenerated; the changelog
entry records the resolved `sigstore` version and any override deviation from the target
range.
