# 749. TASK-217 security scan baseline hardening

**Date:** 2026-04-27
**Version:** 0.1.0
**Tasks:** TASK-217

## Key Changes

### Security Tooling
- Replaced the combined local `scan:security` shell chain with `scripts/run-security-scan.ts`, which runs the full scanner matrix and reports every scanner result.
- Expanded local scanner coverage:
  - Semgrep SAST rule packs,
  - Bun dependency advisory audit,
  - Trivy lockfile CVE scan with dev dependency coverage,
  - Trivy Docker/IaC misconfiguration scan,
  - Trivy filesystem secret scan,
  - Gitleaks Git history scan,
  - Gitleaks current worktree scan,
  - optional Trivy container image scan through `SECURITY_SCAN_IMAGE`.
- Added split package scripts for Trivy vulnerability/config/secret scans, Gitleaks history/worktree scans, Bun audit, SBOM generation, and optional image scanning.
- Tightened CI Semgrep and Trivy gate behavior with strict exit handling and Trivy `vuln,secret,misconfig` scanner coverage.
- Replaced Dockerfile `RUN cd core && ...` build commands with `WORKDIR /app/core` so Trivy config scanning no longer reports DS-0013 for the image build stage.
- Documented scanner ownership, local scope, strict/advisory behavior, and Gitleaks directory-scan allowlist rationale.
- Added `TASK-219` to track the dependency CVE remediation uncovered by the expanded scanner matrix.

### Validation
- Ran:
  - `bun test tests/unit/security/securityGateConfig.test.ts`
  - `bun run lint:repo:types`
  - `bun --cwd core lint:types`
  - `trivy config --exit-code 1 --severity MEDIUM,HIGH,CRITICAL --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next .`
  - `bun scripts/run-security-scan.ts`
  - `bun scripts/run-security-scan.ts --strict`
  - `git diff --check`
- `bun scripts/run-security-scan.ts` completed the full advisory matrix and reported dependency findings from `bun audit` and Trivy vuln.
- `bun scripts/run-security-scan.ts --strict` correctly failed on those dependency findings; Semgrep, Trivy config, Trivy secret, and Gitleaks history/worktree were clean after the Dockerfile fix.
- `bun --cwd core lint` remains blocked by an unrelated dirty-tree warning in `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (`react-hooks/exhaustive-deps` for `editor`).
