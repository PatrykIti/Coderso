# TASK-048-06: Content Modeling Docs & Examples
# FileName: TASK-048-06_Content_Modeling_Docs_and_Examples.md

**Priority:** 🟡 Medium  
**Category:** Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-048-02, TASK-048-03, TASK-048-04  
**Status:** ⏳ **To Do** (2026-02-01)

---

## Overview

Document practical content setups so non‑technical users can build real sites
immediately (e.g. mabudo.pl, church/paroquia sites, B2B sites).

---

## Deliverables

### New docs
- `_docs/CONTENT_FIELDS.md`  
  Field types, examples, validation rules.
- `_docs/CONTENT_RELATIONS.md`  
  How relations work + UI flow + examples.
- `_docs/CONTENT_MODELING_COOKBOOK.md`  
  Step‑by‑step examples for real sites.

### Updates
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md`

---

## Example Scenarios (Cookbook)

### 1) Mabudo‑style site
**Types**
- Services
- Projects
- Testimonials
**Relations**
- Testimonials → Projects
**Widgets**
- Service list widget
- Testimonials widget (filter by current project)

### 2) Church / Parish site
**Types**
- Announcements
- Events
**Relations**
- Events → Announcements

### 3) B2B Agency site
**Types**
- Case Studies
- Clients
**Relations**
- Case Studies → Clients

---

## Documentation Updates Required

Ensure each new doc is linked from `_docs/README.md`.

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-content-modeling-docs.md` and link TASK-048-06.
