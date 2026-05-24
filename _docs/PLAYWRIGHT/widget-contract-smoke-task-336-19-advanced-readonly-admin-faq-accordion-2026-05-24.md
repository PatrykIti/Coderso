# Widget Contract Smoke Results

- **Generated:** 2026-05-24T19:09:10.917Z
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
| `faq-accordion` | passed | wizard:passed r1/s1/v1<br>visual:passed r1/s7/v7<br>advanced:passed r1/s4/v4 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `faq-accordion` | passed | /test-faq-accordion-0516 | 200 | no | - |
