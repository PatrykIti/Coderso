# TASK-516-07: File Field Type (attachment) — optional/heaviest, gated

# FileName: TASK-516-07-File-Field-Type.md

**Parent Task:** TASK-516
**Priority:** Medium (scoped last; split decision RESOLVED — ships as one subtask,
see "Resolved design decisions" below).
**Category:** Services / Runtime / Public Widgets / Security-sensitive
**Estimated Effort:** Large
**Dependencies:** TASK-516-04 (`FormCanvas.tsx` primary owner — must ship first
so 516-07 can add the File preview branch), TASK-516-05 (field-settings controls),
TASK-516-06 (`formEmbed.tsx` + `FormRuntimePreviewDialog.tsx` primary owners — must
ship first so 516-07 can add the File controls), TASK-516-03 (`FieldLibrary.tsx` +
`FormBuilderPage.tsx` primary owners — must ship first so 516-07 can add the File
rail item). Lands LAST — see the File-case ownership note below.
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/services/forms/validation.ts`, the file-submission
handling in `core/services/forms/submissionService.ts`, the submission
handler branch + the NEW public upload route in
`core/server/routes/formsRoutes.ts` (`handleFormSubmissionRoute` +
`handleFormAttachmentUploadRoute`), and a NEW 516-07-owned helper module
`core/services/forms/formAttachment.ts` (NEW).** Adds the `file` field type shown
in the prototype rail (`FormBuilderPreview.tsx:71` — live-verified: a `Paperclip`
rail item labelled "File"). This is the only subtask that touches `validation.ts`
(keeping single-writer for that shared file).

**Additive single-writer edit to `core/services/media/mediaService.ts`
(`uploadMedia` signature only).** 516-07 adds an OPTIONAL `constraints?` parameter
to `uploadMedia` (`mediaService.ts:116`) so field-level `accept`/`maxSizeMb` can
tighten the effective mime allowlist / size cap at upload. The edit is strictly
additive (existing callers pass nothing ⇒ unchanged global-config behavior) and
is a documented single-writer exception like the File-case UI seam below; no other
subtask writes `mediaService.ts`.

**Additive single-writer edit to `core/services/media/mediaUsageService.ts`
(`listMediaUsage` scan branch + `MediaUsageTargetType`).** 516-07 adds a
`"submission"` variant to `MediaUsageTargetType` (`mediaUsageService.ts:13`) and a
`form_submissions` scan branch to `listMediaUsage` (`mediaUsageService.ts:45`) so
media referenced by a form-submission payload is surfaced in the admin media-usage
panel (see ship item 2 for why this is required, not optional). The edit is strictly
additive (a new per-family loop + one union-type member; existing branches and
callers unchanged) and no other subtask writes `mediaUsageService.ts`.

Ships:

**File-case UI ownership (documented single-writer exception).** Because the
`file` type is not a valid `FormFieldType` until this subtask lands, no earlier
subtask can reference it type-safely. Therefore **516-07 is the concrete owner of
every File render surface** and makes bounded, **additive `file`-case-only** edits
to files whose primary owner has already shipped (516-07 lands LAST):
`FieldLibrary.tsx` / `FormBuilderPage.tsx` (the File rail item — 516-03 does NOT
add it), `FormCanvas.tsx` (the File preview branch), `formEmbed.tsx` (the File
upload control), and `FormRuntimePreviewDialog.tsx` (the File preview control).
These edits add ONLY the `file` branch and must not touch any non-file code in
those files. This is the single documented multi-writer seam in TASK-516; it is
safe because it is strictly additive and lands after all primary owners.

1. **Field-type registration** — add `"file"` to `FormFieldType`
   (`validation.ts:11-24`) + `fieldTypes` set (`validation.ts:61-75`), and add
   `accept?: string[]`, `maxSizeMb?: number`, `multiple?: boolean` to
   `FormFieldSettings` (`validation.ts:26-39`). Normalize them in the settings
   normalizer (reject-unknown at the boundary): `accept` = deduped lowercase
   mime tokens matching `/^[a-z0-9.+-]+\/[a-z0-9.*+-]+$/`, `maxSizeMb` = clamp
   `1..100` (a static sanity bound — the normalizer is SYNC and cannot read the
   async media `getConfig` cap; the TRUE global cap is enforced at upload via
   `uploadMedia`, which takes `min(field, global)`), `multiple` = boolean. These
   three keys JOIN the settings allowlist ⇒ round-trip persistence
   + present-only byte-identity tests (see Testing).
2. **Attachment model (RESOLVED — reference existing media, no DDL, no raw
   bytes).** An uploaded file becomes a row in the existing `media` table via the
   existing `mediaService.uploadMedia` pipeline (`mediaService.ts:116`); the
   submission payload stores ONLY the owned media **id** (or `string[]` of ids for
   `multiple`) in `form_submissions.payload` (jsonb, `schema.ts:1288`). No new
   table, no `bytea`, no base64. (Because we store a bare id, no schema change is
   needed; the parent's "only DDL candidate" note is resolved to NO DDL.)

   **Usage-scan consistency — REQUIRES a media-usage extension (do NOT assume it is
   free).** `containsMediaReference` (`mediaReferenceMatcher.ts:16`) CAN match a
   bare id nested in a jsonb object (it recurses object entries and matches
   `value === mediaId`), BUT the media-usage SCAN `listMediaUsage`
   (`mediaUsageService.ts:45`) only enumerates `pages`/`contentEntries`/`posts`/
   `commerceProducts` — it NEVER queries `form_submissions`, and
   `MediaUsageTargetType` (`mediaUsageService.ts:13`) has no form/submission
   variant. `deleteMedia` (`mediaService.ts:267`) has NO in-use guard for ANY media
   type (it deletes unconditionally). So without a change, a media row referenced
   only by a submission payload reports 0 usages in the admin usage panel — the
   admin cannot see the reference before deleting, orphaning the stored id. To make
   the "reference existing media" model actually consistent, **516-07 makes an
   additive single-writer edit to `mediaUsageService.ts`** (see Scope + Pseudocode):
   extend `MediaUsageTargetType` with a `"submission"` variant and add a
   `form_submissions` scan branch that runs `containsMediaReference(row.payload, id)`
   over `form_submissions.payload`, mirroring the existing per-family loops (same
   `pushUsage`/`seen` dedupe, same `limitPerFamily` clamp, `adminHref` to the form's
   submissions view). This surfaces form attachments in the usage panel exactly like
   pages/entries/posts/commerce. (Note: `deleteMedia` remains guard-free for all
   types — matching current behavior; this subtask only fixes usage VISIBILITY, it
   does not add a hard delete block, which would be an out-of-scope cross-cutting
   change to every media type.) Regression test: a submission payload holding a
   media id makes `listMediaUsage(id)` return a `"submission"` entry (see Testing).
3. **`validateSubmissionPayload` `file` case (structural, sync).** Structurally
   normalize the value to an owned-media-**id reference** via `normalizeMediaReference`
   (defined in Pseudocode): present-but-malformed (not a well-formed id / not an
   array of ids for `multiple`) ⇒ **throw `form_payload_invalid`** (mirrors the
   `hidden` strict-reject at `validation.ts:413-424`); absent handled by the
   pre-switch guard (`validation.ts:340`). NO DB call here (keeps the function
   sync — see the async-ripple note in Pseudocode).
4. **DB-backed reference resolution + constraint re-check (submissionService,
   async).** After `validateSubmissionPayload`, `submitForm`
   (`submissionService.ts:29-45`, 516-07-owned file handling) resolves each stored
   id via `getMediaById` (`mediaService.ts:164`): missing/unknown id ⇒ throw
   `form_payload_invalid` (reject cross-origin/unknown per Security Contract);
   then re-check the resolved row's `mimeType` against the field's `accept` and
   `size` against `maxSizeMb` ⇒ throw `form_payload_invalid` on violation. This is
   the security backstop that does not trust the upload path.
5. **Public nonce-gated upload endpoint (RESOLVED anonymous-upload path).** NEW
   `POST /forms/:id/uploads` in `formsRoutes.ts` (`handleFormAttachmentUploadRoute`)
   — see Security Contract for full auth/nonce gating. It reuses the SAME access
   gate as the submission route, enforces `accept`/`maxSizeMb` server-side by
   passing the field's constraints to `uploadMedia`, and returns only
   `{ id, url, mimeType, size }` (a reference the client submits back).
6. **Renderers (owned here — File-case-only, per the ownership note above; ships
   in THIS subtask, NOT deferred).** Since this subtask lands LAST and is the first
   place `file` is a valid type, it adds every File render surface itself as
   additive `file`-only branches: the **File rail item** (`Paperclip` icon) in
   `FieldLibrary.tsx`/`FormBuilderPage.tsx`, the **canvas preview** `file` branch in
   `FormCanvas.tsx`, the **`formEmbed` control** (`file` input → calls the upload
   endpoint, submits the returned id), and the **runtime preview dialog control**
   in `FormRuntimePreviewDialog.tsx`. No File JSX is expected from 516-03/04/06 —
   they omit `file` entirely; 516-07 supplies it. The split-into-fast-follow option
   is REJECTED (see Resolved design decisions): type + validation + upload + renderers
   ship together so the field is never a half-wired dead type.

## Security Contract

**Route-touching + new upload surface — highest-scrutiny subtask.** The public
submission path (`POST /forms/:id/submissions`, unauthenticated for public forms,
`formsRoutes.ts:306`) must NOT accept arbitrary bytes. The core tension: the
submission route is PUBLIC (no `requirePermission`), while the media endpoint
requires `media:write` (`mediaRoutes.ts:111`), so an anonymous submitter cannot use
`POST /media`. This is RESOLVED by a dedicated nonce-gated public upload route that
reuses `mediaService` enforcement WITHOUT granting `media:write`.

**Anonymous-upload path (RESOLVED) — `POST /forms/:id/uploads`
(`handleFormAttachmentUploadRoute`, NEW in `formsRoutes.ts`).**

- **NO `requirePermission("media:write")`.** It is registered as a public route
  (like the submission route) and gates access with the EXACT same primitives the
  submission route already uses (`formsRoutes.ts:175-204`), in this order:
  1. Load the form (`getForm`); 404 if missing.
  2. `normalizeSubmissionAccess(form.submissionAccess, "public")` +
     `evaluateSubmissionAccess(...)`. For `internal` forms it enforces the same
     auth/api-key gate (and `requirePermission("forms:write")` for a logged-in
     admin) as the submission route — so File uploads on internal forms are NOT
     anonymous.
  3. For public forms where `access.requireCaptcha`, require and verify the
     runtime-issued submission nonce via
     `assertFormSubmissionNonce(form.id, body.formNonce)` (HMAC-signed,
     10-min TTL, `submissionNonce.ts:41`) AND run
     `enforceBotProtection({ action: "public_write", ip, ... })` — identical to
     `formsRoutes.ts:195-203`. The same nonce the form runtime already emits
     (`formRuntimeResolver.ts:63`) authorizes both the upload and the later
     submission; no new secret and no new nonce type is introduced.
- **Field-scoped constraint enforcement (RESOLVED mechanism).** The request body
  carries the target `fieldName`; the handler looks it up in the form's normalized
  fields, asserts `field.type === "file"`, and passes the field's resolved
  `{ accept, maxSizeMb }` into `uploadMedia(file, meta, userId, { allowedMime,
  maxSizeBytes })` (the additive `constraints` param). `uploadMedia` applies the
  effective caps = INTERSECTION of the field allowlist with the global
  `allowedMime`, and effective size = `min(field maxSizeMb, global maxSizeBytes)`,
  then throws the existing `media_file_too_large` / `media_mime_not_allowed`
  (`mediaService.ts:122-128`). This plumbs the per-field settings that the global
  config alone does not enforce; without it the `accept`/`maxSizeMb` controls
  would be cosmetic.
- **Response = reference only.** Returns `{ id, url, mimeType, size }`; the client
  submits the `id` back in the submission payload. Bytes never transit the
  submission body.
- **Double enforcement (defense-in-depth).** Even a reference that skipped the
  upload route is re-validated at submission: `submitForm` resolves the id via
  `getMediaById` (unknown ⇒ `form_payload_invalid`) and RE-checks the resolved
  row's `mimeType`/`size` against the field `accept`/`maxSizeMb` (see ship item 4).
  So per-field limits hold even if the upload path is bypassed.
- Preserve existing bot-protection, submission-nonce (`submissionNonce.ts`), and
  `submissionAccess` gating unchanged; `file` fields respect field `logic`
  visibility exclusion exactly like other types.
- Unknown field type still rejected by `fieldTypes` reject-unknown; the new
  `accept`/`maxSizeMb`/`multiple` settings keys join the allowlist ⇒ round-trip
  persistence test.
- No new secrets; no change to RBAC — the upload route deliberately does NOT reuse
  `media:write` (which anonymous submitters lack) and instead reuses the form's
  own public submission gate + nonce.

## Pseudocode (grounded in real code)

```ts
// ── validation.ts (516-07 sole writer) ───────────────────────────────────────
export type FormFieldType = ... | "file";
const fieldTypes = new Set<FormFieldType>([... , "file"]);
// FormFieldSettings += accept?: string[]; maxSizeMb?: number; multiple?: boolean;

