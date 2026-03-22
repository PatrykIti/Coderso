# TASK-150: IP Allowlist Admin UI Assistant Documentation Refresh
# FileName: TASK-150_IP_Allowlist_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the IP Allowlist surface based on
a real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/security/ip-allowlist` out of the broader security article and
replace it with a guided document that matches the shipped restriction table and
add-range drawer workflow.

## Scope

1. Review the current security assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on
   `http://localhost:5173/admin/settings/security/ip-allowlist` with an
   authenticated session and record actual behavior.
3. Create a dedicated IP Allowlist doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/security/ip-allowlist` points to the
   new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - settings sidebar,
   - add button,
   - active restrictions table,
   - propagation notice.
2. Capture the table flow:
   - label,
   - CIDR range,
   - added by,
   - status,
   - remove action,
   - empty/loading/error states.
3. Capture the add-range drawer flow:
   - label,
   - CIDR input,
   - notes,
   - security note,
   - add/cancel actions.
4. Rewrite the doc without leaving this route only as a sub-bullet inside the
   broader Security Settings article.

## Acceptance Criteria

1. IP Allowlist has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about trusted networks, CIDR entry, propagation
   behavior, and allowlist risks.
4. The coverage matrix points `/settings/security/ip-allowlist` at the new
   canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local IP Allowlist UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/ip-allowlist.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-150_IP_Allowlist_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local IP Allowlist UI
  on `/admin/settings/security/ip-allowlist`.
- The walkthrough confirmed:
  - route shell,
  - active restrictions table,
  - empty state,
  - propagation note,
  - add-range form surface,
  - add-range drawer trigger.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/IpAllowlistPage.tsx`
  - `core/admin/ui/settings/IpAllowlistTable.tsx`
  - `core/admin/ui/settings/IpAllowlistDrawer.tsx`
  - `core/admin/ui/settings/useIpAllowlist.ts`
  - `core/admin/services/ipAllowlistClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
