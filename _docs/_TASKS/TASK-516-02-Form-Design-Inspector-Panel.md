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
`Switch`, `Input`) and reuse the color-swatch / clearable-style control the
widget editors already use (`core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
patterns) for color tokens.

```tsx
type FormDesignPanelProps = {
  theme: FormFormTheme | undefined;
  onThemeChange: (updates: Partial<FormFormTheme> | undefined) => void;  // merged + normalized by 516-03 owner; `undefined` = reset whole theme
};

export function FormDesignPanel({ theme, onThemeChange }: FormDesignPanelProps) {
  const resolved = resolveFormTheme(theme);                  // for resolved-default hints
  const patchGroup = <G extends keyof FormFormTheme>(group: G, patch) =>
    onThemeChange({ [group]: { ...(theme?.[group] ?? {}), ...patch } } as Partial<FormFormTheme>);
  const clearKey = (group, key) => { const next = { ...(theme?.[group] ?? {}) }; delete next[key]; patchGroup(group, next-as-replace); };

  return (
    <div className="flex h-full flex-col">
      <header/* Palette icon + "Form Design" + subtitle */ />
      <ScrollArea>
        {/* Layout: width Select, alignment Select, columns 1|2 segmented, field gap, button alignment */}
        {/* Container: card Switch, background swatch, borderColor swatch, borderWidth, radius, padding, shadow */}
        {/* Typography: titleSize, titleWeight, titleColor/labelColor/helperColor swatches, fontFamily */}
        {/* Inputs: size, radius, borderColor, background swatches */}
        {/* Submit: background/textColor swatches, radius, fullWidth Switch, label Input */}
        {/* each control: <ControlDefaultHint value={theme?.group?.key} resolved={resolved.group.key} onReset={()=>clearKey(...)} /> */}
      </ScrollArea>
      <footer><Button variant="outline" onClick={()=>onThemeChange(undefined /* reset all -> 516-03 drops the `theme` key */)}>Reset to default theme</Button></footer>
    </div>
  );
}
```

Reset semantics: per-control reset removes the single key (present-only);
"Reset to default theme" signals 516-03 to drop the whole `theme`. Every control
shows the resolved default so the user sees the effective value (owner mandate
from TASK-506 F2: visible resolved-default hint on every control).

Error handling: pure presentational; invalid input impossible (selects/switches);
free-text (submit label, color) is normalized by the 516-01 model on save.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formDesignPanel.test.tsx` (NEW):
  renders all control groups; changing a `Select`/`Switch` fires
  `onThemeChange` with the merged group patch; per-control reset omits the key;
  resolved-default hint shows the `resolveFormTheme` value when the token is
  unset. No Bun APIs (pure React render lane).

## UI/UX fidelity + max-config-flexibility notes

The panel is the primary "style the WHOLE FORM" surface — it must expose every
theme token from 516-01, grouped sensibly (Layout / Container / Typography /
Inputs / Submit), integrated tastefully into the existing inspector visual
language (bordered sections, uppercase micro-labels). No native `<select>` /
raw color `<input>` — use the shared admin `Select` + swatch controls. Every
control resettable; maximum flexibility with a calm default.
