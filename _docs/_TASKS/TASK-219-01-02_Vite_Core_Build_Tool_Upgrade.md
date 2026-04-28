# TASK-219-01-02: Vite Core Build Tool Upgrade
# FileName: TASK-219-01-02_Vite_Core_Build_Tool_Upgrade.md

**Priority:** High
**Category:** Security + Build Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-219-01
**Status:** Done (2026-04-27)

---

## Overview

Upgrade the direct Vite owner in `core/package.json` so the lockfile no longer resolves vulnerable `vite@7.3.1`, while keeping the admin and site build contracts stable.

Scanner findings to close:
- Vite high dev-server access-control / file-read findings fixed by `7.3.2` or `8.0.5`.
- Rollup and Picomatch findings may also clear after Vite lock refresh, but that proof belongs to `TASK-219-02`.

Target policy: try the minimal fixed Vite 7 line first (`^7.3.2` or newer fixed 7.x). Move to Vite 8 only if Vite 7 remains dirty or peer constraints require it.

## Sub-Tasks

- [x] Confirm current owner with `bun pm why vite`.
- [x] Update `core/package.json` `devDependencies.vite`.
- [x] Refresh `bun.lock` without broad unrelated dependency churn.
- [x] Build admin and site bundles.
- [x] Validate Vitest still runs with the Vite/Vitest peer graph.

## Files to Change

- `core/package.json`
- `bun.lock`
- `vite.config.ts` / `core/vite*.config.ts` only if the Vite upgrade requires config changes.
- `tests/**` only if Vite behavior changes require test updates.

## Security Contract

- Visibility: build/dev-server tooling.
- Auth model: not applicable.
- RBAC: not applicable.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: not applicable.
- Anti-abuse:
  - do not suppress Vite CVEs,
  - do not weaken dev-server filesystem restrictions,
  - do not ship a Vite config workaround that broadens file serving or HMR origin exposure.
- Secret handling: no env files or registry credentials may be committed.

## Pseudocode

```bash
bun pm why vite
# patch core/package.json:
# "vite": "^7.3.2"
bun update --filter @nextless/core vite@^7.3.2
rg -n '"vite": \\["vite@7\\.3\\.1' bun.lock
bun --cwd core x vite build --config vite.config.ts
bun --cwd core build:site
bun run test:vitest
```

If the minimal fixed Vite 7 line is unavailable or still scans dirty:

```bash
# Only after recording why Vite 7 is insufficient:
bun update --filter @nextless/core vite@^8
```

## Testing Requirements

- `bun pm why vite`
- `rg -n '"vite": \\["vite@7\\.3\\.1' bun.lock` returns no rows.
- `bun --cwd core x vite build --config vite.config.ts`
- `bun --cwd core build:site`
- `bun run test:vitest`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- Parent `TASK-219` progress note on completion.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `vite` resolves to `7.3.2` or newer fixed version.
2. Vite no longer appears in `bun audit --audit-level high`.
3. Admin and site builds pass.
4. Vite config does not broaden dev-server filesystem or origin exposure.

## Progress Notes

- 2026-04-27: Upgraded core Vite to `^8.0.10`, `@vitejs/plugin-react` to `^6.0.1`, `@tailwindcss/vite` to `^4.2.4`, and `tailwindcss` to `^4.2.4` after checking current registry versions and peer compatibility.
- 2026-04-27: A stale `core/node_modules/vite@7.3.1` shadowed the workspace install and caused the local `Missing field moduleType` dev-server error. Removing stale nested installs and running a clean `bun install` left the workspace on Vite `8.0.10`.
- 2026-04-27: Admin Vite build and site build passed on Vite `8.0.10`.
