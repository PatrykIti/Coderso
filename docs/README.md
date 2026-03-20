# Nextless Assistant Documentation

This directory contains the official product documentation corpus used by the
assistant knowledge base.

## Purpose

- describe real product behavior in user-facing language,
- cover major admin screens, workflows, and examples,
- provide stable source material for DB ingest and assistant retrieval,
- stay separate from `_docs/`, which remains the home for architecture notes,
  task tracking, changelog entries, and developer-oriented references.

## Audience

Primary audiences:
- `admin`
- `editor`

Secondary audience:
- `developer` only when a screen or workflow truly requires implementation
  detail for integrations or advanced setup.

## Required Structure For Assistant Docs

Every ingestable document in `docs/` must include:

1. YAML frontmatter:
   - `title`
   - `audience`
   - `productArea`
   - `language`
   - `keywords`
2. Required sections:
   - `What Is It`
   - `When To Use`
   - `Step By Step`
   - `Examples`
   - `Common Mistakes`

See [the template](./_TEMPLATE.md) before creating or editing content.

## Directory Map

- `getting-started/`
  High-level orientation, navigation, and first-run guidance.
- `screens/`
  Canonical guidance for core admin screens and settings surfaces.
- `coderso/`
  Canonical guidance for Coderso modules and their workflows.
- `solution-kits/`
  Applied guidance for each packaged solution kit.
- `playbooks/`
  Scenario-based guides for common outcomes such as lead generation, booking,
  commerce, and content-first workflows.

## Coverage

The route-to-doc coverage plan lives in [the coverage matrix](./_COVERAGE_MATRIX.md).
Every major admin route should map to one canonical document in this directory.

## Writing Rules

- Write in English.
- Prefer product language over developer shorthand.
- Explain intent, workflow, and outcome before internal terminology.
- Use real route and screen names that match the shipped UI.
- Include practical examples and common failure modes.
- Do not document roadmap or unfinished behavior as if it were shipped.
