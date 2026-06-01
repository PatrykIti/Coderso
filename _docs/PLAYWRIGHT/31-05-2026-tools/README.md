# Tools UI Playwright Audit - 31-05-2026

This folder contains the manual-plus-Playwright audit reports for the CMS admin
Tools area.

## Scope

The audit covered every entry currently exposed under Tools in the admin
sidebar:

- Search (`/admin/search`)
- SEO Manager (`/admin/seo`)
- Analytics (`/admin/analytics`)
- Backups (`/admin/backups`)
- Import / Export (`/admin/tools/import-export`)
- Redirects (`/admin/redirects`)

## Reports

- [Tools section overview](REPORT_TOOLS_SECTION_OVERVIEW.md)
- [Search](REPORT_SEARCH.md)
- [SEO Manager](REPORT_SEO_MANAGER.md)
- [Analytics](REPORT_ANALYTICS.md)
- [Backups](REPORT_BACKUPS.md)
- [Import / Export](REPORT_IMPORT_EXPORT.md)
- [Redirects](REPORT_REDIRECTS.md)

## Method

- Browser automation used Playwright against the running local admin UI.
- The test session used `http://localhost:5173/admin` because
  `coderso-b.localhost` did not resolve in Node/Playwright in this environment.
- The credential note available during the task was stale for this checkout, so
  the audit used a temporary backend-created admin session instead of resetting
  the shared admin password.
- Claude CLI was attempted outside its sandbox, but its own API authentication
  failed with `401 Invalid authentication credentials`; the reports therefore
  rely on Playwright evidence and local code review.

