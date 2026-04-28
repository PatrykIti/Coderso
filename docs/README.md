# Coderso Assistant Documentation

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
   - `Basic`
   - `Medium`
   - `Instruction`
   - `Advanced`

Optional but strongly recommended sections:
- `Troubleshooting`
- `Decision Guide`
- `Checklist`
- `Security`

Backward compatibility:
- legacy section pack (`What Is It`, `When To Use`, `Step By Step`, `Examples`,
  `Common Mistakes`) is still accepted by ingest,
- new docs should prefer the multi-level pack.

See [the template](./_TEMPLATE.md) before creating or editing content.

## Query Intent -> Preferred Section

Use this mapping to keep assistant answers deterministic:

| Query intent | Preferred section |
| --- | --- |
| quick overview / "what is this" | `Basic` |
| "more details" / "when should I use it" | `Medium` |
| "how do I configure/use..." | `Instruction` |
| "advanced setup/scenarios/trade-offs" | `Advanced` |
| error/fix/debug | `Troubleshooting` |
| "which option should I choose" | `Decision Guide` |
| "give me launch/readiness checks" | `Checklist` |
| security/auth/hardening concerns | `Security` |

## Directory Map

- `getting-started/`
  High-level orientation, navigation, and first-run guidance.
- `screens/`
  Canonical guidance for core admin screens and settings surfaces.
- `coderso/`
  Canonical guidance for Advanced modules and their workflows.
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
