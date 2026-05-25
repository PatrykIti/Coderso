# 950 - Template Section Editor Ownership

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets/Admin UI

- Template Section Advanced diagnostics now show human-readable template and
  content summaries instead of raw JSON payloads, raw template ids, or resolver
  error codes.
- Selecting or clearing a template now removes stale resolved payload data.
- Wizard remains one-time template setup, while Visual owns only daily
  presentation metadata.

### Runtime/QA/Docs

- Runtime now renders a safe placeholder when a template has a resolver error,
  even if legacy payloads still contain stale resolved blocks.
- Added focused Vitest coverage and strict Playwright evidence for the updated
  Visual/Advanced contract and public fixture path.
