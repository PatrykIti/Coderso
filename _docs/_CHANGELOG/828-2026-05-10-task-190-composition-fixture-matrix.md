# 828 - TASK-190 composition fixture matrix

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190-08-01, TASK-190-08

## Key Changes

### Assistant/QA
- Added the TASK-190 mixed blueprint composition fixture matrix for single-pack
  regressions, mixed-capability setup prompts, gated booking/checkout, Mabudo-like
  tier-A parity, and server-derived resource-catalog reuse.
- Added provider red-team fixtures for action-array injection, SQL/path payloads,
  secret-bearing drafts, raw media uploads, ambiguous media filenames, and
  LLM-unavailable catalog-backed planning.
- Added an opt-in OpenAI/OpenRouter live-provider matrix that keeps supported
  mixed setup prompts on the local-first composed path and verifies gated module
  metadata remains non-executable.

### Documentation
- Synchronized the LLM Guide acceptance and live coverage matrices for the new
  TASK-190-08-01 fixture and live-provider lanes.