// settings normalizer (reject-unknown boundary; only file fields keep these):
// accept    → dedupe lowercase tokens matching /^[a-z0-9.+-]+\/[a-z0-9.*+-]+$/ (drop bad)
// maxSizeMb → clamp(Math.round(n), 1, 100)  // static bound; true global cap enforced at upload
// multiple  → Boolean(n)

// normalizeMediaReference — SYNC, STRUCTURAL ONLY (no DB). Discriminates an
// owned-media-ID reference from anything else. It does NOT accept raw bytes and,
// to avoid cross-origin/SSRF ambiguity, does NOT accept bare URLs: the canonical
// stored reference is the media ROW id (the upload route returns { id }). Returns
// the normalized reference, or null for "present but malformed" (caller throws).
type MediaRef = string | string[];
const MEDIA_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // media.id is uuid
function extractOneId(entry: unknown): string | null {
  // accept "<uuid>" OR { id: "<uuid>" } (the upload response shape)
  const raw = typeof entry === "object" && entry
    ? normalizeString((entry as { id?: unknown }).id)
    : normalizeString(entry);
  return raw && MEDIA_ID_RE.test(raw) ? raw : null;
}
function normalizeMediaReference(value: unknown, settings: FormFieldSettings): MediaRef | null {
  if (settings.multiple === true) {
    if (!Array.isArray(value)) return null;          // present-but-malformed
    const ids: string[] = [];
    for (const entry of value) {
      const id = extractOneId(entry);
      if (!id) return null;                          // ANY bad entry ⇒ reject whole payload
      ids.push(id);
    }
    return ids.length ? ids : null;                  // [] treated as "no value" upstream
  }
  return extractOneId(value);                        // single id or null
}

