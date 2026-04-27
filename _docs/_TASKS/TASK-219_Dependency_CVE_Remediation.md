# TASK-219: Dependency CVE Remediation
# FileName: TASK-219_Dependency_CVE_Remediation.md

**Priority:** High
**Category:** Security + Dependencies
**Estimated Effort:** Medium
**Dependencies:** TASK-217
**Status:** Done (2026-04-27)

---

## Overview

Remediate the dependency CVEs surfaced by the hardened `TASK-217` scanner matrix. The new local security scan now includes Bun audit and Trivy dev-dependency lockfile coverage, which exposes high/critical findings in build/test tooling dependencies that were previously suppressed.

Goal: make `bun run scan:security:strict` pass without weakening scanner scope or adding broad CVE allowlists.

Current strict scanner findings from 2026-04-27:
- `happy-dom` `17.6.3`: critical VM context escape; fixed line starts at `20.0.0`, with additional high findings fixed by `20.8.9`.
- `vite` `7.3.1`: high dev-server findings; fixed by `7.3.2` or `8.0.5` depending dependency path.
- `rollup` `4.56.0`: high path traversal / arbitrary write; fixed by `4.59.0`.
- `picomatch` `4.0.3`: high ReDoS; fixed by `4.0.4`.
- `flatted` `3.3.3`: high DoS/prototype pollution; fixed by `3.4.2`.
- `minimatch` `3.1.2`: high ReDoS; fixed by at least `3.1.4` on the 3.x line or newer compatible major lines.

Non-goals:
- Do not reduce `TASK-217` scanner coverage.
- Do not remove `--include-dev-deps` from Trivy.
- Do not add `.trivyignore` entries unless a finding is proven unfixable and gets owner/reason/expiry/ticket metadata.
- Do not broad-update unrelated runtime dependencies unless required by the fixed dependency graph.

## Finding Matrix

| Finding Owner | Current Source | Current Version | Target/Fix Policy | Notes |
|---------------|----------------|-----------------|-------------------|-------|
| `happy-dom` | root `package.json` direct devDependency | `^17.6.3` -> lock `17.6.3` | bump direct devDependency to at least `^20.8.9`, or latest stable fixed line if available | Major upgrade; validate full Vitest and happy-dom DOM behavior. |
| `vite` | `core/package.json` direct devDependency and Vitest transitive peer | `^7.3.1` -> lock `7.3.1` | prefer minimal fixed `^7.3.2` first; only move to Vite 8 if Vite 7 still scans dirty or peer graph requires it | Validate both admin and site Vite builds. |
| `rollup` | Vite transitive | lock `4.56.0` | lock must resolve to `>=4.59.0` | Usually fixed by Vite/lock refresh; use narrow override only if lock stays vulnerable. |
| `picomatch` | Vite/Vitest/tinyglobby/transitive tooling | lock `4.0.3` | lock must resolve to `>=4.0.4` for 4.x consumers | Verify no glob behavior regressions in coverage/test runners. |
| `flatted` | ESLint `flat-cache` transitive | lock `3.3.3` | lock must resolve to `>=3.4.2` | Usually a lock-only transitive update within `flat-cache` range. |
| `minimatch` | ESLint/eslint-plugin-react 3.x transitive plus newer 9.x consumers | lock `3.1.2` | 3.x consumers must resolve to `>=3.1.4`; newer consumers must not be downgraded | Avoid one global override that forces all consumers to one incompatible major. |

## Sub-Tasks

- [x] TASK-219-01: Direct Test and Build Tooling Bumps
  - [x] TASK-219-01-01: Happy DOM Vitest Runtime Upgrade
  - [x] TASK-219-01-02: Vite Core Build Tool Upgrade
- [x] TASK-219-02: Transitive Lockfile CVE Remediation
  - [x] TASK-219-02-01: Rollup and Picomatch Lockfile Closure
  - [x] TASK-219-02-02: ESLint Flatted and Minimatch Closure
