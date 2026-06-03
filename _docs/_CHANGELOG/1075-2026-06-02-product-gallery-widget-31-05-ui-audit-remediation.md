# 1075 - Product Gallery widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-385, TASK-385-01, TASK-385-02

## Key Changes

### CMS Widgets / Product Gallery

- Product Gallery Advanced now distinguishes active manual curation from preserved inactive manual selections in query mode.
- Product Gallery smoke bootstrap now seeds deterministic media, attaches it to commerce products, and publishes a link/view-all-ready audit page.
- Product Gallery admin smoke now verifies admin/public images, ready product links, and visible view-all output.
- Product Gallery smoke inventory now targets the 31-05 audit page and no longer carries the old empty-fixture marker.

### QA / Docs

- Added Product Gallery editor regression coverage for inactive preserved manual selections.
- Added smoke helper coverage for Product Gallery page-data fixture and authenticated commerce/media/page seeding.
