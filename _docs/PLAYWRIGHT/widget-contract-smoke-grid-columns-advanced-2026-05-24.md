# Widget Contract Smoke Results

- **Generated:** 2026-05-24T13:54:34.253Z
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
- Fixture gaps: 0
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `grid-columns` | passed | advanced:passed r1/s3/v3 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `grid-columns` | passed | /test-grid-columns-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-grid-columns.png |
