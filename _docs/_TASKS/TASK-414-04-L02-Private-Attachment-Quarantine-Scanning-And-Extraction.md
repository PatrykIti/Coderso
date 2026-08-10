# TASK-414-04-L02: Private Attachment Quarantine Scanning And Extraction
# FileName: TASK-414-04-L02-Private-Attachment-Quarantine-Scanning-And-Extraction.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-04
**Priority:** Critical
**Category:** Agent / Private Files / Malware Scanning / Extraction
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-04-L01; TASK-414-03 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Implement one shared private-input attachment lifecycle consumed independently
by Agent sessions and Designer workspaces. Every upload enters a dedicated
server-private quarantine and is rooted at exactly one authorized Agent session
or Designer workspace. Designer upload never requires `assistant:use` or an
Agent session. It
never creates a Media row, uses a Media public URL, or becomes available to an
AI provider until exact type verification and a clean ClamAV scan complete.

Apache Tika 3.x performs bounded extraction in an isolated no-network worker.
The worker is unprivileged, disposable, resource-capped, archive-aware, and
configured to return normalized text/metadata only. It does not fetch external
relationships, execute macros, write embedded files, perform OCR/network calls,
or return active markup.

TASK-414-03-L02 is the sole table/migration/snapshot/journal writer. This leaf
uses its shared private-attachment repository, status CAS, typed root ownership,
purge lease, and outbox/lifecycle interfaces. It must not add or alter DB schema.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole writer for:

- new `core/services/privateInputs/attachments/attachmentContracts.ts`;
- new `core/services/privateInputs/attachments/attachmentTypePolicy.ts`;
- new `core/services/privateInputs/attachments/privateAttachmentStore.ts`;
- new `core/services/privateInputs/attachments/privateAttachmentLocalStore.ts`;
- new `core/services/privateInputs/attachments/privateAttachmentObjectStore.ts`;
- new `core/services/privateInputs/attachments/clamdAttachmentScanner.ts`;
- new `core/services/privateInputs/attachments/tikaAttachmentExtractor.ts`;
- new `core/services/privateInputs/attachments/tikaWorkerClient.ts`;
- new `core/services/privateInputs/attachments/attachmentProjection.ts`;
- new `core/services/privateInputs/attachments/attachmentService.ts`;
- new `core/services/privateInputs/attachments/attachmentRetentionService.ts`;
- new `core/server/routes/privateAttachmentMultipart.ts`;
- new `core/server/validation/privateInputAttachmentSchemas.ts`;
- new `core/server/routes/privateInputAttachmentRoutes.ts`;
- new `docker/private-input-attachments/clamd.conf`;
- new `docker/private-input-attachments/tika-config.xml`;
- new `docker/private-input-attachments/tika-worker.Dockerfile`;
- new `docker/private-input-attachments/tika-worker.mjs`;
- new `docker/private-input-attachments/tika-entrypoint.sh`;
- new `docker/private-input-attachments/compose.yaml`;
- new `tests/vitest/private-inputs/attachmentTypePolicy.test.ts`;
- new `tests/vitest/private-inputs/attachmentProjection.test.ts`;
- new `tests/vitest/private-inputs/privateAttachmentMultipart.test.ts`;
- new `tests/unit/private-inputs/privateAttachmentStore.test.ts`;
- new `tests/unit/private-inputs/clamdAttachmentScanner.test.ts`;
- new `tests/unit/private-inputs/tikaAttachmentExtractor.test.ts`;
- new `tests/integration/routes/privateInputAttachments.test.ts`;
- new `tests/integration/server/privateInputAttachmentLifecycle.test.ts`;
- new `tests/integration/server/privateInputAttachmentContainers.test.ts`;
- new `tests/security/privateInputAttachmentIsolation.test.ts`.

Forbidden: `core/db/**`, migration SQL/meta/journal, TASK-414-03 repositories/
capabilities, `core/services/media/**`, media routes/tables, shared route index,
`assistantRoutes.ts`, Assistant UI, AI provider adapters, action engine, shared
Dockerfile, `core/server/{router,httpServer,requestBody,routeResponse,
routePreBodyPolicy}.ts`, package/lock files, shared docs/tasks/changelog, and
other leaf files. The later
TASK-414-09-L03 integration owner mounts `registerPrivateInputAttachmentRoutes` and
registers the retention worker with the shared lifecycle.

