# Cross-cutting audit — Responsive cascade (desktop base + tablet/mobile overrides)

## 1. Meta
- **Target:** `_responsive` (cross-cutting: responsive cascade / breakpoint override model)
- **Kind:** cross-cutting
- **Date:** 2026-06-10
- **Audit HEAD:** `a06049ba` (per orchestrator). NB: the working tree was at `1fb8604a` at run time because another agent is concurrently applying 418 sanity fixes; observations reflect that live snapshot.
- **Session:** `PW_SESSION="xcResponsive"`
- **Subject page:** "Audit Responsive 0610 xc" — editor `…/admin/pages/6da9b7dd-e2f7-4ce2-9142-2a0956badcaa`, published slug `/audit-responsive-0610-xc`
- **Inserted target:** Hero ("Headline, copy, and primary action") → 1 section, 3 blocks (heading/text/button)
- **Screenshots:**
  - `.tmp/audit/shots/xcResponsive-editor-tablet-override.png` (Layout panel, tablet, max-width override badge)
  - `.tmp/audit/shots/xcResponsive-front-mobile.png` (published front at 390px viewport)
- **Reference:** `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html` (responsive subpanel = lines 1682–1702)

---

## 2. The vision being verified
Desktop = base. Tablet/Mobile store **only overrides**. Mobile derives from **desktop base**, never from tablet. Switching back to desktop must not be corrupted by smaller-breakpoint edits. Reference adds a dedicated **responsive subpanel** (hide-on-screen toggle, "vertical layout on mobile" toggle, per-field "↺ przywróć dziedziczenie" reset).

The editor model lives in `core/admin/ui/pages/PageEditor.tsx`:
- `device` state (`useState<PageBreakpoint>("desktop")`) driven by `DeviceSwitcher` (icon-only buttons, `aria-label` = `Desktop`/`Tablet`/`Mobile` — note: **no text content**, so `jsclick_text` fails; you must use `jsclick_aria`).
- Per-field state via `ResponsiveControlShell` → `data-page-editor-responsive-field={override?"override":"inherited"}` + a badge that reads **Base** (desktop) / **Override** / **Inherited**, plus a **Reset** button when `device!=="desktop" && override`.
- `readBlockBreakpointOverride` / `readSectionBreakpointOverride` short-circuit to `undefined` on desktop, so desktop never reads a smaller-bp override.

---

## 3. Step-by-step live results

### Step 1 — Desktop = base
Layout panel controls (hero section level): **Columns** (number=1), **Max width** (number=1080), **Align** (select start/center/end/stretch), **Justify** (select), **Variant** (select default/split/centered/full-width).
- Per-field badges: all **4** responsive fields → badge **"Base"**, state `inherited`, no reset button. ✅
- Classifier counts: `{override:0, inherited:4}`. ✅

### Step 2 — Tablet override
- `jsclick_aria "Tablet"` → `data-page-editor-canvas-device="tablet"`. ✅
- BEFORE edit: `{override:0, inherited:4}` — tablet **inherits** desktop. ✅
- `set_field "max width" "640"` → that field flips to **Override**, gets a **Reset** button (`hasReset:true`); the other 3 stay **Inherited**. `{override:1, inherited:3}`. ✅
- Editing **columns→1** (already the base value) did **not** create an override — value-equals-base does not dirty the cascade. Good hygiene. ✅

### Step 3 — Mobile inherits DESKTOP (not tablet)
- BEFORE edit (mobile): **Max width shows 1080**, i.e. it inherits the **desktop base 1080**, *not* the tablet override 640. `{override:0, inherited:4}`. ✅ **This is the core cascade vision and it holds.**
- `set_field "max width" "360"` → Max width = **Override**, others **Inherited**. `{override:1, inherited:3}`. ✅

### Step 4 — Back to Desktop, base unchanged (the §5.3 correctness check)
- Desktop Max width = **1080** (badge "Base"), `{override:0, inherited:4}` — **unchanged** by the tablet(640)/mobile(360) edits. ✅
- Re-reading: **tablet still 640**, **mobile still 360**, **desktop still 1080** → three independent layers persisted, base never overwritten. ✅
- **Verdict on §5.3 regression (base derived-from-mobile corruption):** for **section layout** this is **FIXED**. The selective-merge / desktop-short-circuit model works.

