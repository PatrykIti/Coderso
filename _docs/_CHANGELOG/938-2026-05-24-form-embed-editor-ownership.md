# 938 - Form Embed editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-10

## Key Changes

- Split Form Embed editor ownership so Wizard owns only form selection/setup diagnostics, Visual owns public copy and presentation controls, and Advanced is read-only runtime/security diagnostics.
- Added the `form-embed` v2 editor contract and shared editor section/control metadata for Playwright ownership smoke checks.
- Redacted raw nonce and public bot-protection key values from Advanced diagnostics snapshots while preserving the existing public form runtime/security pipeline.
- Updated Form Embed widget docs and targeted Vitest coverage for mode ownership, contract validation, and read-only Advanced behavior.
