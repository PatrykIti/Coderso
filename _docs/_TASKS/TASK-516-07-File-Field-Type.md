# TASK-516-07: File Field Type (attachment) — optional/heaviest, gated

# FileName: TASK-516-07-File-Field-Type.md

**Parent Task:** TASK-516
**Priority:** Medium (scoped last; may be split/deferred — see Open Questions)
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
handling in `core/services/forms/submissionService.ts`, and the submission
handler branch in `core/server/routes/formsRoutes.ts`
(`handleFormSubmissionRoute`).** Adds the `file` field type shown in the
prototype rail (`FormBuilderPreview.tsx:71`). This is the only subtask that
touches `validation.ts` (keeping single-writer for that shared file). Ships:

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

1. **Field-type registration** — add `"file"` to `FormFieldType` +
   `fieldTypes` set (`validation.ts:11-24,61-75`) with per-type settings
   (`accept` mime list, `maxSizeMb`, `multiple`) normalized in
   `normalizeSettings`.
2. **Submission handling** — decide + implement the attachment model
   (see Open Questions): reference existing media
   (`core/services/media/mediaService.ts`) so an uploaded file becomes a media
   reference stored in the submission payload as a validated id/URL, NOT raw
   bytes in `form_submissions.payload`.
3. **`validateSubmissionPayload`** — a `file` case validating the reference
   (owned media id / same-origin URL), size/mime already enforced at upload.
4. **Renderers (owned here — File-case-only, per the ownership note above).**
   Since this subtask lands LAST and is the first place `file` is a valid type, it
   adds every File render surface itself as additive `file`-only branches: the
   **File rail item** (`Paperclip` icon) in `FieldLibrary.tsx`/`FormBuilderPage.tsx`,
   the **canvas preview** `file` branch in `FormCanvas.tsx`, the **`formEmbed`
   control** (`file` input → upload), and the **runtime preview dialog control**
   in `FormRuntimePreviewDialog.tsx`. No File JSX is expected from 516-03/04/06 —
   they omit `file` entirely; 516-07 supplies it. If the timeline is tight, the
   renderer visuals may be split into a fast-follow (still owned by 516-07),
   landing the type + validation + submission wiring first — see Open Questions.

## Security Contract

**Route-touching + new upload surface — highest-scrutiny subtask.** The public
submission path (`POST /forms/:id/submissions`, unauthenticated for public forms,
`formsRoutes.ts:306`) must NOT accept arbitrary bytes. Requirements:

- Uploads go through the **existing authenticated/validated media pipeline**, not
  the public submission body; the submission payload carries only a validated
  **reference** (owned media id or same-origin URL), re-validated server-side in
  `validateSubmissionPayload` (reject cross-origin/unknown ids — mirror the
  `hidden` field's strict-equality trust model, `validation.ts:413-424`).
- Enforce `accept` (mime allowlist) + `maxSizeMb` server-side at upload; never
  trust client-declared type/size.
- Preserve existing bot-protection, submission-nonce (`submissionNonce.ts`), and
  `submissionAccess` gating unchanged; `file` fields respect field `logic`
  visibility exclusion exactly like other types.
- Unknown field type still rejected by `fieldTypes` reject-unknown; the new key
  additions to per-type settings join the allowlist ⇒ round-trip persistence test.
- No new secrets; no change to RBAC beyond reusing media upload's existing gate.

## Pseudocode (grounded in real code)

```ts
// validation.ts
export type FormFieldType = ... | "file";
const fieldTypes = new Set([... , "file"]);
// normalizeSettings: if type === "file": accept?: string[] (mime), maxSizeMb?: 1..N clamp, multiple?: bool
// validateSubmissionPayload case "file":
case "file": {
  const ref = normalizeMediaReference(value);        // owned media id / same-origin URL
  if (!ref) { if (field.required) throw new Error("form_payload_required"); break; }
  normalized[field.name] = ref;                       // reference only, never bytes
  break;
}
```

## Testing requirements + lanes

- **Bun unit** `tests/unit/forms/formsService.test.ts` /
  `tests/vitest/forms/*` (NEW): `file` field normalizes `accept`/`maxSizeMb`/
  `multiple`; unknown settings key rejected; round-trip persistence.
- **Bun route** `tests/integration/routes/forms.test.ts` +
  `tests/unit/server/publicFormsApi.test.ts` (extend): submission with a valid
  media reference succeeds; cross-origin/unknown reference rejected; required
  file enforced; oversized/wrong-mime rejected at the upload boundary. Own row
  cleanup; shared-DB safe.

## UI/UX fidelity + max-config-flexibility notes

The prototype rail shows File as a first-class field; delivering it fulfills
prototype fidelity + max flexibility. Because of the security surface it is
scoped last and may be split into "type + validation" vs. "upload UI" if the
timeline is tight — see Open Questions.
