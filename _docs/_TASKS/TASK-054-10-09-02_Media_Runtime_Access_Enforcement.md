# TASK-054-10-09-02: Media Runtime Access Enforcement
# FileName: TASK-054-10-09-02_Media_Runtime_Access_Enforcement.md

**Priority:** High  
**Category:** Runtime Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-09-01  
**Status:** Done (2026-02-18)

---

## Goal
Apply delivery access mode to runtime media requests.

## Scope
1. Add media access evaluator (`public|internal`).
2. In `/media/*` handler:
   - `public` => current behavior,
   - `internal` => require authenticated session or API key scope.
3. Keep existing rate-limit behavior.

## Pseudocode
```ts
if (delivery.accessMode === "public") {
  allow current /media behavior
}

if (delivery.accessMode === "internal") {
  user = attachUserFromSession(cookies)
  if (user) requirePermission("media:read")
  else {
    apiKey = authenticateApiKey(authorization)
    require apiKey && apiKey.scopes includes "media.read"
  }
  serve media
}
```

## Acceptance Criteria
1. Anonymous requests to internal media return 401.
2. API key without `media.read` returns 403.
3. Authorized requests return media payload normally.