- [x] TASK-219-03: Scanner Validation and Closure
  - [x] TASK-219-03-01: Strict Security Scan CVE Closure
  - [x] TASK-219-03-02: Docs, Changelog, and Board Closure

## Implementation Order

### 1. Capture Dependency Owners

Run this before changing versions and paste the relevant owner summary into the changelog when closing:

```bash
bun pm why happy-dom
bun pm why vite
bun pm why rollup
bun pm why picomatch
bun pm why flatted
bun pm why minimatch
```

Expected ownership:
- `happy-dom` is a root devDependency and a Vitest optional peer used by the Vitest lane.
- `vite` is direct in `core/package.json` and transitive/peer-owned through Vitest tooling.
- `rollup`, `picomatch`, `flatted`, and `minimatch` are lockfile/transitive tooling dependencies.

### 2. Apply Minimal Direct Version Bumps

Patch direct manifest owners first:
- `package.json`
  - `happy-dom`: `^20.8.9` or newer fixed stable major if registry/latest policy chooses it.
- `core/package.json`
  - `vite`: `^7.3.2` or newer fixed 7.x first.

Do not change React, Tailwind, Radix, server/runtime, database, or SDK dependencies unless lockfile resolution proves they are part of the CVE chain.

### 3. Refresh Lockfile and Transitives

Preferred first command:

```bash
bun update --recursive happy-dom vite rollup picomatch flatted minimatch
```

If Bun does not move vulnerable transitives enough, retry targeted updates without widening unrelated packages:

```bash
bun update happy-dom@^20.8.9
bun update --filter @nextless/core vite@^7.3.2
bun update rollup picomatch flatted minimatch
```

If a vulnerable transitive remains pinned after those commands, use the narrowest possible `package.json` `overrides` entry and prove compatibility:
- allowed candidates if needed:
  - `rollup`: `^4.59.0`
  - `picomatch`: `^4.0.4`
  - `flatted`: `^3.4.2`
- `minimatch` caution:
  - first prefer lockfile refresh to `3.1.4` for 3.x consumers,
  - do not globally force `minimatch` to `3.x` if that downgrades current 9.x/10.x consumers,
  - if Bun only supports a broad override that would collapse incompatible majors, upgrade the parent package chain instead or document a narrow scanner exception with expiry.

### 4. Verify Lockfile Result Before Broad Tests

After install/update, confirm the lockfile no longer contains vulnerable resolved versions:

```bash
rg -n '"happy-dom": \\["happy-dom@17\\.|"vite": \\["vite@7\\.3\\.1|"rollup": \\["rollup@4\\.56\\.|"picomatch": \\["picomatch@4\\.0\\.3|"flatted": \\["flatted@3\\.3\\.3|"minimatch": \\["minimatch@3\\.1\\.2' bun.lock
bun audit --audit-level high
trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .
```

The `rg` command should return no vulnerable resolved package rows. If `bun audit` and Trivy disagree, record both outputs and prioritize the stricter scanner until the mismatch is understood.

### 5. Validate Build/Test Compatibility

Because this touches Vite/Rollup and happy-dom, validation must cover both build and Vitest behavior:

```bash
bun test tests/unit/security/securityGateConfig.test.ts
bun run test:vitest
bun --cwd core lint
bun --cwd core lint:types
bun run lint:repo:types
bun --cwd core x vite build --config vite.config.ts
bun --cwd core build:site
bun run scan:security:strict
git diff --check
```

If `bun run test:vitest` fails due to happy-dom 20 behavior changes, fix the affected tests/helpers rather than downgrading the dependency below the fixed line.

### 6. Closure Updates

On completion:
- move this task to `Done` with date,
- update `_docs/_TASKS/README.md` statistics and row,
- add a changelog entry in `_docs/_CHANGELOG/`,
- update `_docs/_CHANGELOG/README.md`,
- update `_docs/SECURITY_SPEC.md` only if a temporary exception or scanner-policy change is introduced.

## Files to Change

