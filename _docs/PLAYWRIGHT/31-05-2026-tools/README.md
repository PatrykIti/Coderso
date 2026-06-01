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
- A deeper follow-up pass on 2026-06-01 created real test data instead of only
  clicking static controls:
  - a published page fixture for Search, SEO Manager, and Analytics,
  - a manual backup through the Backups dialog,
  - an Import / Export JSON roundtrip through the file input,
  - a redirect created through the Redirects drawer and checked against the
    public runtime.
- The test session used `http://localhost:5173/admin` because
  `coderso-b.localhost` did not resolve in Node/Playwright in this environment.
- The credential note available during the task was stale for this checkout, so
  the audit used a temporary backend-created admin session instead of resetting
  the shared admin password.
- Claude CLI was attempted outside its sandbox, but its own API authentication
  failed with `401 Invalid authentication credentials`; the reports therefore
  rely on Playwright evidence and local code review.

## Deep-Pass Outcome

- Search found a real published page fixture.
- SEO Manager saved title and description into the SEO document, but those
  values did not render in the public page HTML.
- Analytics showed the published page fixture in API top content and UI top
  content.
- Backups created a queued backup row, but no artifact, size, download, restore,
  or completion path was produced.
- Import / Export successfully downloaded, previewed, applied, verified, and
  restored a valid JSON bundle. A malformed menu id passed preview but failed
  during apply with a server 500.
- Redirects created an admin redirect row, but the public runtime returned 404
  for the source path instead of redirecting.