// validateSubmissionPayload case "file":  (value is PRESENT & non-empty here —
// undefined/null/"" already handled by the pre-switch guard at validation.ts:340)
case "file": {
  const ref = normalizeMediaReference(value, field.settings);
  if (!ref) {
    // PRESENT-but-invalid must REJECT (not silently drop), mirroring the
    // hidden case's strict reject at validation.ts:413-424:
    throw new Error("form_payload_invalid");
  }
  normalized[field.name] = ref;                      // owned media id(s) — never bytes
  break;
}
```

> **Async ripple (execution-readiness):** the DB existence + mime/size re-check is
> deliberately NOT in `validateSubmissionPayload` so that function stays SYNC (all
> other cases are sync and it has many callers). The `await getMediaById(...)` work
> lives in `submitForm` (already `async`), which 516-07 owns for file handling.

```ts
// ── submissionService.ts (516-07 owns file handling) ─────────────────────────
export async function submitForm(formId, payload, meta) {
  const form = await getForm(formId);
  if (!form) throw new Error("form_not_found");
  const fields = await listFormFields(formId);            // real path (submissionService.ts:37)
  const normalizedFields = fields.map(toFieldRecord);     // NormalizedFormField[]
  const normalizedPayload = validateSubmissionPayload(payload, normalizedFields); // sync, structural
  // NEW: resolve + verify every file reference against the media table
  await verifyFileReferences(normalizedFields, normalizedPayload);  // formAttachment.ts (below)
  // ...existing insert of normalizedPayload into form_submissions.payload...
}

