# TASK-516-05: Field Settings Control Fixes (Phone / Time / Rating / Hidden)

# FileName: TASK-516-05-Field-Settings-Control-Fixes.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Content (Forms)
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (foundation only; no shared write). Independent of
516-03/04.
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FieldSettingsPanel.tsx` and
`core/services/forms/fieldSettings.ts`.** Aligns the field inspector to the
**existing** backend behavior (no `validation.ts` change needed — the backend
already supports these; the UI was hiding/mis-exposing them). Ships:

1. **B4 — time increment.** Add `time` to `supportsStep`
   (`FieldSettingsPanel.tsx:71`) so the "Input increment" control shows for
   `time`; backend already accepts `inputStep` for `time` (`validation.ts:199`).
2. **B5 — rating controls.** Remove `rating` from `supportsNumericBounds` (or
   branch it): hide the dead **Minimum** input (backend deletes rating `min`,
   `validation.ts:240-242`) and add a dedicated **Scale (3–10)** control writing
   `settings.max` (backend clamps 3–10, `validation.ts:234-239`).
3. **B6 — hidden guard.** For `hidden`, show an inline required-value notice and
   prevent a confusing silent server reject by marking the "Trusted default
   value" as required in the UI (visual `*` + helper) — backend still enforces
   (`validation.ts:226-232`), this just surfaces it early.
4. **B1 partial — phone settings.** `phone` is added to the library by 516-03;
   confirm the panel's `supportsPlaceholder` already includes `phone`
   (`FieldSettingsPanel.tsx:58-66` — it does) and no phone-specific control is
   mis-hidden.
5. **fieldSettings.ts** — only if a new option list/label is needed (e.g. a
   rating-scale options array); keep enums/normalizers otherwise unchanged (that
   file's runtime normalizers are shared with the server — do NOT loosen them).

## Pseudocode (grounded in real code)

```tsx
const supportsStep = new Set(["number","range","time"]);            // +time (B4)
const supportsNumericBounds = new Set(["number","range"]);          // -rating (B5)
const supportsRatingScale = new Set(["rating"]);                    // NEW (B5)

// DEFINE a module-local clampInt inside FieldSettingsPanel.tsx (single-writer
// scope). Do NOT import from FormSettingsPanel.tsx — its clampInt is a private
// (non-exported) module const and no 516 subtask owns FormSettingsPanel.tsx,
// so exporting it would be an unowned cross-file write. This local copy mirrors
// the proven FormSettingsPanel.tsx:51 signature + clamp semantics exactly:
const clampInt = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

{supportsRatingScale.has(field.type) ? (
  <div className="space-y-2">
    <label>Rating scale (3–10)</label>
    <Input type="number" min={3} max={10} step={1}
      value={field.settings.max ?? 5}
      // clampInt: Number.parseInt(value,10) → integer, then clamp 3..10.
      // Non-integer/out-of-range input is coerced to a valid integer BEFORE
      // write so validation.ts:236 (Number.isInteger && 3..10) can never reject
      // a value this control produced. Pass the raw string as the first arg.
      onChange={e => onSettingsChange(field.id, { max: clampInt(e.target.value, 5, 3, 10) })} />
    <p className="text-xs text-muted-foreground">Number of points on the scale.</p>
  </div>
) : null}

// hidden default (supportsTextDefault branch :295) — mark required:
<label>Trusted default value <span className="text-destructive">*</span></label>
{isHiddenAndEmpty ? <p className="text-xs text-destructive">Hidden fields must submit a fixed value.</p> : null}
```

Error handling: purely surfaces existing backend constraints earlier; save still
goes through the validated `PUT /forms/:id/fields` path.

## Security Contract

**UI-only alignment; no route/RBAC/normalizer loosening.** `fieldSettings.ts`
runtime normalizers (`normalizeFormFieldStyle`, `normalizeFormFieldLogic`,
`evaluateFormFieldLogic`) are shared server-side and MUST NOT be weakened —
changes are additive UI option lists at most. All field writes remain gated by
`forms:write` via `PUT /forms/:id/fields` (`formsRoutes.ts:293`), normalized by
`validation.normalizeFormFields` (reject-unknown field types, per-type settings
validation). This subtask does not change what the server accepts.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/fieldSettingsPanel.test.tsx`
  (NEW/extend): `time` field shows the input-increment control (B4); `rating`
  field shows a Scale (3–10) control and NO Minimum control (B5); the Scale
  clamps to 3–10 AND coerces to an integer — assert a decimal entry (e.g. `4.5`
  via `fireEvent.change` value `"4.5"`) writes `max: 4` and an out-of-range entry
  (`"99"`) writes `max: 10`, so the value handed to `PUT /forms/:id/fields`
  always satisfies `validation.ts:236` (`Number.isInteger(max) && 3 ≤ max ≤ 10`)
  and is never silently rejected on save; `hidden` field shows the required-value notice when empty (B6);
  a `phone` field shows the Placeholder control.
- **Vitest pure** `tests/vitest/forms/fieldSettings.test.ts` (only if option
  lists change): assert any new exported option list.

## UI/UX fidelity + max-config-flexibility notes

Every field type's controls must reflect what the backend actually supports — no
dead controls (rating Minimum), no hidden-but-supported controls (time
increment, phone). Surfaces constraints proactively for a smooth authoring loop.
