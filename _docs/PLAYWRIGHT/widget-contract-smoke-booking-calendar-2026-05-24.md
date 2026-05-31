# Widget Contract Smoke Results

- **Generated:** 2026-05-24T12:48:32.285Z
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
| `booking-calendar` | fixture-gap | wizard:passed r1/s3/v3<br>visual:passed r1/s6/v6<br>advanced:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing) | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `booking-calendar` | passed | /test-booking-calendar-0516 | 200 | no | - |
