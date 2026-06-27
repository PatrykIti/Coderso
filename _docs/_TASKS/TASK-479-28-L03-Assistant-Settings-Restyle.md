# TASK-479-28-L03: Assistant Settings Restyle
# FileName: TASK-479-28-L03-Assistant-Settings-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Settings / Visual Refresh
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-28-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-28

---

## Overview

Restyle the **Assistant** settings page
(`core/admin/ui/settings/AssistantSettingsPage.tsx` + `AssistantSettingsCard.tsx`)
to the prototype's `AssistantSettingsPage`: `SettingsSection` groups for
**Provider** (provider / model / API key), **Behavior** (temperature / system
prompt), **Features** (capability toggles), and **Usage** — over the real
assistant settings + model-metadata flow. The assistant API key stays
**backend-only** (write-only masked input, never read back to the client).

- **Goal:** Give Assistant settings the prototype's grouped, soft look while
  preserving the real provider/model/key wiring, the LLM-enabled +
  `assistantDefaultMode` validation (`resolveAssistantValidationError`), the
  OpenRouter/provider model-metadata fetch (`getAssistantModelMetadata`), the docs
  reindex action (`reindexAssistantDocs` + its `ConfirmActionDialog`), the
  dirty-state guard, auto-save, and the sticky save bar. Default the model field
  to the latest Claude options (`claude-opus-4-8`, `claude-sonnet-4-6`,
  `claude-haiku-4-5`) without breaking the real free-form/provider-resolved model
  binding.
- **Owning module/service:** `core/admin/ui/settings/AssistantSettingsPage.tsx`
  and `core/admin/ui/settings/AssistantSettingsCard.tsx`, backed by
  `assistantClient` (`getAssistantModelMetadata`, `reindexAssistantDocs`,
  `type AssistantModelMetadataResponse`), `settingsValues`
  (`ASSISTANT_SETTINGS_DEFAULT_VALUES`, `AssistantSettingsValues`,
  `assistantLlmModel`), and the shared dirty/auto-save hooks.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (assistant key backend-only),
  the Claude model ids (see the Anthropic/Claude API reference / `claude-api`
  skill — latest is **Claude Opus 4.8**, plus Sonnet 4.6 / Haiku 4.5),
  `_docs/DESIGN_TOKENS.md`; prototype source
  `_docs/_PROTOTYPE/src/pages/settings/AssistantSettingsPage.tsx` and patterns
  `_docs/_PROTOTYPE/src/components/patterns/SettingsSection.tsx`, primitives
  `_docs/_PROTOTYPE/src/components/ui/{input,select,switch,textarea,progress}.tsx`.
- **Out of scope:** No change to the assistant settings schema, the model
  validation, the model-metadata endpoint, the reindex action, or the key storage
  boundary. The prototype's "620K / 1M tokens" usage meter is MOCK — render the
  Usage section only from a REAL usage value if one exists; otherwise omit the
  numeric meter (do not fabricate token counts).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

**Key handling:** the assistant API key field stays a write-only, masked input.
The page already never reads the stored key back — keep it that way. Do NOT bind a
fetched secret into client state, the cache, logs, or a debug payload. On save,
send the key opaquely through the existing `onSave`/settings client; an empty
field means "unchanged", never "clear".

---

## Implementation Pseudocode

Target file A: `core/admin/ui/settings/AssistantSettingsPage.tsx`. Keep the ENTIRE
state/effect/handler block: the snapshot/`isDirty` + `useRegisterSettingsDirty`,
`resolveAssistantValidationError`, the `getAssistantModelMetadata` fetch (its
`useEffect` + abort/`useRef` guard — do not add a sync setState in an effect),
`reindexAssistantDocs` + its `ConfirmActionDialog`, `handleSave`,
`useAutoSaveEffect`, `useSettingsAutoSave`, the busy derivation, and the Alerts.
Only the body JSX changes (group `AssistantSettingsCard` fields into
`SettingsSection`s) plus the save bar chrome.

Target file B: `core/admin/ui/settings/AssistantSettingsCard.tsx`. Re-lay-out the
existing fields into `SettingsSection`/`SettingsField`. Keep every binding:
`values.assistantLlmProvider`, `values.assistantLlmModel`,
`values.assistantLlmEnabled`, `assistantDefaultMode`, the key input, the
`modelMetadata`/`modelMetadataError`/`isModelMetadataLoading` badges, and the
reindex trigger.

Port from prototype `AssistantSettingsPage.tsx` (Provider / Behavior / Features /
Usage sections).

