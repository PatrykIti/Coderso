# Hero Widget Contract Smoke Results

- **Generated:** 2026-05-24T11:34:37.776Z
- **Command:** `bun scripts/playwright-widget-contract-smoke.ts --session widget-contract-task-336-11 --widget hero --output-json .tmp/widget-smoke-hero.json --output-md .tmp/widget-smoke-hero.md`
- **Admin:** `http://localhost:5173/admin`
- **Frontend:** `http://localhost:3000`
- **Widget:** `hero`

## Summary

- Admin failures: 0
- Public failures: 0
- Fixture gaps: 0
- Metadata gaps: 0

## Admin Mode Contract

| Widget | Status | Modes | Duplicate paths | Notes |
|---|---|---|---|---|
| `hero` | passed | wizard:passed r1/s3/v3<br>visual:passed r1/s11/v11<br>advanced:passed r1/s6/v6 | - | - |

## Public CSS Smoke

| Widget | Status | Path | HTTP | Overflow | Notes |
|---|---|---|---|---|---|
| `hero` | passed | `/homepage` | 200 | no | screenshot: `.tmp/playwright-widget-contract-smoke/screenshots/public-hero.png` |
