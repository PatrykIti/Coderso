# TASK-041: Email Settings Core and UI
# FileName: TASK-041_Email_Settings_Core_and_UI.md

**Priority:** Medium  
**Category:** Settings/Email  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001, TASK-004, TASK-006-31, TASK-007  
**Status:** To Do

---

## Overview

Persist email provider settings, add delivery test/logs, and wire the Email Settings UI.

## Goals

- Store SMTP/provider configuration (encrypted).
- Send test email from UI.
- Record delivery logs for debugging.

## Sub-Tasks (detailed task files)

- `TASK-041-01_Email_Settings_Service.md`
- `TASK-041-02_Email_API_Routes.md`
- `TASK-041-03_Email_UI_Wiring.md`

## Documentation Updates Required

- `_docs/CMS_API.md` email settings endpoints.
- `_docs/SECURITY_SPEC.md` secret storage.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-email-settings-core.md`
