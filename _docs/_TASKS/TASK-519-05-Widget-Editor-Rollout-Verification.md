# TASK-519-05: Widget-Editor Rollout Verification (27 Editors, 5 Clusters)

# FileName: TASK-519-05-Widget-Editor-Rollout-Verification.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Admin UI / Widget Editors / Verification / Security (per-widget normalize)
**Estimated Effort:** Medium
**Dependencies:** 519-03 (upgraded `SharedColorControl` + `ClearableFields`). No route/RBAC/migration change.
**Status:** ✅ Done

---

## Scope (verification-first; single-writer where a fix/widening is needed)

The 27 widget editors that consume `SharedColorControl` inherit alpha authoring
AUTOMATICALLY from the 519-03 upgrade. This subtask VERIFIES, per editor, that an
authored alpha color (`#0812209e`, `rgba(8,17,31,.84)`) (a) round-trips in the control
and (b) persists **schema-valid** through THAT widget's server normalize — and PREFERS
**no schema widening**. It is split into 5 leaf clusters so no leaf carries the whole
set (single-writer applies per owned editor file when a fix is required).

**Verified baseline (why NONE is expected):** widget color props route through
`resolveClearableCssColorValue` / `resolveClearableStyleValue`
(`core/widgets/core/clearableStyle.ts:66`; e.g. `navigation.tsx:15-16`).
`resolveClearableCssColorValue` accepts 8-digit hex / `rgb[a]`-with-alpha / `hsl[a]` /
`var(--color-*)` (patterns :15-19); `resolveClearableStyleValue` is trim/non-empty
passthrough (stores any string). Either way an authored alpha value persists. Any editor
whose OWN widget normalizer is stricter (a bespoke hex-only regex dropping alpha) is the
ONLY case needing a present-only widening + round-trip test — named in its cluster leaf.

**Leaf clusters (27 editors; single-writer per owned file when fixed):**

| Leaf | Cluster | Editor files (in `core/admin/ui/widgets/editors/`) + widget normalizer to check (`core/widgets/core/`) |
|------|---------|----------------------------------------------------------------------------------------------------------|
| 519-05-L01 | Commerce / booking (7) | `ProductTableEditors.tsx`, `ProductCompareEditors.tsx`, `ProductGalleryEditors.tsx`, `PricingPlansEditors.tsx`, `CompareTimelineEditors.tsx`, `BookingCalendarEditors.tsx`, `AppointmentFormEditors.tsx` → `productCompare.tsx`, `bookingCalendar.tsx`, etc. |
| 519-05-L02 | Content / listing (6) | `ContentListEditors.tsx`, `ListingFiltersEditors.tsx`, `PostsFeedEditors.tsx`, `EntryTeaserEditors.tsx`, `SearchBoxEditors.tsx`, `RichTextSectionEditors.tsx` → `listingFilters.tsx`, etc. |
| 519-05-L03 | Layout / structure (6) | `GridColumnsEditors.tsx`, `DividerEditors.tsx`, `TabsEditors.tsx`, `AccordionEditors.tsx`, `ToggleBlockEditors.tsx`, `FeatureGridEditors.tsx` → `tabs.tsx`, `faqAccordion.tsx`, etc. |
| 519-05-L04 | Nav / footer / forms (5) | `NavigationEditors.tsx`, `FooterEditors.tsx`, `FormEmbedEditors.tsx`, `NewsletterEditors.tsx`, `LogoCloudEditors.tsx` → `navigation.tsx`, `newsletter.tsx`, `logoCloud.tsx`, etc. |
| 519-05-L05 | Social proof (3) | `TeamEditors.tsx`, `TestimonialsEditors.tsx`, `TimelineEditors.tsx` |

**Land order:** after 519-03; L01–L05 independent (disjoint file sets).

## Per-editor verification procedure (every leaf follows this)

For each editor file + its widget module:
1. `grep -an "SharedColorControl" <editor>` — list the color-control sites + props.
   Confirm no site passes an `onChange`/`onSwatchChange` that re-narrows the value or a
   hex-only wrapper. rg reads large TSX as binary — use `grep -an`/`Read`.
2. `grep -an "resolveClearableCssColorValue\|resolveClearableStyleValue\|Color\|hex\|rgba" core/widgets/core/<widget>.tsx`
   — confirm each color prop normalizes via a helper that accepts alpha
   (`resolveClearableCssColorValue`) or passes through (`resolveClearableStyleValue`). If
   a bespoke hex-only normalize is found → that is a WIDENING candidate (record it).
3. LIVE (page editor, place the widget): author `#0812209e` + `rgba(8,17,31,.84)` on
   each color control → swatch preview shows alpha, opacity slider reflects it → save the
   page region (PATCH) → reopen → value round-trips → publish → front render shows the
   alpha (computed `background-color`/`color` has the expected opacity).

## Widening exception protocol (expected: NONE)

If step 2/3 shows an editor's persisted alpha value is DROPPED by its widget normalizer:
- Make the normalizer accept the alpha format **present-only** (route the prop through
  `resolveClearableCssColorValue` instead of a hex-only regex) — an ADDITIVE change in
  that widget file (that widget module becomes a single-writer target of the cluster
  leaf), legacy docs stay byte-identical, and ship a round-trip test in the widget's
  existing normalize test lane. Name the editor + widget in the leaf.

## Security

Per-widget normalize is the write boundary; render is `resolveClearableCssColorValue`.
Neither is weakened — a widening only makes a stricter-than-baseline widget MATCH the
baseline whitelist (still rejects `url(`/`expression(`/`;{}<>`). No route/RBAC/migration.

## Tests

Each cluster leaf: for any widget it widens, a round-trip test in that widget's
normalize test lane (Vitest widgets, e.g. alongside
`tests/vitest/widgets/clearableStyle.test.ts`). For the no-widening editors, the
authoring round-trip is proven by the 519-03 control tests + the parent Playwright smoke
(scenario 2/5) — no per-editor unit test needed (avoid 27 redundant tests). Record the
verification result (round-trips: yes; widened: none/named) in each leaf.

## Acceptance

All 27 editors author + round-trip alpha (live-verified), each persisting schema-valid;
count of editors requiring widening reported (expected 0; any exception named +
round-trip-tested); gates green.
