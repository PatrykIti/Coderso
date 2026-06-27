# TASK-479-21-L01: Solution Kits Gallery Restyle
# FileName: TASK-479-21-L01-Solution-Kits-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Solution Kits
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-21
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Solution Kits screen to match the prototype. Port the
prototype's **featured violet banner** and soft **kit card grid** (icon tile with
per-kit tone, includes badges, active/selected state, soft action button) onto
the existing `SolutionKitsPage.tsx` + `SolutionKitCard.tsx`, preserving every
behavior: the cache-hydrated kit catalog, kit selection persistence, the selected-
kit detail panel, and the Reviewed Site Builder assistant handoff.

- **Goal:** A Notion-like, violet-accented Solution Kits screen: warm canvas, a
  rounded `bg-primary` featured banner with a glow blob and an AI-assembled
  badge, then a responsive grid of soft `rounded-2xl` kit cards (icon tile, kit
  title, description, includes badges, "Selected" success badge on the active
  kit, soft select button) — with zero behavior changes.
- **Owning module/service:** `core/admin/ui/kits/SolutionKitsPage.tsx` +
  `core/admin/ui/kits/SolutionKitCard.tsx`, reusing
  `core/admin/ui/shared/PageHeader.tsx`, `core/admin/ui/layouts/AdminShell.tsx`,
  and `core/admin/components/ui/{card,badge,button,alert}.tsx`.
- **Source-of-truth docs:** `_docs/SOLUTION_KITS.md`,
  `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/DESIGN_TOKENS.md`. **Ports from:**
  `_docs/_PROTOTYPE/src/pages/advanced/SolutionKitsPage.tsx`, tokens in
  `_docs/_PROTOTYPE/src/styles/theme.css`, shared primitives in
  `_docs/_PROTOTYPE/src/components/{ui,patterns}`.
- **Out of scope:** No change to `solutionKitsClient` (`listSolutionKitsCached`,
  `getSolutionKitCached`), `cachePolicy` keys/TTLs, `cacheBus`,
  `solutionKitSelection` (localStorage + selection events), `useSolutionKits` /
  `useSolutionKitRuns`, or `openAssistantPanel`. No new endpoints, no install/
  apply action. Do NOT add a real "Apply kit" mutation — the prototype's "Apply
  kit" label is decorative; keep the real read-only selection semantics (see the
  reconciliation note below).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Reads stay on `listSolutionKitsCached` /
`getSolutionKitCached`; the active kit stays persisted via `solutionKitSelection`
(localStorage key `coderso.solutionKits.activeKit.v1` + selection events). No new
fields enter client cache, logs, or debug payloads; full-site generation continues
to run only through the reviewed assistant intake (`openAssistantPanel`).

---

## Implementation Pseudocode

Concrete shapes — port the prototype's visual structure but bind it to the REAL
state already in `SolutionKitsPage.tsx`. **Keep all existing hooks, effects,
handlers, and the cache-hydrate + background-revalidation flow untouched**; only
the returned JSX and the card class names change.

### Reconciliation note (read first)

The prototype is a simplified gallery (8 demo kits, an "Apply kit" button, a
"Browse all kits" banner CTA). The REAL screen has 5 catalog kits, a read-only
selection model, a selected-kit detail panel, and a Reviewed Site Builder CTA.
Port the prototype's **look**, not its demo affordances:

- Prototype "Active" / "Re-apply kit" → maps to the real **active/selected**
  state (`isActive`); keep the existing **"Selected" / "Select kit"** labels.
  Do NOT rename to "Apply kit"/"Re-apply kit" (the kits page test asserts the
  page does NOT contain "Apply kit").
- Prototype "Browse all kits" banner button → the canonical reviewed-flow CTA
  ALREADY exists in the right-column **Reviewed Site Builder** card (the existing
  `openAssistantPanel({ mode: "llm-guide", message: REVIEWED_SITE_BUILDER_PROMPT, reset: true })`
  "Open LLM Guide" button, which is out of scope to remove). To avoid a
  **duplicate CTA**, keep the featured banner a **non-action visual hero**
  (heading + "AI assembled" badge + copy) and do NOT add a second "Open LLM Guide"
  button. Never introduce a new install path.

