# TASK-516-02: Form Design Inspector Panel (whole-form styling UI)

# FileName: TASK-516-02-Form-Design-Inspector-Panel.md

**Parent Task:** TASK-516
**Priority:** High
**Category:** Admin UI / Content (Forms)
**Estimated Effort:** Medium
**Dependencies:** TASK-516-01 (`FormFormTheme` type, enum sets, `resolveFormTheme`).
**Status:** ✅ Done
**Completed:** 2026-07-06

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

**Color swatch primitive (the ≈10 most-repeated control in this panel).** Import
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
  allowTransparent?: boolean;     // renders a "Use transparent" button — but ONLY inside the
                                  // showValueInput===false branch (SharedColorControl.tsx:219-227). It is
                                  // INERT with the default showValueInput=true. So background swatches must
                                  // pass BOTH allowTransparent AND showValueInput={false} for the affordance.
  showValueInput?: boolean;       // default true (hex text field beside the swatch);
                                  // pass false on background swatches to swap the hex field for the
                                  // swatch+state chip that hosts the "Use transparent" button
  controlId?: string;             // stable id, e.g. "form-theme-surface-background"
  controlPath?: string;           // ownership marker -> data-widget-control-path (writable)
  placeholder?: string; pickerFallback?: string; treatAsThemeDefaultValues?: string[]; swatchAriaLabel?: string;
};
```

Per color token, wire: `value={theme?.[group]?.[key]}`,
`onChange={(v)=>patchGroup(group,{[key]:v})}`, `onClear={()=>clearKey(group,key)}`.
For the two BACKGROUND swatches (`surface.background`, `input.background`) that
must offer transparency, pass **BOTH** `allowTransparent` AND `showValueInput={false}`
— the "Use transparent" button only renders inside SharedColorControl's
`showValueInput===false` branch (`SharedColorControl.tsx:219-227`), so
`allowTransparent` alone (with the default `showValueInput=true`) is inert and no
transparent affordance appears; the other 8 (opaque) swatches keep the default hex
input. The 10 color tokens: `surface.background` (transparent-capable),
`surface.borderColor`, `typography.titleColor` / `labelColor` / `helperColor`,
`input.borderColor`, `input.background` (transparent-capable), `input.textColor`,
`submit.background` / `submit.textColor`. (`input.textColor` is a real 516-01
token — `ResolvedFormTheme.input.textColor?` at 516-01:134, default `undefined`
at 516-01:148, enumerated in `buildFormThemeStyleVars` at 516-01:164 — so the
panel exposes it per the "expose every theme token from 516-01" mandate.)

**Cross-subtask reconcile (VERIFIED SATISFIED — `ResolvedFormTheme` shape).** This
panel's `ControlDefaultHint` reads `resolved[group][key]` (e.g.
`resolved.layout.width` → `"md"`) to render the effective default. That requires
`resolveFormTheme` to return the **per-group RAW resolved token shape** — grouped,
fully defaulted, concrete raw values. This is now CONFIRMED in place: 516-01 ships
the grouped-raw `ResolvedFormTheme` (TASK-516-01 lines 130–136:
`layout: { width: FormThemeWidth; … }`) with `FORM_THEME_DEFAULTS` of concrete raw
tokens (TASK-516-01 lines 144–150: `layout:{ width:"md", align:"center", … }`),
and the token→className/style maps + `buildFormThemeStyleVars` (TASK-516-01 lines
152–164) are kept a SEPARATE concern (NOT folded into the value shape). The PARENT
task has ALSO been reconciled to this same grouped-raw shape and now declares it
AUTHORITATIVE (TASK-516 lines 280–293: "`resolveFormTheme` returns GROUPED-RAW
effective tokens … NOT className/style … This is what FormDesignPanel's
ControlDefaultHint reads (`resolved.layout.width` → \"md\")"; the parent's grouped-raw
`export type ResolvedFormTheme` is at TASK-516 line 287, and its resolver test at
TASK-516 line 341 asserts `.layout.width === "md"`). The earlier divergent
className/style-shaped sketch that once lived in the parent (`container.className` /
`surface.style` / `typography.titleClassName`, no raw `layout.width`) has been
REMOVED — a grep of the parent for those symbols now returns no matches, and the
parent explicitly records that it "broke 516-02's hint contract" (TASK-516 lines
285–286). No further cross-subtask edit is required for this hint.

> **LANDING PRECONDITION (verified satisfied — no longer blocking).**
> `ControlDefaultHint`'s `resolved={resolved[group][key]}` contract requires the
> grouped-raw `ResolvedFormTheme` (raw effective tokens per group). BOTH producers
> now ship that shape: 516-01 (TASK-516-01 lines 130–136 type + 144–150 defaults)
> AND the reconciled PARENT TASK-516 (lines 280–293 declare the grouped-raw return
> AUTHORITATIVE; line 341 tests `.layout.width === "md"`). The previously divergent
> className/style sketch is gone from the parent. This precondition is therefore
> already met; it is retained here only as the invariant 516-01 must not regress
> (if any future edit re-introduces a className/style-shaped resolver return, this
> hint breaks). Both producing shapes are outside this file's single-writer scope.

**Merge protocol (pinned, reconciled with 516-03 `setFormTheme`).** `onThemeChange`
emits a `Partial<FormFormTheme>` keyed by GROUP; 516-03's `setFormTheme`
(TASK-516-03 — the `setFormTheme` handler at line 179 plus its
GROUP-LEVEL REPLACE merge-protocol comment at lines 170-178, verified —
statement-body handler mirroring the real `setFormSettings` idiom at
`FormBuilderPage.tsx:585-594`) does a **group-level
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
        {/* Inputs: size, radius, borderColor, background, textColor swatches */}
        {/* Submit: background/textColor swatches, radius, fullWidth Switch, label Input */}
        {/* Each NON-COLOR control pairs its input with the LOCAL hint below:
            <ControlDefaultHint value={theme?.[group]?.[key]} resolved={resolved[group][key]} onReset={() => clearKey(group, key)} />
            The 10 COLOR swatches are DELIBERATELY EXCLUDED from ControlDefaultHint —
            SharedColorControl already renders its own resolved/cleared-state UI (a
            "Theme default" label + "No color override is saved…" description via
            ClearableFieldHeader/describeSharedColorControlState, verified at
            SharedColorControl.tsx:71-79), and every color token defaults to `undefined`
            (516-01 FORM_THEME_DEFAULTS: surface.background/borderColor,
            typography.title/label/helperColor, input.background/borderColor/textColor,
            submit.background/textColor — TASK-516-01 lines 144-150), so a ControlDefaultHint
            on a color would resolve to undefined and print the literal "Default: undefined".
            Its own onClear (wired to clearKey) is the color reset affordance. */}
      </ScrollArea>
      <footer><Button variant="outline" onClick={()=>onThemeChange(undefined /* reset all -> 516-03 drops the `theme` key */)}>Reset to default theme</Button></footer>
    </div>
  );
}

// LOCAL to FormDesignPanel.tsx (single-writer). This is NOT the MenuDesignEditor
// private helper (menu-domain signature `{ section, device, level, propKey, isSet }`,
// non-exported, incompatible) — DO NOT import that. Re-implement the TASK-506 F2
// idiom for the form theme's flat value/resolved/onReset shape. Used ONLY for the
// enum/bool/number tokens whose resolved default is ALWAYS concrete (layout.*,
// surface card/padding/radius/shadow/borderWidth, typography sizes/weights/family,
// input size/radius, submit fullWidth/radius/label). Color tokens are NOT passed
// here (they resolve to undefined by default and own their cleared-state UI in
// SharedColorControl — see the render comment above).
function ControlDefaultHint({ value, resolved, onReset }: {
  value: unknown;                 // the raw token from theme[group][key] (undefined = unset)
  resolved: unknown;              // the effective value from resolveFormTheme (concrete for every control this is used on)
  onReset: () => void;            // wired to clearKey(group, key)
}) {
  // MIRRORS TASK-507 FIX B (MenuDesignEditor.tsx:625 `if (value === undefined) return null;`):
  // never render "Default: undefined". A resolved default of `undefined` means the token
  // inherits the ambient theme (no concrete effective value to show) — hide the hint.
  // Defensive: the color tokens (all `undefined`-by-default) are already excluded above,
  // so in practice this only trips if a future token gains an undefined default.
  if (resolved === undefined) return null;
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
(present-only, verified against TASK-516-03 line 179 — `setFormTheme`
handler + its GROUP-LEVEL REPLACE merge-protocol comment at lines 170-178 — plus 516-01
`normalizeFormTheme` present-only omit-empty-group). "Reset to default theme"
signals 516-03 to drop the whole `theme`. Every control surfaces its resolved
default: the enum/bool/number controls via the LOCAL `ControlDefaultHint` component
(re-implemented in this file per the TASK-506 F2 mandate — NOT the incompatible
menu-domain private helper), and the 10 color swatches via SharedColorControl's own
built-in resolved/cleared-state UI ("Theme default" + description). `ControlDefaultHint`
mirrors TASK-507 FIX B's `resolved===undefined → return null` guard so it never prints
the literal string "Default: undefined"; combined with the color-swatch exclusion, the
user always sees a meaningful effective value and never a raw `undefined`.

Error handling: pure presentational; invalid input impossible (selects/switches);
free-text (submit label, color) is normalized by the 516-01 model on save.

## Testing requirements + lanes

- **Vitest admin/UI** `tests/vitest/admin/formDesignPanel.test.tsx` (NEW):
  renders all control groups; changing a `Select`/`Switch` fires
  `onThemeChange` with the merged group patch (`{ [group]: { ...prevGroup, ...patch } }`);
  per-control reset on a group with OTHER set keys emits the reduced group with the
  target key ABSENT (asserts `clearKey` bypasses `patchGroup` — the key is NOT
  re-added); reset on the group's LAST set key emits `{ [group]: undefined }`;
  "Reset to default theme" emits `undefined`; the local `ControlDefaultHint`, for a
  token with a CONCRETE resolved default (e.g. `layout.width` → "md"), shows that
  value when the token is unset and a reset affordance when set; and — mirroring
  TASK-507 FIX B — when the resolved default is `undefined` it renders NOTHING (assert
  the component returns null / the rendered output NEVER contains the literal string
  "undefined", so an unset color token never shows "Default: undefined"); assert the
  color swatches use SharedColorControl's own cleared-state UI ("Theme default")
  rather than a `ControlDefaultHint`. No Bun APIs (pure React render lane).

## UI/UX fidelity + max-config-flexibility notes

The panel is the primary "style the WHOLE FORM" surface — it must expose every
theme token from 516-01, grouped sensibly (Layout / Container / Typography /
Inputs / Submit), integrated tastefully into the existing inspector visual
language (bordered sections, uppercase micro-labels). No native `<select>` /
raw color `<input>` — use the shared admin `Select` + swatch controls. Every
control resettable; maximum flexibility with a calm default.
