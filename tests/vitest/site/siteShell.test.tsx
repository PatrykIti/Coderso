// @vitest-environment happy-dom
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import {
  SiteHeaderMenuDocumentRender,
  SiteHeaderNav,
  normalizeNavPath,
  resolveMenuActiveHref,
  resolveMenuActiveItemPath,
  type SiteShellNavigation,
} from "../../../core/site/siteShell";
import type { NavigationItem } from "../../../core/widgets/core/navigation";

// --- normalizeNavPath (TASK-504-03) ------------------------------------------

test("normalizeNavPath: root, trailing-slash strip, query/hash drop", () => {
  expect(normalizeNavPath("/")).toBe("/");
  expect(normalizeNavPath("/blog/")).toBe("/blog");
  expect(normalizeNavPath("/blog///")).toBe("/blog");
  expect(normalizeNavPath("/blog?tag=x")).toBe("/blog");
  expect(normalizeNavPath("/blog#frag")).toBe("/blog");
  expect(normalizeNavPath("  /about  ")).toBe("/about");
});

test("normalizeNavPath: external / anchor / scheme / protocol-relative ⇒ null", () => {
  expect(normalizeNavPath("#")).toBeNull();
  expect(normalizeNavPath("")).toBeNull();
  expect(normalizeNavPath("//cdn.example.com/x")).toBeNull();
  expect(normalizeNavPath("https://example.com/blog")).toBeNull();
  expect(normalizeNavPath("mailto:a@b.com")).toBeNull();
  expect(normalizeNavPath("tel:+123")).toBeNull();
  expect(normalizeNavPath("about")).toBeNull();
});

// --- resolveMenuActiveHref (TASK-504-03) -------------------------------------

const items: NavigationItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Blog",
    href: "/blog",
    children: [
      { label: "Post", href: "/blog/post" },
      {
        label: "Members",
        href: "/members",
        meta: { visibility: "logged_in", badge: null, description: null, icon: null },
      },
    ],
  },
  { label: "Empty group", href: "#" },
];

test("resolveMenuActiveHref: exact top-level match", () => {
  expect(resolveMenuActiveHref(items, "/blog")).toBe("/blog");
});

test("resolveMenuActiveHref: path-prefix match", () => {
  expect(resolveMenuActiveHref(items, "/blog/other")).toBe("/blog");
});

test("resolveMenuActiveHref: longest / most-specific nested target wins", () => {
  expect(resolveMenuActiveHref(items, "/blog/post")).toBe("/blog/post");
});

test("resolveMenuActiveHref: root '/' matches only '/'", () => {
  expect(resolveMenuActiveHref(items, "/")).toBe("/");
  // '/blog' must NOT resolve to the home '/' link.
  expect(resolveMenuActiveHref(items, "/blog")).not.toBe("/");
});

test("resolveMenuActiveHref: hidden (logged_in) item never wins", () => {
  // /members is only reachable via a hidden child ⇒ never a candidate.
  expect(resolveMenuActiveHref(items, "/members")).toBeNull();
});

test("resolveMenuActiveHref: absent activePath ⇒ null", () => {
  expect(resolveMenuActiveHref(items, null)).toBeNull();
  expect(resolveMenuActiveHref(items, undefined)).toBeNull();
  expect(resolveMenuActiveHref(items, "")).toBeNull();
});

// --- SiteHeaderMenuDocumentRender aria-current stamping ----------------------

const navigation: SiteShellNavigation = { label: "Primary", items };

const navOnlyDoc = (): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks: [{ id: "blk_nav", type: "nav-items", props: {} }],
    },
  ],
});

const countAriaCurrent = (html: string) => (html.match(/aria-current="page"/g) ?? []).length;

test("top-level active link carries aria-current='page' and no other link does", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={navOnlyDoc()}
      navigation={navigation}
      activePath="/blog/other"
    />
  );
  expect(countAriaCurrent(html)).toBe(1);
  // The /blog anchor is the stamped one; the /blog/post child is not.
  expect(html).toMatch(/href="\/blog"[^>]*aria-current="page"/);
  expect(html).not.toMatch(/href="\/blog\/post"[^>]*aria-current="page"/);
});

test("nested active link is stamped at depth (recursion threading)", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={navOnlyDoc()}
      navigation={navigation}
      activePath="/blog/post"
    />
  );
  expect(countAriaCurrent(html)).toBe(1);
  expect(html).toMatch(/href="\/blog\/post"[^>]*aria-current="page"/);
  // The parent /blog link is NOT stamped (longest-match specificity).
  expect(html).not.toMatch(/href="\/blog"[^>]*aria-current="page"/);
});

test("no activePath ⇒ zero aria-current in the menu-document render", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender document={navOnlyDoc()} navigation={navigation} />
  );
  expect(countAriaCurrent(html)).toBe(0);
});

// --- Brand IMAGE render (defect B1) ------------------------------------------

const brandDoc = (props: Record<string, unknown>): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks: [{ id: "blk_brand", type: "brand", props } as never],
    },
  ],
});

test("brand image mode with a resolved src renders a real <img> (not the placeholder)", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({
        mode: "image",
        href: "/",
        image: { src: "https://cdn.example.com/logo.png", alt: "Acme" },
      })}
      navigation={null}
    />
  );
  expect(html).toContain("<img");
  expect(html).toContain("https://cdn.example.com/logo.png");
  // The <a> brand carries the block-id hook that 504-02's img{} rule sizes.
  expect(html).toContain('data-menu-block-id="blk_brand"');
});

