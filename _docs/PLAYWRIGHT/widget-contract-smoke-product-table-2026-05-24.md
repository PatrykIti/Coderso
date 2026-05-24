# Widget Contract Smoke Results

- **Generated:** 2026-05-24T12:50:37.772Z
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
- Fixture gaps: 2
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `product-table` | fixture-gap | wizard:passed r1/s1/v1<br>visual:fixture-gap r0/s0/v0 (admin_fixture_unopenable:block_select_missing)<br>advanced:passed r1/s2/v2 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `product-table` | fixture-gap | /producttabletestproducttabletest | 200 | no | public_fixture_empty; empty fixture; screenshot: .tmp/playwright-widget-contract-smoke/screenshots/public-product-table.png |
