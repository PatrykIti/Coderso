# 969 - Raw Advanced payload and preset cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Replaced visible raw Advanced JSON/payload snapshots in Contact, CTA Banner,
  Hero, Posts Feed, Pricing Plans, Rich Text Section, and Stats KPI with
  human runtime or saved-content summaries.
- Kept Advanced support actions review/confirmation gated, including Pricing
  Plans plan-alignment and payload-cleanup actions.
- Removed Hero Visual preset JSON import/export from the normal editor surface;
  presets remain create/apply/update/delete with search and sort.
- Added missing destination-picker control metadata in CTA Banner, Hero, and
  Pricing Plans so Playwright no longer reports unowned writable controls.
- Updated widget docs, task notes, and regression tests to lock the
  beginner-safe Wizard/Visual/Advanced contract.

## Validation

- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-raw-summary-*-2026-05-26.*`
