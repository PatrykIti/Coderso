# TASK-046: Public Site Runtime (Index)
# FileName: TASK-046_Public_Site_Runtime.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-044, TASK-045  
**Status:** 🟡 To Do

---

## Overview

Rozbuduj publiczny runtime tak, aby:
1. Obsługiwać **content entries** (blog, news, produkty, itp.)
2. Mieć **dedykowany cache/SSR**
3. Dawać pełną kontrolę w UI (homepage, 404, routes, preview)

Wszystko sterowane z admina – bez kodowania.

---

## Sub-Tasks

### TASK-046-01: Site Settings Model (routes + homepage)
Ustawienia strony: baseUrl, homepage, 404, content routes.

### TASK-046-02: Public Routes & Preview
Rozszerz handler publiczny o entry routes + preview.

### TASK-046-03: Entry Rendering Templates
System template dla content types (list + detail).

### TASK-046-04: SSR Cache & Revalidation
Cache HTML na publicznym runtime (memory + TTL).

### TASK-046-05: Admin UI — Site Settings
Nowa sekcja w panelu: wybór homepage, 404, content routes, preview toggle.

---

## Testing Requirements

- Unit: route matcher + renderer
- Integration: site settings API wiring
- UI smoke tests for Site Settings

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md` (new)
- `_docs/CMS_API.md`
- `_docs/_CHANGELOG/<new>.md`
