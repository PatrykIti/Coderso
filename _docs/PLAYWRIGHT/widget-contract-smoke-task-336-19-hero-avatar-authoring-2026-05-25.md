# Widget Contract Smoke Results

- **Generated:** 2026-05-25T02:13:10.215Z
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
| `hero` | passed | visual:passed r1/s11/v11<br>advanced:passed r1/s6/v6 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `hero` | passed | /homepage | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-hero.png |
