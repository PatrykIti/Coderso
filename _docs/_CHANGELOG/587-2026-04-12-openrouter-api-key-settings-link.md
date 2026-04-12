# 587. OpenRouter API key settings link

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09

## Key Changes

### Assistant Settings
- Added Assistant settings copy and link to the OpenRouter integration secret configuration.
- Kept OpenRouter API key storage in Settings -> Integrations, where `apiKey` is encrypted and not exposed in Assistant card payloads.

### Docs
- Updated settings/integrations docs to use canonical `llm-guide` terminology and point OpenRouter API key setup to Settings -> Integrations.
