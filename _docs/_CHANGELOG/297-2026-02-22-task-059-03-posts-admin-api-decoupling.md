# 297 - TASK-059-03 Posts Admin API Decoupling

- **Date:** 2026-02-22
- **Version:** 0.1.297
- **Tasks:** TASK-059, TASK-059-03

## Key Changes

### Admin Posts API Contract
- Domknieto `core/server/routes/postsRoutes.ts` jako post-native API layer dla `/admin/api/posts*`.
- Usunieto legacy fallbacki `entry_*` z mapowania bledow.
- Utrzymano zgodny kontrakt endpointow i payloadow dla `core/admin/services/postsClient.ts`.

### Error Mapping Hardening
- Error mapping jest jawny dla posts domain:
  - `post_not_found` -> `404`
  - `post_slug_conflict` -> `409`
  - `post_revision_not_found` -> `404`
  - `post_validation_failed` -> `400`

### Route-Level Tests
- Rozszerzono testy `tests/integration/routes/postsRoutes.test.ts`:
  - komplet endpointow `/posts*`,
  - lista wymaganych permission scopes (`content:read`, `content:write`, `content:publish`),
  - kontrakt `mapPostError`.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/postsRoutes.test.ts tests/unit/content/postsService.test.ts tests/unit/admin/postsClient.test.ts tests/integration/posts/posts-revisions-flow.test.ts`

## Result
- TASK-059-03 is closed: admin posts API is now cleanly aligned with the decoupled posts domain contract.
