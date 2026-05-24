# Widget Contract Smoke Results

- **Generated:** 2026-05-24T00:57:17.930Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: yes
- Admin auth: authenticated

## Summary

- Admin failures: 17
- Public failures: 2
- Fixture gaps: 29
- Metadata gaps: 13

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | metadata-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s7/v7<br>advanced:passed r1/s2/v2 | - | - |
| `template-section` | fixture-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s3/v3<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `grid-columns` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `split-layout` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s5/v5<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `tabs` | metadata-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s6/v6 | - | - |
| `accordion` | fixture-gap | wizard:passed r1/s2/v2<br>visual:passed r1/s4/v4<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `toggle-block` | metadata-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `spacer` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s3/v3<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `divider` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s4/v4<br>advanced:passed r1/s4/v4 | - | - |
| `stack` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s5/v5<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `hero` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s10/v10<br>advanced:passed r1/s2/v2 | - | - |
| `feature-grid` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `testimonials` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `pricing-plans` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `faq-accordion` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `cta-banner` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `logo-cloud` | metadata-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s5/v5<br>advanced:passed r1/s3/v3 | - | - |
| `gallery-mosaic` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s7/v7<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `stats-kpi` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `team` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s4/v4<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `rich-text-section` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `content-list` | fixture-gap | wizard:passed r1/s2/v2<br>visual:passed r1/s6/v6<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `posts-feed` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `entry-teaser` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `product-gallery` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s5/v5<br>advanced:passed r1/s4/v4 | - | - |
| `product-compare` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `product-table` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s10/v10<br>advanced:passed r1/s2/v2 | - | - |
| `listing-filters` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `search-box` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s3/v3<br>advanced:passed r1/s3/v3 | - | - |
| `timeline` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s2/v2 | - | - |
| `compare-timeline` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `newsletter` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `booking-calendar` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>advanced:failed r1/s0/v0 (mode_root_or_visible_section_missing) | - | - |
| `appointment-form` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `form-embed` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `contact` | fixture-gap | wizard:passed r1/s4/v4<br>visual:passed r1/s8/v8<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `navigation` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s8/v8<br>advanced:failed r1/s0/v0 (mode_root_or_visible_section_missing) | - | - |
| `footer` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s1/v1<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `section` | passed | /section-widget-test | 200 | no | - |
| `template-section` | fixture-gap | - | - | - | public_fixture_missing |
| `grid-columns` | passed | /test-grid-columns-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-grid-columns.png |
| `split-layout` | passed | /test-split-layout-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-split-layout.png |
| `tabs` | passed | /test-tabs-0516 | 200 | no | - |
| `accordion` | passed | /test-accordion-0516 | 200 | no | - |
| `toggle-block` | passed | /test-toggle-block-0516 | 200 | no | - |
| `spacer` | passed | /test-spacer-0516 | 200 | no | - |
| `divider` | passed | /test-divider-0516 | 200 | no | - |
| `stack` | fixture-gap | /test-stack-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-stack.png |
| `hero` | passed | /homepage | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
| `feature-grid` | passed | /featuregridtest | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-feature-grid.png |
| `testimonials` | failed | /test-testimonials-0516 | 200 | no | card_overflow_unmarked; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-testimonials.png |
| `pricing-plans` | passed | /test-pricing-plans-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-pricing-plans.png |
| `faq-accordion` | passed | /test-faq-accordion-0516 | 200 | no | - |
| `cta-banner` | passed | /test-cta-banner-0516 | 200 | no | - |
| `logo-cloud` | passed | /test-logo-cloud-0516 | 200 | no | - |
| `gallery-mosaic` | passed | /gallery-mosaic-test-0516 | 200 | no | - |
| `stats-kpi` | passed | /stats-kpi-audit-0516 | 200 | no | - |
| `team` | failed | /test-team-0516 | 200 | no | card_overflow_unmarked; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-team.png |
| `rich-text-section` | passed | /richtextsectiontest | 200 | no | - |
| `content-list` | fixture-gap | /test-content-list-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-content-list.png |
| `posts-feed` | passed | /posts-feed-test-page | 200 | no | - |
| `entry-teaser` | passed | /test-entry-teaser-0516 | 200 | no | - |
| `product-gallery` | fixture-gap | /test-product-gallery-widget | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
| `product-compare` | fixture-gap | /test-product-compare-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-compare.png |
| `product-table` | fixture-gap | /producttabletestproducttabletest | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-table.png |
| `listing-filters` | passed | /test-listing-filters-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-listing-filters.png |
| `search-box` | fixture-gap | - | - | - | public_fixture_missing |
| `timeline` | fixture-gap | - | - | - | public_fixture_missing |
| `compare-timeline` | passed | /test-compare-timeline-0516 | 200 | no | - |
| `newsletter` | passed | /test-newsletter-widget-0516 | 200 | no | - |
| `booking-calendar` | passed | /test-booking-calendar-0516 | 200 | no | - |
| `appointment-form` | passed | /test-appointment-form-0516 | 200 | no | - |
| `form-embed` | fixture-gap | - | - | - | public_fixture_missing |
| `contact` | passed | /contact-audit-0516 | 200 | no | - |
| `navigation` | passed | /homepage | 200 | no | - |
| `footer` | passed | /test-footer-widget-0516 | 200 | no | - |
