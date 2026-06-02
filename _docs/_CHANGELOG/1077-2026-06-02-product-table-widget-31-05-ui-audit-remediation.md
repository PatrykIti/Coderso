# 1077 - Product Table widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-387, TASK-387-01, TASK-387-02

## Key Changes

### CMS Widgets / Product Table

- Product Table Advanced now distinguishes saved collection/status filter toggles from visible visitor controls when runtime options are unavailable.
- Saved public filter intent remains visible for authors without implying a public fieldset is active.

### Commerce Fixtures / Playwright

- Product Table smoke bootstrap now seeds media-backed commerce products, a safe `/fixture-products/:slug` products route, and an out-of-stock fixture product.
- Product Table smoke now patches and publishes the audited page with image, linked Product column, and action CTA-ready settings.
- Generated smoke proof now verifies Product Table admin and public images, safe Product-column links, and visible action CTAs.

### QA / Docs

- Added Product Table Advanced inactive-filter regression coverage.
- Added smoke helper coverage for Product Table page-data fixture and authenticated admin API bootstrap.
