# Nextless

## Index

Start here. This README is the main index for the repo.

Primary docs live in `_docs/`:

- `AGENTS.md` - agent guidelines
- `_docs/ARCHITECTURE.md` - core architecture and system rules
- `_docs/CMS_SPEC.md` - CMS scope and overview
- `_docs/CMS_API.md` - admin API endpoints
- `_docs/CONTENT_TYPES_SPEC.md` - collections and content types
- `_docs/DATA_MODEL.md` - database schema overview
- `_docs/DESIGN_TOKENS.md` - design tokens and theming
- `_docs/MEDIA_SPEC.md` - media storage and uploads
- `_docs/PAGE_MODEL.md` - page builder JSON model
- `_docs/PREVIEW_SPEC.md` - draft preview flow
- `_docs/ORM_SPEC.md` - ORM choice and configuration
- `_docs/AUTH_SPEC.md` - authentication and sessions
- `_docs/RBAC_SPEC.md` - roles and permissions
- `_docs/RELEASE_PROCESS.md` - semantic-release, PR release notes, and Docker image publishing
- `_docs/THEMES_SPEC.md` - themes and theme profiles
- `_docs/SEARCH_SPEC.md` - search and indexing
- `_docs/AUDIT_SPEC.md` - audit logs
- `_docs/SECURITY_SPEC.md` - baseline security middleware
- `_docs/README.md` - docs index
- `_docs/SDK_SPEC.md` - plugin SDK contract
- `_docs/STORE_SPEC.md` - store + security pipeline
- `_docs/TESTING_STRATEGY.md` - target hybrid testing model for Bun runtime and Vitest coverage lanes
- `_docs/WIDGETS.md` - core widgets and configuration model
- `_docs/_WIDGETS/README.md` - widgets index and per-widget docs
- `_docs/_TASKS/README.md` - tasks index
- `_docs/_CHANGELOG/README.md` - changelog index

Testing docs:

- `tests/README.md` - current runner ownership and test command surface

## Workflow rules

- Tasks: add new task files in `_docs/_TASKS` and update `_docs/_TASKS/README.md`.
- Changelog: after any code change (excluding docs), add a new file in `_docs/_CHANGELOG` and update `_docs/_CHANGELOG/README.md`.
