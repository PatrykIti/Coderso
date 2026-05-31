# Widget Contract Smoke Results

- **Generated:** 2026-05-26T05:17:12.864Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000
- **Playwright session:** task-336-19-raw-summary-hero

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
| `hero` | passed | visual:passed r1/s13/v13<br>advanced:passed r1/s8/v8 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `hero` | passed | /homepage | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