This leaf consumes TASK-414-03-L03's terminal strict route response/pre-body/raw
stream contract and TASK-414-04-L01's exact `@fastify/busboy@3.2.0` dependency
read-only. It does not add a second multipart parser, server pipeline, response
serializer, request wrapper, lifecycle, or package owner.

The exact pure integration exports are:

```ts
export function registerPrivateInputAttachmentRoutes(
  router: Router,
  deps: PrivateInputAttachmentRouteDeps,
): void;
export const privateInputAttachmentLifecycleContribution:
  RuntimeLifecycleContributionV1;
```

`RuntimeLifecycleContributionV1` and its single dependency type name
`Task414ContributionDepsV1` are imported from TASK-414-03-L03's one exact owner
`core/server/routes/contributions/task414ContributionContract.ts`; this leaf
never redefines the contribution type. The lifecycle contribution owns bounded
scanner/parser readiness plus retention/
purge scheduling as one awaited participant; it never installs signals, starts
the lifecycle, or creates an HTTP bypass.

## State And Storage Contract

The terminal repository must expose an optimistic state machine compatible with:

```text
uploading -> quarantined -> scanning -> extracting -> ready
     |            |            |            |
     +----------> rejected <----+------------+
     +----------> purge_pending -> purged
ready ----------> purge_pending -> purged
```

Every transition compares the expected attachment revision and current state.
`ready` is reachable only after exact type verification, clean malware scan,
and successful bounded projection. A crash leaves a lease-expirable state that
the bounded reconciler resumes or rejects; it never promotes on absence of a
scanner/extractor response.

`PrivateAttachmentStore` exposes only opaque operations:

```ts
export interface PrivateAttachmentStore {
  putQuarantine(input: PrivateAttachmentWriteV1): Promise<PrivateAttachmentObjectV1>;
  openForScan(key: PrivateAttachmentKeyV1): Promise<BoundedReadable>;
  openCleanForExtraction(key: PrivateAttachmentKeyV1): Promise<BoundedReadable>;
  moveToClean(key: PrivateAttachmentKeyV1): Promise<PrivateAttachmentKeyV1>;
  delete(key: PrivateAttachmentKeyV1): Promise<void>;
}
```

It has no URL method. Local objects use a non-web-root directory, mode 0700 for
directories/0600 for files, no-follow open, random keys, atomic writes, and
same-filesystem rename. S3/Azure objects use a dedicated private container or
prefix, deny anonymous access, server-side encryption, no website hosting,
short SDK timeouts, and no generated signed URL. Existing server-owned storage
credentials/configuration may be reused through a narrow injected resolver;
Media service/rows/cache/events are not.

## Exact Type Allowlist

Filename is normalized to its basename before policy checks. Every accepted
file must match one complete tuple; browser MIME is never sufficient.
Before malware scanning, the app performs only bounded filename/extension,
declared MIME, total-byte, and fixed-header magic checks—no image decode, ZIP
directory walk, PDF xref/trailer parse, UTF-8/CSV parse, relationship read, or
other complex parser. ClamAV scans those quarantined bytes next. Only after a
clean result does the same no-network resource-capped worker boundary perform
the complete structural/decode checks in this table and then extraction. A
malware/scan-unavailable result therefore reaches no complex parser.

| Extension | Declared MIME | Required magic/structure |
|---|---|---|
| `.png` | `image/png` | PNG signature `89 50 4E 47 0D 0A 1A 0A` |
| `.jpg`, `.jpeg` | `image/jpeg` | JPEG SOI `FF D8 FF` and valid bounded decode |
| `.webp` | `image/webp` | RIFF header with `WEBP` form type and valid bounded decode |
| `.pdf` | `application/pdf` | `%PDF-`, valid trailer/xref/parser access, not encrypted |
| `.docx` | OOXML Word MIME | ZIP magic plus exact content type and `word/document.xml` |
| `.xlsx` | OOXML Spreadsheet MIME | ZIP magic plus exact content type and `xl/workbook.xml` |
| `.pptx` | OOXML Presentation MIME | ZIP magic plus exact content type and `ppt/presentation.xml` |
| `.txt` | `text/plain` | valid UTF-8, no NUL, bounded control-character ratio |
| `.csv` | `text/csv` | valid UTF-8, no NUL, bounded consistent CSV parse |
| `.csv` | `text/plain` | same CSV structural verifier; never treated as generic text |

