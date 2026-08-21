# 1319. Menu Determinism, Responsive Cascade, and Runtime Parity (TASK-542)

**Date:** 2026-08-21
**Version:** 0.1.0
**Tasks:** TASK-542 (TASK-542-01, TASK-542-02, TASK-542-03, TASK-542-04; 6
executable leaves: TASK-542-01-L01, TASK-542-02-L01, TASK-542-03-L01,
TASK-542-03-L02, TASK-542-03-L03, TASK-542-04-L01)

---

## 🚀 Key Changes

### Strict deterministic menu documents (TASK-542-01, TASK-542-01-L01)

- Split the monolithic `menuDocumentV2` into cohesive modules (contract,
  defaults, normalization, CSS facade) while keeping the facade surface stable.
- Deterministic unique ids/topology: menu blocks receive stable ids, ordered
  children, and a required unique-id contract; repeated normalizations produce
  byte-identical documents.
- Stable legacy reads: legacy stored documents that do not satisfy the strict
  `MenuDocumentV2` shape resolve fail-closed (`null`) instead of emitting
  partial or corrupted output; valid legacy shapes keep deterministic
  normalization with zero persistence.

### Complete responsive neutralizers (TASK-542-02, TASK-542-02-L01)

- Split `menuDocumentCss` into core/rules/delta modules with a neutralizer
  matrix covering every device (desktop/tablet/mobile) × level override.
- Reset-every-device-value semantics: turning a chrome option OFF on one device
  emits explicit neutralizers (no inherited stale values); transitions, hover
  lift, carets, indicators, and dividers all neutralize correctly per device.
- Icon color emission: the icon color token renders per device with the
  correct resolved site-token value (desktop vs tablet differ in the smoke).
- Scrolled-header and brand parity: scrolled state applies only to the
  responsive (tablet/mobile) header, desktop stays white; brand blocks keep
  byte-identical default output when unauthored.

### Shared public projection, active identity, and cache safety (TASK-542-03)

- **TASK-542-03-L01:** new shared `publicNavigationProjection` owner
  consolidates the site-shell's duplicated public filters: hidden
  (`visibility: logged_in`) subtrees are dropped wholesale, an item earns
  markup only when it links somewhere or shelters a projected descendant, and
  dead parents with projected children stay linkless groups. It consumes the
  mapper's canonical hrefs and never parses URLs or mutates cached data.
- **TASK-542-03-L02:** the front render path uses the shared projection plus
  the active identity (`aria-current`) and the responsive scroll gate, so the
  canvas, preview, and public render agree on structure and active state.
- **TASK-542-03-L03:** draft-safe revalidation — the editor force-revalidates
  the authoritative menu in the background, hydrates a CLEAN editor live,
  never clobbers a dirty local draft (remote-update notice + Keep editing /
  Reload), skips its own cache-event broadcast (no redundant force loop), and
  surfaces retryable failures without clearing cache/draft. The 1000+-line
  editor facade was split into 6 cohesive modules.

### Tests, smoke, and closure (TASK-542-04, TASK-542-04-L01)

- Additive Vitest coverage: projection semantics, schema reject-unknown and
  round-trip persistence, byte-identity defaults, responsive CSS emission
  goldens, site-shell binding, and draft-safe revalidation flows.
- Post-audit remediation (0 HIGH / 0 MEDIUM gate): deterministic ID/topology
  matrix (missing/blank/invalid/duplicate IDs, 160-char truncation with marker
  reservation, global section/block collisions, stable repeated legacy repair,
  read→unrelated-save), the scrolled-variant helper contract, the table-driven
  TASK-542-02 neutralizer matrix with per-device goldens for base→tablet AND
  base→mobile overrides (itemDivider/hoverUnderline/indicator/caret/flyout/
  orientation/padding-axis resets plus a combined tablet+mobile row), a
  shared-branch positive control on every zero-delta mobile row so the
  assertions cannot pass vacuously, icon-color-only device deltas (proving
  `BRAND_STYLE_COMPARE_KEYS` includes `iconColor`), and a no-override
  byte-identity golden. The TASK-508 golden suite moved to its own
  `menu-document-css-508.test.ts` and the TASK-542-02 matrix to
  `menu-document-css-542.test.ts` so the §1-§7 file stays under the 1,000-line
  gate.
- Runtime Bun coverage for menu routes, render byte-identity, site-shell
  projection/active identity, and legacy `<details>` compatibility pins.
- Seven distinct real-flow smoke scenarios (`wf542smoke`) across devices
  (desktop/tablet/320/390/480): legacy stable reads, desktop effects + flyout,
  L2+ OFF no-inherit, padding-axis independence, icon desktop/tablet colors,
  design projection parity (duplicate `/blog`, dead/members dropped,
  `aria-current` exactly one), geometry (no horizontal overflow) plus
  dirty/no-clobber via cache-bus broadcast. 0 product console errors.

## 🔒 Security Contract

- Public render uses only the shared projection with fail-closed visibility:
  `logged_in` items and whole subtrees never reach markup.
- No new secrets, credentials, or user data enter caches or debug payloads;
  server cache and admin cache rules from `_docs/ADMIN_CACHE.md` remain
  unchanged in spirit (menu detail cache retains its invalidation + cacheBus
  broadcast contract).

## 🧪 Validation

- `bun --cwd core lint:types` EXIT=0; `bun --cwd core lint` EXIT=0; root repo
  `tsc -p tsconfig.json --noEmit` EXIT=0.
- Targeted Vitest: 12 menu service/site suites (menu-document-v2, menu-document-
  v2-devices, menu-document-v2-navchrome, menu-document-v2-styles, menu-document-
  v2-scrolled, menu-document-css, menu-document-css-508, menu-document-css-542,
  menu-item-settings-variant, menu-nav-extras, normalize-menu-appearance,
  menuSchemas) 366/366 green plus 6 admin menu UI suites (menu-editor,
  menu-editor-validation, menu-editor-shell-wave, menu-editor-refresh-policy,
  menu-design-editor, menu-design-editor-revalidation) 117/117 green.
- Targeted Bun lane: menuService + menu-document-render + menus routes +
  site-shell-runtime — 115/117 in the combined run; the two failures and the
  isolated run's single remaining failure are the documented pre-existing
  slow-remote-PG `afterEach` DB-cleanup hook timeouts (test body assertions
  all pass; the file was last touched by `7c77f2e1` on 2026-08-11, before this
  family), not 542 regressions.
- Admin build EXIT=0; admin-boundary 914 browser-reachable files PASS;
  admin-bundle 0 oversized dynamic chunks; `gates:coderso` 5/5 PASS
  (functional, ux, performance, security, reliability).
- `git diff --check` clean; all touched files below the 1,000-line gate.

## 📝 Docs

- `_docs/PAGE_MODEL.md` menuDocumentV2 extension notes; `_docs/ADMIN_CACHE.md`
  and `_docs/ADMIN_CACHE_MAP.md` menu cache invalidation contract;
  `docs/guide/screens/menus.md` end-user menu authoring guidance.

4 children + 6 leaves terminal.
