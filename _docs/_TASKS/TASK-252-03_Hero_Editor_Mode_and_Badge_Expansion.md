# TASK-252-03: Hero Editor Mode and Badge Expansion

# FileName: TASK-252-03_Hero_Editor_Mode_and_Badge_Expansion.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Refactor the Hero editor around the final TASK-252 mode structure and add an
optional badge/announcement surface.

Hero is already the most flexible Pages widget. The missing product capability
is a badge/eyebrow/announcement element commonly used above the headline. The
editor also needs better grouping so its flexibility feels intentional rather
than dense.

## Business Requirements

- Keep one `hero` widget type.
- Add an optional badge surface above or near the headline:
  - label text;
  - optional icon/text prefix;
  - optional link/href;
  - visual tone/style;
  - placement compatible with centered, split, and media-left variants.
- Keep existing Hero content, CTA, media, background, typography, color, border,
  preset, and responsive payloads backward compatible. New background media,
  overlay, and motion controls are not part of this umbrella unless a later
  Adapt leaf promotes them with schema/default/editor/runtime/test ownership.
- Reorganize the Hero editor using TASK-252-01 shared IA:
  - `Wizard`: goal, hero layout, headline/subhead, CTA count, primary media.
  - `Visual`: Variant and presets; Badge and headline; CTA; Media; Surface;
    Typography; Colors and borders.
  - `Advanced`: layout width, spacing, responsive media behavior, raw technical
    diagnostics only if needed.
- Preserve Hero presets stored in `widgets.hero.presets`. Presets must include
  badge data after the model is added, but old presets must still apply.
- Ensure href validation remains user-safe: relative URLs or full URLs only.
- Do not add a production fallback only for tests; update schema/defaults/
  normalizer/rendering consistently.

## Sub-Tasks

This parent is now executed through physical per-widget leaves. Do not implement this parent as one broad batch; complete the leaves below in dependency order.

- [ ] TASK-252-03-01: Hero Badge Announcement and Editor IA

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/services/userSettingsClient.ts` only if preset type changes are
  required.
- `core/widgets/types.ts` only if shared editor metadata/capabilities are
  extended by TASK-252-01.
- `tests/vitest/widgets/hero.test.tsx`
- `tests/vitest/widgets/heroEditors.test.tsx`
- `tests/vitest/ui/hero-editor-wave.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token behavior changes.
- `_docs/_WIDGETS/HERO.md`
- `_docs/WIDGETS.md`

## Implementation Pseudocode

Add schema-first badge data in `hero.tsx`.

```ts
type HeroBadge = {
  enabled?: boolean;
  label: string;
  href?: string;
  icon?: string;
  tone?: "neutral" | "primary" | "success" | "warning";
  placement?: "above-headline" | "inline-headline";
};

type HeroData = {
  badge?: HeroBadge;
  // existing fields stay unchanged
};

function normalizeHeroBadge(value: unknown): HeroBadge | undefined {
  if (!isRecord(value)) return undefined;
  const label = readTrimmedString(value.label);
  if (!label) return undefined;
  return {
    enabled: value.enabled !== false,
    label,
    href: normalizeHeroBadgeHref(value.href),
    icon: readTrimmedString(value.icon),
    tone: normalizeBadgeTone(value.tone),
    placement: normalizeBadgePlacement(value.placement),
  };
}
```

Render badge through explicit safe text/link output.

```tsx
const badge = normalizeHeroBadge(data.badge);
{badge?.enabled ? (
  badge.href ? <a href={badge.href}>{badge.label}</a> : <span>{badge.label}</span>
) : null}
```

Refactor `HeroVisualEditor` sections to shared editor primitives and add stable
control metadata:

```tsx
<WidgetEditorSection id="badge-headline" title="Badge and headline">
  <WidgetControlRow id="hero-badge-label" label="Badge label">
    <Input value={badge.label} onChange={handleControlChange} />
  </WidgetControlRow>
</WidgetEditorSection>
```

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered Hero output is public.
- Auth model:
  - no new endpoint;
  - existing page/template save calls remain authenticated admin writes.
- RBAC:
  - unchanged page/template write permissions.
- CSRF:
  - unchanged admin CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - Hero schema must accept only known badge fields and normalize legacy/missing
    badge payloads safely.
- Anti-abuse:
  - badge label/icon are text, not raw HTML;
  - badge href must pass the existing safe href pattern;
  - no public write surface, nonce/HMAC/reCAPTCHA not applicable.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if Hero slot
  or renderer output changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if Hero
  token fields move or change.

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/tmp/hero/*` research references created by TASK-252-02.
- `_docs/_TASKS/TASK-252*.md`

## Acceptance Criteria

- Hero supports a badge/announcement surface in schema, defaults, normalizer,
  renderer, editor, tests, and docs.
- Old Hero payloads and presets still render and can be edited.
- Hero Visual mode is sectioned into readable groups with one-line controls
  where practical.
- Playwright CLI can identify badge, CTA, media, typography, color, and existing
  no-regression surface controls by accessible name or `data-widget-control`;
  background-specific expansion remains outside this Keep leaf.
