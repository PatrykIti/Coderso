# 829 - TASK-190 blueprint composer guide

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190-08-03, TASK-190-08

## Key Changes

### Documentation
- Added `_docs/BLUEPRINT_COMPOSER.md` as the capability authoring guide for
  stable ids, resource keys, provides/requires taxonomy, merge policies, gated
  domains, fixtures, security rules, diagnostics, and closure checklists.
- Updated the docs index, assistant site-builder contract, architecture docs,
  and testing strategy with the blueprint composer authoring and diagnostics
  owner seams.

### Assistant/Observability
- Added redacted blueprint composition diagnostics serialization for prompt
  hashes, selected/gated capability ids, action assembly traces, conflicts,
  no-duplicate matcher decisions, candidate scores, and provider-draft shape
  without raw prompt/provider snippets.
