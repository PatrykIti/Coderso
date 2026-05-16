# TASK-272-07: Hero Rich Copy and Social Proof Composition

# FileName: TASK-272-07_Hero_Rich_Copy_and_Social_Proof_Composition.md

**Priority:** Medium
**Category:** Widgets + Hero + Content Authoring + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-04, TASK-272-04
**Status:** To Do

---

## Overview

Add bounded rich-copy support and an optional social proof row to the Hero
widget.

This leaf must not store raw unsafe HTML. Reuse the existing sanitized post rich
text patterns or introduce a narrower Hero inline-rich-text normalizer with the
same fail-closed safety posture.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:217-218` - BF-04 missing rich text for
  headline/body.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:247-248` - BF-14 missing social proof
  row.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:295,299` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Add safe rich-copy fields and optional `socialProof` data. Normalize rich text through a bounded sanitizer and render it without unsafe script/event attributes. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add rich copy controls and social proof controls in Visual mode. Keep Wizard plain and beginner-safe unless a minimal toggle is explicitly needed. |
| `core/services/posts/editor/postRichTextSerializer.ts` and related sanitizer helpers | Reuse only if the dependency remains Bun-free and import-safe for widget tests; otherwise create a small Hero-owned sanitizer/helper. |
| `tests/vitest/widgets/hero.test.tsx` | Assert sanitized rich copy renders allowed inline marks/links and strips unsafe tags/attributes. Assert social proof row rendering and fallback behavior. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert rich-copy/social-proof editor controls render with stable metadata. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover toggling rich copy/social proof, editing fields, and preserving CTA/media data. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run or update if rich copy links use the shared safe-href helper. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema fields change. |
| `_docs/_WIDGETS/HERO.md` | Document allowed rich-copy marks and social proof model. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BF-04/BF-14 fixed or record evidence. |

## Implementation Pseudocode

```ts
type HeroRichText = {
  html: string;
};

type HeroSocialProof = {
  enabled?: boolean;
  rating?: string;
  reviewCount?: string;
  label?: string;
  avatars?: Array<{ src: string; alt: string }>;
};

function normalizeHeroRichText(value: unknown) {
  const sanitized = sanitizePostRichTextHtml(readString(value) ?? "");
  return sanitized || undefined;
}
```

Runtime flow:

```tsx
{normalized.richHeadline ? (
  <SafeRichText html={normalized.richHeadline} as="h1" />
) : (
  <h1>{normalized.headline}</h1>
)}

{normalized.socialProof?.enabled ? <HeroSocialProofRow value={normalized.socialProof} /> : null}
```

Error handling:

- Rich headline/body must preserve plain-text legacy fields as fallback.
- Links inside rich copy must use safe href normalization and external-link
  handling from TASK-256.
- Social proof avatars require alt text or decorative empty-alt policy, and
  missing images must not break layout.
- Limit counts/avatars to a small maximum, for example five avatars and two
  metrics, to keep the Hero compact.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new fields must stay strict and normalize legacy
  plain-text payloads.
- Anti-abuse: rich text is sanitized; links use safe href rules; avatar/media
  URLs use existing media URL policy; no raw scripts, event handlers, iframes,
  or arbitrary style/class inputs are allowed.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-07_Hero_Rich_Copy_and_Social_Proof_Composition.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Hero supports safe rich headline/body authoring without raw unsafe HTML.
- Existing plain-text Hero payloads and presets remain compatible.
- Hero supports an optional bounded social proof row.
- Rich-copy links and avatar/media output remain safe and accessible.
