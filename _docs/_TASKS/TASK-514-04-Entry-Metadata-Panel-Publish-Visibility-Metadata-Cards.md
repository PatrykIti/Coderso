# TASK-514-04: Entry Metadata Panel — Publish (Status+Visibility+Schedule) / Taxonomy / Metadata Cards

# FileName: TASK-514-04-Entry-Metadata-Panel-Publish-Visibility-Metadata-Cards.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Admin UI / Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-514-02 (client `visibility`/`hasPassword` fields + payload)
**Status:** ✅ Done
**Completed:** 2026-07-06

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
  `Publish` (`EntryEditorPreview.tsx:86`; parent `TASK-514_…md:406`); the current
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
- **Drop the inter-card `<Separator />` dividers (`:277`/`:317`/`:351`/`:390`/`:510`).**
  The prototype's right column is `<div className="flex flex-col gap-6">`
  (`EntryEditorPreview.tsx:85`) — three `SectionCard`s separated by the `gap-6`
  stack ONLY, with ZERO horizontal `<Separator />` between them (verified in
  source AND live). Once every section becomes a bordered `SectionCard`, those
  retained inter-card separators are non-prototype chrome that contradicts the
  "exactly as the prototype" mandate, so remove them and rely on the outer
  stack spacing alone. (The prototype's SOLE `<Separator />` lives INSIDE the
  Publish card before its Publish/Save-draft buttons at `:111` — a block this
  subtask omits per §2, so no in-card separator is added either.) Keep the
  outer `space-y-6` stack between cards for the gap-only separation.

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
onAccessPasswordChange?: (value: string) => void; // typed value; empty on save = keep current password (removing a password is done by switching Visibility to public/private — see §2)
hasPassword?: boolean;             // server truth: a hash already exists; default false
createdAt?: string | null;
updatedAt?: string | null;
entryId?: string | null;
revisionsSlot?: ReactNode;         // seam for TASK-487-02-L02; default undefined → renders nothing (see §5)
scrollable?: boolean;              // default true → wrap the card stack in ScrollArea (mobile Sheet); 514-03 passes false for the desktop in-grid mount → plain stacked SectionCards, no inner scroller (see §4)
```

Add `import type { ReactNode } from "react";` (or extend the existing `react`
type import) for the `revisionsSlot` type. **Naming:** this matches the parent's
canonical seam name `revisionsSlot?: ReactNode` (`TASK-514_…md:391`, also used on
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
      <p className="text-[11px] text-muted-foreground">
        {hasPassword
          ? "A password is set. Enter a new one to change it, or switch Visibility to Public/Private to remove it."
          : "Required to protect this entry."}
      </p>
    </div>
  ) : null}
</div>
```

**No standalone Clear-password button — removing a password is done via Visibility
(reconciled with 514-01 + parent authoritative semantics).** There is deliberately
NO "Clear password" control that clears the hash while the entry stays
`visibility === "password"`. That path is not supported end-to-end and would create
an incoherent state (password-protected with no password): the service (514-01 §3,
the SOLE writer + authoritative spec) only clears the stored hash when `visibility`
switches to `public`/`private` (`metadataUpdate.accessPassword = null`), and under
`visibility === "password"` a falsy `accessPassword` KEEPS the existing hash; a
subsequent save with no password would then hit the `entry_password_required`
precondition. The parent's authoritative submission-semantics table
(`TASK-514_…md` §"Read/write asymmetry") lists exactly two clear paths — omit =
keep, switch to public/private = clear — and no clear-while-password path.
Therefore the ONLY "remove the password" affordance is changing Visibility to
Public/Private (which 514-01 clears). The password `Input` behaves as: empty on
save = keep the current password (`hasPassword` true) or set none yet (`hasPassword`
false); a non-empty string sets/replaces the hash. The callback is typed
`(value: string) => void` (§1) — no `null` clear signal is emitted.

**Schedule — functional editable Input retained (documented prototype deviation).**
The prototype renders Schedule as a compact READ-ONLY styled row — a bordered muted
box with a Calendar icon + `Schedule` label and a right-aligned date string
(`<div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">…<Calendar/> Schedule …Jun 27, 2026</div>`,
`EntryEditorPreview.tsx:105-110`; verified live) — i.e. static display, no entry
affordance. The CMS must let the author actually SET/edit the schedule date, so this
subtask KEEPS the current functional labeled "Schedule date" `Input` (with the
`Calendar` overlay + `canSchedule` disable/placeholder) as-is (`:259-273`) rather
than the prototype's static row. This is an intentional fidelity deviation for the
same reason as the in-card Publish buttons below (prototype static-display element vs.
required live functionality); cite it in the closure (514-06) alongside the
Publish-card deviation. (If a follow-up wants the prototype's compact-row look while
staying editable, the date entry can move behind an inline popover editor triggered
from that row — out of scope here.) The existing "Save metadata" button
(`:500-507`) persists visibility/password via the metadata payload (514-03 builds
it) — no separate save.

