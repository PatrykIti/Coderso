# Widget Contract Smoke Results

- **Generated:** 2026-05-24T21:18:52.570Z
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
| `product-gallery` | passed | visual:passed r1/s8/v8<br>advanced:passed r1/s4/v4 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `product-gallery` | passed | /test-product-gallery-widget | 200 | no | screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-gallery.png |
