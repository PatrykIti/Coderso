# Widget Contract Smoke Results

- **Generated:** 2026-05-24T12:47:57.137Z
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
| `content-list` | passed | wizard:passed r1/s2/v2<br>visual:passed r1/s7/v7<br>advanced:passed r1/s3/v3 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `content-list` | fixture-gap | /test-content-list-0516 | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-content-list.png |
