# Filename: 031-2026-01-27-core-http-server-admin-bootstrap.md

# 31. Core HTTP server and admin bootstrap

**Date:** 2026-01-27  
**Version:** 0.1.0  
**Tasks:** TASK-004-01, TASK-004-06

## Key Changes

### Core Server
- Added Bun HTTP server handling `/admin` and `/admin/api` with cookie helpers, JSON parsing, and error mapping.
- Centralized admin route registration via `registerAllRoutes`.
- Added dev bootstrap to run the server with Vite proxy when needed.

### Admin UI
- Added Vite admin entry (`index.html`, `main.tsx`, `AdminApp`) and SSR entry stub.
- Configured Vite build output for `/admin` assets.

### Testing
- Added route matcher and error handler tests.
- Added auth route registration tests.
