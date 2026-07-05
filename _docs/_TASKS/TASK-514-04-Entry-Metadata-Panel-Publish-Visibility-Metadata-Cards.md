# TASK-514-04: Entry Metadata Panel — Publish (Status+Visibility+Schedule) / Taxonomy / Metadata Cards

# FileName: TASK-514-04-Entry-Metadata-Panel-Publish-Visibility-Metadata-Cards.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Admin UI / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-514-02 (client `visibility`/`hasPassword` fields + payload)
**Status:** ⏳ To Do

---

## Overview

Bring the entry right-column panel to prototype fidelity. The prototype
(`EntryEditorPreview.tsx:85-168`) stacks three `SectionCard`s in a `320px`
column: **Publish** (Status, Visibility, Schedule, Publish/Save buttons),
**Taxonomy** (Category, Tags), **Metadata** (Created / Updated / Author / Entry
ID `dl`). Every prototype section is a `<SectionCard title="…">` whose TITLE
sits INSIDE a bordered card header (`SectionCard.tsx:26-45` — `border-b`
header over a `p-5` body) — NOT a title-above-a-plain-card look. The current
`EntryMetadataPanel` (`:226-552`) has Publishing (Status + Schedule), Publish
checklist, "What is this?" help, SEO snippet, Taxonomy, Save metadata, Danger
zone, and an author footer — but it hand-rolls legacy chrome (a raw `<section>`
+ uppercase `<p>` label ABOVE a plain `<Card><CardContent>`; see `:230-238`)
and has **no Visibility control** and **no Metadata card**. This subtask adds
Visibility + a Metadata card, **re-homes every panel section into the shared
`SectionCard` primitive** (`core/admin/ui/shared/SectionCard.tsx`, import
`import { SectionCard } from "@/ui/shared/SectionCard";` — ported from the
prototype by TASK-479-06-L02, already used by 514-03's left column), and
preserves ALL current functionality (checklist, SEO snippet, taxonomy quick-add,
save, delete). This makes the panel chrome match the prototype's in-card headers
EXACTLY and drops the non-faithful `<section>`+`<p>`+`<Card>` pattern.

**Owned files (sole writer):**
- `core/admin/ui/entries/EntryMetadataPanel.tsx`.

**Do NOT** edit `EntryEditor.tsx` (514-03 — it passes new props), the client
(514-02), or add SEO title/canonical/robots inputs (**TASK-487-03-L02** owns
those — this subtask only keeps the existing `description` field and shapes the
SEO card they slot into). **Shared-file flag:** TASK-487-03-L02 (SEO fields) and
TASK-487-02-L02 (revision drawer trigger) also edit this file — see parent
coordination; keep the SEO card + a documented revisions-trigger slot easy to
extend, do not implement them.

Max-config-flexibility: Visibility is a first-class control; password entry is a
dedicated input shown only for `password`; Metadata is always visible.

---

## Execution-Ready Plan

Verified: props type `EntryMetadataPanelProps` (`:67-90`), `EntryStatus` +
`statusOptions` (`:34-41`), the Publishing section (`:230-276`), author footer
(`:538-550`). Uses `Select`/`SelectTrigger`/`SelectItem` (`:19-25`), `Input`,
`StatusBadge`, `Separator`. **Chrome:** add
`import { SectionCard } from "@/ui/shared/SectionCard";` (component verified at
`core/admin/ui/shared/SectionCard.tsx:13-55`; props `title`, `action`, `icon`,
`children`, `bodyClassName`, `padded`) and replace the legacy
`<section>`+`<p>`+`<Card><CardContent>` wrappers below with `<SectionCard>`;
`Card`/`CardContent` imports (`:16`) can then be dropped unless another retained
block still needs them.

### 0. Convert every panel section to `SectionCard`

Replace each `<section className="space-y-3"> … <p …uppercase>Label</p> …
<Card><CardContent className="…p-4">BODY</CardContent></Card> … </section>`
with `<SectionCard title="Label" bodyClassName="…">BODY</SectionCard>`, so the
title renders inside the card's `border-b` header exactly like the prototype
(`EntryEditorPreview.tsx:86` Publish / `:123` Taxonomy / `:148` Metadata):

- **Publishing** (`:230-276`): `<SectionCard title="Publish" action={<StatusBadge status={status} />}>`
  — the existing right-aligned `StatusBadge` moves into the `action` slot
  (`SectionCard.tsx:49` renders `action` at the header's right). **Title text is
  `Publish`, NOT `Publishing`:** the prototype (source of truth) titles this card
  `Publish` (`EntryEditorPreview.tsx:86`; parent `TASK-514_…md:352`); the current
  code's `Publishing` legacy `<p>` label is dropped in favor of the exact prototype
  string.
- **Publish checklist** (`:278-316`), **SEO snippet** (`:352-389`), **Taxonomy**
  (`:391-499`), **Danger zone** (`:508-535`): `<SectionCard title="…">` with the
  section body as children. The "SEO" badge (`:357`) moves to `action`.
- **"What is this?" help** (`:318-350`) is a collapsible whose header is a
  `<button>` toggle, not a static title — keep it as-is (or pass the toggle
  button via `action` with no `title`); it is NOT one of the prototype's three
  cards, so document the choice rather than forcing it into `SectionCard`.
- Provide `bodyClassName` matching each old `CardContent` spacing (e.g.
  `"space-y-4"`, `"space-y-3"`) since `SectionCard` supplies its own `p-5`
  padding — do NOT re-add `p-4`.
- Keep the `<Separator />` dividers (`:277` etc.) and the outer
  `space-y-6` stack between cards.

### 1. Extend props (`:67-90`)

**ALL new props are OPTIONAL** so this subtask compiles standalone. Per the strict
land order (514-04 = step 3, BEFORE 514-03 = step 4), the yet-unmodified
`EntryEditor.tsx` mounts `EntryMetadataPanel` at `:921` (desktop `aside`) and
`:954` (mobile `Sheet`) WITHOUT these props; making them required would break root
`tsc` until 514-03 lands. 514-03 always supplies them; the optional markers +
safe defaults keep every land green.

```ts
visibility?: "public" | "private" | "password";       // default "public"
onVisibilityChange?: (value: "public" | "private" | "password") => void;
accessPassword?: string;           // controlled input (empty unless user typed); default ""
onAccessPasswordChange?: (value: string | null) => void; // string = typed value; null = explicit clear signal (parent removes the password while staying password-protected)
hasPassword?: boolean;             // server truth: a hash already exists; default false
createdAt?: string | null;
updatedAt?: string | null;
entryId?: string | null;
revisionsSlot?: ReactNode;         // seam for TASK-487-02-L02; default undefined → renders nothing (see §5)
scrollable?: boolean;              // default true → wrap the card stack in ScrollArea (mobile Sheet); 514-03 passes false for the desktop in-grid mount → plain stacked SectionCards, no inner scroller (see §4)
```

Add `import type { ReactNode } from "react";` (or extend the existing `react`
type import) for the `revisionsSlot` type. **Naming:** this matches the parent's
canonical seam name `revisionsSlot?: ReactNode` (`TASK-514_…md:315`, also used on
the editor in 514-03 §5) — do NOT introduce a divergent `revisionsTrigger` name.

In the component body default the visibility control to `visibility ?? "public"`,
`accessPassword ?? ""`, `hasPassword ?? false`, and no-op the `on*Change`
callbacks if undefined (`onVisibilityChange?.(...)`), so the panel is safe when
mounted by the pre-514-03 editor.

### 2. Publish card — add Visibility (in the `Publish` `SectionCard` body from
§0, after Status `:257`, before Schedule `:259`)

```tsx
<div className="space-y-2">
  <label className="text-[11px] font-semibold uppercase text-muted-foreground">Visibility</label>
  <Select value={visibility ?? "public"} onValueChange={(v) => onVisibilityChange?.(v as ...)}>
    <SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="public">Public</SelectItem>
      <SelectItem value="private">Private</SelectItem>
      <SelectItem value="password">Password protected</SelectItem>
    </SelectContent>
  </Select>
  {visibility === "password" ? (
    <div className="space-y-1.5">
      <Input
        type="password"
        value={accessPassword ?? ""}
        onChange={(e) => onAccessPasswordChange?.(e.target.value)}
        placeholder={hasPassword ? "Leave blank to keep current password" : "Set a password"}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {hasPassword ? "A password is set. Enter a new one to change it." : "Required to protect this entry."}
        </p>
        {hasPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 text-[11px] text-muted-foreground hover:text-destructive"
            onClick={() => onAccessPasswordChange?.(null)}
          >
            Clear password
          </Button>
        ) : null}
      </div>
    </div>
  ) : null}
</div>
```

**Clear-password control (parent-mandated).** The parent (`TASK-514_…md:355-358`)
requires: "leaving it blank on save = no change; explicit clear button → sends
`accessPassword: null`. onChange handlers surface `{ visibility, accessPassword? }`".
This panel is the SOLE writer of the panel UI, so the explicit clear control lives
HERE. The `Clear password` `Button` is rendered ONLY when `hasPassword` is true (no
stored password ⇒ nothing to clear) and emits the parent's null signal via
`onAccessPasswordChange?.(null)` — this is why §1 types the callback as
`(value: string | null) => void`. Semantics passed up to 514-03's save path:
`null` = remove the stored password while the entry stays `visibility === "password"`
(distinct from an empty typed string, which means "leave blank on save = no change");
a non-empty string sets/replaces the password. 514-03 maps `null` → the payload's
`accessPassword: null` clear signal. The shared `Button` is already imported
(`:15`), so no new import is needed.

The Schedule field stays as-is (`:259-273`). The existing "Save metadata" button
(`:500-507`) persists visibility/password via the metadata payload (514-03 builds
it) — no separate save.

**In-card Publish / Save-draft buttons — DELIBERATELY CONSOLIDATED (not
implemented here).** The prototype Publish `SectionCard` ends with a `<Separator />`
+ a `Publish` (Rocket icon) `Button` + a ghost `Save draft` `Button`
(`EntryEditorPreview.tsx:110-119`; parent `TASK-514_…md:332`). This subtask does
**NOT** add those in-card buttons: 514-03's in-page `PageHeader` already renders
the real `Save draft` + `Publish/Update` (+ `Runtime preview`) actions
(`TASK-514-03-…md:74-76` — "keep the current action set: Runtime preview, Save
draft, Publish"), wired to the live save/publish path. Duplicating them inside
this card would create two competing publish controls over the same state, so the
prototype's card-footer buttons are intentionally re-homed into the 514-03
PageHeader actions cluster. Consequence for this card: after the Schedule row we
keep NO trailing `<Separator />`+buttons block — the card ends at Schedule. (The
panel's own footer "Save metadata" button in §4 persists metadata only and is
distinct from Publish.) Cite this rationale in the closure (514-06) as the
Publish-card fidelity deviation.

### 3. Metadata card (NEW `<SectionCard title="Metadata">`, place after Taxonomy
`:499`, before Save `:500`, mirroring the prototype `SectionCard`+`dl`
`:148-167` — title in the card's `border-b` header, NOT a `<p>` above a plain card)

```tsx
<SectionCard title="Metadata">
  <dl className="flex flex-col gap-2 text-sm">
    <Row dt="Created" dd={fmt(createdAt)} />
    <Row dt="Updated" dd={fmt(updatedAt)} />
    <Row dt="Author" dd={author?.name || author?.email || "—"} />
    <Row dt="Entry ID" dd={<span className="font-mono text-xs">{entryId ?? "—"}</span>} />
  </dl>
</SectionCard>
```
`fmt` = a local date formatter (reuse the `toLocaleDateString` pattern from
`EntryGrid.tsx:21-31` — do NOT import a component; inline a small helper). `Row`
= a tiny local `flex items-center justify-between` (`dt` muted, `dd` right).

### 4. Preserve everything else

Publish checklist (`:278-316`), "What is this?" help (`:318-350`), SEO snippet
card (`:352-389`, keep description-only), Taxonomy (`:391-499`), Save metadata
(`:500-507`), Danger zone (`:508-535`), author footer (`:538-550`) all remain —
but each is re-homed into the `SectionCard` primitive per §0 (its title now
lives in the card's `border-b` header, dropping the old `<section>`+`<p>` label),
so the column reads as the prototype's stacked in-card-header cards rather than
the legacy title-above-plain-card look. The Save metadata button + author footer
stay in the panel footer (outside the cards); the panel keeps its `ScrollArea`
+ footer for the desktop `aside` AND the mobile `Sheet` (both render this
component in 514-03).

### 5. Revisions-trigger seam (documented, NOT implemented)

Declare the optional `revisionsSlot?: ReactNode` prop (added to the §1 type block)
and render it as a documented extension point near the Metadata card — e.g.
`{revisionsSlot}` immediately after the Metadata `SectionCard`, wrapped so it
collapses to nothing when absent: `{revisionsSlot ?? null}` (a bare `{undefined}`
already renders nothing, so no extra guard is required). TASK-487-02-L02 plugs its
"History" `Button` / revision-drawer trigger into this slot. The name is
consistent with the parent seam and with 514-03's editor-side `revisionsSlot`
(`TASK-514_…md:315`, `TASK-514-03-…md:127-130`). Do not fetch or render revisions
here — this subtask only reserves the passthrough seam.

---

## Acceptance Criteria

1. Publish card shows Status + **Visibility** + Schedule; selecting "Password
   protected" reveals the password `Input`; other values hide it.
2. Password placeholder reflects `hasPassword` (keep vs set); typing a value is
   captured via `onAccessPasswordChange`. When `hasPassword` is true a **Clear
   password** button is shown and emits `onAccessPasswordChange(null)` (the parent's
   explicit clear signal); when `hasPassword` is false the clear button is absent.
3. **Metadata** card renders Created / Updated / Author / Entry ID with real
   values passed from 514-03.
4. Checklist, SEO snippet (description only), taxonomy quick-add, Save metadata,
   Danger zone, author footer all still work — no functionality lost.
5. SEO card retains ONLY the description field (no title/canonical/robots — that
   is 487-03-L02); a documented slot exists for those + the revisions trigger.
6. Renders correctly in both the desktop `aside` and mobile `Sheet` mounts (514-03),
   light + dark.
7. **Chrome fidelity:** every panel section uses `<SectionCard title=…>` from
   `@/ui/shared/SectionCard` (title inside the card's `border-b` header),
   matching the prototype `EntryEditorPreview.tsx:86/123/148`; the legacy
   `<section>`+uppercase `<p>`+`<Card><CardContent>` pattern is gone.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free (admin UI)

- Visibility select: choosing "password" shows the password input; choosing
  "public" hides it and (via 514-03 wiring, asserted there) clears the value.
- `onVisibilityChange`/`onAccessPasswordChange` fire on interaction.
- Clear password: with `hasPassword=true`, the **Clear password** button renders and
  clicking it fires `onAccessPasswordChange(null)` (assert the arg is `null`, not `""`);
  with `hasPassword=false` the button is not rendered.
- Metadata card renders passed Created/Updated/Author/Entry ID.
- Regression: checklist badge, SEO description textarea, tag add-on-Enter, Save
  metadata button still present + wired.
- Chrome: the section titles render — assert the exact `SectionCard` header text
  **`Publish`** (NOT `Publishing`), `Taxonomy`, and `Metadata` — so both the
  conversion off the legacy `<section>`+`<p>` pattern AND the prototype title
  fidelity (`EntryEditorPreview.tsx:86`) are proven; the `StatusBadge` still renders
  in the `Publish` header (now via `action`).

### SMOKE

Full visibility + metadata card flow at TASK-514-06 (real select, real reload).

---

## Deferred

SEO title/canonicalUrl/robots inputs (TASK-487-03-L02). Revision drawer + its
trigger wiring (TASK-487-02-L02).
