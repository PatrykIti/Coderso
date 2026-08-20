# TASK-539-08-L01: Nine-Flow Page Parity Suite and Closure

# FileName: TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md

**Parent Subtask:** TASK-539-08
**Priority:** High
**Category:** Pages / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-07
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create in this leaf only)

---

## Sole-writer scope

May edit only:

- create `tests/integration/runtime/task-539-page-parity-runtime.test.ts`;
- `_docs/PAGE_MODEL.md`;
- `_docs/SECURITY_SPEC.md`;
- `_docs/CMS_SPEC.md`;
- `docs/develop/content-and-widgets.md`;
- `docs/guide/screens/page-editor-preview-settings-and-history.md`;
- TASK-539 descendant/parent statuses, only the TASK-539 board row/statistics delta,
  changelog 1318, and only its changelog-index row;
- screenshots `_docs/_workflows/_smoke/task-539-*`.

Read but never edit:

- `tests/integration/runtime/pages-runtime.test.ts` (427-line suite, already split
  into `pages-runtime-blocks.test.ts` / `pages-runtime-responsive.test.ts` /
  `pages-runtime-test-support.ts`; read-only);
- `tests/integration/runtime/site-shell-runtime.test.ts`.

Do not edit production source, another task family, workflow code, or shared-index
bytes outside the exact TASK-539/changelog-1318 deltas. Read both indexes fresh
immediately before closure. There is no TASK-545 prerequisite, exception, manifest,
or evidence-path substitution.

The live concurrent TASK-548 stream is an explicit collision guard. Forbidden paths
are `_docs/_TASKS/TASK-548*.md`, `_docs/_workflows/task-548-*.mjs`,
`_docs/_CHANGELOG/1261-*`, the changelog-1261 index row, and the TASK-548 board
row/statistics bytes. The literal shared future-writer paths
`_docs/SECURITY_SPEC.md` and
`docs/guide/screens/page-editor-preview-settings-and-history.md` require a strict
handoff: this TASK-539 leaf lands both edits before TASK-548-07-L01 and
TASK-548-06-L01 begin. The task-board dependency note is reciprocal authority for
`TASK-539-08-L01 → TASK-548-06-L01/TASK-548-07-L01`. Read both exact status fields
fresh immediately before editing and fail unless both are `⏳ To Do`; no worktree
isolation or conditional handback overrides this order. Record the two landed
shared-file hashes in TASK-539 closeout. TASK-548 then reads those bytes and owns its
own Guide compiler/report/coverage and security-closeout sequence. Never edit the
guide after either TASK-548 writer starts. Preserve all foreign TASK-548 bytes. Copy
its exact then-current source/test ownership paths into every TASK-539 dispatch and
recompute board statistics from all physical task files; never apply a stale
hard-coded TASK-539 delta.

## Implementation Pseudocode

### Start and runtime suite

Fail closed unless TASK-540 and every descendant are terminal and a new start audit
passes against the current post-TASK-540 HEAD plus full status/diff. Before any
TASK-539 source edit, the implementation workflow must already exist and pin that
baseline; a later commit does not narrow line-gate scope.

### Real HTTP Page mutation harness

The new Bun suite must not import or call `registerPageRoutes`, its handlers, or a
test router. Ground the harness against
`tests/integration/routes/userSettings.test.ts` and use the same real symbols:

```text
startHttpServer, resolveRateLimitBucket
resolveAdminPath
createSession, createCsrfToken, setCsrfToken, SESSION_COOKIE_NAME
getSetting, getSettingRecord, setSetting, deleteSetting
getSecuritySettings, setSecuritySettings, resetSecuritySettingsCache
resetRateLimitBuckets
createPageTemplate, SITE_FOOTER_TEMPLATE_SETTING_KEY, clearSiteCache
createForm, setFormFields
db; accessLogs, auditLogs, formFields, forms, ipAllowlist, listingQueries,
  pageRevisions, pages, pageTemplates, previewTokens, roles, sessions, settings,
  userRoles, users
trackedFetch, expectedAccessLogSignature, validateAndCleanupAccessLogs
type AccessLogCandidate, type AccessLogScope, type ExpectedAccessLog, type PollDeps
```