### Step 5 — Reset affordance + Responsive panel
- Per-field **Reset** works: clicking Reset on tablet Max width reverted it to `1080`, state `inherited`, badge "Inherited", `{override:0}`. ✅ (I re-applied 640 afterwards before publishing.)
- **Responsive panel is essentially empty** ⚠️ — its entire content is one info line ("tablet edits create overrides.") + a target-state badge (`data-page-editor-responsive-target-state="override"`). Probe: **0 inputs, 0 selects, 0 `[role=switch]`, 0 hide/visibility toggles.** It contains **no** hide-on-screen toggle, **no** "vertical layout on mobile" toggle, and **no** explicit per-field override list. This is a **DRIFT vs the reference** responsive subpanel (which renders 2 `.sw` toggles + a per-field reset field). The override affordances exist, but only inline on each control in Layout/Style/Spacing/etc. — not surfaced in the dedicated Responsive tab.

### Step 6 — Does the override reach the published front? **NO**
- Published front (desktop viewport): hero section inner grid carries an **inline** style
  `--coderso-section-accent:#0d9488; … max-width:1080px; margin:0 auto; gap:24px` — a single hard-coded **base** value.
- Whole page: **0** `[data-responsive]` / `[data-breakpoint]` elements; only **1** `@media (max-width…)` rule in the entire document (a generic framework rule, unrelated to the section).
- `resize 390 800` + reload → at a 390px viewport the section grid **still computes `max-width: 1080px`**. The mobile override (360) and tablet override (640) **do not apply** on the public front.

**Root cause (source-confirmed):** the renderer resolves the cascade **server-side to one breakpoint**:
- `core/services/pages/pageRendererV2.tsx:143` → `maxWidth: \`${section.layout.maxWidth}px\`` (single inline value, no media queries).
- `resolvePageRenderTree(document, breakpoint)` flattens to that one breakpoint before render.
- `core/server/publicSite.tsx:802` → `breakpoint: (options?.previewDevice ?? "desktop")`. A real public visit has no `previewDevice`, so it **always resolves to desktop**. There is no client-side media-query emission, so a real phone gets the desktop layout.

➡️ The responsive cascade is **editor/preview-only**. It is stored and previewed correctly per breakpoint, but it is **never delivered to real responsive browsers** — the public HTML is a static desktop snapshot.

---

## 4. Override badge counts (classifier evidence)
`data-page-editor-responsive-field` counts on the Layout panel, after the cascade was set up:

| Breakpoint | override | inherited |
|---|---|---|
| Desktop | 0 | 4 (badge "Base") |
| Tablet  | 1 (Max width) | 3 |
| Mobile  | 1 (Max width) | 3 |

(Reference-style dedicated controls remain absent everywhere: across the audited panels `counts.switch / swatch / range / segmentedGroup` are all **0** — same headline drift as the per-target audits; controls are native select / number / text.)

---

## 5. Drift vs reference (responsive specifically)
1. **No dedicated Responsive subpanel.** Reference has hide-on-screen toggle + "vertical layout on mobile" toggle + a per-field reset field. Current Responsive tab = one sentence + a state badge, 0 controls. **DRIFT (medium).**
2. **Breakpoint switch is icon-only** (`aria-label` only, no visible label/px readout). Reference shows "Duży 1080 / Średni 744 / Mały 390" with a live canvas-width readout + a "Edytujesz: …" scope pill. Current shows only "tablet · override context". **DRIFT (low).**
3. **Per-field override affordances exist but use native primitives** (the inline Base/Override/Inherited badge + ghost "Reset" button) instead of the reference's `↺ przywróć dziedziczenie` inline reset link. Functionally equivalent. **PARTIAL.**
4. **Override does not render on the public front (highest-impact).** Not a cosmetic drift — the cascade is functionally inert for real visitors. **BROKEN (high).**

---

## 6. Verdict
**PARTIAL → trending BROKEN.**

- **Editor model: WORKS.** Desktop=base, tablet/mobile store only overrides, mobile inherits desktop (not tablet), base is never corrupted by smaller-bp edits, and per-field Reset restores inheritance. The original §5.3 "base derived from mobile" corruption is **FIXED** for section layout. Counts: Desktop `{0,4}`, Tablet `{1,3}`, Mobile `{1,3}`.
- **Public runtime: BROKEN (severity high).** The server resolves to a single `desktop` breakpoint and emits one inline `max-width` with no media queries; tablet/mobile overrides never reach the browser. A 390px phone receives the 1080px desktop layout (`pageRendererV2.tsx:143`, `publicSite.tsx:802`).
- **UI drift: medium.** The dedicated Responsive subpanel from the reference (hide-on-screen + layout toggles) is missing; the tab is informational only.

**One-line why:** the breakpoint cascade is authored and previewed correctly but is flattened to desktop server-side, so it has no effect for real responsive visitors — the feature is editor-only.
