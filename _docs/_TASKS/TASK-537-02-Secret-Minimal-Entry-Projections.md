# TASK-537-02: Secret-Minimal Entry Projections

# FileName: TASK-537-02-Secret-Minimal-Entry-Projections.md

**Parent Task:** TASK-537
**Priority:** High
**Category:** Content Entry Service / Transactions / Secret Handling
**Estimated Effort:** Large
**Dependencies:** TASK-537-01-L01, TASK-537-01-L02
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1249

---

## Scope

As the sole entryService.ts writer, integrate the transaction-aware taxonomy/SEO seams
into one updateEntryMetadata transaction and narrow every audited update/publish/delete
query. The same leaf owns the metadata route's small scheduling, transition-authorization,
and error-mapping corrections plus the narrow executor-aware RBAC read seam because those
boundaries must agree with the locked transaction state. This integration prevents an
intermediate revision from reintroducing broad secret-bearing rows or a permission lookup
from waiting on a second pooled connection while the entry row is locked.

## Grounded anchors

- core/services/content/entryService.ts:685-688 deleteEntry uses full returning().
- entryService.ts:830-865 updateEntry uses an unused full returning().
- entryService.ts:868-917 publishEntry begins with full select().
- entryService.ts:954-1052 updateEntryMetadata performs status, taxonomy, visibility,
  password, and SEO through separate owners.
- Public/minimal read projections already exist around entryService.ts:618-714 and must
  remain the response boundary.

## Leaf

TASK-537-02-L01 is the only leaf and the sole TASK-537 writer of entryService.ts.
TASK-537-02-L01 owns its pre-gate entry/route/cache behavior-test updates.
TASK-537-03-L01 owns only additive cross-domain tests plus docs/status/changelog edits
and cannot re-baseline source-owner assertions.

## Security Contract

No endpoint or permission-model expansion. Existing admin content endpoints retain Admin
session-cookie auth, `content:write`, `content:publish` for a real transition, CSRF,
`admin_write`, strict route envelopes, and centralized domain-error mapping; this route
has no API-key mode and this task adds none. After the row lock, the route guard reads one
permission snapshot with one minimal joined `user_roles` -> `roles` SELECT through the
same transaction executor, always rechecks `content:write`, conditionally checks
`content:publish`, and runs before the first write. A string requirement is a one-element
all-of list and an empty list fails closed, including for wildcard roles. This closes
split-snapshot authorization and the one-connection-pool deadlock without requiring
`content:publish` for an ordinary metadata save on an already-published entry. Role and
user-role commits before the joined statement starts are visible; later commits do not
retroactively change that mutation's authorization result.
Plaintext password exists only long
enough to hash. Read/return projections may compute `hasPassword` in SQL but may not
materialize the stored `accessPassword` column/value in JavaScript. A newly prepared
hash may exist transiently only inside the coordinator's DB-write path (local
preparation and write plan) and must never be returned, cached, or logged. SEO
canonical/robots domain errors map to
machine-readable HTTP 400 responses.

## Compatibility and land order

Land after both 537-01 leaves. The first mutation lookup is a minimal `SELECT ... FOR
UPDATE`; standalone publish uses the same locked path so password decisions and per-entry
revision numbering are serialized. Route `scheduledAt` remains present-only, and the
coordinator validates the final stored status/date pair before writing. Return/error/cache
behavior remains compatible except that the formerly partial metadata commit becomes
atomic, the two existing SEO validation codes are correctly mapped, and a post-commit
cache invalidator failure is now redacted/reported while returning the durable result
instead of surfacing a retry-prone failed request. TASK-517 is
blocked until this leaf and closure pass; its planned entryService changes must be rebased
and freshly audited against the explicit projection/helper shape.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/auth/rbac.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/routes/contentTypes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/integration/runtime/detail-page-runtime.test.ts \
  tests/integration/runtime/detail-page-composer-runtime.test.tsx
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/security/codersoSecurityGate.test.ts
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/content/taxonomyService.ts core/services/seo/seoService.ts \
  core/services/content/entryService.ts core/server/routes/contentEntryRoutes.ts \
  core/server/routes/index.ts \
  core/services/auth/roleService.ts core/server/middleware/rbac.ts
~~~