**Shared-token/primitive provenance (do NOT redefine here):** every soft tone
(`bg-primary-soft`/`bg-success-soft`/`bg-warning-soft`/`bg-info-soft` + `text-primary`/
`text-success`/`text-warning`/`text-info`), `shadow-card`, `font-display`, and the
`variant="soft"` / `variant="success"` Badge & Button options are **tokens/variants
from TASK-479-05**. `Card`/`Badge`/`Button`/`Alert`, `PageHeader`, and `AdminShell`
are the **TASK-479-06-L02** restyled shells. This leaf only consumes them.

### 1) Page layout (`SolutionKitsPage.tsx` — JSX only)

```tsx
// Real state stays EXACTLY: useSolutionKits(), selectedId/effectiveSelectedId,
// selectedKit (getSolutionKitCached effect), handleSelectKit (setActiveSolutionKitId),
// selectedSummary/manifest memo, the error Alert, and the reviewed-flow CTA.
// PORT layout from prototype pages/advanced/SolutionKitsPage.tsx:
//   PageHeader (title + "Beta" badge) -> featured violet banner -> kit card grid,
// with the existing right-column (Reviewed Site Builder + Selected kit details)
// preserved. The existing xl two-column grid may stay; insert the banner ABOVE it.

<AdminShell activeHref="/admin/advanced/solution-kits" breadcrumbs={["Coderso", "Solution Kits"]}>
  <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
    <PageHeader title="Solution Kits" description="..." actions={<Badge variant="outline">Beta</Badge>} />

    {error ? <Alert variant="destructive">...</Alert> : null}

    {/* Featured banner — port prototype banner chrome as a NON-ACTION visual hero.
        The reviewed-flow CTA lives ONCE in the right-column Reviewed Site Builder
        card (see §4) — do NOT add a second "Open LLM Guide" button here. */}
    <Card className="relative overflow-hidden border-0 bg-primary p-7 text-primary-foreground shadow-card">
      <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative max-w-lg">
        <Badge className="mb-3 border-white/20 bg-white/15 text-white"><Sparkles className="size-3" /> AI assembled</Badge>
        <h2 className="font-display text-2xl font-bold">Launch a full site in minutes</h2>
        <p className="mt-1.5 text-sm text-white/80">Pick a kit and Coderso scaffolds pages, widgets, and content types — then open the Reviewed Site Builder to generate.</p>
      </div>
    </Card>

    {/* existing 2-col grid preserved: kit cards (left) + reviewed/detail (right) */}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(24rem,1fr)]"> ... </div>
  </div>
</AdminShell>
```

### 2) Per-kit icon + tone (render-time derivation, NO new API)

```tsx
// The prototype hard-codes icon+tone per kit. The real catalog has 5 fixed ids.
// Map deterministically by id (pure, render-time). Fallback handles unknown ids.
// Tone tokens (`-soft` backgrounds + accent text) come from TASK-479-05; this
// leaf only consumes them. The 5 keys are the EXACT `SolutionKitId` members in
// core/admin/services/solutionKitsClient.ts (automotive-workshop, medical-clinic,
// beauty-salon, services-directory, small-ecommerce) — do not invent ids.
import { Car, Stethoscope, Scissors, ListChecks, ShoppingBag, Boxes } from "lucide-react";
const KIT_VISUALS: Record<SolutionKitId, { icon: LucideIcon; tone: string }> = {
  "automotive-workshop": { icon: Car,        tone: "bg-warning-soft text-warning" },
  "medical-clinic":      { icon: Stethoscope, tone: "bg-info-soft text-info" },
  "beauty-salon":        { icon: Scissors,    tone: "bg-primary-soft text-primary" },
  "services-directory":  { icon: ListChecks,  tone: "bg-success-soft text-success" },
  "small-ecommerce":     { icon: ShoppingBag, tone: "bg-primary-soft text-primary" },
};
const visualFor = (id: SolutionKitId) => KIT_VISUALS[id] ?? { icon: Boxes, tone: "bg-muted text-muted-foreground" };
// Pass icon+tone down to SolutionKitCard (new optional props), OR derive inside
// the card from kit.id. Keep it a pure prop — do not fetch anything.
```

### 3) Kit card (`SolutionKitCard.tsx` — restyle, preserve wiring)