Import the access-log helpers/types from the existing
`tests/integration/routes/support/userSettingsAccessLogHarness.ts`; do not copy or
weaken its asynchronous stable-inventory/drain algorithm. Implement these local,
typed helpers inside the new suite, keeping the complete test file `<=1000`:

```text
configuredHost(value, fallback)
  parse an absolute configured base URL and return URL.host, else fallback

createHttpActor(kind, permissions, marker)
  insert one UUID user and one uniquely named UUID role
  insert exactly one userRoles assignment
  call createSession({userId, userAgent:marker})
  call createCsrfToken(), then setCsrfToken(session.id, tokenHash)
  return {kind,userId,roleId,sessionId,sessionToken,csrfToken}

installHttpSecurityFixture()
  snapshot the raw security.settings row as {exists,value,updatedAt}
  resetSecuritySettingsCache(), then call setSecuritySettings with:
    csrf {enabled:true,headerName:"x-csrf-token",tokenTtlMinutes:30}
    rateLimit enabled and admin_write {windowSeconds:60,maxRequests:100}
    botProtection {enabled:false} so the owned public Form fixture is deterministic
  read getSecuritySettings() and assert those exact applied values
  insert one collision-safe suite-owned IPv4 /32 row into ipAllowlist
  resetRateLimitBuckets()
  return {rawSecuritySnapshot,allowlistId,forwardedIp}

pageRequest(method, routeSuffix, actor?, csrf?, body?, expectedStatus)
  build ${adminPath}/api${routeSuffix} under the ephemeral loopback base URL
  send Host equal to configuredHost(await getSetting("site.adminBaseUrl"), fallbackHost)
  send User-Agent marker, X-Forwarded-For equal to the owned /32 address,
    JSON Content-Type/body when present,
    Cookie `${SESSION_COOKIE_NAME}=${actor.sessionToken}` when authenticated,
    and X-CSRF-Token only when requested
  call trackedFetch with the exact path/status/user/session ledger entry
  return the real HTTP Response

snapshotOwnedMutationState(slugs, pageIds)
  query only exact owned Page slugs/ids plus their pageRevisions and auditLogs
  return deterministic rows/counts so every denial can compare before/after bytes

createOwnedListingQuery(ownedUserId)
  insert one suite-owned listingQueries row directly through db with the typed
    desired query shape {source:"users",sourceConfig:{},filters:[...],sort:[...],
    pagination:{limit:1,offset:0},fields:["id","name","status"]}
  return the created UUID id
  this is a local typed DB insert fixture (no admin HTTP client, service writer
    fence/lock, cache, or audit side effects)
```

Create at least these actors with collision-safe UUID identities and exact RBAC:

- reader: `["content:read"]` and therefore no write;
- writer: `["content:read", "content:write"]` and no publish;
- publisher: `["content:read", "content:write", "content:publish"]`.

Install the HTTP security fixture before creating sessions or starting the server.
The owned `/32` must be unique even when foreign allowlist rows already exist; retry
only this suite's candidate on a unique-key collision and never edit/delete a foreign
row. Resolve `adminPath = await resolveAdminPath()`, start one
`startHttpServer({port:0})`, and use `http://127.0.0.1:${server.port}` only as the
transport origin while sending the configured Admin Host header. Assert
`resolveRateLimitBucket` returns `"admin_write"` for `POST /pages`,
`PATCH /pages/:id`, `POST /pages/:id/autosave`, and
`POST /pages/:id/publish`. Then execute this ordered matrix through real HTTP:

1. unauthenticated create -> `401` / `auth_required`;
2. writer create with missing CSRF -> `403` / `csrf_invalid`;
3. writer create with an invalid CSRF token -> `403` / `csrf_invalid`;
4. reader create with its valid CSRF token -> `403` / `forbidden`;
5. writer create with valid CSRF -> `200`; track the returned Page ID;
6. writer update with valid CSRF -> `200` and exact current-document persistence;
7. writer update carrying one nested unknown PageDocumentV2 member -> `400` /
   `page_document_unknown_field`, with the returned error path and no persistence;
