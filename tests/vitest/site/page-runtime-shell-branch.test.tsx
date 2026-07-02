// @vitest-environment happy-dom
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  createDefaultMenuBlock,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import type { MenuAppearance } from "../../../core/services/menus/normalizeMenuAppearance";
import { PAGE_DOCUMENT_SCHEMA_VERSION } from "../../../core/services/pages/pageDocumentV2";
import { DefaultRuntimePageShellV2 } from "../../../core/site/pageRuntimeV2";
import { renderPublicPageV2RuntimeHtml } from "../../../core/site/renderPublicPage";
import { buildSiteShellCss } from "../../../core/site/siteShellCss";
import type { SiteShellNavigation, SiteShellRenderProps } from "../../../core/site/siteShell";

const emptyDoc = () => ({ schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION, sections: [] });

const navigation: SiteShellNavigation = {
  label: "Primary menu",
  items: [{ label: "Home", href: "/" }],
};

// A document WITHOUT sticky/surface so the scoped body sheet never emits the
// sticky rule — keeps the head-CSS gate assertions unambiguous.
const menuDoc = (): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks: [
        { id: "blk_nav", type: "nav-items", props: {} },
        { ...createDefaultMenuBlock("brand"), id: "blk_brand" },
      ],
    },
  ],
});

const stickyAppearance: MenuAppearance = { sticky: true };
const stickyHeaderRule = "position:sticky;top:0;z-index:50";

const baseShell = (over: Partial<SiteShellRenderProps>): SiteShellRenderProps => ({
  navigation: null,
  navigationAppearance: null,
  navigationExtras: null,
  navigationDocument: null,
  footerDocument: null,
  ...over,
});

// --- §4: DefaultRuntimePageShellV2 document-vs-default branch -----------------

test("navigationDocument present ⇒ SiteHeaderMenuDocumentRender (custom menu scope)", () => {
  const html = renderToString(
    <DefaultRuntimePageShellV2
      title="T"
      templateKey="default"
      document={emptyDoc() as never}
      siteName="Acme"
      siteShell={baseShell({ navigation, navigationDocument: menuDoc() })}
    />
  );
  expect(html).toContain('data-site-menu-doc="true"');
  expect(html).toContain('data-site-header="true"');
  // The custom render still binds the live item tree into nav-items.
  expect(html).toContain('data-site-nav-link="true" href="/"');
});

test("navigationDocument absent ⇒ default SiteHeaderNav markup is unchanged", () => {
  const html = renderToString(
    <DefaultRuntimePageShellV2
      title="T"
      templateKey="default"
      document={emptyDoc() as never}
      siteName="Acme"
      siteShell={baseShell({ navigation })}
    />
  );
  expect(html).toContain('data-site-header="true"');
  expect(html).not.toContain('data-site-menu-doc="true"');
  expect(html).toContain('data-site-nav-link="true" href="/"');
});

test("cleared document (null) ⇒ default path", () => {
  const html = renderToString(
    <DefaultRuntimePageShellV2
      title="T"
      templateKey="default"
      document={emptyDoc() as never}
      siteName="Acme"
      siteShell={baseShell({ navigation, navigationDocument: null })}
    />
  );
  expect(html).not.toContain('data-site-menu-doc="true"');
  expect(html).toContain('data-site-header="true"');
});

// --- §5: renderPublicPage head-CSS gate --------------------------------------

test("(a) document + ZERO items still emits the base buildSiteShellCss sheet", () => {
  const html = renderPublicPageV2RuntimeHtml({
    title: "T",
    document: emptyDoc(),
    // mapped navigation is null at zero items; the document is non-null.
    siteShell: baseShell({ navigation: null, navigationDocument: menuDoc() }),
    siteName: "Acme",
  });
  // The base .site-header* layout sheet MUST be present for the custom menu.
  expect(html).toContain(buildSiteShellCss(null));
});

test("(b) MIGRATED menu (document active + residual appearance) emits buildSiteShellCss(null) — no legacy bleed", () => {
  const html = renderPublicPageV2RuntimeHtml({
    title: "T",
    document: emptyDoc(),
    siteShell: baseShell({
      navigation,
      navigationDocument: menuDoc(),
      navigationAppearance: stickyAppearance,
    }),
    siteName: "Acme",
  });
  // Base sheet present; the residual appearance's sticky rule must NOT appear
  // anywhere (neither in the head base sheet nor the scoped body sheet).
  expect(html).toContain(buildSiteShellCss(null));
  expect(html).not.toContain(stickyHeaderRule);
});

test("(c) no-document path is byte-unchanged: buildSiteShellCss(navigationAppearance)", () => {
  const html = renderPublicPageV2RuntimeHtml({
    title: "T",
    document: emptyDoc(),
    siteShell: baseShell({ navigation, navigationAppearance: stickyAppearance }),
    siteName: "Acme",
  });
  // The published appearance drives the head sheet exactly as today.
  expect(html).toContain(buildSiteShellCss(stickyAppearance));
  expect(html).toContain(stickyHeaderRule);
});
