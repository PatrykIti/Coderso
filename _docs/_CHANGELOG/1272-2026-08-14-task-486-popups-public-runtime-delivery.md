# 1272 - TASK-486 Popups: Public Runtime Delivery & Trigger/Targeting Engine

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-486, TASK-486-01, TASK-486-01-L01, TASK-486-01-L02, TASK-486-01-L03, TASK-486-02, TASK-486-02-L01, TASK-486-02-L02, TASK-486-02-L03, TASK-486-03, TASK-486-03-L01, TASK-486-03-L02, TASK-486-04, TASK-486-04-L01, TASK-486-04-L02, TASK-486-04-L03

## Key Changes

- **Public read endpoint** `GET /api/popups?path=<pathname>`: published-only, server-side path/audience targeting (never client-asserted), PII-free `PublicPopup` DTO projection (`id/slug/trigger/frequency/content/settings` only), anonymous read under the `public_read` rate-limit bucket.
- **Client runtime engine** (pure, Bun-free): trigger detection (time_delay, scroll_depth, exit_intent, cta_click) via `triggerWatchers`, frequency/cooldown gating via `frequencyGate` (localStorage + injected storage), and the `popupRuntime` orchestrator with injected-storage support.
- **Render + injection**: `renderPopup` component (accessible, safe-href, no PII) and `popupRuntimeScript.ts` static IIFE injection into the public site HTML with an AST identifier guard against SSR transform rewrites; `publicSite.tsx` wires the runtime.
- **Lane-correct tests**: Bun route integration + security lane (published-only, targeting, exclusion, DTO projection, cooldown, public_read bucket, PII gate), Vitest engine/render suites, and runtime-script-build AST guard tests.
- **Docs**: `CMS_API.md`, `SECURITY_SPEC.md`, and `ARCHITECTURE.md` record the public route, security model (server-derived audience, anonymous read), and runtime delivery path (inline-script/CSP note).

## Validation

- Vitest: 678 tests green across 130 files (popups + ui-integration lanes); route integration 8/8 + security 3/3; runtime-script-build 12/12; popup-runtime-render 7/7.
- Core lint, core lint:types, precommit:check, git diff --check all clean; all files at or below 1,000 physical lines.
- **Runtime smoke (wf486smoke)**: 8 distinct real-flow scenarios PASS — time_delay, scroll_depth, exit_intent, cta_click, frequency cooldown (reload does not re-show), path include/exclude, route contract (published-only, PII-free, reject-unknown 400), admin light+dark. 8 valid PNGs, 0 console errors on public flows, complete fixture cleanup (0 `wf486-*` rows remain).

## Notes

- All 4 subtasks + 11 leaves terminal. Known gap (out of scope per TASK-486-03-L01): popups render the full DOM contract but are unstyled; a popup CSS theme task is recommended before release.