// ── formAttachment.ts (NEW, 516-07-owned) ────────────────────────────────────
// Houses the DB-backed backstop + the mime matcher, keeping submissionService lean.
export function mimeMatchesAccept(mime: string, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;                 // no field restriction
  const m = mime.toLowerCase();
  return accept.some((a) => a === m || (a.endsWith("/*") && m.startsWith(a.slice(0, -1))));
}
export async function verifyFileReferences(
  fields: NormalizedFormField[], payload: Record<string, unknown>,
): Promise<void> {
  for (const field of fields) {
    if (field.type !== "file") continue;
    const value = payload[field.name];
    if (value === undefined) continue;               // optional & absent
    const ids = Array.isArray(value) ? (value as string[]) : [value as string];
    for (const id of ids) {
      const row = await getMediaById(id);            // mediaService.ts:164
      if (!row) throw new Error("form_payload_invalid");           // unknown/cross-origin
      if (!mimeMatchesAccept(row.mimeType, field.settings.accept)) // backstop
        throw new Error("form_payload_invalid");
      if (field.settings.maxSizeMb && row.size > field.settings.maxSizeMb * 1024 * 1024)
        throw new Error("form_payload_invalid");
    }
  }
}
```

```ts
// ── mediaService.ts (516-07 ADDITIVE edit: optional constraints param only) ──
export async function uploadMedia(
  file: UploadFile, meta: MediaMeta, userId?: string,
  constraints?: { allowedMime?: string[]; maxSizeBytes?: number },   // NEW, optional
) {
  const config = await getConfig();
  const allowedMime = constraints?.allowedMime
    ? config.allowedMime.filter((m) => constraints.allowedMime!.includes(m)) // intersection
    : config.allowedMime;
  const maxSizeBytes = Math.min(config.maxSizeBytes, constraints?.maxSizeBytes ?? Infinity);
  // ...existing body, but check against {maxSizeBytes, allowedMime} above instead of raw config
  //    (throws media_file_too_large / media_mime_not_allowed exactly as today, ts:122-128)
}
```

```ts
// ── mediaUsageService.ts (516-07 ADDITIVE edit: new "submission" scan branch) ─
// Makes ship-item-2's "usage stays consistent" guarantee actually hold: a media id
// stored in a form_submissions.payload is now surfaced in the admin usage panel,
// mirroring the existing pages/entries/posts/commerce loops (same seen/limit dedupe).
export type MediaUsageTargetType = "page" | "entry" | "post" | "commerce" | "submission"; // += submission

