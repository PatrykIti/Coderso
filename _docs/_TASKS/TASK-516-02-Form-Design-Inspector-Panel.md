# TASK-516-02: Form Design Inspector Panel (whole-form styling UI)

# FileName: TASK-516-02-Form-Design-Inspector-Panel.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Content (Forms)
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (`FormFormTheme` type, enum sets, `resolveFormTheme`).
**Status:** ⏳ To Do

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/forms/FormDesignPanel.tsx` (NEW).** A
self-contained inspector panel component (props-in / callback-out, no data
fetching) that edits `FormSettings.theme`. 516-03 mounts it as a new `Design`
tab in the form inspector. Ships every theme control group with resolved-default
hints and per-control reset, reusing existing admin controls so it feels native.

## Pseudocode (grounded in real code)

Follow the exact structure/idioms of `FormSettingsPanel.tsx` (bordered
`section` groups, `[10px] uppercase tracking` labels, `ScrollArea`, `Select`,
`Switch`, `Input`) for the non-color controls.

**Color swatch primitive (the ≈9 most-repeated control in this panel).** Import
the EXPORTED reusable swatch `SharedColorControl` from
`core/admin/ui/widgets/editors/SharedColorControl.tsx:145` — do NOT import
`ColorField` (`FormEmbedEditors.tsx:506`), which is a PRIVATE, non-exported
widget-domain wrapper that merely composes `SharedColorControl` (imported there at
`:34`); it is reference-only, like the `ControlDefaultHint` treatment below.
Verified exported prop shape (`SharedColorControl.tsx:126-143`):

```ts
// SharedColorControl (exported primitive) — relevant props for a theme color token:
type SharedColorControlProps = {
  label: string;
  value: string | undefined;      // the raw token from theme[group][key] (undefined = unset)
  onChange: (next: string) => void;
  onClear?: () => void;           // wired to clearKey(group, key) for per-control reset
  allowTransparent?: boolean;     // true for background swatches (surface/input); adds a transparent option
  showValueInput?: boolean;       // default true (hex text field beside the swatch)
  controlId?: string;             // stable id, e.g. "form-theme-surface-background"
  controlPath?: string;           // ownership marker -> data-widget-control-path (writable)
  placeholder?: string; pickerFallback?: string; treatAsThemeDefaultValues?: string[]; swatchAriaLabel?: string;
};
```

Per color token, wire: `value={theme?.[group]?.[key]}`,
`onChange={(v)=>patchGroup(group,{[key]:v})}`, `onClear={()=>clearKey(group,key)}`,
`allowTransparent` on background swatches. The 9 color tokens:
`surface.background`, `surface.borderColor`, `typography.titleColor` /
`labelColor` / `helperColor`, `input.borderColor` / `input.background`,
`submit.background` / `submit.textColor`.

**Cross-subtask reconcile (pinned — `ResolvedFormTheme` shape).** This panel's
`ControlDefaultHint` reads `resolved[group][key]` (e.g. `resolved.layout.width`
→ `"md"`) to render the effective default. That ONLY works if `resolveFormTheme`
returns the **per-group RAW resolved token shape** — grouped, fully defaulted,
concrete raw values — as 516-01 specifies (`FORM_THEME_DEFAULTS = { layout:{
width:"md", align:"center", … }, … }`, TASK-516-01 lines 115-117). The
token→className/style maps and `buildFormThemeStyleVars` (TASK-516-01 line 120)
are a SEPARATE concern and MUST NOT be folded into `ResolvedFormTheme`'s value
shape. NOTE FOR THE 516-01 IMPLEMENTER + PARENT RECONCILE: the PARENT task
(TASK-516 lines 266-274) currently sketches a DIVERGENT className/style-shaped
`ResolvedFormTheme` (`container.className` / `surface.style` / `titleClassName`)
with NO `layout.width` raw value — under that shape `resolved[group][key]` breaks
this hint. The authoritative shape for `resolveFormTheme`'s RETURN is 516-01's
grouped-raw one; the parent's class/style maps live in the separate
`buildFormThemeStyleVars`. 516-01 must produce the grouped-raw shape this panel
depends on (the parent must be reconciled to match — parent edit is out of this
file's single-writer scope, flagged here).

**Merge protocol (pinned, reconciled with 516-03 `setFormTheme`).** `onThemeChange`
emits a `Partial<FormFormTheme>` keyed by GROUP; 516-03's `setFormTheme`
(TASK-516-03 lines 118-127, verified — statement-body handler mirroring the real
`setFormSettings` idiom at `FormBuilderPage.tsx:585-593`) does a **group-level
SHALLOW merge** (`{ ...(prev.settings.theme ?? {}), ...updates }`) then wraps the
whole object in `normalizeFormSettings`. Consequences this panel MUST honor:
- 516-03 REPLACES the whole group object at its key (it does NOT deep-merge inside
  a group). So `patchGroup` is responsible for producing the complete next group
  object by merging its own `patch` over the current group.
- `normalizeFormSettings` → `normalizeFormTheme` is **present-only**: it drops an
  empty/`undefined` group and drops the whole `theme` key when nothing valid
  remains. Therefore emitting `{ [group]: undefined }` (emptied group) or
  `undefined` (whole theme) is the correct present-only reset signal — no leftover
  empty objects survive the normalize on the very same `setMeta`.
- Because 516-03 already merges group-over-group, `clearKey` must emit the REDUCED
  group DIRECTLY via `onThemeChange` — it must NOT route through `patchGroup`,
  whose `{ ...currentGroup, ...patch }` would re-add the just-deleted key (a
  shallow merge cannot delete a key).

```tsx
type FormDesignPanelProps = {
  theme: FormFormTheme | undefined;
  // GROUP-LEVEL REPLACE: each emitted group value fully replaces theme[group] in
  // 516-03's `{ ...theme, ...updates }`; then normalizeFormSettings makes it
  // present-only. `{ [group]: undefined }` clears a group; `undefined` = reset whole theme.
  onThemeChange: (updates: Partial<FormFormTheme> | undefined) => void;
};

