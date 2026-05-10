# Widget Research Archive

This directory stores TASK-252 research artifacts used before widget editor
implementation leaves are written. The archive is intentionally research-first:
implementation file owners, line numbers, and pseudocode leaves are added only
after the relevant widget examples are collected and analyzed.

## Required Per-Widget Files

Each Pages-publishable widget folder must contain:

- `README.md` with at least ten research cards, or a `SHORTFALL.md` when fewer
  than ten credible public patterns exist after a documented search.
- `MATRIX.md` mapping observed options to Coderso decisions.
- Optional `LICENSE-NOTES.md`, `SECURITY-NOTES.md`, or screenshot references
  when a widget needs extra license, public-write, or visual context.

## Research Card Format

Each card must record:

- `URL`
- `Access type`: `open-source`, `docs-example`, `premium-reference`, or
  `unknown-license`
- `License / terms`
- `Observed UX pattern`
- `Useful Coderso fields`
- `Decision`: `Keep`, `Adapt`, or `Reject`
- `Copy policy`

## Copy Policy

- Open-source examples can be summarized in this archive. Copy code only after
  the license is verified and the source/license are recorded.
- Documentation examples are summarized by default. Copy only short permitted
  snippets when the docs license allows it.
- Premium/proprietary examples are reference-only. Store URLs, screenshots when
  allowed by terms, and UX observations; do not copy source.
- Do not store tokens, private provider settings, customer data, or secrets.

## Decision Rules

- `Keep`: the option should become or remain a Coderso editor/schema feature.
- `Adapt`: the pattern is useful but must be reshaped to fit Coderso's
  schema-first widget contract.
- `Reject`: the pattern is noisy, unsafe, redundant, or belongs to a different
  product surface.

Research should favor flexible WordPress-competitive page building while keeping
the final editor simple enough for end users to scan and operate.