OOXML MIME strings are exactly the registered
`application/vnd.openxmlformats-officedocument.*` values for the named format.
Content-types, relationships, central directory, filenames, CRCs, and entry
bounds are validated in the post-clean sandbox before Tika extraction. Generic
ZIP and all unlisted aliases fail.

Explicit rejections include legacy OLE `.doc/.xls/.ppt`, RTF, HTML/SVG/XML,
executables/scripts, macro-enabled `.docm/.xlsm/.pptm`, any `vbaProject.bin`,
external relationships, embedded packages/objects, password/encrypted PDF or
OOXML, malformed/polyglot/trailing executable data, symbolic/hard links,
archive traversal, nested generic archives, and MIME/extension/magic mismatch.

## Scan, Extraction, And Projection Limits

| Boundary | Hard ceiling |
|---|---:|
| Uploaded bytes | 25 MiB/file; 64 MiB/run |
| Images | 16,384 px/side and 50 megapixels |
| ClamAV stream/time | 25 MiB / 30 seconds |
| Tika worker | 60 seconds, 512 MiB memory, 1 CPU, 64 PIDs |
| Archive expansion | 100 MiB, 2,048 entries, depth 2, ratio 20:1 |
| PDF pages / presentation slides | 200 / 200 |
| Workbook | 20 sheets, 100,000 populated cells total, 10,000 rows/sheet |
| Embedded resources | count 0; no embedded byte extraction |
| Extracted text | 250,000 UTF-8 characters/file |
| Extracted metadata | 64 KiB after exact-key projection |

ClamAV uses `INSTREAM` over a configured private Unix domain socket. Startup
checks the socket owner/mode, scanner version, maximum stream size, and health.
There is no TCP fallback and no “scanner unavailable means clean” mode. A scan
returns only `clean | infected(signatureCode) | unavailable | limit`; signature
text is reduced to a bounded safe code before persistence/audit.

Tika uses a pinned supported 3.x artifact and explicit parser configuration in
a dedicated worker image pinned by digest; the app image contains no Java/Tika.
The worker runs as a non-root UID with read-only root, private temporary
storage, `no-new-privileges`, dropped capabilities, bounded JVM heap/CPU/PIDs/
open files/wall time, and no network namespace/interface. A pinned Node 26
broker in that image listens only on an owner/mode-checked Unix socket in a
shared private volume. `tikaWorkerClient.ts` and the broker use one strict
length-prefixed protocol carrying version, random nonce, normalized MIME,
declared byte count/SHA-256, exact parser-limit profile, streamed already-clean
bytes, and one bounded strict JSON response. Unknown frames, mismatched nonce/
length/digest, trailing bytes, over-capacity, timeout, disconnect, or oversized
output fail closed. No filesystem/object path crosses the socket.

The broker launches one disposable resource-capped parser process for an
accepted request, feeds bytes through stdin/private temp input, collects only
normalized JSON from stdout, kills the full process group on any limit, and
removes temp data before replying. Stderr is redacted and bounded.
The worker uses write-limit and secure-content/zip-bomb handlers, disables
inline/embedded image extraction, OCR, macro extraction, and external entity/
relationship access. Sandbox setup/version/config failure is
`assistant_attachment_extraction_unavailable`, never an in-process fallback.
The shared lifecycle participant checks socket owner/mode and sends a protocol
health frame returning only Node/JRE/Tika versions, artifact/config digests and
capacity. It verifies a no-egress canary. Missing/unhealthy Tika or ClamAV keeps
processing unavailable; the app never launches Java, connects to worker TCP,
or treats absence as clean. Re-verify supported Tika/JRE/ClamAV patches and
image/artifact digests immediately before implementation.

`AttachmentProjectionV1` contains only normalized text chunks, page/sheet/
slide labels, safe scalar metadata, image dimensions/color information, MIME,
hash, truncation flags, and limit receipts. It contains no HTML, formulas,
scripts, links made clickable, embedded bytes, document properties that match
secret-like keys, filesystem/object paths, or parser diagnostics. Spreadsheet
cells are rendered as bounded row/column/value text; formulas and external
links are not executable and are omitted or represented as literal safe text.

## TTL And Purge Contract

- Import `ASSISTANT_RETENTION_POLICY_V1` from TASK-414-03-L02; do not redefine
  durations. `uploading`, `quarantined`, `scanning`, `extracting`, and
  `rejected` use `private-input-inflight`: hard 24 hours from `created_at` or an
  earlier terminal transition, never from a lease/read/poll.
