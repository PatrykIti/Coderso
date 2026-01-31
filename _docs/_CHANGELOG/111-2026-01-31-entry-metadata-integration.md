# Entry Metadata Integration (2026-01-31)

## Added
- Entry metadata support: tags, scheduling, and SEO snippet wiring.
- New `/content/:type/entries/:id/metadata` endpoint for metadata updates.
- Entry Editor metadata panel now uses real author/tags/SEO data.

## Changed
- `content_entries` schema extended with `tags` and `scheduled_at`.
- Entry services now sync SEO fields via `seo_documents`.

## Tests
- Added unit tests for entry metadata service and UI panel.
- Added admin client test for metadata endpoint.

## Docs
- Updated CMS API, Data Model, and Architecture notes.

