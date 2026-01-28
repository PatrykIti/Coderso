# TASK-004: Auth, RBAC, and Admin API Base (Index)
# FileName: TASK-004_Auth_RBAC_and_Admin_API_Base.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Large
**Dependencies:** TASK-001
**Status:** In Progress (2026-01-27)

---

## Overview

Zadanie bazowe dla auth + RBAC + warstwy REST admin API. Ten plik jest
indeksem, a szczegoly znajduja sie w osobnych plikach pod-taskow.

**Cel:**
- Dzialajacy login + session cookie + `/admin` UI.
- Middleware RBAC dla wszystkich admin endpointow.
- Spiety router HTTP z warstwa API i Admin UI.

---

## Subtasks (separate files)

| ID | Status | File |
| --- | --- | --- |
| TASK-004-01 | To Do | `TASK-004-01_Core_HTTP_Server_and_Admin_UI_Bootstrap.md` |
| TASK-004-02 | To Do | `TASK-004-02_Auth_Advanced_Endpoints_CSRF_OTP_Reset.md` |
| TASK-004-03 | Done (2026-01-27) | `TASK-004-03_Password_hashing_and_sessions.md` |
| TASK-004-04 | Done (2026-01-27) | `TASK-004-04_Auth_middleware.md` |
| TASK-004-05 | Done (2026-01-27) | `TASK-004-05_RBAC_middleware.md` |
| TASK-004-06 | In Progress | `TASK-004-06_Auth_routes_and_base_API_layer.md` |
| TASK-004-07 | Done (2026-01-28) | `TASK-004-07_Auth_UI_Wiring.md` |

---

## Recommended Order (login-ready)

1) **TASK-004-01** (HTTP server + Admin UI bootstrap) – uruchamia `/admin`.
2) **TASK-004-02** (CSRF + OTP/reset endpoints) – pozwala podpiac auth UI.
3) **TASK-004-06** (auth routes + base API layer) – spina auth z routerem.
4) **TASK-004-07** (auth UI wiring) – podpina login/2FA/reset do API.

---

## Documentation Updates Required

Zalezne od podtaskow:
- `_docs/AUTH_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ARCHITECTURE.md`

---

## Changelog Entry (planned)

Oddzielny wpis per podtask zgodnie z plikami changelog.