- `ready` uses `private-input-ready`: rolling seven days after `ready_at` or the
  last successful server-authorized root/input-binding use and absolute 30 days
  after `ready_at`. A successful authorized binding use may
  refresh the rolling TTL but not the absolute ceiling; an expired source stays
  represented by a safe unavailable binding and must be re-uploaded for a new
  generation run.
- Explicit attachment/root deletion revokes that root immediately. It marks
  `purge_pending` only when no separately authorized Designer input/handoff
  binding still references the projection; knowing an ID never preserves it.
- A shared-lifecycle worker claims at most 100 rows, deletes projection and
  clean/quarantine objects idempotently, then records `purged`; failures use
  bounded exponential retry and never resurrect readiness.
- An orphan sweeper lists only the dedicated prefix in keyset pages of at most
  100 and removes unreferenced objects older than the policy's hard 24 hours.
  It never scans Media/public storage.
- Executed CMS audit/action evidence retains only safe attachment IDs/digests
  under its own contract, never bytes or extracted text.

## Attachment Route Contract

The root kind and root ID come only from the matched path and authenticated
context; multipart/JSON bodies cannot override either. The six internal routes
are:

| Product root | Upload | Status | Revoke/delete |
|---|---|---|---|
| Agent session | `POST /admin/api/private-inputs/agent-sessions/:sessionId/attachments` | `GET /admin/api/private-inputs/agent-sessions/:sessionId/attachments/:attachmentId` | `DELETE /admin/api/private-inputs/agent-sessions/:sessionId/attachments/:attachmentId` |
| Designer workspace | `POST /admin/api/private-inputs/designer-workspaces/:workspaceId/attachments` | `GET /admin/api/private-inputs/designer-workspaces/:workspaceId/attachments/:attachmentId` | `DELETE /admin/api/private-inputs/designer-workspaces/:workspaceId/attachments/:attachmentId` |

Upload accepts exactly one multipart `file`, verifies the path-derived root,
reserves admission/quota, streams to quarantine, and returns `202` with the same
strict safe status DTO. Status returns metadata, scan/extraction state, safe
error code, expiry, and projection availability only. DELETE is idempotent and
returns `202/204` without bytes or content.

There is deliberately no download/preview/content route. Agent or Designer can
request an internal projection or one-shot provider delivery only through
service calls after rechecking the typed root or explicit handoff/input binding,
current RBAC, retention, and exact model capability. A handoff may authorize an
Agent-rooted projection for one owner-matched Designer input binding; it never
changes ownership or creates a public URL.

Both POST descriptors use TASK-414-03-L03's `stream` pre-body mode with exact
`multipart/form-data` (including a syntactically valid bounded boundary), wire
cap `64 MiB + 64 KiB multipart overhead`, and no buffered fallback. Before a
body byte is read, the shared pipeline must complete exact route matching and
the two-tier framing check: duplicate/conflicting `Content-Length` and
CL+Transfer-Encoding are rejected by the Bun parser as a transport-level 400
before the app callback, without app response-policy headers or an app
access-log record; app-visible `request_framing_invalid`/400 applies only to
malformed framing that reaches the callback (for example forbidden chunked
framing on a non-stream policy), and only those cases carry the frozen
response-policy headers plus exactly one sanitized access-log record; then
strict `Content-Length` validation/cap, Admin session, root-specific RBAC,
`private-input-upload` rate limiting, CSRF, path-derived owner/root existence,
concurrent-slot acquisition, and attempted-byte quota reservation. A declared
length above the cap fails `413` (`payload_too_large`, cap breach only) without opening the parser/store. Missing
length or chunked transfer is accepted only behind the same slot/quota grant and
the independent wire/file byte counters; attempted bytes are charged up to the
observed bounded amount even when parsing, scan, or extraction later fails.

`privateAttachmentMultipart.ts` is the sole focused adapter around
`@fastify/busboy`. It applies explicit finite limits: one file, zero text fields,
one part, bounded header pairs/header bytes, bounded boundary/name/filename/MIME
metadata, exact field name `file`, and the per-file cap from the type policy.
Duplicate `file`, any field/extra part, nested multipart, malformed disposition,
ambiguous/duplicate content metadata, parser limit event, trailing part, or
premature EOF fails closed. The adapter bridges the already-authorized one-shot
request stream with backpressure directly into a newly created quarantine write;
it computes byte count/hash and retains only the fixed bounded magic-prefix
window needed by type inspection. It never constructs `FormData`, `File`, a
whole-body `Uint8Array`/`Buffer`, or an unbounded chunk array.

