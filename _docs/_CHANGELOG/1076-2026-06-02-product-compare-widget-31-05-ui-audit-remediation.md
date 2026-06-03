# 1076 - Product Compare widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-386, TASK-386-01, TASK-386-02

## Key Changes

### CMS Widgets / Product Compare

- Product Compare Advanced now marks saved search, collection, and status filters inactive while selected products own runtime resolution.
- Product Compare keeps selected-product runtime semantics unchanged and preserves dormant saved query filters for authors.

### Commerce Fixtures / Playwright

- Product Compare smoke bootstrap now seeds media-backed commerce products, a safe `/fixture-products/:slug` products route, and an out-of-stock fixture product.
- Product Compare smoke now patches and publishes the audited page with image, title-link, and CTA-ready settings.
- Generated smoke proof now verifies Product Compare admin and public images, safe product title links, and visible CTAs.

### QA / Docs

- Added Product Compare Advanced inactive-filter regression coverage.
- Added smoke helper coverage for Product Compare route/page fixture builders and authenticated admin API bootstrap.