8. writer autosave with valid CSRF -> `200` and exactly one owned autosave revision;
9. writer publish with valid CSRF -> `403` / `forbidden`, preserving draft Page
   bytes, the existing autosave inventory, zero publish revision, and zero publish
   audit;
10. publisher publish with valid CSRF -> `200`, published/current document parity,
    exactly one publish revision, and exactly one `pages.publish` audit row.

Compare `snapshotOwnedMutationState` before/after every denied or invalid request,
including exact slug lookup before a Page ID exists. This is the evidence for zero
Page/revision/autosave/audit mutation. The real missing/invalid-CSRF responses and
the access-log ledger prove the request crossed `httpServer` middleware; the static
bucket-helper assertion alone is not cited as middleware proof.

### Public runtime and direct-service fixtures

Create the published footer template through `createPageTemplate` and set its shell
reference through the existing `SITE_FOOTER_TEMPLATE_SETTING_KEY` plus `setSetting`
pattern. For every touched setting (including cache/content-route values), first
snapshot `getSettingRecord`; restore an existing record with `setSetting` and remove
only a suite-created record with `deleteSetting`. Footer/template/settings are
fixtures, not claimed Page HTTP coverage.

Create one collision-safe published, public suite-owned Form through `createForm`
and one exact text field through `setFormFields`:
`{type:"text",label:"Name",name:"name",required:true,settings:{},orderIndex:0}`;
the Page form block references that exact Form ID. Create one suite-owned saved query
through `createOwnedListingQuery`. Its deterministic query is
`{source:"users",sourceConfig:{},filters:[{field:"id",op:"eq",value:ownedUserId}],`
`sort:[{field:"id",dir:"asc"}],pagination:{limit:1,offset:0},`
`fields:["id","name","status"]}`. Under the same unsafe marquee subtree, the Page
contains paired `filters` and `collection` blocks that reference that exact query
ID. The collection block uses
`{contentTypeId:"",queryId:ownedQueryId,limit:1,templateId:null,`
`paginationMode:"none",pageSize:null}`. The filters block owns the count/filter-form
surface and causes the document-level listing runtime to be requested; the collection
block owns the visible actor row. The document-level registry must still emit exactly
one listing-runtime script, and neither resolved surface may depend on ambient rows.

Before the first public render, snapshot
`process.env.FORM_SUBMIT_NONCE_SECRET` with an explicit present/absent bit and install
one unique, nonlogged test-local secret. Restore the exact prior value—or delete the
variable when it was originally absent—in an unconditional outer `finally`. Never
record the generated secret, session token, CSRF token, cookie, or nonce in output,
screenshots, access-log expectations, or closeout evidence.

After authorized HTTP publish, request the actual public Page path from the same
ephemeral server using the configured public Host (or loopback fallback) and the same
owned `X-Forwarded-For`. Assert strict canonical gallery and nested-unknown behavior,
public HTML/CSS hooks, responsive rules, parsed paint, static runtime, main/footer
selector/style/script contracts, and unsafe marquee descendants containing the owned
Form plus the paired saved-query consumers. They must render one canonical segment,
exactly one valid form nonce/runtime surface, one resolved filters surface with
`data-page-filters-count="1"` and `1 result`, one collection surface containing the
expected unique actor-backed row, and exactly one document-level listing-runtime
script. Never copy assertions into
`pages-runtime.test.ts`; existing Page and site-shell runtime suites remain read-only
regression consumers.

### Exact cleanup and failure aggregation

Track exact Page, template, Form, saved-query, allowlist, user, role, session, and
setting identities. Stop the server before cleanup. In an unconditional outer
`finally`, independently of access-log validation, restore/delete the nonce-secret
environment variable, restore the raw `security.settings` row by exact-key
upsert-with-original-`updatedAt` or exact-key delete, call
`resetSecuritySettingsCache()`, delete only the owned allowlist ID, and call
`resetRateLimitBuckets()`. Then use the user-settings harness's stable access-log
validation/drain over this suite's marker/user/session scope. Its cleanup callback,
plus the guarded fallback path, deletes/restores only owned state in foreign-key-safe
order:

