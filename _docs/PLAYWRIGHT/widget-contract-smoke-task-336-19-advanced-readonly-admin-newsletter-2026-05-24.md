# Widget Contract Smoke Results

- **Generated:** 2026-05-24T19:09:49.760Z
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

- Admin failures: 0
- Public failures: 0
- Fixture gaps: 1
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `newsletter` | fixture-gap | wizard:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `newsletter` | passed | /test-newsletter-widget-0516 | 200 | no | - |
