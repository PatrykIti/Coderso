# TASK-490-02-L03: CMS_API + SECURITY_SPEC docs & closure
# FileName: TASK-490-02-L03-Docs-And-Closure.md

**Parent Subtask:** TASK-490-02
**Priority:** Medium
**Category:** Forms / docs
**Estimated Effort:** Small
**Dependencies:** TASK-490-01-L02 (route shape), TASK-490-02-L01/L02 (client + UI shipped).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Document the shipped export route + envelope and its security posture
  so the docs match code, then run the closure gate matrix for TASK-490.
- **Owning module(s) to create-or-extend:** `_docs/CMS_API.md` (Forms section),
  `_docs/SECURITY_SPEC.md` (admin read line). **Docs only — no code.**
- **Source-of-truth docs (the ones being edited / cited):** `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out-of-scope:** any code change (all shipped in 490-01 / 490-02-L01/L02); the
  board `README.md` and `_docs/_CHANGELOG/` (orchestrator-synced — **do not edit**).

> No Security Contract section: this is a docs-only leaf that adds no route, auth,
> or data path. It *describes* the contract authored in TASK-490-01-L02.

---

## Implementation Pseudocode

This leaf edits prose, not code; the "pseudocode" is the exact doc content to add.

### `_docs/CMS_API.md` — Forms section

Add the route to the Forms endpoint list (after `GET /forms/:id/submissions`):

```
- `GET /forms/:id/submissions/export?format=csv|json`
```

Then add a subsection mirroring the Analytics export block:

> `GET /forms/:id/submissions/export`
>
> Internal admin read (`forms:read`, `admin_read` bucket, no CSRF). `format` is
> required and must be `csv` or `json`; unknown query params and other formats are
> rejected with `validation_error`. Like the analytics export, the file payload is
> returned in a JSON envelope so the admin UI builds the browser download:
>
> ```json
> {
>   "fileName": "coderso-form-contact-submissions-2026-06-28.csv",
>   "contentType": "text/csv",
>   "content": "Submission ID,Received At,Status,Full name,Email\n...",
>   "totalRows": 12
> }
> ```
>
> CSV columns are `Submission ID, Received At, Status` followed by one column per
> form field (header = field **label**, in `orderIndex` order), then any extra
> payload keys not in the current schema. `format=json` returns
> `contentType: "application/json"` whose `content` is a JSON array of
> `{ id, createdAt, status, data }`. `ip` and `userAgent` are intentionally
> excluded from both formats (the export is a subset of the submissions read
> surface and never widens PII exposure).

### `_docs/SECURITY_SPEC.md`

Add one line where the admin read routes / `admin_read` GETs are described:
`GET /forms/:id/submissions/export` is an internal `forms:read`, `admin_read`,
no-CSRF read whose payload is a subset of `GET /forms/:id/submissions`
(`ip`/`userAgent` omitted).

---

## Testing Requirements

Docs-only leaf — no automated test lane. Verification = the closure gate matrix
for the whole task:

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- Bun route + security lanes from TASK-490-01-L02 green.
- Vitest domain + client + UI lanes from 490-01-L01 / 490-02-L01 / 490-02-L02 green.
- Manual doc review: the CMS_API envelope/example matches the shipped
  `FormSubmissionsExport` shape exactly (field names, `contentType` values,
  column rules).

### Closure checklist (TASK-490)

- [ ] All TASK-490-01 / 490-02 leaves `✅ Done` (or terminal).
- [ ] `GET /forms/:id/submissions/export` shipped, `forms:read`-gated, strict
      query, CSV + JSON.
- [ ] `exportFormSubmissions` client + Export CSV/JSON actions live; download
      verified.
- [ ] `_docs/CMS_API.md` + `_docs/SECURITY_SPEC.md` match the shipped contract.
- [ ] No DB migration was needed (read-only feature) — confirmed.
- [ ] Full gate matrix (lint, types, Bun route+security, Vitest domain+client+UI)
      recorded in the closeout.
- [ ] Board index + changelog synced **by the orchestrator** (not hand-edited
      here).
