# TASK-054-199: Security Gate (SAST, SCA, Secrets, and CVE)
# FileName: TASK-054-199_Security_Gate_SAST_SCA_Secrets_and_CVE.md

**Priority:** High  
**Category:** Security + CI/CD  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-19, TASK-020-11  
**Status:** To Do

---

## Overview
Zaprojektować i wdrożyć automatyczny security gate dla repo, który blokuje merge/release przy krytycznych problemach bezpieczeństwa.

## Scope
1. SAST dla TypeScript/Node (Semgrep CE ruleset pod OWASP/API/security).
2. SCA/CVE dla zależności (`bun.lock`, `package.json`) z twardym progiem fail.
3. Secret scanning dla repo i historii commita.
4. Raporty artefaktów + czytelne statusy w CI.
5. Baseline/allowlist policy (z terminem wygaśnięcia i uzasadnieniem).

## Security Contract
- **Visibility:** internal CI gate (brak public API).
- **Auth path:** CI runner + repo permissions.
- **Fail policy:** `critical/high` -> fail pipeline (z wyjątkami tylko przez time-boxed allowlist).
- **Auditability:** każdy bypass musi mieć ownera, reason, expiry date i ticket.

## Files
- `.github/workflows/security-gate.yml` (new)
- `.semgrep.yml` (new)
- `.trivyignore` (new, optional)
- `.gitleaks.toml` (new)
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/_TASKS/TASK-054-19_Coderso_QA_Performance_and_Security_Gates.md`

## Pseudocode
```yaml
jobs:
  security-gate:
    steps:
      - semgrep scan -> fail on high/critical
      - osv/trivy scan lockfiles -> fail on critical/high CVE
      - gitleaks scan -> fail on detected secrets
      - upload SARIF/JSON artifacts
      - print remediation summary
```

## Acceptance Criteria
1. Każdy PR uruchamia pełny gate security.
2. Krytyczne findings blokują merge.
3. Wyjątki są jawne, time-boxed i audytowalne.
4. Dokumentacja zawiera lokalny runbook (`jak odpalić lokalnie` + `jak czytać raport`).

## Testing Requirements
- Unit/integration niezmienione.
- Test workflow execution on sample branch:
  - positive case (zero critical/high) -> pass,
  - negative case (injected vulnerable dependency/secret) -> fail.
- Lokalna walidacja komend skanerów przez dev script.

## Documentation Updates Required
- `_docs/SECURITY_SPEC.md` (narzędzia, progi, wyjątki)
- `_docs/CODERSO_RELEASE_GATES.md` (nowy gate w release checklist)
- `_docs/_CHANGELOG/*.md` (po implementacji)
