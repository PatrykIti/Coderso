# Changelog: Store Client and Update Policy

Date: 2026-01-27
Task: TASK-017

## Summary
- Added store client with metadata, signature, download, and revocation fetching.
- Implemented ed25519 signature and SHA256 checksum verification.
- Added installer flow to unpack plugin ZIPs, validate manifests, and register plugins.
- Implemented update policy evaluation (auto-security/manual/auto-all).
- Added revocation handling to auto-disable installed plugins.
- Added unit/integration tests for verification, policy, installs, and revocations.

## Notes
- Requires store env vars: `STORE_BASE_URL`, `STORE_PUBLIC_KEY`.