```tsx
// KEEP props { kit, isActive, onSelect } and the onSelect(kit.id) call EXACTLY.
// Restyle to the prototype card: rounded-2xl, soft shadow, icon tile, includes badges.
<Card className={cn("flex h-full flex-col rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-card",
  isActive && "border-primary/70 ring-1 ring-primary/30")}>
  <div className="flex items-start justify-between">
    <span className={cn("flex size-12 items-center justify-center rounded-2xl", tone)}>
      <Icon className="size-6" />
    </span>
    {isActive ? <Badge variant="success"><Check className="size-3" /> Selected</Badge> : null}
  </div>

  <div className="mt-4 font-display text-[15px] font-semibold">{kit.title}</div>
  <p className="mt-1 text-sm text-muted-foreground">{kit.shortDescription}</p>

  {/* includes badges: port prototype outline badges from REAL data */}
  <div className="mt-3 flex flex-wrap gap-1.5">
    {kit.recommendedModules.slice(0, 4).map((m) => (
      <Badge key={m} variant="outline" className="capitalize">{m.replaceAll("-", " ")}</Badge>
    ))}
  </div>

  {/* PRESERVE selection semantics + labels (no "Apply kit") */}
  <Button variant={isActive ? "soft" : "outline"} size="sm" className="mt-4 w-full"
    onClick={() => onSelect(kit.id)}>
    {isActive ? "Selected" : "Select kit"}
  </Button>
</Card>
```

### 4) Right column (Reviewed Site Builder + Selected kit details)

```tsx
// Restyle the two right-column cards to rounded-2xl / soft shadow + violet
// primary actions. DO NOT touch: openAssistantPanel CTA, the read-only note,
// the manifest/required/recommended/optional module badges, post-install list,
// or selectedKit loading state. Only spacing, radii, shadow, and accent change.
```

**Data flow:** unchanged. `listSolutionKitsCached` hydrate (lazy initial cache in
`useSolutionKits`) → `items` → kit grid; `getSolutionKitCached(effectiveSelectedId)`
effect → `selectedKit` detail; `handleSelectKit` → `setActiveSolutionKitId`
(localStorage + selection event). Icon/tone and includes badges are pure render-
time derivations of the real kit data (no new fetch, no setState-in-effect).

**Error handling:** unchanged — keep the existing destructive `Alert` for
`error`, the "Loading solution kits..." card while the cache is cold, and the
"Manifest details will appear after refreshing this kit." fallback. The restyle
must not swallow or relocate any of these surfaces.

**React-hooks / cache rules to honor (call out in PR):** icon/tone maps and
includes slices are pure render-time derivations (no sync setState in effects);
the existing `getSolutionKitCached` effect keeps its `active` cleanup guard; no
mount-force refetch added; no dirty-state overwrite; nav stays on `AdminShell` +
`activeHref` / `breadcrumbs` — do not hand-build any href; route any nav through
the canonical `adminPaths` / `AdminLink` helpers if links are added.

**Regression-test shape (delivered in L02):** featured banner renders as a
non-action hero (heading + AI-assembled badge); the single reviewed-flow CTA
("Open LLM Guide") stays in the Reviewed Site Builder card and is NOT duplicated
in the banner; grid renders one card per cached kit with title + recommended-
module badges; the active kit shows the "Selected" badge and "Selected" button
label; clicking a non-active card's button calls `onSelect` (persists via
`setActiveSolutionKitId`); the page still contains "Reviewed Site Builder" /
"Open LLM Guide" and does NOT contain "Apply kit".

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/solutionKitsClient.test.ts`
- The new restyle suite from L02 (`tests/vitest/ui-integration/solution-kits-restyle.test.tsx`).
- Manual: light + dark toggle on `/admin/advanced/solution-kits`; confirm the
  featured banner, kit-card grid, active/selected state, kit selection
  persistence, selected-kit details, and the Reviewed Site Builder CTA all behave
  as before.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` board + Statistics on status change.
- `_docs/_CHANGELOG/` entry on closure, linking `TASK-479` + `TASK-479-21-L01`.
- `_docs/SOLUTION_KITS.md` — only if a user-visible label changes (e.g. the banner
  hero heading or the reviewed-flow CTA label); document no behavior change.
