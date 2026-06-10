# Cross-Cutting Audit — Catalog & Capability Gating (Command Palette)

## 1. Meta
- **Target:** `_gating` (cross-cutting — command-palette catalog & capability gating)
- **Kind:** cross-cutting
- **Date:** 2026-06-10
- **Audit HEAD:** `a06049ba` (TASK-418 closed). NOTE: another agent may be concurrently editing the source tree (418 sanity fixes); observations below reflect that snapshot.
- **Session:** `PW_SESSION="xcGating"`
- **Method:** Drove `playwright-cli` directly (sourced `.tmp/audit/lib.sh`; `auth`; `new_page "Audit Gating 0610 xc"`; `jsclick_text "Add section"` to open the palette; read every `[role=dialog]` button). Cross-checked source-of-truth in `core/services/pages/pageDocumentV2.ts`.
- **Evidence:** live palette button dump (below); source catalog `core/services/pages/pageDocumentV2.ts` lines 340–457.
- **Screenshot:** `.tmp/audit/shots/_gating-palette.png`
- **Page created:** `http://coderso-a.localhost:5173/admin/pages/53d76e1e-3bf3-435a-a48f-6514351c1cd5` (slug `/audit-gating-0610-xc`, draft).

## 2. Live palette inventory (what I actually saw)
Opening "Add section" launches a single unified Command palette (`[role=dialog]` aria-label `"Command palette"`). It exposes BOTH section and block insert entries in one list. Excluding the trailing "Close" button there are **exactly 25 entries**.

Precise entry titles, in order, as read live from the DOM:

```
Hero, Content, Feature grid, Media split, Timeline, Gallery, Comparison,
FAQ, Testimonials, CTA, Custom,                              (= 11 SECTIONS)
Heading, Text, Button, Image, Video, List, Card, Divider,
Spacer, Statistic, Quote, Container, Columns, Group          (= 14 BLOCKS)
```

### Sections present (11/11) — MATCH
hero, content, feature-grid (`Feature grid`), media-split (`Media split`), timeline, gallery, comparison, faq (`FAQ`), testimonials, cta (`CTA`), custom. ✅ All 11 expected section types present, no extras.

### Blocks present (14/14) — MATCH
heading, text, button, image, video, list, card, divider, spacer, statistic, quote, container, columns, group. ✅ All 14 expected block types present, no extras.

## 3. Gated types correctly ABSENT
Verified each is NOT an insertable palette entry (titles checked against the precise per-button title node, not raw substring — see note on false positives below):

| Gated SECTION | In palette? |
|---|---|
| template | ABSENT ✅ |
| navigation | ABSENT ✅ |
| collection | ABSENT ✅ |
| filters | ABSENT ✅ |
| lead-form | ABSENT ✅ |
| embed | ABSENT ✅ |

| Gated BLOCK | In palette? |
|---|---|
| gallery (block) | ABSENT ✅ (note: a `Gallery` *section* entry exists and is correct; the gated `gallery` *block* is not present) |
| form | ABSENT ✅ |
| collection | ABSENT ✅ |
| embed | ABSENT ✅ |
| icon | ABSENT ✅ |

**False-positive caveat:** a naive `dialog.innerText.includes(...)` substring scan flags `collection` and `embed` as "present" — but those hits come from the *description* copy of legitimate entries ("Visual **collection** section" on the Gallery section; "**Embed**ded video from media or URL" on the Video block). The per-button title extraction confirms neither `collection` nor `embed` exists as an actual insertable entry. Gating holds.

## 4. Source-of-truth corroboration (`pageDocumentV2.ts`)
The live palette exactly mirrors the capability registry:

- `insertableSectionTypes` (lines 340–352) = the same 11 sections. Gated sections carry capability reasons (lines 354–361): `template→template-section-boundary`, `navigation→runtime-navigation-boundary`, `collection→collection-section-boundary`, `filters→listing-section-boundary`, `lead-form→form-section-boundary`, `embed→embed-section-boundary`. `insertable=false` for all six.
- `editorInsertableBlockTypes` (lines 398–413) = the same 14 blocks. Block enum (`pageBlockTypes`, line ~22) additionally contains `gallery, form, collection, embed, icon` — all excluded from the editor-insertable set, hence gated from the palette. Capability reasons (lines 431–437): `gallery→gallery-editor-controls-pending`, `form→form-editor-controls-pending`, `collection→collection-editor-controls-pending`, `embed→embed-editor-controls-pending`, `icon→icon-runtime-renderer-pending`.

## 5. Public-runtime of gated blocks
- Author CANNOT place gallery/form/collection/embed/icon: they are absent from the palette (confirmed live) and `editorInsertable=false` in the registry. So no new page can introduce these blocks via the editor. This is the effective mitigation for the original §5.4 complaint (gray placeholders).
- Runtime renderer state (registry, lines 441–443): `realRuntimeBlockTypes` marks gallery/form/collection/embed as `runtimeRenderer:"real"` but they remain non-insertable; **`icon` is NOT in `realRuntimeBlockTypes`**, so `icon` still has `runtimeRenderer:"placeholder"`. The placeholder code path in `pageRendererV2.tsx` (e.g. icon `case "icon":` at line 841) is therefore still reachable only for legacy/assistant docs, not for editor-authored pages.
- I scanned the live pages list (126 pages, all `/audit-*` fixtures). None is an assistant-built page exercising gated blocks, so no live placeholder-vs-real front observation was available; the gating record above stands as the conclusion.

## 6. Comparison vs original TASK-417 report §5.7
TASK-417 §5.7 complained only **8 sections + 8 blocks** were reachable. Now **11 sections + 14 blocks** are reachable from the palette — a clear **IMPROVEMENT** (+3 sections, +6 blocks). Gating of the 6 sections + 5 blocks is intentional (capability boundaries / editor-controls-pending) and correctly enforced in both the UI and the registry.

## 7. Verdict
- **WORKS** — severity **low**.
- Why: palette exposes exactly the intended 11 sections + 14 blocks; all 6 gated sections and 5 gated blocks (template/navigation/collection/filters/lead-form/embed; gallery-block/form/collection/embed/icon) are correctly absent; live UI matches the source registry; net improvement over TASK-417's 8+8. Only residual: `icon` still maps to a placeholder runtime renderer (`icon-runtime-renderer-pending`), but it is non-insertable so unauthored pages cannot surface it.