export function FormDesignPanel({ theme, onThemeChange }: FormDesignPanelProps) {
  const resolved = resolveFormTheme(theme);                  // for resolved-default hints
  // set/override a single token: build the complete next group (merge over current), emit as group replace
  const patchGroup = <G extends keyof FormFormTheme>(group: G, patch: object) =>
    onThemeChange({ [group]: { ...(theme?.[group] ?? {}), ...patch } } as Partial<FormFormTheme>);
  // per-control reset: DELETE one key from a copy, emit the reduced group DIRECTLY (NOT via patchGroup,
  // which would re-merge & re-add the key). Empty group -> `undefined` so 516-03's normalize drops it (present-only).
  const clearKey = <G extends keyof FormFormTheme>(group: G, key: string) => {
    const next: Record<string, unknown> = { ...(theme?.[group] ?? {}) };
    delete next[key];
    onThemeChange({ [group]: Object.keys(next).length ? next : undefined } as Partial<FormFormTheme>);
  };

  return (
    <div className="flex h-full flex-col">
      <header/* Palette icon + "Form Design" + subtitle */ />
      <ScrollArea>
        {/* Layout: width Select, alignment Select, columns 1|2 segmented, field gap, button alignment */}
        {/* Container: card Switch, background swatch, borderColor swatch, borderWidth, radius, padding, shadow */}
        {/* Typography: titleSize, titleWeight, titleColor/labelColor/helperColor swatches, fontFamily */}
        {/* Inputs: size, radius, borderColor, background swatches */}
        {/* Submit: background/textColor swatches, radius, fullWidth Switch, label Input */}
        {/* each control pairs its input with the LOCAL hint below:
            <ControlDefaultHint value={theme?.[group]?.[key]} resolved={resolved[group][key]} onReset={() => clearKey(group, key)} /> */}
      </ScrollArea>
      <footer><Button variant="outline" onClick={()=>onThemeChange(undefined /* reset all -> 516-03 drops the `theme` key */)}>Reset to default theme</Button></footer>
    </div>
  );
}

// LOCAL to FormDesignPanel.tsx (single-writer). This is NOT the MenuDesignEditor
// private helper (menu-domain signature `{ section, device, level, propKey, isSet }`,
// non-exported, incompatible) — DO NOT import that. Re-implement the TASK-506 F2
// idiom for the form theme's flat value/resolved/onReset shape:
function ControlDefaultHint({ value, resolved, onReset }: {
  value: unknown;                 // the raw token from theme[group][key] (undefined = unset)
  resolved: unknown;              // the effective value from resolveFormTheme (always defined)
  onReset: () => void;            // wired to clearKey(group, key)
}) {
  if (value === undefined) {      // unset -> show the resolved default so the effective value is visible
    return <span className="text-[10px] font-medium text-muted-foreground">Default: {String(resolved)}</span>;
  }
  // overridden -> offer a reset affordance back to the resolved default
  return (
    <button type="button" onClick={onReset} className="text-[10px] font-medium text-muted-foreground hover:text-foreground">
      Reset (default: {String(resolved)})
    </button>
  );
}
```

Reset semantics: per-control reset (`clearKey`) emits the REDUCED group directly
via `onThemeChange` so 516-03's group-level shallow merge cannot re-add the key,
and an emptied group is emitted as `undefined` so `normalizeFormSettings` drops it
(present-only, verified against TASK-516-03 lines 118-127 + 516-01
`normalizeFormTheme` present-only omit-empty-group). "Reset to default theme"
signals 516-03 to drop the whole `theme`. Every control shows the resolved default
via the LOCAL `ControlDefaultHint` component (re-implemented in this file per the
TASK-506 F2 mandate — NOT the incompatible menu-domain private helper) so the user
always sees the effective value.

Error handling: pure presentational; invalid input impossible (selects/switches);
free-text (submit label, color) is normalized by the 516-01 model on save.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formDesignPanel.test.tsx` (NEW):
  renders all control groups; changing a `Select`/`Switch` fires
  `onThemeChange` with the merged group patch (`{ [group]: { ...prevGroup, ...patch } }`);
  per-control reset on a group with OTHER set keys emits the reduced group with the
  target key ABSENT (asserts `clearKey` bypasses `patchGroup` — the key is NOT
  re-added); reset on the group's LAST set key emits `{ [group]: undefined }`;
  "Reset to default theme" emits `undefined`; the local `ControlDefaultHint` shows
  the `resolveFormTheme` value when the token is unset and a reset affordance when
  set. No Bun APIs (pure React render lane).

## UI/UX fidelity + max-config-flexibility notes

The panel is the primary "style the WHOLE FORM" surface — it must expose every
theme token from 516-01, grouped sensibly (Layout / Container / Typography /
Inputs / Submit), integrated tastefully into the existing inspector visual
language (bordered sections, uppercase micro-labels). No native `<select>` /
raw color `<input>` — use the shared admin `Select` + swatch controls. Every
control resettable; maximum flexibility with a calm default.
