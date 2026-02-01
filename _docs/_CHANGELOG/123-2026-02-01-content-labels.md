# Content labels update

## Summary
- Renamed the admin “Entries” section to “Content” for a more WordPress-like UI.
- Added singular/plural label handling based on the selected content type.
- Updated search UI labels to match the new content naming.

## Tasks
- TASK-066

## Files touched
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/entries/EntryMetadataPanel.tsx`
- `core/admin/ui/entries/contentTypeLabels.ts`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/search/SearchPage.tsx`
- `core/admin/ui/search/SearchResults.tsx`
- `core/admin/ui/search/useSearchResults.ts`
- `tests/unit/ui/content-entries.test.tsx`
- `tests/unit/ui/search-results.test.tsx`