```text
restore exact setting snapshots (setSetting or deleteSetting)
delete auditLogs where targetId is an owned Page ID
delete previewTokens where targetType="page" and targetId is owned
delete pageRevisions where pageId is owned
delete pages where id is owned
delete pageTemplates where id is the owned footer template
delete formFields where formId is the owned Form ID
delete forms where id is the owned Form ID
delete listingQueries where id is the owned saved-query ID
delete sessions where id is an owned session
delete userRoles where userId/roleId belongs to this suite
delete roles where id is owned
delete users where id is owned
```

The access-log harness deletes only its observed owned access-log IDs before actor
rows disappear. Build its `PollDeps` exactly as the grounded fixture does: select
`accessLogs` candidates by the unique User-Agent marker or owned user/session IDs,
delete only explicit observed access-log IDs, use `Date.now`, and use a bounded
`setTimeout` wait. Always clear the site cache in finalization. Mirror the
user-settings suite's
behavior-error, validation-error, fallback-cleanup, and `AggregateError` handling so
a failed assertion never skips cleanup. Never truncate a table, delete by broad role
name/status, or record raw cookies, CSRF tokens, credentials, sensitive responses,
or an actionable exploit payload.

## Security Contract

- **Visibility/auth:** all exercised mutation routes are internal
  `/admin/api/*` routes authenticated only by the existing session cookie; there is
  no TASK-539 API-key mode. The suite must reach them through
  `startHttpServer({port:0})`, `resolveAdminPath`, the configured
  `site.adminBaseUrl` Host, the owned allowlisted `X-Forwarded-For`, and
  `SESSION_COOKIE_NAME`; direct route invocation is not HTTP evidence.
- **RBAC:** create, update, and autosave require `content:write`; publish requires
  `content:publish`. Unique reader, writer, and publisher users receive only the
  exact role permissions enumerated above.
- **CSRF/rate limit:** every session-backed write in the harness sends the real
  `X-CSRF-Token` shape issued by `createCsrfToken`/`setCsrfToken` and remains in the
  `admin_write` bucket. The exact raw `security.settings` record is restored after a
  fixture-forced enabled `x-csrf-token`/30-minute CSRF contract and a bounded enabled
  `admin_write` policy; bot protection is disabled only inside the restored fixture
  so ambient captcha settings cannot change the Form markup. Both security and
  rate-limit caches are reset. The owned `/32` allowlist entry proves requests cross
  IP middleware without touching foreign entries. Unauthenticated, missing-CSRF,
  invalid-CSRF, reader-write, and writer-publish requests assert exact 401/403 codes
  and zero owned mutation. The test must not bypass middleware to claim route
  coverage.
- **Validation:** the PageDocumentV2 boundary strictly rejects unknown fields and
  the suite proves a nested unknown member returns
  `page_document_unknown_field`/400 with no persistence through real HTTP.
- **Anti-abuse:** public Page render is read-only and TASK-539 adds no public write,
  so no new nonce/signature/HMAC or captcha policy applies. Existing form nonces and
  scripts must occur exactly once when an unsafe marquee subtree degrades to one
  segment. The suite uses an owned published Form and a restored test-local nonce
  secret; it never submits the Form or exposes the secret/nonce.
- **Fixture boundary:** the footer template and shell settings are test setup/cleanup
  through `createPageTemplate` and `setSetting`, matching the existing
  `site-shell-runtime.test.ts` fixture pattern; they are not claimed as HTTP route
  coverage. If an implementer instead exercises registered handlers, page-template
  create/update requires `content:write`, settings PATCH requires `settings:write`,
  both remain session-cookie/CSRF/`admin_write` protected, and their strict schemas
  must run. `tests/integration/routes/pages.test.ts` remains direct
  route/schema/service proof only. Cleanup restores exact setting snapshots and
  deletes only suite-owned Page/revision/preview/audit/Form/field/listing-query/
  session/user-role/role/user/template rows after exact access-log drainage. Global
  security/env state and the owned allowlist row are restored independently even
  when access-log validation fails.