```tsx
// AssistantSettingsCard.tsx — RENDER ONLY. Bindings unchanged.
<div className="divide-y divide-border">
  <SettingsSection title="Provider" description="The model that powers writing assistance.">
    <div className="flex flex-col gap-4">
      <SettingsField label="Provider">
        <Select value={values.assistantLlmProvider}
                onChange={(e) => onChange?.({ assistantLlmProvider: e.target.value })}>
          {/* keep the REAL provider option set (none / openrouter / anthropic / …) */}
        </Select>
      </SettingsField>

      <SettingsField label="Model"
        hint="The latest Claude models offer the best quality for content work.">
        {/* Real field is a FREE-FORM Input bound to values.assistantLlmModel.
            KEEP it free-form (provider-resolved), but add Claude suggestions via a
            <datalist> so the prototype's curated options are offered without
            breaking the open binding. Do NOT replace the Input with a closed Select
            that would reject a custom/provider-specific model id. */}
        <Input list="assistant-model-suggestions"
               value={values.assistantLlmModel}
               onChange={(e) => onChange?.({ assistantLlmModel: e.target.value })}
               placeholder="claude-opus-4-8" disabled={llmConfigDisabled} />
        <datalist id="assistant-model-suggestions">
          <option value="claude-opus-4-8">Claude Opus 4.8</option>
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
        </datalist>
        {/* keep the existing modelMetadata / modelMetadataError / loading Badges */}
      </SettingsField>

      <SettingsField label="API key" htmlFor="assistant-key"
        hint="Stored encrypted; never exposed to the browser.">
        <Input id="assistant-key" type="password" /* write-only, masked */
               value={values.assistantApiKeyInput}  /* the EXISTING write-only input field */
               onChange={(e) => onChange?.({ assistantApiKeyInput: e.target.value })}
               placeholder="•••• unchanged" disabled={llmConfigDisabled} />
      </SettingsField>
    </div>
  </SettingsSection>

  <SettingsSection title="Behavior" description="Tune tone and ground rules for the assistant.">
    {/* temperature/default-mode Select + system-prompt Textarea — same bindings */}
  </SettingsSection>

  <SettingsSection title="Features" description="Enable specific assistant capabilities.">
    {/* the REAL capability toggles as <Switch> rows bound to values.* —
        only render toggles the settings model actually persists */}
  </SettingsSection>

  <SettingsSection title="Corpus & usage" description="Docs index and assistant status.">
    {/* keep the official docs-corpus panel + reindex trigger (ConfirmActionDialog).
        Render a usage meter ONLY if a real usage value exists; otherwise omit —
        do not port the mock "620K / 1M tokens" Progress bar. */}
  </SettingsSection>
</div>
```

**Default model latest-Claude rule:** when the page bootstraps a NEW config (no
persisted model), default `assistantLlmModel` to `claude-opus-4-8` and offer
`claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5` as the suggestion set.
Do NOT hard-replace an already-persisted model id on load (that would dirty the
form on mount and could clobber a user's provider-specific model). Update
`ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmModel` default only if product
confirms; otherwise keep the suggestion list (datalist) and leave the persisted
default change to a separate task.

**Data flow:** `values`/`onChange` from the page snapshot → render-time
`form`/`savedForm` → `isDirty` → `handleSave`. Model metadata loads via the
existing effect (provider-keyed, abortable) and only sets state at the async
boundary — keep that; do not add a sync setState in an effect. Reindex runs
through `reindexAssistantDocs` behind its confirm dialog.

**Error handling:** unchanged — keep `resolveAssistantValidationError` gating Save
(LLM-Guide requires enabled LLM + non-`none` provider), the metadata-error Badge,
the reindex error toast/alert, and the page Alerts.

**Regression-test shape (see L07):** render `<AssistantSettingsPage values={seed}
onSave={spy} />`; assert Provider/Behavior/Features sections render; assert the
model Input offers the Claude suggestions (datalist options present) AND still
accepts a custom value; assert the key field is `type="password"` and that NO
fetched secret appears in the DOM/props; assert the LLM-Guide validation still
blocks Save; assert reindex opens its confirm dialog.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/settings.test.tsx`

Keep behavioral assertions (validation gating, metadata badge, reindex confirm,
key masking); update literal chrome assertions where the SettingsSection grouping
intentionally changes. State in the summary if any suite was skipped.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure, linking `TASK-479` + `TASK-479-28-L03`.
- If a Settings UX doc lists the assistant model defaults, note the latest-Claude
  suggestion set. No secret/cache/schema contract change.