Abort, client disconnect, route cancellation, parser error, store failure, limit
breach, and handler exception synchronously stop both sides and invoke one
idempotent cleanup path for the partial object, upload reservation, slot, and
unused quota grant. Success is impossible until parser `finish`, exact-one-file,
wire/file counts, store close/hash, and no-trailing-data checks all pass. The
route then persists the owner-bound upload row/quarantine fact and schedules scan
only after commit. Scanner/Tika never see a partial object.

## Security Contract

- **Visibility:** the six routes above are internal Admin routes. No public,
  front-host, Media, signed-URL, or raw-byte endpoint exists.
- **Auth:** authenticated Admin session; actor and typed root come from the
  server/path. Attachment IDs and object keys are not credentials.
- **RBAC:** Agent-root upload/status/delete require `assistant:use` plus exact
  actor-owned session membership. Designer-root upload/delete require
  `designer:write`; status requires `designer:read`; all require the exact
  actor-owned workspace. Designer does not require Agent permission/session.
  A later Media import must independently require `media:write` and is not part
  of this leaf.
- **CSRF:** required on multipart POST and DELETE. For POST it runs before body
  parsing or stream access. GET is side-effect free and cannot lease/extend TTL
  by itself.
- **Rate limit:** `private-input-upload`, charged by attempted bytes before scan,
  with per-actor and installation-wide concurrent quarantine/scan/extraction
  and daily byte caps.
- **Validation:** exact streaming multipart fields/parts/header counts, opaque
  IDs, filename/boundary/header bounds, independent wire/file size counters,
  complete tuple allowlist, archive/parser limits,
  recursive reject-unknown worker/store/repository DTOs, optimistic states.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply. Lease,
  idempotency, bounded queues/retries, TTL, purge, and resource controls are
  mandatory; repeated rejected uploads still consume quota.
- **Secrets/privacy:** no private bytes/text/object keys, original paths,
  scanner/parser diagnostics, session data, or provider handles in URLs,
  browser/local storage, caches, logs, metrics, audits, screenshots, or errors.

## Implementation Pseudocode

```ts
export async function acceptPrivateInputAttachment(
  input: AuthorizedRouteBodyStreamV1,
  ctx: AuthorizedPrivateInputRootContextWithAdmission,
  deps: AttachmentServiceDeps
): Promise<AttachmentStatusDtoV1> {
  const root = ctx.preBodyAdmission.requireOwnedRoot();
  let staged: StagedQuarantineUploadV1 | null = null;
  try {
    staged = await deps.multipart.streamExactlyOneFileToQuarantine({
      input,
      admission: ctx.preBodyAdmission,
      openWrite: () => deps.store.createQuarantineWrite(),
      limits: strictMultipartLimitsFor(root.kind),
    });
    const shallow = inspectDeclaredMimeExtensionAndFixedMagic({
      declaredMime: staged.declaredMime,
      originalName: normalizeAttachmentBasename(staged.originalName),
      magicPrefix: staged.magicPrefix,
      bytes: staged.bytes,
    });
    const reservation = await deps.repository.commitQuarantinedUploadTx({
      actorId: ctx.actorId,
      root,
      originalName: normalizeAttachmentBasename(staged.originalName),
      key: staged.object.key,
      sha256: staged.sha256,
      bytes: staged.bytes,
      shallow,
    });
    await deps.jobs.enqueueScanAfterCommit(reservation.id);
    return deps.repository.getSafeStatus(reservation.id, ctx.actorId);
  } catch (error) {
    await settleUploadFailureAndPurge(staged, ctx.preBodyAdmission, error, deps);
    throw mapAttachmentDomainError(error);
  }
}

export async function processAttachment(
  attachmentId: string,
  deps: AttachmentWorkerDeps
): Promise<void> {
  const scanLease = await deps.repository.claimForScan(attachmentId);
  const scan = await deps.clamd.scan(await deps.store.openForScan(scanLease.key));
  if (scan.state !== "clean") return rejectAndSchedulePurge(scanLease, scan, deps);
  const clean = await deps.store.moveToClean(scanLease.key);
  const extractionLease = await deps.repository.markExtracting(scanLease, clean);
  const verified = await deps.tika.verifyAndExtractExactStructure(
    await deps.store.openCleanForExtraction(clean),
    extractionLease.shallow,
    extractionLease.sha256,
    extractionLimitsFor(extractionLease.shallow),
  );
  const projection = normalizeAttachmentProjectionV1(verified.extracted);
  await deps.repository.markReady(extractionLease, projection);
}

export async function purgeExpiredAttachments(deps: PurgeDeps): Promise<void> {
  for (const item of await deps.repository.claimPurgeBatch({ limit: 100 })) {
    await deleteEveryPrivateObjectIdempotently(item, deps.store);
    await deps.repository.markPurged(item.id, item.revision);
  }
}
```

