# 238-2026-02-18 - Coderso runtime widget listings integration

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-07-06

## Key Changes
- Widgets/Model: Added new source mode contract `legacy | listing` to `contentList` and `entryTeaser`, with backward-compatible normalization for existing data.
- Runtime/Resolver: Integrated saved Listings queries/templates into widget runtime resolvers, including safe public runtime behavior (`includeDrafts=false` outside preview).
- Runtime/Mapping: Added row-to-widget runtime item mapping for listing results (title/slug/href/excerpt/meta/tags/image), with optional template action/href interpolation.
- Admin/UI: Extended widget editors with Listings query/template selectors for both widgets while preserving legacy source controls.
- Tests: Added unit coverage for listing mode placeholders and runtime resolution paths in `contentList` and `entryTeaser` widget tests.
