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
ID `dl`). The current `EntryMetadataPanel` (`:226-552`) has Publishing (Status +
Schedule), Publish checklist, "What is this?" help, SEO snippet, Taxonomy, Save
metadata, Danger zone, and an author footer — but **no Visibility control** and
**no Metadata card**. This subtask adds Visibility + a Metadata card, re-homes the
existing sections into prototype-faithful `SectionCard`s, and preserves ALL
current functionality (checklist, SEO snippet, taxonomy quick-add, save, delete).

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
`Card`/`CardContent`, `StatusBadge`, `Separator`.

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
onAccessPasswordChange?: (value: string) => void;
hasPassword?: boolean;             // server truth: a hash already exists; default false
createdAt?: string | null;
updatedAt?: string | null;
entryId?: string | null;
```

In the component body default the visibility control to `visibility ?? "public"`,
`accessPassword ?? ""`, `hasPassword ?? false`, and no-op the `on*Change`
callbacks if undefined (`onVisibilityChange?.(...)`), so the panel is safe when
mounted by the pre-514-03 editor.

### 2. Publish card — add Visibility (in the Publishing `Card`, after Status
`:257`, before Schedule `:259`)

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
        {hasPassword ? "A password is set. Enter a new one to change it." : "Required to protect this entry."}
      </p>
    </div>
  ) : null}
</div>
```

The Schedule field stays as-is (`:259-273`). The existing "Save metadata" button
(`:500-507`) persists visibility/password via the metadata payload (514-03 builds
it) — no separate save.

### 3. Metadata card (NEW `SectionCard`/`section`, place after Taxonomy `:499`,
before Save `:500`, mirroring the prototype `dl` `:148-167`)

```tsx
<section className="space-y-3">
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</p>
  <Card><CardContent className="p-4">
    <dl className="flex flex-col gap-2 text-sm">
      <Row dt="Created" dd={fmt(createdAt)} />
      <Row dt="Updated" dd={fmt(updatedAt)} />
      <Row dt="Author" dd={author?.name || author?.email || "—"} />
      <Row dt="Entry ID" dd={<span className="font-mono text-xs">{entryId ?? "—"}</span>} />
    </dl>
  </CardContent></Card>
</section>
```
`fmt` = a local date formatter (reuse the `toLocaleDateString` pattern from
`EntryGrid.tsx:21-31` — do NOT import a component; inline a small helper). `Row`
= a tiny local `flex items-center justify-between` (`dt` muted, `dd` right).

### 4. Preserve everything else

Publish checklist (`:278-316`), "What is this?" help (`:318-350`), SEO snippet
card (`:352-389`, keep description-only), Taxonomy (`:391-499`), Save metadata
(`:500-507`), Danger zone (`:508-535`), author footer (`:538-550`) all remain.
Wrap each `section`'s body in a `Card`/`CardContent` (already the case) so the
column reads as prototype-style stacked cards. The panel keeps its
`ScrollArea` + footer for the desktop `aside` AND the mobile `Sheet` (both render
this component in 514-03).

### 5. Revisions-trigger seam (documented, NOT implemented)

Leave a clear extension point comment where TASK-487-02-L02 can add a "History"
`Button` (e.g. a `revisionsTrigger?: ReactNode` prop rendered near the Metadata
card) — declare the optional prop but render `null` if absent. Do not fetch or
render revisions here.

---

## Acceptance Criteria

1. Publish card shows Status + **Visibility** + Schedule; selecting "Password
   protected" reveals the password `Input`; other values hide it.
2. Password placeholder reflects `hasPassword` (keep vs set); typing a value is
   captured via `onAccessPasswordChange`.
3. **Metadata** card renders Created / Updated / Author / Entry ID with real
   values passed from 514-03.
4. Checklist, SEO snippet (description only), taxonomy quick-add, Save metadata,
   Danger zone, author footer all still work — no functionality lost.
5. SEO card retains ONLY the description field (no title/canonical/robots — that
   is 487-03-L02); a documented slot exists for those + the revisions trigger.
6. Renders correctly in both the desktop `aside` and mobile `Sheet` mounts (514-03),
   light + dark.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`.

### Vitest — Bun-free (admin UI)

- Visibility select: choosing "password" shows the password input; choosing
  "public" hides it and (via 514-03 wiring, asserted there) clears the value.
- `onVisibilityChange`/`onAccessPasswordChange` fire on interaction.
- Metadata card renders passed Created/Updated/Author/Entry ID.
- Regression: checklist badge, SEO description textarea, tag add-on-Enter, Save
  metadata button still present + wired.

### SMOKE

Full visibility + metadata card flow at TASK-514-06 (real select, real reload).

---

## Deferred

SEO title/canonicalUrl/robots inputs (TASK-487-03-L02). Revision drawer + its
trigger wiring (TASK-487-02-L02).
