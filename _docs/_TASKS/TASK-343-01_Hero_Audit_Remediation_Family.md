# TASK-343-01: Hero Audit Remediation Family

# FileName: TASK-343-01_Hero_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-342
**Status:** Done (2026-05-30)

---

## Overview

Close the three confirmed Hero defects from the 2026-05-29 deep audit:
single-CTA persistence, overlay-strength color loss, and broken background
image overlay composition outside the centered-image branch.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_HERO_WIDGET.md:181-214`
- `core/admin/ui/widgets/editors/HeroEditors.tsx:1192-1222,1293-1457,1936-2021`
- `core/widgets/core/hero.tsx:329,797,860-871,1032-1058,1174-1184`

## Sub-Tasks

- [x] Make `Single CTA` persist through save/reload without silently restoring
  `heroDefaults.secondaryCta`.
- [x] Preserve the chosen overlay color when only the overlay strength changes.
- [x] Replace invalid `background-image: rgba(...), url(...)` composition with a
  valid layered overlay strategy for background images.
- [x] Add renderer/editor regression coverage and update the report routing.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Fix CTA persistence normalization and valid background-image overlay composition. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Preserve overlay hue when strength changes and keep CTA layout state truthful. |
| `tests/vitest/widgets/hero.test.tsx` | Cover CTA persistence and background overlay render paths. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover single/dual CTA round-trip and overlay-strength color preservation. |
| `_docs/PLAYWRIGHT/28-05-2026/REPORT_HERO_WIDGET.md` | Update findings and final owner routing. |

## Implementation Pseudocode

```ts
function resolvePersistedSecondaryCta(
  rawData: Partial<HeroData>,
  editorCtaMode: "single" | "dual"
): HeroCta | undefined {
  if (editorCtaMode === "single") return undefined;
  return normalizeHeroCta(rawData.secondaryCta);
}

function updateOverlayStrength(savedColor: string | undefined, nextStrength: number): string {
  const parsed = parseSavedOverlayColor(savedColor) ?? parseHex(defaultInlineOverlayColor);
  return toRgba(parsed.rgb, nextStrength);
}

function resolveBackgroundImageLayer(input: {
  resolvedVariant: HeroVariantId;
  background: HeroBackground;
  media?: HeroMedia;
  backgroundMedia?: HeroBackgroundMedia;
}): string | undefined {
  if (!hasResolvedHeroImage(input)) return resolvePlainBackgroundImage(input.background);
  return joinLayers([
    input.background.overlay ? buildLinearGradientOverlay(input.background.overlay) : undefined,
    resolveGradientLayer(input.background),
    resolveImageUrlLayer(input),
  ]);
}
```

Do not reference a non-existing `HeroData.ctaLayout` field unless the fix
intentionally widens the schema/defaults/editor contract. The current editor
derives single/dual mode from the secondary CTA control state, so the
normalizer must preserve the raw "secondary CTA absent" state before default
merge restores `heroDefaults.secondaryCta`.

Implementation note: the shipped fix keeps the editor's existing `Single CTA`
emission (`secondaryCta` absent) and makes widget default normalization preserve
that absent key for saved non-empty Hero data.

## Regression Test Shape

- Assert `single` CTA save/reload keeps `secondaryCta` absent.
- Assert changing overlay strength preserves hue.
- Assert background-image variants with overlay render valid layered CSS and do
  not collapse to `none`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: keep the existing Hero schema strict.
- Anti-abuse: do not widen allowed URL/script inputs.
- Secret handling: none.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_HERO_WIDGET.md`.
- Update `_docs/_WIDGETS/HERO.md` if renderer/editor semantics change.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Saving `Single CTA` no longer restores a hidden secondary CTA.
- Overlay strength changes preserve the chosen color.
- Background image overlay works on non-centered variants and never wipes the
  image on fresh render.

## Completion Notes (2026-05-30)

- Added widget-definition support for preserving selected absent default keys
  on saved non-empty widget data and applied it to Hero `secondaryCta`, so
  saved single-CTA blocks do not rehydrate the default `Learn more` CTA.
- Updated `HeroOverlayField` to derive the color input value from saved RGBA
  channels, preserving hue while changing opacity.
- Converted explicit background image overlays into valid
  `linear-gradient(color, color)` background-image layers above the authored
  gradient and image URL.
- Synchronized the Hero audit report, widget docs, task board, and changelog.

## Validation Executed (2026-05-30)

- `bun test tests/unit/widgets/validator.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p` diff-fed read-only review for TASK-343-01 (no blockers; minor
  notes addressed)
