# TASK-541-03: Parity, Property, Round-trip, and Closure

# FileName: TASK-541-03-Parity-Property-Roundtrip-And-Closure.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Menu / Form / Retained Compatibility / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-541-01, TASK-541-02
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Goal

Prove one generated corpus's original authoring inputs behave identically through
the canonical owner, authoring-profile admin emit, Menu authoring, Form's explicit
inherited-profile superset, and applicable retained render seams. Prove inherited-
only emissions separately and only at explicitly declared inherited controls, then
prove normalized-byte idempotence. Verify real save/reopen/computed-color behavior;
document profiles and close changelog/task state without reopening source contracts.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-541-03-L01 | Shared parity suite, smoke, docs, audits, and closure | ✅ Done |

## Ownership

This technical subtask owns one additive parity test, docs, evidence, and closure
only. Production source reopens only through a separately recorded verified drift
fix and fresh targeted validation. The two TASK-541-01 service suites are landed,
read-only gates; this subtask reruns them and adds parity only in its new suite.

## Security Contract

No endpoint/security-model changes. Tests must prove positive-list rejection again
at Menu/Form write and retained render, including the registered internal Form
create/update schema seam, without logging raw unsafe strings or adding scanner
exceptions.

## Acceptance

- Every value emitted by an authoring-profile admin control is accepted with the
  same canonical bytes by Menu, Form's inherited-profile superset, and each
  applicable authoring/inherited retained consumer.
- Inherited-only values are emitted and accepted only by explicitly declared
  inherited controls/contexts; no parity claim incorrectly includes default admin,
  Menu, or Page authoring.
- Original corpus inputs—not only pre-normalized expectations—reach every declared
  consumer, while a separate pass proves canonical bytes are idempotent.
- Each source-owned consumer normalizer proves raw-before-rewrite behavior at the
  exact cap, cap + 1, C0/C1 controls, and non-ASCII whitespace.
- Round-trip/persistence and real computed styles agree.
- At least seven light/dark browser flows have zero console errors, including a
  deep-nested Menu path and a Form `currentColor` submit-style flow bound through a
  supported Form block on a published Page.
- Docs, descendants, board/index and changelog 1253 are synchronized.
