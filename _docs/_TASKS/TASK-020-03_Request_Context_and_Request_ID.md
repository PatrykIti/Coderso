# TASK-020-03: Request Context and Request ID
# FileName: TASK-020-03_Request_Context_and_Request_ID.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-020-01
**Status:** To Do

---

## Overview

Add a request context with request ID and timing for every API request, and expose it in headers and logs.

## Goals

- Generate UUID per request (configurable).
- Attach to `RouteContext` and response headers.
- Provide request duration for logging.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/middleware/requestId.ts` | `createRequestContext` middleware helper |
| `core/server/router.ts` | Extend `RouteContext` with `requestId` + `requestStart` |
| `core/server/httpServer.ts` | Call middleware before route handling; set header |

### Suggested shape

```ts
export type RequestContext = {
  requestId: string;
  requestStart: number; // ms timestamp
};
```

### Response header

- Default: `X-Request-Id`
- Use `securitySettings.requestId.headerName`

### Logging hooks

- For errors, include `requestId` in the log line.
- (Optional) add `Server-Timing` with total duration.

## Testing Requirements

- [ ] `tests/integration/routes/requestId.test.ts` expects header on any `/admin/api` response.
- [ ] `tests/unit/security/requestId.test.ts` validates header name override.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` request ID policy.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-request-context.md`
