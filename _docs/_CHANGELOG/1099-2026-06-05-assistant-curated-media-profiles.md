# 1099 - Assistant curated media profiles

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-405

## Key Changes

### Assistant media profiles

- Added a backend-owned curated media profile adapter for assistant-generated
  full-service sites. Profiles own media kind, role, industry/theme matching,
  source URL, and license URL.
- Added the first image-only profile for architecture and interior-design sites.
  Curated video and arbitrary remote media import remain gated until a trusted
  media pipeline exists.
- Removed unrelated media fallback for unsupported industries: non-matching
  full-service prompts do not receive architecture stock images.

### Public runtime and trust boundary

- Added explicit curated cover URL, alt, source, and license fields for service
  and portfolio samples without changing media-library fields such as
  `heroImage` or `gallery`.
- Rendered curated media in supporting rich-text page blocks, catalog cards,
  and service/portfolio detail hero media.
- Required curated cover URLs to carry exact source/license metadata and
  filtered non-curated manual `coverImageUrl` values before public listing or
  detail rendering.
- Fixed rich-text image rendering so generated stock images do not cause mobile
  horizontal scroll.

### QA and docs

- Updated assistant/media docs to describe curated profiles, image-only current
  support, and the fail-closed media boundary.
- Added TASK-406 as the follow-up reset E2E for a different industry/theme.
- Playwright CLI E2E passed after `coderso-dev-core-host` restart on admin
  `http://coderso-b.localhost:5175/admin/`, front
  `http://coderso-b.localhost:3001/`, and site Vite assets
  `http://coderso-b.localhost:5176/site/`: 49-action plan, dry-run ready,
  execute failed count zero, public pages/detail pages/navigation/contact/images
  and mobile checks passed, and page/console errors were zero.