// inside listMediaUsage(), AFTER the commerceProducts loop, BEFORE `return result;`:
// (add `formSubmissions, forms` to the schema import at mediaUsageService.ts:4-10)
const submissionRows = await db
  .select({
    id: formSubmissions.id,        // schema.ts:1281 (payload jsonb @ :1288, formId @ :1285)
    formId: formSubmissions.formId,
    payload: formSubmissions.payload,
    formName: forms.name,          // forms.name @ schema.ts (title for the usage row)
  })
  .from(formSubmissions)
  .leftJoin(forms, eq(formSubmissions.formId, forms.id));

for (const submission of submissionRows) {
  if (result.filter((usage) => usage.type === "submission").length >= limit) break;
  if (!containsMediaReference(submission.payload, mediaId)) continue; // matcher already recurses jsonb
  pushUsage(result, seen, {
    id: `submission:${submission.id}`,
    type: "submission",
    title: submission.formName ?? "Form submission",
    context: "Form submission attachment",
    targetId: submission.id,
    targetSlug: null,
    // no per-submission detail page; link to the parent form's submissions view
    // (real admin route: FormBuilderPage.tsx:680 / FormListPage.tsx:163):
    adminHref: `/advanced/forms/${encodeURIComponent(submission.formId)}/submissions`,
  });
}
// NOTE: deleteMedia (mediaService.ts:267) still has NO in-use guard for any media
// type — this branch only makes the reference VISIBLE in the usage panel; it does
// not add a delete block (that would be a cross-cutting change out of 516-07 scope).
```

```ts
// ── formsRoutes.ts (516-07 owns this NEW route) ──────────────────────────────
// PUBLIC — no requirePermission("media:write"); gated by the form's own access + nonce.
router.post("/forms/:id/uploads", async (ctx) =>
  handleFormAttachmentUploadRoute(ctx, { requirePermission, validate }));