## Data Flow

Exact route/wire cap → Admin session/RBAC/rate/CSRF/path-owner/quota admission
before body → bounded Busboy stream → private quarantine → owner-bound upload
transaction →
exact tuple/hash/size checks → post-commit scan job → ClamAV Unix socket → clean
private object → isolated Tika 3.x → strict bounded projection → optimistic
`ready`. Agent/Designer may then read the projection or stream clean bytes to an
exact-capable provider after product-specific authorization; neither path
exposes a URL. Root revoke/expiry/delete + no remaining authorized binding →
bounded purge lease → private object/projection deletion → purged tombstone.

## Machine-Readable Errors

- `assistant_attachment_invalid`, `assistant_attachment_too_large`,
  `assistant_attachment_type_unsupported`,
  `assistant_attachment_type_mismatch`;
- `assistant_attachment_legacy_format`, `assistant_attachment_encrypted`,
  `assistant_attachment_macro_forbidden`,
  `assistant_attachment_external_reference_forbidden`,
  `assistant_attachment_archive_limit`;
- `assistant_attachment_malware_detected`,
  `assistant_attachment_scan_unavailable`,
  `assistant_attachment_scan_limit`;
- `assistant_attachment_extraction_unavailable`,
  `assistant_attachment_extraction_limit`,
  `assistant_attachment_projection_invalid`;
- `assistant_attachment_not_found`, `assistant_attachment_not_ready`,
  `assistant_attachment_expired`, `assistant_attachment_conflict`,
  `assistant_attachment_purge_failed`;
- `assistant_attachment_multipart_invalid`,
  `assistant_attachment_upload_interrupted`,
  `assistant_attachment_quota_exceeded`.

Routes map expected validation/policy/conflict/unavailable failures to safe
4xx/409/413/415/422/429/503 responses. They never return malware signature,
archive member name, parser exception, storage key, socket path, or driver text.

## Regression-Test Shape

- Exact positive tuple fixtures for PNG/JPEG/WebP/PDF/DOCX/XLSX/PPTX/TXT and
  both CSV MIME tuples; mutate extension, declared MIME, magic, OOXML content
  type/main part/relationships. Only name/MIME/fixed-magic mismatch rejects
  before scan; every decode/ZIP/PDF/OOXML/CSV structural case first receives a
  clean scan and then rejects inside the sandbox before extraction output.
- Negative fixtures cover OLE, macro files, encrypted PDF/OOXML, generic/nested
  ZIP, traversal, symlink, malformed central directory, huge ratio/count/depth,
  polyglot/trailing executable data, over-dimension image, page/slide/sheet/cell
  limits, invalid UTF-8/NUL/control-heavy text, and inconsistent CSV.
- ClamAV tests use a fake private Unix socket and the standard EICAR test string;
  prove infected/unavailable/timeout/oversize never reaches Tika and no TCP
  fallback is attempted.
- Tika tests inspect the pinned 3.x configuration/worker invocation, assert
  no-network/non-root/read-only/cap-drop/resource flags, enforce output/write/
  time limits, exercise real private socket framing/health, and prove malformed
  frame/nonce/length/digest/stdout/stderr cannot leak or select a local fallback.
- Store tests prove no URL API, no-follow/private permissions, random keys,
  encrypted private object settings, idempotent delete, and no Media call/event.
- Multipart tests use fragmented boundaries/headers and backpressured streams;
  prove auth/RBAC/rate/CSRF/path ownership and quota admission finish before the
  first read, declared max+1 consumes zero bytes, missing/chunked length remains
  bounded, exact max succeeds, max+1/duplicate/field/extra-part/header-limit/
  malformed/truncated/disconnect/store-error aborts once, deletes partial bytes,
  releases the slot, and never allocates a whole-body buffer or calls
  `Request.formData()`.