## Exact targeted gates

Run every command from leaves 01–07 and this exact aggregate inventory. A named failure
is rerun once alone before classification.

```bash
bun run test:vitest -- tests/vitest/pages/page-document-v2-facade.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-idempotence.test.ts tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts tests/vitest/pages/page-document-v2-listing-and-settings.test.ts tests/vitest/pages/page-document-v2-style-contracts.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-block-grid-placement.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-content-controls.test.ts tests/vitest/pages/page-editor-visual-controls.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-media-url-control.test.tsx tests/vitest/ui/page-editor-gallery-items-control.test.tsx tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx tests/vitest/ui/page-editor-v2-controls-flow.test.tsx tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx tests/vitest/ui/page-editor-v2-layout-flow.test.tsx tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx tests/vitest/ui/page-editor-v2-settings-flow.test.tsx tests/vitest/pages/task-539-page-editor-controls.test.ts tests/vitest/ui/task-539-page-editor-flow.test.tsx
bun run test:vitest -- tests/vitest/pages/page-composition-effects.test.ts tests/vitest/pages/task-534-interactivity-css.test.ts tests/vitest/pages/task-539-transform-composition.test.ts
bun run test:vitest -- tests/vitest/pages/page-renderer-v2-facade.test.tsx tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-renderer-v2-section-layout.test.tsx tests/vitest/pages/page-renderer-v2-blocks.test.tsx tests/vitest/pages/page-renderer-v2-data-binding.test.tsx tests/vitest/pages/page-renderer-v2-effects.test.tsx tests/vitest/pages/page-renderer-v2-svg.test.tsx tests/vitest/pages/page-renderer-v2-composition.test.tsx tests/vitest/pages/page-renderer-timeline-geometry.test.ts tests/vitest/pages/task-534-interactivity-render.test.tsx tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx tests/vitest/pages/task-539-renderer-replica-identity.test.tsx
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts tests/vitest/pages/page-responsive-css-section.test.ts tests/vitest/pages/page-responsive-css-block.test.ts tests/vitest/pages/page-responsive-css-block-behavior.test.ts tests/vitest/pages/page-responsive-css-security.test.ts tests/vitest/pages/task-539-responsive-css-parity.test.tsx
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/sectionScrollEffect.test.tsx tests/vitest/content/cursorSpotlight.test.tsx tests/vitest/content/task-534-interactivity-runtime.test.tsx tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx
```

## Exact aggregate gates

Run in this order after targeted suites are green:

```bash
node --check _docs/_workflows/task-539-fix.mjs
node --check _docs/_workflows/task-539-implement.mjs
node _docs/_workflows/task-539-implement.mjs --self-test-file-line-limit
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun --cwd core build:site
bun run check:admin-boundary
bun run check:admin-bundle
set -a && source .env && set +a
bun --eval 'import { canConnect, hasTable } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); const names = ["menus","menu_items","page_templates","pages","page_revisions","preview_tokens","seo_documents","content_types","content_entries","redirects","theme_profiles","theme_routes","audit_logs","access_logs","sessions","users","roles","user_roles","settings","ip_allowlist","forms","form_fields","listing_queries"]; const requiredTables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, reachable && await hasTable(name)]))); process.stdout.write(JSON.stringify({ configured, reachable, requiredTables })); if (!reachable || Object.values(requiredTables).some((present) => !present)) process.exit(1); process.exit(0)'
bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun test --timeout=30000 tests/integration/runtime/task-539-page-parity-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/pages-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/site-shell-runtime.test.ts
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

The preflight covers the two named legacy runtime suites, public route/theme/SEO
resolution, IP middleware, and every table used by the real-HTTP actor/Page/Form/
listing/access-log harness. The new HTTP case owns a 30-second timeout because it
starts/stops Bun, waits for asynchronous access-log quiescence, and performs exact
cleanup. Do not close on an unreachable DB, any missing required table, a skipped
required case, truncated command, missing workflow result, line count above 1,000,
or unavailable strict scanner. Require the final named-suite receipts to report zero
skipped required cases. Recover, rerun, and record the final result. Attribute a
broad-suite failure only after its named file confirms it in isolation.

## Fresh post-audit

After tests and docs are final, run about five independent, read-only lenses
sequentially on the same final working tree:

1. scope/finding fidelity, start gate, land order, TASK-535 remains closed;
2. schema/error strictness, legacy reads, present-only and byte identity;
3. parsed-paint/raw-style security, selector escaping, placement parity;
4. renderer transform/marquee/timeline plus main/footer controller and reduced motion;
5. test integrity, line receipts, docs/task/changelog graph, collision boundaries.

Every agent must return a result and every finding needs `file:line` evidence; a
missing result is not a pass. Fix verified HIGH/MEDIUM findings in their sole-owner
leaf, rerun its exact gate, then restart fresh lenses. A LOW may be deferred only by
linking a deduplicated, execution-ready TASK-9999 leaf and recording exact proof of
both zero user-visible/UI/UX/accessibility effect and zero data/security/privacy/auth/
RBAC/API/persistence/migration/performance/reliability/test-integrity impact. Otherwise
fix it before closure.

## Nine real browser flows

Restart the server (no hot reload), verify admin and public front respond, then use one
task-scoped `playwright-cli` session such as `-s=wf539smoke`. Execute these nine
distinct real flows:

1. **Maximum-depth and placement parity.** Build legal depth-4 nested layout plus
   root frame, timeline/gallery/FAQ/testimonial wrapper, default media-split,
   non-default media-split, nested, and per-column placement classes. Author/reset
   all `x/y/z`, spans, custom font size, and `textTransform:none`; assert computed
   grid placement/typography/layer geometry in desktop/tablet/mobile editor and front.
2. **Gallery lifecycle.** Insert three media items with alt/caption/category tokens,
   use every gallery control, save draft, reopen, publish, and filter on front by
   pointer/keyboard; assert persistence, bounds, hidden state, pressed state, and ARIA.
3. **Composed transforms.** Combine section reveal, independent decoration/orbs,
   hover, tilt, magnetic, and layer placement; assert every computed channel changes
   independently, fine-pointer move/leave resets, wrapper width, and click path.
4. **Marquee identity/accessibility.** Exercise seamless true/false and a seamless
   group containing a deeply nested owned Form plus paired `filters`/`collection`
   blocks that share the owned saved-query ID, together with a nested authored
   marquee.
   Replica-safe content has one rail, two adjacent segments/no gap/no wrap, a replica
   that is `aria-hidden` and `inert`, locally namespaced IDs/data hooks with no
   duplicate ID, and reduced-motion stop. Trigger the four hook families that real
   block content can own—switcher, gallery, tilt, and magnetic—and prove only primary
   nodes bind/respond with one-action cardinality. Attempt programmatic focus,
   pointer click, and keyboard activation on normally focusable replica descendants;
   native `inert` must keep focus outside the replica and produce zero replica
   activation/listener effect. Exercise reveal/parallax on real
   section wrappers and spotlight on the real Page root separately; their defensive
   replica-marker cases remain runtime-suite fixed DOM, not fabricated product
   markup. Each unsafe subtree deterministically has one
   canonical segment, no replica marker/namespace, and exactly one form nonce,
   executable form script, filters/count surface, collection actor-row surface,
   document-level listing-runtime script, and nested marquee instance.
   At one tablet and one mobile front viewport, author real responsive typography,
   frame/inner-element visual style, and tilt+layer offsets on duplicated safe
   descendants. Compare computed block-frame, inner-element, text, and hoisted
   tilt/layer styles plus bounding boxes between the canonical and replica targets:
   both segments must visibly match. Author a legal responsive grid span only on the
   outer marquee group and prove its singular canonical grid target remains outside
   both segments with the expected geometry. Every duplicated descendant must have
   no grid hook, grid alias, inline span, or responsive span CSS. Assert the replica
   uses only
   `PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE`,
   `PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE`, with canonical original
   block-ID values on their precise frame/hoisted-wrapper targets, retains namespaced
   selection/runtime identities, and leaks no alias to primary, non-seamless, unsafe
   fallback, or a non-owning replica node.
5. **Full-bleed paint.** Author responsive gradient layers plus final color, radius,
   shadow, and glow; assert viewport-wide outer paint, capped content, exact computed
   image/color split, no double-tone box, and invalid paint absent.
6. **Main/footer rescans.** Exercise the product-reachable SSR main→footer order with
   different effects plus later inserted matching nodes/rescans. Assert both roots
   bind exactly once, later nodes respond, globals do not multiply,
   `--spotlight-x`/`--spotlight-y` update on the correct
   `[data-page-spotlight]` root and visibly move that root's overlay, and magnetic
   custom properties update then reset on pointer leave. Cite the green
   TASK-539-07-L02 fixed-DOM Vitest receipt for the defensive footer→main parser
   order; production SSR cannot emit that reverse order, so Playwright must not
   fabricate or reorder product markup.
7. **Reduced-motion functionality.** Enable reduced motion and prove switcher and
   gallery pointer/keyboard/roving/ARIA/hidden behavior remains functional while
   reveal/parallax/spotlight/tilt/magnetic stay neutral and content remains visible.
8. **Timeline, glow, and divider geometry.** Exercise default, compact, multi-item, and
   single-item timelines plus gradient/non-gradient divider gating. Assert connector
   endpoints at the exact `22px` default/`18px` compact marker centers, non-final
   row-gap bleed, no single-item connector, and visible divider length/alignment/tone.
   Author the lift/glow-reveal decoration on real blocks and prove the glow
   `::before/::after` overlay carries `pointer-events:none` (computed style) so real
   pointer clicks, drags, and text selection pass through the glow overlay to the
   underlying interactive content; assert a clickable descendant receives the event
   and the overlay never captures the pointer.
9. **Narrow canvas and themes.** At 320, 390, and 480 px open/close the inspector,
   select and edit controls in both light and dark Admin themes, and assert positive
   usable canvas width, reachable controls, no rail-induced zero width, clipping, or
   horizontal trap. At 640px and one `lg` viewport, assert computed right padding is
   exactly 300px while the selected inspector is open despite the retained `lg:p-8`;
   closing restores the ordinary computed `p-6 lg:p-8` padding. The narrow overlay
   may cover content by design, but it must be closable and reopenable without
   trapping the editor.

Assert visible effects through computed styles, bounding boxes, DOM/ARIA/data state,
focus, and actual hit targets—not control presence or CSS-string presence. Preflight
admin/front before the flows, cover save→reopen and publish→front parity, collect at
least one `task-539-*` screenshot per flow (and both themes for flow 9), and require
zero console errors in every scenario. Record scenario ID, viewport/theme, visible
assertions, console result, and screenshot path in TASK-539 closeout evidence.

## Documentation and atomic closure

Update all five named docs with the strict gallery/legacy-read behavior, shared
placement classification, responsive typography/spans/layers, parsed paint/full bleed,
transform variables/marquee/timeline, controller rescans, reduced motion, present-only
identity, and user-visible editing/publish workflow. Do not describe task internals in
the user guide.

Create
`_docs/_CHANGELOG/1318-{YYYY-MM-DD}-task-539-page-v2-post-audit-remediation-ii.md`
using the actual closure date and live changelog convention. Record exact validation
results, line receipt, audits, nine-flow evidence, screenshots, and owner commit scope
without secrets. Its Tasks field/index coverage must enumerate TASK-539, all 8 direct
children, and all 18 physical leaves, including TASK-539-03-L05, before any family
status is closed.

Only after every required receipt is green: mark leaves terminal, then child tasks,
then TASK-539; update only its board row and recompute statistics from physical files;
add only changelog 1318/index rows. No direct child may remain open. Do not commit as an
agent.
