# TASK-482-05: Phase-2 Basic steps + `site.timezone` settings key
# FileName: TASK-482-05-Phase2-Basic-Steps-And-Settings-Keys.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-04
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The Basic track's concrete fields: branding/identity, locale, **timezone**, and
public + admin URLs, persisted via the bulk `PATCH /settings` endpoint. Timezone
is currently un-modelled — `site.timezone` is **missing** from `DEFAULT_SETTINGS`
in `settingsService.ts` — so this subtask first adds the key (allowlist +
normalizer + validation) and only then wires the UI step.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-05-L01 | Add `site.timezone` (+ optional branding/logo) settings key | Small | ⏳ To Do |
| TASK-482-05-L02 | Basic steps UI bound to bulk `PATCH /settings` | Medium | ⏳ To Do |

## Dependencies

- TASK-482-04 (step framework/shell). L02 depends on L01 (new key must exist
  before the UI writes it).

## Testing Requirements

- L01: Vitest service lane for the normalizer/validation + Bun route-integration
  asserting `PATCH /settings` accepts/round-trips `site.timezone` and rejects
  bad values.
- L02: Vitest ui-integration for the Basic steps writing through the settings
  client.
