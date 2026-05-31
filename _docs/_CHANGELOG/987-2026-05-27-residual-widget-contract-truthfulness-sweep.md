# 987 - Residual widget contract truthfulness sweep

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-339, TASK-339-15

## Key Changes

- Closed the remaining low-risk contract wording/order mismatches across the
  residual widget set after the larger hero-parity leaves landed.
- Updated stale Wizard titles and Advanced summary wording for the remaining
  layout/support/runtime widgets without introducing new UI surfaces or fresh
  writable controls.
- Removed the last stale `posts-feed` Advanced runtime-summary contract claim
  and synchronized the final minor section ordering drift in `section`,
  `content-list`, and `listing-filters`.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/contentList.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/postsFeed.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- Quick Playwright admin pass rechecked `booking-calendar` and `appointment-form`