- `package.json`
- `core/package.json`
- `bun.lock`
- `tests/**` only if dependency behavior changes require test updates
- `_docs/SECURITY_SPEC.md` if scanner policy or temporary exceptions change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
- `_docs/_TASKS/TASK-219*.md`

## Security Contract

- Visibility: engineering/dependency supply chain.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not suppress CVEs without owner, reason, expiry, and task/ticket id,
  - prefer compatible fixed versions before broad major upgrades,
  - if a major test/runtime tool upgrade is required, validate impacted Vitest/admin/UI lanes before closing.
- Idempotency: dependency lockfile updates must be reproducible via `bun install`.
- Secret handling: no package manager tokens or registry credentials may be committed.
- Supply-chain hygiene:
  - use lockfile-resolved fixed versions, not scanner suppressions, as the default remediation path,
  - avoid blanket major upgrades unless the minimal fixed graph still fails scanners,
  - record every manual override with owner, reason, and removal condition.

## Testing Requirements

- `bun install`
- `bun pm why happy-dom`
- `bun pm why vite`
- `bun pm why rollup`
- `bun pm why picomatch`
- `bun pm why flatted`
- `bun pm why minimatch`
- `bun audit --audit-level high`
- `trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .`
- `bun run scan:security:strict`
- `bun test tests/unit/security/securityGateConfig.test.ts`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `bun --cwd core x vite build --config vite.config.ts`
- `bun --cwd core build:site`
- Relevant focused suites for any dependency behavior changes
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
- `_docs/SECURITY_SPEC.md` only if temporary scanner exceptions are needed

## Acceptance Criteria

1. `bun audit --audit-level high` is clean or has only documented, time-boxed exceptions.
2. `trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps ...` is clean or has only documented, time-boxed exceptions.
3. `bun run scan:security:strict` passes after dependency remediation and Dockerfile config scan remains clean.
4. `bun.lock` no longer resolves the vulnerable rows listed in the finding matrix.
5. Vitest/admin UI lanes still pass after `happy-dom`, Vite, Rollup, and transitive glob dependency updates.
6. Admin and site Vite builds still pass.
7. Changelog and task board are synchronized.

## Progress Notes

- 2026-04-27: Completed dependency CVE remediation without scanner allowlists. Root tooling now uses `happy-dom` `^20.9.0`, `vitest`/`@vitest/coverage-v8` `^4.1.5`, `eslint` `^9.39.4`, `@eslint/js` `^9.39.4`, `@typescript-eslint/*` `^8.59.0`, `eslint-plugin-react-hooks` `^7.1.1`, `globals` `^17.5.0`, and a root `minimatch` `^3.1.5` compatibility pin for remaining 3.x consumers.
- 2026-04-27: Core build tooling now uses Vite `^8.0.10`, `@vitejs/plugin-react` `^6.0.1`, `@tailwindcss/vite` `^4.2.4`, and `tailwindcss` `^4.2.4`. The lockfile no longer resolves vulnerable `happy-dom@17.6.3`, `vite@7.3.1`, `rollup@4.56.0`, `picomatch@4.0.3`, `flatted@3.3.3`, or `minimatch@3.1.2` rows.
- 2026-04-27: Validation completed: `bun audit --audit-level high`, Trivy HIGH/CRITICAL lockfile CVE scan with dev dependencies, `bun run scan:security:strict`, `bun run scan:sbom`, `bun run test:vitest`, focused post-editor Vitest suites, `bun test tests/unit/security/securityGateConfig.test.ts`, `bun --cwd core lint:types`, `bun run lint:repo:types`, admin Vite build, site build, and `git diff --check`.
- 2026-04-27: `bun --cwd core lint` passed under the ESLint 9 flat-config compatibility baseline. After the follow-up request to enable the full `eslint-plugin-react-hooks` recommended preset, the current lint intentionally reports new React Hooks/Compiler cleanup findings; that non-CVE follow-up is tracked in `TASK-220`.