test("brand image mode with NO resolvable logo falls through to the text/site-name fallback", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({ mode: "image", href: "/" })}
      navigation={null}
      siteName="Acme Co"
    />
  );
  expect(html).not.toContain("<img");
  expect(html).toContain("Acme Co");
});

test("text-mode brand renders the brand text (byte-stable text path)", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({ mode: "text", href: "/", text: "Brandy" })}
      navigation={null}
    />
  );
  expect(html).not.toContain("<img");
  expect(html).toContain("Brandy");
});

// --- Legacy SiteHeaderNav untouched ------------------------------------------

test("legacy SiteHeaderNav never emits aria-current (no activeHref reaches it)", () => {
  const html = renderToString(<SiteHeaderNav navigation={navigation} siteName="Acme" />);
  expect(countAriaCurrent(html)).toBe(0);
});

// --- resolveMenuActiveItemPath (TASK-542-03-L02) -----------------------------

const dupeItems: NavigationItem[] = [
  { label: "First", href: "/dupe" },
  { label: "Second", href: "/dupe" },
  { label: "Team", href: "/team", children: [{ label: "Nested dupe", href: "/dupe" }] },
];

test("resolveMenuActiveItemPath: absent activePath ⇒ null (no stamp)", () => {
  expect(resolveMenuActiveItemPath(dupeItems, null)).toBeNull();
  expect(resolveMenuActiveItemPath(dupeItems, undefined)).toBeNull();
});

test("resolveMenuActiveItemPath: duplicate hrefs stamp EXACTLY ONE DFS-first item", () => {
  // Strict `>` keeps the FIRST DFS match on equal-length targets: "0", never "1".
  expect(resolveMenuActiveItemPath(dupeItems, "/dupe")).toBe("0");
});

test("resolveMenuActiveItemPath: longest normalized target wins over siblings", () => {
  const tree: NavigationItem[] = [
    { label: "Blog", href: "/blog" },
    { label: "Blog", href: "/blog", children: [{ label: "Post", href: "/blog/post" }] },
  ];
  expect(resolveMenuActiveItemPath(tree, "/blog/post")).toBe("1.0");
  expect(resolveMenuActiveItemPath(tree, "/blog/other")).toBe("0");
});

test("resolveMenuActiveItemPath: a hidden (logged_in) subtree can never win", () => {
  const tree: NavigationItem[] = [
    {
      label: "Members",
      href: "/members",
      meta: { visibility: "logged_in", badge: null, description: null, icon: null },
    },
    { label: "Public", href: "/members" },
  ];
  // The hidden sibling is dropped by the projection and the tree REINDEXES,
  // so the public item is the sole candidate at "0".
  expect(resolveMenuActiveItemPath(tree, "/members")).toBe("0");
});

test("duplicate hrefs in the menu-document render stamp exactly ONE aria-current", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={navOnlyDoc()}
      navigation={{ label: "Dupe", items: dupeItems }}
      activePath="/dupe"
    />
  );
  expect(countAriaCurrent(html)).toBe(1);
  // The FIRST DFS link (top-level /dupe) is the stamped one.
  expect(html).toMatch(/href="\/dupe"[^>]*aria-current="page"/);
});

// --- responsive-only scroll-state machine gate (TASK-542-03-L02) --------------

const scrollDoc = (
  layout: Record<string, unknown>,
  responsive?: Record<string, { layout: Record<string, unknown> }>
): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout,
      ...(responsive ? { responsive } : {}),
      blocks: [{ id: "blk_nav", type: "nav-items", props: {} }],
    },
  ],
});

const scrollScriptCount = (html: string) => (html.match(/<script/g) ?? []).length;

test("scroll machine: a DESKTOP-authored sticky scrolled variant emits the script on the front", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc({ sticky: true, surfaceColorScrolled: "#101827" })}
      navigation={navigation}
      activePath="/blog"
    />
  );
  expect(scrollScriptCount(html)).toBe(1);
});

test("scroll machine: a TABLET-ONLY scrolled variant still arms the script (defect fix)", () => {
  // 542-03-L02 defect: the old gate read only the desktop base layout, so a
  // tablet/mobile-only authored scrolled variant never armed the machine.
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc(
        { sticky: true },
        { tablet: { layout: { surfaceColorScrolled: "#101827" } } }
      )}
      navigation={navigation}
      activePath="/blog"
    />
  );
  expect(scrollScriptCount(html)).toBe(1);
});

test("scroll machine: a MOBILE-ONLY scrolled variant also arms the script", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc(
        { sticky: true },
        { mobile: { layout: { borderColorScrolled: "#101827" } } }
      )}
      navigation={navigation}
      activePath="/blog"
    />
  );
  expect(scrollScriptCount(html)).toBe(1);
});

test("scroll machine: NO authored scrolled key ⇒ zero script (legacy byte-identical)", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc({ sticky: true })}
      navigation={navigation}
      activePath="/blog"
    />
  );
  expect(scrollScriptCount(html)).toBe(0);
});

test("scroll machine: sticky false with scrolled keys never arms the machine", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc({ sticky: false, surfaceColorScrolled: "#101827" })}
      navigation={navigation}
      activePath="/blog"
    />
  );
  expect(scrollScriptCount(html)).toBe(0);
});

test("scroll machine: preview/canvas (no activePath) never emits the script even with a scrolled variant", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={scrollDoc({ sticky: true, surfaceColorScrolled: "#101827" })}
      navigation={navigation}
    />
  );
  expect(scrollScriptCount(html)).toBe(0);
});
