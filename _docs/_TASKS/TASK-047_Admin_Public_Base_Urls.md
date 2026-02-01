# TASK-047: Admin/Public Base URLs (Routing Policy)
# FileName: TASK-047_Admin_Public_Base_Urls.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-046-01 (Site Settings Model), TASK-046-05 (Admin UI — Site Settings)  
**Status:** 🟡 To Do

---

## Overview

Wprowadź **elastyczną politykę routingu** dla dwóch adresów:
- **Admin Base URL** (np. `https://cms.example.com`)
- **Public Base URL** (np. `https://example.com`)

Wszystko konfigurowalne z UI (Site Settings), bez kodowania.

---

## Behavior Rules

1. **Brak obu URL** → działa domyślny adres serwera (wszystko).
2. **Tylko admin_base_url** → cały ruch kierowany na admin (front zablokowany).
3. **Tylko public_base_url** → cały ruch kierowany na public (admin zablokowany).
4. **Oba ustawione** → admin działa wyłącznie na admin_base_url, public na public_base_url.

---

## Sub-Tasks

### TASK-047-01: Settings Model + Validation
Dodaj klucze ustawień:
- `site.adminBaseUrl`
- `site.publicBaseUrl`

### TASK-047-02: Routing Policy Middleware
Middleware rozpoznaje host i:
- blokuje /admin na public host
- blokuje public routes na admin host

### TASK-047-03: Admin UI Wiring
Dodaj pola w Site Settings:
1. Base URL for Admin Panel
2. Base URL for Website

---

## Testing Requirements

- Unit: routing policy (host routing)
- Integration: settings validation
- UI smoke test (fields render)

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
