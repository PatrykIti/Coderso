# TASK-541-03: Parity, Property, Round-trip, and Closure

# FileName: TASK-541-03-Parity-Property-Roundtrip-And-Closure.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-541-01, TASK-541-02
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only here after implementation validation)

---

## Goal

Prove one generated corpus behaves identically through canonical owner, admin emit,
menu write and widget render; verify real save/reopen/computed-color behavior; document
profiles and close changelog/task state without reopening source contracts.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-541-03-L01 | Shared parity suite, smoke, docs, audits, and closure | ⏳ To Do |

## Ownership

This technical subtask owns tests/docs/closure only. Production source reopens only
through a separately recorded verified drift fix and fresh targeted validation. The two
TASK-541-01 service suites are landed, read-only gates; this subtask reruns them and adds
parity only in its enumerated consumer test files.

## Security Contract

No endpoint/security-model changes. Tests must prove positive-list rejection again at
menu write and widget render, without logging raw unsafe strings or adding scanner
exceptions.

## Acceptance

- Every authoring value emitted by admin is accepted with the same canonical bytes by
  menu/widget authoring boundaries.
- Inherited-only values are accepted only by explicit inherited contexts.
- Round-trip/persistence and real computed styles agree.
- Six light/dark browser flows have zero console errors.
- Docs, descendants, board/index and changelog 1253 are synchronized.
