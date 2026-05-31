# TASK-336-19 Booking + Appointment Focused Probe

Date: 2026-05-26

- **Tool:** `playwright-cli`
- **Session:** `widget-contract-smoke-task-336-19-booking-focused`
- **Widgets:** `booking-calendar`, `appointment-form`
- **Result:** passed

## Checks

| Check | Result |
|---|---:|
| Initial Wizard tabs on completed widgets | 0 |
| `Run setup again` visible | yes |
| Visual controls missing metadata | 0 |
| Advanced controls missing metadata | 0 |
| Advanced writable paths | 0 |
| Advanced raw inputs | 0 |
| Advanced `<pre>` payloads | 0 |
| Visual raw technical inputs for flow/destination/locale/endpoint paths | 0 |
| Raw `Flow key` text | no |
| Raw endpoint label text | no |
| Raw URL label text | no |
| Raw locale label text | no |
| Raw captcha enum text | no |

## Notes

The focused probe inspected daily Visual and Advanced surfaces after selecting
each fixture block. Appointment Form showed the page-first after-submit
destination picker in Visual. Consent privacy/terms destination pickers are
covered by Vitest because toggling consent in Playwright intentionally dirties
the fixture page.
