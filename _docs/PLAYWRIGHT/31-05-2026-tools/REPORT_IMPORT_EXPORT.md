# Import / Export - Playwright Audit

Date: 31-05-2026  
Route: `/admin/tools/import-export`

## What Was Clicked

- Sidebar Tools -> Import / Export.
- Activity Log button.
- Export option checkboxes for Content Types, Pages, and Media.
- Per-card options chevron buttons.
- Download buttons for all three export cards.
- Import dropzone/file input with invalid JSON.
- Import dropzone/file input with a valid exported JSON bundle.
- Apply Import.
- Recent Imports search field.

## What Worked

- The route loaded successfully.
- All three export cards rendered.
- Export checkboxes could be toggled visually.
- Download buttons called the export API and returned downloadable JSON files.
- Invalid JSON produced an import error.
- A valid export bundle produced an import preview.
- Apply Import returned a successful backend response.

## What Did Not Work

### [ISSUE] Export option checkboxes do not affect the download

Evidence:

- Playwright toggled every checkbox on all export cards.
- Each Download action still called the same export endpoint and returned the
  same full bundle shape.

Why:

- `ExportCards` renders options with uncontrolled `defaultChecked`.
- `onExport(card.id)` passes only the card ID.
- `ImportExportPage.handleExport` ignores the target/card ID and downloads the
  full export bundle.

How to fix:

- Define an export request schema with target and include options.
- Store option state per card.
- Send selected options to the API and filter the generated bundle accordingly.
- Add tests that toggle options and assert request payload plus export shape.

### [ISSUE] Per-card options chevrons have no behavior

Evidence:

- Playwright clicked the chevron button on every export card.
- No menu opened and card text did not change.

Why:

- The button is rendered without a menu/action handler.

How to fix:

- Wire it to a menu of advanced export settings, or remove/disable the button.
- Add an interaction test for the menu or disabled state.

### [ISSUE] Activity Log button has no behavior

Evidence:

- Playwright clicked Activity Log.
- The URL and visible UI did not change.

Why:

- The button is rendered without a handler or route.

How to fix:

- Link it to an import/export activity route or modal.
- If activity is not implemented, disable the button and expose current activity
  in the Recent Imports table only.

### [ISSUE] Accepted file types are inconsistent

Evidence:

- The UI text says `.json, .csv, .zip up to 50MB`.
- The file input accepts `.json`.
- The import parser uses `JSON.parse`.

Why:

- `ImportDropzone` copy advertises CSV/ZIP support that the client parser and
  input accept list do not implement.

How to fix:

- Either limit the visible copy to JSON, or add real CSV/ZIP parsing and backend
  validation.
- Keep the input `accept`, help text, client parser, and route schema aligned.

### [ISSUE] Recent Imports search does not filter

Evidence:

- Playwright typed a search term in Recent Imports.
- The same static rows remained visible.

Why:

- `ImportDropzone` uses static `importHistory`.
- The search input is uncontrolled and is not connected to filtering.

How to fix:

- Store search state and filter the activity table locally, or back it with a
  real import-history API.
- Add tests for matching and no-results history searches.

## Source References

- `core/admin/ui/import-export/ImportExportPage.tsx`
- `core/admin/ui/import-export/ExportCards.tsx`
- `core/admin/ui/import-export/ImportDropzone.tsx`
- `core/admin/api/importExportClient.ts`
- `core/server/routes/admin/importExportRoutes.ts`

