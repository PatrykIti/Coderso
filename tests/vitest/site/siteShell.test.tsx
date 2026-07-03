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
