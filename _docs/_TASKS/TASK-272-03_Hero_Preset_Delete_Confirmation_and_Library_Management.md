# TASK-272-03: Hero Preset Delete Confirmation and Library Management

# FileName: TASK-272-03_Hero_Preset_Delete_Confirmation_and_Library_Management.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + User Settings
**Estimated Effort:** Large
**Dependencies:** TASK-272
**Status:** Done (2026-05-19)

---

## Overview

Make Hero preset deletion recoverable through confirmation and improve the Hero
preset list with search, sorting, and import/export.

Hero presets are currently stored through the existing `widgets.hero.presets`
user setting. This leaf should stay on that existing settings contract unless a
future product decision explicitly asks for shared/team preset storage.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:177-179` - UX-03 preset deletion has
  no confirmation.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:232-236` - BF-09/BF-10 preset
  export/import and organization gaps.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:280,297` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Add a delete confirmation dialog for preset deletion. Add local search/sort for up to 24 presets. Add JSON export/import buttons with a validating parser that can report malformed, duplicate, and over-limit imports instead of silently dropping entries. |
| `core/admin/services/userSettingsClient.ts` | Update `HeroPresetSetting` only if the import/export metadata needs typed fields such as `version` or `exportedAt`. Do not create a new API route. |
| `core/services/settings/userSettingsService.ts` | Update server-side Hero preset validation only if new preset metadata is persisted. |
| `tests/unit/settings/userSettingsService.test.ts` | Add or update validation coverage when import/export metadata changes the persisted Hero preset payload. |
| `tests/vitest/admin/userSettingsClient.test.ts` | Add or update client cache/typing coverage when import/export metadata changes the client contract. |
| `tests/integration/routes/userSettings.test.ts` | Add route-level proof when persisted preset metadata changes the `/user-settings` contract. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover confirm/cancel delete, search/filter, export payload generation where testable, import success, import duplicate handling, and import validation errors. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Add SSR-level smoke if new preset controls must be present without client effects. |
| `_docs/_WIDGETS/HERO.md` | Document Hero preset limits and import/export behavior. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark UX-03/BF-09/BF-10 fixed or record evidence. |

## Implementation Pseudocode

```tsx
const [pendingDeletePreset, setPendingDeletePreset] = useState<HeroPresetSetting | null>(null);

<Button onClick={() => setPendingDeletePreset(preset)}>Delete</Button>

<ConfirmActionDialog
  open={Boolean(pendingDeletePreset)}
  title="Delete Hero preset?"
  description={`Delete "${pendingDeletePreset?.name}"? This cannot be undone.`}
  confirmLabel="Delete preset"
  onConfirm={() => pendingDeletePreset && handleDeletePreset(pendingDeletePreset.name)}
/>
```

Import/export flow:

```ts
type HeroPresetExport = {
  schemaVersion: 1;
  exportedAt: string;
  presets: HeroPresetSetting[];
};

type HeroPresetImportResult =
  | { ok: true; presets: HeroPresetSetting[]; warnings: string[] }
  | { ok: false; error: string };

function parseHeroPresetImport(value: unknown): HeroPresetImportResult {
  const presets = isRecord(value) && Array.isArray(value.presets) ? value.presets : value;
  const sanitized = sanitizeHeroPresetList(presets);
  if (!Array.isArray(presets)) return { ok: false, error: "Preset import must be an array." };
  if (sanitized.length === 0 && presets.length > 0) {
    return { ok: false, error: "No valid Hero presets found." };
  }
  return { ok: true, presets: sanitized, warnings: collectDroppedPresetWarnings(presets) };
}
```

Error handling:

- Import rejects empty files, malformed JSON, non-Hero variants, missing names,
  unsafe duplicates, and over-limit results with a visible error.
- Duplicate names are a hard failure: if the imported payload contains a
  case-insensitive duplicate or collides with an existing preset name, show a
  visible error and persist nothing from that import attempt.
- Export must not include user identifiers, tokens, or environment-specific
  secrets.
- Delete confirmation must disable while `setUserSetting` is pending.

## Security Contract

No new API routes are added. The existing user-settings endpoint remains in
use.

- Endpoint visibility: existing internal authenticated user-settings endpoint.
- Auth model: unchanged authenticated user settings calls through
  `getUserSetting` / `setUserSetting`.
- RBAC: unchanged user-owned settings access.
- CSRF: unchanged existing settings write protection.
- Rate-limit bucket: unchanged settings write bucket.
- Reject-unknown validation: import must supplement `sanitizeHeroPresetList`
  with a parser that returns visible errors/warnings before persistence.
- Anti-abuse: imported JSON is data only; no scripts, raw HTML, blob URLs, or
  secrets may be executed or persisted.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx` if SSR
  controls change.
- `bun test tests/unit/settings/userSettingsService.test.ts` when persisted
  preset metadata or validation changes.
- `bun run test:vitest -- tests/vitest/admin/userSettingsClient.test.ts` when
  persisted preset metadata changes the client contract.
- `bun test tests/integration/routes/userSettings.test.ts` when persisted
  preset metadata changes the `/user-settings` route contract.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-03_Hero_Preset_Delete_Confirmation_and_Library_Management.md`
- `_docs/_TASKS/README.md` on status changes

## Final Evidence

- Closed on 2026-05-19 with confirmed preset deletion, search/sort,
  import/export, visible normalization warnings, and single-CTA preset
  round-trips that no longer backfill a default secondary CTA.
- Focused proof lives in `tests/vitest/ui/hero-editor-wave.test.tsx`,
  `tests/unit/settings/userSettingsService.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`, and TASK-272-09.

## Acceptance Criteria

- Deleting a Hero preset requires confirmation and can be cancelled.
- Preset search/sort helps users manage the 24-preset cap.
- Import/export works through bounded JSON and reuses Hero preset validation.
- Invalid or duplicate imports do not partially persist data.
- No new shared preset API or route is introduced by this leaf.
