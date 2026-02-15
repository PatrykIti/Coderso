# 221-2026-02-15 - Admin rate limit auth bypass

Date: 2026-02-15
Version: Unreleased
Tasks: TASK-020-06

## Key Changes
- Core/Security: Skip admin rate limiting for authenticated users to prevent UX lockouts while keeping auth rate limits active.
- Docs: Clarified admin rate limit behavior for logged-in sessions.
- Tests: Added coverage for authenticated admin rate limit bypass.
