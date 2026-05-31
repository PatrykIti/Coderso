# Widget Contract Smoke Results

- **Generated:** 2026-05-26T02:00:48.958Z
- **Dry run:** no
- **Inventory:** 38/38 widgets
- **Admin:** http://localhost:5173/admin
- **Frontend:** http://localhost:3000
- **Playwright session:** task-336-19-product-gallery-query-color

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
| `product-gallery` | passed | visual:passed r1/s10/v10<br>advanced:passed r1/s6/v6 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `product-gallery` | passed | /test-product-gallery-widget | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
