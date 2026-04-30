# TASK-244-05-01: Widget Surface Clear Test Matrix and Docs Closure

# FileName: TASK-244-05-01_Widget_Surface_Clear_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widgets + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-244-05
**Status:** To Do

---

## Overview

Create and execute the final TASK-244 validation matrix. The implementer must
not close the task based only on broad lint/type success; every real surface
problem needs targeted proof.

## Sub-Tasks

- None. This is an execution leaf.

## Required Matrix

| Group | Runtime proof | Editor proof | Docs proof |
|---|---|---|---|
| Hero/shared controls | `tests/vitest/widgets/hero.test.tsx`, `tests/vitest/widgets/heroEditors.test.tsx`, and `tests/vitest/widgets/section.test.tsx` prove cleared gradient/background/overlay/button backgrounds omit output | `tests/vitest/ui/hero-editor-wave.test.tsx` and `tests/vitest/ui/section-editor-wave.test.tsx` prove `Clear` removes nested `background`/`style` keys | `_docs/_WIDGETS/HERO.md`, `_docs/_WIDGETS/SECTION.md`, `_docs/WIDGETS.md` |
| Screen widgets | `tests/vitest/widgets/screenWidgets.test.tsx` proves cleared screen frame surfaces omit background classes/styles | `tests/vitest/ui/custom-screen-binding-panel.test.tsx` plus `ScreenEditors.tsx` coverage proves removed style keys | `_docs/WIDGETS.md`, `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` where two-column docs change |
| Operational widgets | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/widgets/appointmentForm.test.tsx`, `tests/vitest/widgets/listingFilters.test.tsx`, `tests/vitest/widgets/searchBox.test.tsx`, `tests/vitest/widgets/productGallery.test.tsx`, `tests/vitest/widgets/productTable.test.tsx`, `tests/vitest/widgets/productCompare.test.tsx` prove cleared shells/tables/cards omit forced backgrounds | The seven operational editor-wave tests listed in TASK-244-03-02 prove `Clear` removes keys | `_docs/WIDGETS.md`; exact new `_docs/_WIDGETS/*.md` files only if introduced |
| Composite/content widgets | `tests/vitest/widgets/gridColumns.test.tsx`, marketing/content Vitest widget suites, and Bun-owned `tests/unit/widgets/contentList.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`, `tests/unit/widgets/entryTeaser.test.tsx` prove cleared surfaces/overlays omit output | The sixteen editor-wave tests listed in TASK-244-04-01 prove `Clear` removes keys | Exact docs listed in TASK-244-04-01 |
| Form/shell/panel widgets | `tests/vitest/widgets/contact.test.tsx`, `tests/vitest/widgets/newsletter.test.tsx`, `tests/vitest/widgets/formEmbed.test.tsx`, `tests/vitest/widgets/navigation.test.tsx`, `tests/vitest/widgets/footer.test.tsx`, `tests/vitest/widgets/accordionWidget.test.tsx`, `tests/vitest/widgets/tabs.test.tsx`, `tests/vitest/widgets/toggleBlock.test.tsx` prove cleared backgrounds omit output | The eight editor-wave tests listed in TASK-244-04-02 prove `Clear` removes keys | `_docs/_WIDGETS/CONTACT.md`, `_docs/_WIDGETS/NEWSLETTER.md`, `_docs/_WIDGETS/FORM_EMBED.md`, `_docs/_WIDGETS/NAVIGATION.md`, `_docs/_WIDGETS/FOOTER.md`, `_docs/WIDGETS.md` |

Every group must also include a negative payload assertion: `Clear` must not
write `"transparent"` or an empty string solely as an off-state sentinel.

## Testing Requirements

- Run all targeted suites from implementation leaves.
- Grep/diff review after implementation:
  - no new `"transparent"` off-state writes in editor clear handlers;
  - no `backgroundColor: "transparent"` assertions used as proof of clear when
    the contract requires omitted output;
  - saved widget payload fixtures omit cleared fields.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
- Final:
  - `bun run gates:coderso`
  - `bun run precommit` before manual commit
- DB-backed suites:
  - source `.env` first when required by the touched Bun-owned suites:
    `set -a && source .env && set +a`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` files named by TASK-244 implementation leaves
- `_docs/_TASKS/TASK-244*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Closure Notes

Fill this section during implementation closure.

- Final changelog number:
- Validation commands:
- Known skipped suites:
- Remaining exclusions:

## Acceptance Criteria

1. Matrix is complete and references real tests.
2. TASK-244 task files are marked Done only after implementation validates.
3. Board counts and changelog index are synchronized.
4. Any skipped tests or compatibility exceptions are explicit.
5. Closure notes include explicit no-transparent-sentinel evidence for every
   implemented clear path.
