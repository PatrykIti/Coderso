# 894. TASK-283-02 section background media and layering model

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-283-02

## Key Changes

### Section runtime

- `SectionData.style.backgroundMedia` now owns bounded decorative image/video data, including library or external sources, video poster metadata, fit, position, opacity, blend mode, and layer ordering.
- `SectionBlock` now renders fail-closed background image/video layers with deterministic `data-section-background-media` and `data-section-layer-order` markers while keeping content above the decorative surface stack.
- Decorative background videos always render as muted, looping, `autoPlay`, `playsInline`, `aria-hidden`, and poster-capable media without widening the Section contract into interactive playback.

### Section editor and docs

- The Section Visual editor now exposes a `Background media and layers` surface with `MediaPicker`-backed asset resolution, Hero-compatible external URL handling, stale-request protection, and video poster/title/description controls.
- Focused runtime, editor, and validator coverage now prove normalized media payloads, bounded layer controls, safe URL fail-closed behavior, and synchronized editor state.
- Section docs, the Playwright report rows for C2 and W11, and the task board now reflect the shipped background-media/layering contract.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (blocked by missing local `semgrep`, `trivy`, and `gitleaks` executables; `bun audit` ran)
- `bun run precommit`
- `git diff --check`