**In-card Publish / Save-draft buttons — DELIBERATELY CONSOLIDATED (not
implemented here).** The prototype Publish `SectionCard` ends with a `<Separator />`
+ a `Publish` (Rocket icon) `Button` + a ghost `Save draft` `Button`
(`EntryEditorPreview.tsx:110-119`; parent `TASK-514_…md:407-408`). This subtask does
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
(`:500-507`), Danger zone (`:508-535`) all remain — but each is re-homed into the
`SectionCard` primitive per §0 (its title now lives in the card's `border-b`
header, dropping the old `<section>`+`<p>` label), so the column reads as the
prototype's stacked in-card-header cards rather than the legacy
title-above-plain-card look. The Save metadata button stays in the panel footer
(outside the cards).

**Remove the legacy author avatar footer (`:538-550`) — author now lives ONLY in
the new Metadata card (§3), matching the prototype.** The prototype shows the
author EXACTLY once, as an `Author` row inside the Metadata `SectionCard`
(`EntryEditorPreview.tsx:158-161`), and has NO author footer anywhere (the
component ends at `:176` with the "Non-functional" note; verified in source and
live). The current code's dedicated avatar footer (`:538-550`) has no prototype
counterpart, and keeping it while §3 adds the `Author` metadata row would render
the author TWICE. Delete the footer block so the author appears solely in the
Metadata card. (The `author` prop is now consumed by the Metadata `Author` row in
§3, so the prop is still used — no prop removal.)

**ScrollArea is `scrollable`-gated, NOT unconditional (reconciled with 514-03 §3).**
514-03 removes the desktop `w-96 aside` (its bounded height was what let an internal
`ScrollArea` scroll) and mounts the panel directly in the unbounded `320px` grid
track, where an internal `ScrollArea` would collapse / break. Therefore the card
stack + footer are wrapped in `ScrollArea` **only when the `scrollable` prop (§1,
default `true`) is true** — the mobile `Sheet` mount (514-03 passes the default) gets
the bounded `ScrollArea`; the desktop in-grid mount (514-03 passes `scrollable={false}`)
renders the cards + footer as plain stacked elements in normal document flow with NO
inner scroller. Concretely: `scrollable ? <ScrollArea>{stack}</ScrollArea> : <>{stack}</>`.
This supersedes the earlier "`ScrollArea` for the desktop `aside` AND the mobile
`Sheet`" wording — the desktop `aside` no longer exists once 514-03 lands.

### 5. Revisions-trigger seam (documented, NOT implemented)

Declare the optional `revisionsSlot?: ReactNode` prop (added to the §1 type block)
and render it as a documented extension point near the Metadata card — e.g.
`{revisionsSlot}` immediately after the Metadata `SectionCard`, wrapped so it
collapses to nothing when absent: `{revisionsSlot ?? null}` (a bare `{undefined}`
already renders nothing, so no extra guard is required). TASK-487-02-L02 plugs its
"History" `Button` / revision-drawer trigger into this slot. The name is
consistent with the parent seam and with 514-03's editor-side `revisionsSlot`
(`TASK-514_…md:391`, `TASK-514-03-…md:127-130`). Do not fetch or render revisions
here — this subtask only reserves the passthrough seam.

---

## Acceptance Criteria

1. Publish card shows Status + **Visibility** + Schedule; selecting "Password
   protected" reveals the password `Input`; other values hide it.
2. Password placeholder + helper text reflect `hasPassword` (keep vs set); typing a
   value is captured via `onAccessPasswordChange` (typed as `(value: string) => void`).
   There is NO standalone "Clear password" button — the helper text points the user to
   switch Visibility to Public/Private to remove a stored password (the only
   service-supported clear path; see §2 and 514-01 §3).
3. **Metadata** card renders Created / Updated / Author / Entry ID with real
   values passed from 514-03.
4. Checklist, SEO snippet (description only), taxonomy quick-add, Save metadata,
   Danger zone all still work — no functionality lost. The legacy author avatar
   footer (`:538-550`) is REMOVED (author now shows once, in the Metadata card,
   per the prototype — see §3/§4); assert the panel renders NO avatar footer.
5. SEO card retains ONLY the description field (no title/canonical/robots — that
   is 487-03-L02); a documented slot exists for those + the revisions trigger.
6. Renders correctly in both 514-03 mounts — the desktop in-grid `320px` column
   (`scrollable={false}`, plain stacked cards, no inner scroller) and the mobile
   `Sheet` (`scrollable` default true → bounded `ScrollArea`) — light + dark.
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
- No Clear-password button: assert that NO "Clear password" control renders in the
  Publish card in either `hasPassword=true` or `hasPassword=false` state (removing a
  password is a Visibility switch, not a button); the helper text differs by
  `hasPassword` (set-a-new-one/switch-to-remove vs required-to-protect).
- Metadata card renders passed Created/Updated/Author/Entry ID; the author name
  appears EXACTLY ONCE (in the Metadata card) — assert NO separate avatar footer
  renders (the legacy `:538-550` footer is removed, matching the prototype).
- `scrollable` prop: with `scrollable={false}` (desktop in-grid) the card stack
  renders with NO `ScrollArea` wrapper; with `scrollable` default/true (mobile
  Sheet) the stack is wrapped in `ScrollArea` (assert the scroller presence/absence).
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
