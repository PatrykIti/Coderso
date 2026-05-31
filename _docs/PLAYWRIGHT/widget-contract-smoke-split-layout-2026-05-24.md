# Widget Contract Smoke Results

- **Generated:** 2026-05-24T13:43:18.863Z
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
| `split-layout` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s5/v5<br>advanced:passed r1/s2/v2 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `split-layout` | passed | /test-split-layout-0516 | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-split-layout.png |