async function handleFormAttachmentUploadRoute(ctx, { requirePermission, validate }) {
  validate(formAttachmentUploadSchema, ctx.body);         // { fieldName, file, formNonce?, captchaToken? }
  const form = await getForm(ctx.params.id);
  if (!form) throw new ApiError("form_not_found", "Form not found.", 404);

  // SAME access gate as the submission route (formsRoutes.ts:175-193):
  const accessMode = normalizeSubmissionAccess(form.submissionAccess, "public");
  const apiKey = accessMode === "internal"
    ? await authenticateApiKey(ctx.headers?.authorization ?? null) : null;
  const access = evaluateSubmissionAccess({
    mode: accessMode, isAuthenticated: Boolean(ctx.user), apiKeyScopes: apiKey?.scopes });
  if (!access.allow) throw new ApiError(
    access.reason === "forbidden" ? "forbidden" : "auth_required",
    access.reason === "forbidden" ? "Forbidden" : "Not authenticated",
    access.reason === "forbidden" ? 403 : 401);
  if (accessMode === "internal" && ctx.user) await requirePermission("forms:write")(ctx);
  if (access.requireCaptcha) {
    assertFormSubmissionNonce(form.id, ctx.body.formNonce);                 // submissionNonce.ts:41
    const security = await getSecuritySettings();
    await enforceBotProtection({ token: ctx.body.captchaToken,
      action: "public_write", ip: ctx.ip, settings: security.botProtection });
  }

  // Field-scoped constraint enforcement (fields load like submissionService.ts:37-38):
  const normalizedFields = (await listFormFields(form.id)).map(toFieldRecord);
  const field = normalizedFields.find((f) => f.name === ctx.body.fieldName);
  if (!field || field.type !== "file") throw new ApiError("form_field_invalid", "Invalid field", 400);
  const row = await uploadMedia(ctx.body.file, {}, ctx.user?.id, {
    allowedMime: field.settings.accept,                     // undefined ⇒ global only
    maxSizeBytes: field.settings.maxSizeMb ? field.settings.maxSizeMb * 1024 * 1024 : undefined,
  }); // throws media_file_too_large / media_mime_not_allowed (mapped to 400)
  return { id: row.id, url: row.url, mimeType: row.mimeType, size: row.size }; // reference only
}
```

## Testing requirements + lanes

- **Vitest, Bun-free pure** `tests/vitest/forms/*` (NEW): `file` field normalizes
  `accept` (drops malformed mime tokens) / `maxSizeMb` (clamps `1..global cap`) /
  `multiple`; unknown settings key rejected; round-trip persistence +
  present-only byte-identity for a no-`file`-key form.
  `normalizeMediaReference` unit table: valid uuid → id; `{ id }` object → id;
  malformed string → null; `multiple:true` array of uuids → `string[]`; array with
  one bad entry → null; bare URL → null; raw bytes/base64 → null.
- **Vitest** `validateSubmissionPayload` (pure): present-but-malformed `file`
  value THROWS `form_payload_invalid` (NOT silently dropped); absent optional
  file skipped; valid id stored as reference.
- **Bun route** `tests/integration/routes/forms.test.ts` +
  `tests/unit/server/publicFormsApi.test.ts` (extend): (a) submission with a valid
  owned media id succeeds; (b) unknown/cross-origin id rejected
  (`form_payload_invalid`) even without going through the upload route; (c)
  required file enforced; (d) resolved row whose mime/size violates the field
  `accept`/`maxSizeMb` rejected at submission (backstop). Own row cleanup;
  shared-DB safe.
- **Bun route** `POST /forms/:id/uploads` (NEW): public form + valid nonce +
  allowed mime/size → returns `{ id, url, mimeType, size }`; missing/expired nonce
  → `form_nonce_required`/`form_nonce_expired`; oversized/wrong-mime → 400
  (`media_file_too_large`/`media_mime_not_allowed`, field-scoped, tighter than
  global); `internal` form without auth → 401/403; unknown/non-file `fieldName` →
  `form_field_invalid`. Create + clean up own form + media rows.
- **Bun unit** `uploadMedia` constraints: field `allowedMime`/`maxSizeBytes`
  intersect/min with global config (tighter, never looser).
- **Bun DB** `listMediaUsage` submission branch (NEW, `mediaUsageService`): insert a
  `form_submissions` row whose `payload` holds a media id (single id and, separately,
  inside a `string[]`), then assert `listMediaUsage(id)` returns a `type:"submission"`
  entry with `adminHref` = `/advanced/forms/<formId>/submissions`; a submission that
  does NOT reference the id yields no entry; `limitPerFamily` clamps the submission
  family like the others. Create + clean up own form/submission/media rows;
  shared-DB safe.

## UI/UX fidelity + max-config-flexibility notes

The prototype rail shows File as a first-class field (live-verified at
`http://localhost:5180/#/advanced/forms/sample`: a `Paperclip` rail item labelled
"File", between "Date" and "Phone"; the prototype canvas is a static mock and
renders no File control, so the canvas preview + inspector controls are 516-07's
functional extension). Delivering it fulfills prototype fidelity + max flexibility.
Because of the security surface it is scoped last, but it is NOT split — see
Resolved design decisions.

## Resolved design decisions

These formerly-deferred decisions are RESOLVED here (the parent task has no
"Open Questions" section; per the contract bar, keystone decisions are resolved
inline rather than dangling):

1. **Attachment model → reference existing media, NO DDL.** Uploads become rows in
   the existing `media` table; the submission payload stores only the owned media
   `id` (or `string[]` for `multiple`). No new table, no bytea/base64, no schema
   migration. Resolves the parent's "only DDL candidate" note to NO DDL. To keep
   the reference model consistent, 516-07 also extends `mediaUsageService`
   (`"submission"` variant + `form_submissions` scan branch) so attachments are
   surfaced in the admin media-usage panel — WITHOUT this the scan would report 0
   usages for submission-only media (see ship item 2; `deleteMedia` stays guard-free
   for all types, so this fixes usage VISIBILITY only, not a hard delete block).
2. **Anonymous-upload path → nonce-gated public route `POST /forms/:id/uploads`.**
   It does NOT require `media:write` (anonymous submitters lack it); it reuses the
   form's own public submission access gate + the runtime-issued submission nonce +
   bot-protection, and reuses `mediaService.uploadMedia` for mime/size enforcement.
   Internal-access forms require auth exactly like the submission route. Full shape
   in the Security Contract + Pseudocode.
3. **Per-field enforcement → constraints plumbed into `uploadMedia` + re-checked at
   submission.** Field `accept`/`maxSizeMb` tighten (intersect/min) the global media
   config at upload, and the resolved media row's mime/size is re-validated in
   `submitForm` (defense-in-depth). The controls are functional, not cosmetic.
4. **Split/defer → REJECTED.** Type + settings + validation + upload endpoint +
   all render surfaces ship together in this one subtask, so `file` is never a
   half-wired dead type. Priority stays Medium and it lands LAST.
