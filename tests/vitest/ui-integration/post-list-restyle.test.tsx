import React from "react";
import { expect, test } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { PostsListPage, filterPosts } from "../../../core/admin/ui/posts/PostsListPage";
import { PostsTable } from "../../../core/admin/ui/posts/PostsTable";
import type { PostStatus, PostSummary } from "../../../core/admin/services/postsClient";

// TASK-479-09-L03: presentation guards for the Posts list restyle (TASK-479-09-L01).
// Render through the SSR helpers the existing Posts suites use and assert on the
// returned HTML string. renderAdminUi supplies the AdminRouterProvider that
// PostsTable's AdminLink/PageRowActions require. Behavioral wiring (the tab strip
// writes statusFilter) is asserted through the real exported `filterPosts`, since
// the SSR snapshot does not exercise click/selection interactions — those stay
// covered by the existing post-*.test.tsx behavioral family.

const post = (status: PostStatus, title: string): PostSummary => ({
  id: `${status}-id`,
  typeId: "post",
  title,
  slug: title,
  status,
  data: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("renders header, status tabs, and the restyled table shell", () => {
  const html = renderAdminUi(<PostsListPage />, { path: "/admin/posts" });
  expect(html).toContain("Posts"); // PageHeader title
  expect(html).toContain("New"); // create action
  // shared StatusTabs strip renders the static tab labels
  expect(html).toContain("Published");
  expect(html).toContain("Drafts");
  expect(html).toContain("Scheduled");
  // page chrome adopts the prototype card tokens (filter card + loading card)
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("shadow-card");
});

test("status badges render the token-driven soft StatusBadge (no hex map)", () => {
  const noop = () => undefined;
  // renderAdminUi (NOT bare renderToString) — PostsTable renders AdminLink, which
  // needs the AdminRouterProvider that renderAdminUi supplies (same wrapper
  // media.test.tsx uses to render leaf components with seeded props).
  const html = renderAdminUi(
    <PostsTable
      items={[post("scheduled", "scheduled-title")]}
      onEdit={noop}
      onPreview={noop}
      onPublish={noop}
      onUnpublish={noop}
      onDuplicate={noop}
    />
  );
  // shared StatusBadge maps scheduled -> info (soft variant), replacing the old
  // amber hex map; the label is capitalized for display via the `capitalize` class.
  expect(html).toContain("bg-info-soft");
  expect(html).toContain("capitalize");
  expect(html).toContain("rounded-2xl"); // restyled wrapper (was rounded-xl)
  expect(html).toContain('href="/admin/posts/scheduled-id"');
  expect(html).toContain('aria-label="Edit post: scheduled-title"');
  expect(html).toContain('aria-label="Actions for scheduled-title"');
  expect(html).toContain('data-post-row-metadata="fallback"');
  expect(html).toContain('class="md:hidden" data-post-row-status-fallback="true"');
  expect(html).toContain("lg:hidden");
  expect(html).toContain("hidden md:table-cell");
  expect(html).toContain("hidden lg:table-cell");
  expect(html).not.toContain("cursor-pointer");
});

test("tab selection drives statusFilter (exported filterPosts wiring)", () => {
  const items = [post("published", "published-title"), post("draft", "draft-title")];
  // the tab strip writes statusFilter; filterPosts is the real filter edge
  const drafts = filterPosts(items, "", "draft", "any");
  expect(drafts.map((entry) => entry.title)).toEqual(["draft-title"]);
  expect(filterPosts(items, "", "all", "any")).toHaveLength(2);
});
