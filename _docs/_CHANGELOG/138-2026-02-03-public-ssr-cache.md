# Public SSR cache

- Added LRU HTML cache for public pages and content routes with TTL configuration.
- Cache revalidation on publish/unpublish and theme profile updates.
- Introduced `site.cacheTtlSeconds` setting (0 disables cache).
