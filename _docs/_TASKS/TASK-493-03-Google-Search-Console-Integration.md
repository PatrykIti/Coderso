# TASK-493-03: Google Search Console Integration (credential + fetch)
# FileName: TASK-493-03-Google-Search-Console-Integration.md

**Parent Task:** TASK-493
**Priority:** Large
**Category:** Tools / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-493-01, Integrations registry + secret store
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add Google Search Console as a first-class Integration whose credential lives in
the **secret store** (encrypted, never to client), a **server-side** auth client
that mints short-lived access tokens, and a sync service that fetches indexed
pages + Search Analytics (impressions/clicks/queries/position) and persists them
into the subtask-01 tables.

This reuses the proven Integrations machinery: `registry.ts` defines
`secret`-typed fields, `integrationsService.ts` encrypts via
`encryptSecret`/`decryptSecret` (`secretStore.ts`, `MEDIA_SECRET_MASTER_KEY`),
and `getIntegrationRuntimeConfig(id)` decrypts **server-side only**.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | GSC credential definition + server-side auth client | Bun | ⏳ To Do |
| L02 | GSC data-sync service + sync route (indexed pages + analytics) | Bun | ⏳ To Do |

---

## Dependencies

- L01 depends on the existing Integrations registry/secret store.
- L02 depends on L01 (the auth client) and subtask 01 (the persistence tables).
- Subtask 02-L02 (sitemap submission) reuses the L01 client.

---

## Testing Requirements

- L01 — Bun: registry definition shape, token minting against a stubbed Google
  token endpoint, credential-never-to-client.
- L02 — Bun: sync route auth/RBAC/CSRF, outbound GSC fetch (stubbed), row upserts
  into the 01 tables, secret-never-to-client/log.
- All outbound-fetch + secret-handling flows are **Bun lane**.