- Route tests cover auth/RBAC/CSRF/rate/strict multipart, Agent and Designer
  roots independently, Designer without `assistant:use`, path/body root
  confusion, cross-user/session/workspace enumeration, cross-root rebinding,
  owner status/delete, handoff-binding retention, no bytes/text/key in DTO, and
  rejected-upload quota charging.
- Crash injection at every state proves lease recovery, no clean promotion on
  ambiguity, bounded purge, orphan cleanup, and no resurrection after deletion.
- A real dedicated-compose integration starts ClamAV and Tika with no external
  worker network and exercises clean PNG/PDF/OOXML, EICAR, scanner/parser
  unavailable, timeout/crash, digest mismatch, and restart; only clean exact-
  digest projections reach `ready`.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/private-inputs/attachmentTypePolicy.test.ts \
  tests/vitest/private-inputs/attachmentProjection.test.ts \
  tests/vitest/private-inputs/privateAttachmentMultipart.test.ts
set -a && source .env && set +a && bun test \
  tests/unit/private-inputs/privateAttachmentStore.test.ts \
  tests/unit/private-inputs/clamdAttachmentScanner.test.ts \
  tests/unit/private-inputs/tikaAttachmentExtractor.test.ts \
  tests/integration/routes/privateInputAttachments.test.ts \
  tests/integration/server/privateInputAttachmentLifecycle.test.ts \
  tests/integration/server/privateInputAttachmentContainers.test.ts \
  tests/security/privateInputAttachmentIsolation.test.ts \
  tests/security/routePreBodyPolicy.security.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
docker compose -f docker/private-input-attachments/compose.yaml config
git diff --check
find core/services/privateInputs/attachments -type f -name '*.ts' -exec wc -l {} +
wc -l core/server/routes/privateInputAttachmentRoutes.ts \
  core/server/routes/privateAttachmentMultipart.ts \
  core/server/validation/privateInputAttachmentSchemas.ts \
  tests/vitest/private-inputs/{attachmentTypePolicy,attachmentProjection,privateAttachmentMultipart}.test.ts \
  tests/unit/private-inputs/{privateAttachmentStore,clamdAttachmentScanner,tikaAttachmentExtractor}.test.ts \
  tests/integration/routes/privateInputAttachments.test.ts \
  tests/integration/server/privateInputAttachmentLifecycle.test.ts \
  tests/integration/server/privateInputAttachmentContainers.test.ts \
  tests/security/privateInputAttachmentIsolation.test.ts
```

## Official Decision Notes

- ClamAV recommends local Unix sockets and documents `INSTREAM`; its TCP socket
  is unauthenticated and should not be exposed: [clamd protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html).
- Apache Tika 3.x documents out-of-process/fork mode, parse timeouts, process
  restart, JVM arguments, and maximum file size: [Tika 3.2.3 getting started](https://tika.apache.org/3.2.3/gettingstarted.html).
- Tika provides bounded text output via
  [`WriteOutContentHandler`](https://tika.apache.org/3.2.3/api/org/apache/tika/sax/WriteOutContentHandler.html)
  and zip-bomb defenses through its secure content handling APIs:
  [`SecureContentHandler`](https://tika.apache.org/3.2.1/api/org/apache/tika/sax/SecureContentHandler.html).
- PDF parser configuration warns that inline-image extraction can expand small
  files into gigabytes, supporting the explicit disabled/zero-embedded policy:
  [`PDFParserConfig`](https://tika.apache.org/3.2.3/api/org/apache/tika/parser/pdf/PDFParserConfig.html).
- Fastify's maintained streaming parser is pinned at
  [`@fastify/busboy@3.2.0`](https://www.npmjs.com/package/@fastify/busboy/v/3.2.0);
  its parser limits are defense in depth behind the repository's independent
  wire/file counters and pre-body admission, not the sole upload boundary.

Re-verify the current supported Tika 3.x patch and security advisories before
implementation; pin by digest and update deliberately. Library controls
supplement, not replace, OS/container isolation and application ceilings.

## Documentation Updates Required

Hand the private-storage, type matrix, scanner/sandbox, TTL/purge, route, and
operator deployment receipts to TASK-414-11-L01. This leaf edits no shared docs,
task board/status, migration metadata, or changelog.
