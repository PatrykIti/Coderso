# TASK-219-02-02: ESLint Flatted and Minimatch Closure
# FileName: TASK-219-02-02_ESLint_Flatted_and_Minimatch_Closure.md

**Priority:** High
**Category:** Security + Lint Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-219-02
**Status:** Done (2026-04-27)

---

## Overview

Close ESLint-chain transitive CVEs without destabilizing lint ownership. The current findings come from:

- `flatted@3.3.3` via `eslint -> file-entry-cache -> flat-cache`,
- `minimatch@3.1.2` via ESLint/eslint-plugin-react 3.x consumers.

Target policy: resolve Flatted to `3.4.2` or newer and 3.x Minimatch consumers to at least `3.1.4`. Do not globally force Minimatch to one major if that would downgrade current 9.x/10.x consumers.

## Sub-Tasks

- [x] Confirm owners with `bun pm why flatted` and `bun pm why minimatch`.
- [x] Try lockfile-only compatible updates first.
- [x] If pinned, upgrade parent lint packages before using broad overrides.
- [x] Use scanner exception only if the vulnerable parent chain cannot be fixed safely in this repo cycle.

## Files to Change

- `bun.lock`
- `package.json` only if lint package versions or narrow overrides are required.
- `.trivyignore` only for a documented, time-boxed exception.

## Security Contract

- Visibility: lint/test tooling transitive dependencies.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - no broad CVE suppressions,
  - no global `minimatch` override that downgrades newer consumers,
  - no lint-rule weakening to hide dependency-upgrade fallout.
- Secret handling: no registry credentials may be committed.

## Pseudocode

```bash
bun pm why flatted
bun pm why minimatch
rg -n '"flatted": \\["flatted@3\\.3\\.3|"minimatch": \\["minimatch@3\\.1\\.2' bun.lock

bun update flatted minimatch

# If vulnerable rows remain:
# 1. Check if eslint/eslint-plugin-react updates move parent ranges.
# 2. Only then consider narrow overrides. Avoid forcing all minimatch consumers
#    to a single incompatible major.
```

Exception template if an unfixable transitive remains:

```text
CVE-... # expires: YYYY-MM-DD owner: Platform/Security reason: parent package has no fixed compatible release ticket: TASK-219
```

## Testing Requirements

- `rg -n '"flatted": \\["flatted@3\\.3\\.3|"minimatch": \\["minimatch@3\\.1\\.2' bun.lock` returns no rows, unless a documented exception is used.
- `bun --cwd core lint`
- `bun run lint:repo:types`
- `bun audit --audit-level high`
- `trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .`
- `git diff --check`

## Documentation Updates Required

- Parent `TASK-219` progress note on completion.
- `_docs/SECURITY_SPEC.md` if an exception is introduced.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Flatted resolves to `3.4.2` or newer fixed version.
2. Vulnerable 3.x Minimatch rows are removed or documented with a narrow, time-boxed exception.
3. Core lint and repo typecheck still pass.

## Progress Notes

- 2026-04-27: Upgraded the lint stack to ESLint 9 compatible packages: `eslint` `^9.39.4`, `@eslint/js` `^9.39.4`, `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` `^8.59.0`, `eslint-plugin-react-hooks` `^7.1.1`, and `globals` `^17.5.0`.
- 2026-04-27: Added `flatted` `^3.4.2` override and root `minimatch` `^3.1.5` compatibility pin. `bun.lock` no longer resolves vulnerable `flatted@3.3.3` or `minimatch@3.1.2`.
- 2026-04-27: `bun --cwd core lint` passed under the ESLint 9 compatibility baseline. The full `eslint-plugin-react-hooks` recommended preset was enabled afterward and the resulting React Hooks/Compiler cleanup is tracked separately in `TASK-220`.
