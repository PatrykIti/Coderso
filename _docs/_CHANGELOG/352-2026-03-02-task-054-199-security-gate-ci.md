# 352 - TASK-054-199 security gate CI workflow

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-054-199, TASK-054-19

## Key Changes

### Security gate
- Added CI security gate workflow with Semgrep (SAST), Trivy (SCA/CVE), and Gitleaks (secrets).
- SARIF reports are uploaded for auditability and PR blocking on critical/high findings.
- Added baseline configs and allowlist policy files (`.semgrep.yml`, `.gitleaks.toml`, `.trivyignore`).

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
