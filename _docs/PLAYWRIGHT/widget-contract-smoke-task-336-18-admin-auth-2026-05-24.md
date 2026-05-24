# Widget Contract Smoke Results

- **Generated:** 2026-05-24T14:53:54.138Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** skipped

## Run Health

- Playwright CLI: available
- Admin reachable: yes
- Frontend reachable: not checked
- Admin auth: authenticated

## Summary

- Admin failures: 9
- Public failures: 0
- Fixture gaps: 19
- Metadata gaps: 2

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `section` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s7/v7<br>advanced:passed r1/s2/v2 | - | - |
| `template-section` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `grid-columns` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `split-layout` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s2/v2 | - | - |
| `tabs` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `accordion` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s4/v4 | - | - |
| `toggle-block` | metadata-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `spacer` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s2/v2 | - | - |
| `divider` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s4/v4<br>advanced:passed r1/s4/v4 | - | - |
| `stack` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s2/v2 | - | - |
| `hero` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s11/v11<br>advanced:passed r1/s6/v6 | - | - |
| `feature-grid` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `testimonials` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `pricing-plans` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `faq-accordion` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `cta-banner` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `logo-cloud` | metadata-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s5/v5<br>advanced:passed r1/s3/v3 | - | - |
| `gallery-mosaic` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s4/v4 | - | - |
| `stats-kpi` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `team` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `rich-text-section` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s4/v4 | - | - |
| `content-list` | fixture-gap | wizard:passed r1/s2/v2<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s3/v3 | - | - |
| `posts-feed` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s5/v5<br>advanced:passed r1/s4/v4 | - | - |
| `entry-teaser` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `product-gallery` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s5/v5<br>advanced:passed r1/s4/v4 | - | - |
| `product-compare` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `product-table` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s9/v9<br>advanced:passed r1/s2/v2 | - | - |
| `listing-filters` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:passed r1/s4/v4<br>advanced:passed r1/s4/v4 | - | - |
| `search-box` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s3/v3<br>advanced:passed r1/s3/v3 | - | - |
| `timeline` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:passed r1/s6/v6<br>advanced:passed r1/s2/v2 | - | - |
| `compare-timeline` | passed | wizard:passed r1/s4/v4<br>visual:passed r1/s6/v6<br>advanced:passed r1/s3/v3 | - | - |
| `newsletter` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `booking-calendar` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:passed r1/s2/v2 | - | - |
| `appointment-form` | fixture-gap | wizard:passed r1/s1/v1<br>visual:passed r1/s7/v7<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `form-embed` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |
| `contact` | fixture-gap | wizard:passed r1/s4/v4<br>visual:passed r1/s8/v8<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |
| `navigation` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s8/v8<br>advanced:failed r1/s0/v0 (mode_root_or_visible_section_missing) | - | - |
| `footer` | failed | wizard:failed r1/s0/v0 (mode_root_or_visible_section_missing)<br>visual:passed r1/s1/v1<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
