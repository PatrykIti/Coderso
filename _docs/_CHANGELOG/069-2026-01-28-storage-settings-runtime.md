# Filename: 069-2026-01-28-storage-settings-runtime.md

# 69. Storage settings runtime configuration

**Date:** 2026-01-28  
**Version:** 0.1.0  
**Tasks:** TASK-005-09

## 🚀 Key Changes

### Core / Settings & Security
- Added encrypted secret storage for media provider credentials (AES-256-GCM).
- Added runtime storage settings service with DB-backed config and cache.
- Added settings API endpoints for storage configuration.

### Media
- Media adapter resolver now reads live storage settings (no restart required).
- Local media serving honors runtime storage config.

### Admin / UI
- Wired Storage Settings UI to live API with masked secrets and save flow.

### Tests
- Added unit tests for secret store, storage settings service, and settings client.

### Docs
- Documented runtime storage settings and master key requirements.
