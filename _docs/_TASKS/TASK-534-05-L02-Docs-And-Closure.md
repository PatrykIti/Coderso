# TASK-534-05-L02: Docs + Changelog Closure

# FileName: TASK-534-05-L02-Docs-And-Closure.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-05
**Priority:** High
**Category:** Docs
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Final closure: writes the changelog entry, flips the TASK-534 tree
to Done, records the ≥5-scenario Playwright smoke evidence, and appends a
gap-closure note to `_TMP-cms-ograniczenia.md` marking the §1 "Brak
interaktywności JS" / §4.9 #9 items now closed (tabs/switcher, filter, magnetic,
scroll-hint, noise). Runs LAST (after 534-01..04 + 534-05-L01 landed + gates
green + live smoke passed).

## Grounded anchors

- Changelog dir `_docs/_CHANGELOG/` — `1242` is the last used (TASK-530). GREP
  next-free at closure; 534 lands at `1243+` after 531/532/533 (do NOT hard-code;
  the orchestrator may have consumed intermediate numbers — re-grep).
- Closure precedent: TASK-521 closure (`1234-2026-…-task-521-page-motion-effects.md`)
  + its parent "Closure changelog" line format.
- Report to annotate: `_TMP-cms-ograniczenia.md` §1 (🔴 Brak interaktywności JS),
  §4.9 #9 (lekka interaktywność), § Panel "wybierz klimat" (role=tablist/aria),
  § Hero (scroll-hint), § Hero/Proces (grain washes).

## Implementation pseudocode

```md
<!-- _docs/_CHANGELOG/<next-free>-<date>-task-534-declarative-interactivity.md -->
# TASK-534 — Declarative interactivity: tabs/switcher block, filterable gallery,
#           polish (noise overlay / scroll-hint / magnetic). Absorbs TASK-527.
- New `switcher` block (role=tablist, N panels), filterable `gallery`,
  `scrollHint` block, `block.style.magnetic`, section/page `noiseOverlay`.
- All ride the ONE pageEffectsRuntime <script>; present-only; no npm dep; no
  migration; no schemaVersion bump. Reproduces _docs/projekty-domow-wow-site.
- Gates: tsc / lint:types / vitest / bun test / gates:coderso green.
- Smoke: ≥5 scenarios light+dark, 0 console errors (screenshots in _smoke/).

<!-- flip Status ✅ Done in TASK-534*.md; annotate _TMP-cms-ograniczenia.md -->
```

## Security note

Docs only — no code. Confirms the Security Contract items were satisfied and the
smoke security-negatives (enum fail-closed, category kebab-drop, escaped labels)
passed, for the closure record.

## Regression / owned-breaking-test notes

- Do NOT edit `_docs/_TASKS/README.md` or existing `_docs/_CHANGELOG/*` entries
  (orchestrator-owned) — ADD the one new changelog file only.
- Verify ALL gates green + the live ≥5-scenario smoke passed BEFORE flipping Done
  (owner mandate: acceptance is measured live, not checklist).

## Hard Invariants

1. Closure changelog number grepped next-free at closure (not hard-coded).
2. Done flipped only after gates + live smoke pass.
3. `_TMP-cms-ograniczenia.md` gap items annotated closed.
