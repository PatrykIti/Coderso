# 770 - TASK-238 GitHub CodeQL Security Findings Remediation

- Date: 2026-04-29
- Version: Unreleased
- Tasks: TASK-238, TASK-238-01, TASK-238-02, TASK-238-03, TASK-238-04, TASK-238-05

## Key Changes

### Security

- Renumbered the GitHub CodeQL remediation family from `TASK-237` to `TASK-238`
  so the already-closed GHCR Docker image lowercase task remains `TASK-237`.
- Closed the CodeQL remediation task family after workflow permission, listing
  query path, video embed host validation, and rich-text sanitizer/entity
  hardening work was documented as complete.
- Recorded current GitHub security state: CodeQL open alerts `0`,
  secret-scanning open alerts `0`, and Dependabot alerts still disabled with
  HTTP 403 for the current token/repository state.

### Documentation

- Updated the kanban board, task family docs, and closure notes to use
  `TASK-238` for CodeQL while keeping `TASK-237` reserved for the GHCR Docker
  image lowercase task.
- Kept Dependabot closure explicitly out of scope until alerts are enabled and
  queryable.

## Validation

- GitHub CodeQL open alert query - PASS (`0` open alerts).
- GitHub secret-scanning open alert query - PASS (`0` open alerts).
- GitHub Dependabot alert query - BLOCKED by repository/API state
  (`Dependabot alerts are disabled for this repository`, HTTP 403).
