import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  normalizeMenuDocumentV2ForWrite,
  type MenuBlockV2,
  type MenuDocumentV2,
} from "../../core/services/menus/menuDocumentV2";
import { normalizeMenuAppearance } from "../../core/services/menus/normalizeMenuAppearance";
import { normalizePageTemplateCreateInput } from "../../core/services/pages/pageTemplateLibrarySchema";
import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  normalizePageDocumentV2ForWrite,
} from "../../core/services/pages/pageDocumentV2";
import { assertTokenOverrides } from "../../core/services/theme/tokenValidation";
import type { PackageRef, ResourceSeed } from "../../core/services/kits/fullSitePackage/types";
import { FORMA_DOM_PAGE_PALETTE, button, group, heading, section, text } from "./pages/shared";
import { cleanJsonObject } from "./json";

const pageRef = (key: string): PackageRef => ({ ref: "page", key });

const menuCta = (
  id: string,
  label: string,
  visible: boolean,
  responsive: NonNullable<MenuBlockV2["responsive"]>
): MenuBlockV2 => {
  const pageButton = createPageBlockV2("button", {
    id,
    props: { label, href: "/kontakt", target: "self", variant: "primary", size: "md" },
  });
  return {
    id,
    type: "cta-button",
    props: pageButton.props,
    ...(pageButton.style ? { style: pageButton.style } : {}),
    visibility: { visible },
    responsive,
  };
};

export const buildExactFormaDomMenuDocument = (): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "menu-primary-section",
      type: "menu-bar",
      name: "Główna nawigacja",
      layout: {
        surfaceColor: "rgba(8,17,31,.62)",
        surfaceColorScrolled: "rgba(8,17,31,.84)",
        paddingX: 16,
        paddingY: 12,
        alignment: "space-between",
        borderColor: "rgba(255,255,255,.12)",
        borderColorScrolled: "rgba(255,255,255,.18)",
        borderWidth: 1,
        shadow: "none",
        sticky: true,
        radius: 40,
        shadowCustom: "0 18px 50px rgba(0,0,0,.24)",
        shadowCustomScrolled: "0 18px 50px rgba(0,0,0,.24)",
      },
      blocks: [
        {
          id: "menu-brand",
          type: "brand",
          props: {
            mode: "icon",
            icon: "house",
            showText: true,
            text: "FormaDom",
            href: "/",
            style: {
              color: FORMA_DOM_PAGE_PALETTE.text,
              fontSize: 20,
              fontWeight: 700,
              iconColor: FORMA_DOM_PAGE_PALETTE.aqua,
              iconSize: 30,
            },
          },
        },
        {
          id: "menu-items",
          type: "nav-items",
          props: {
            itemGap: 8,
            fontSize: 14,
            fontWeight: 600,
            textTransform: "none",
            linkColor: FORMA_DOM_PAGE_PALETTE.muted,
            linkHoverColor: "rgba(255,255,255,.08)",
            linkActiveColor: "rgba(255,255,255,.12)",
            linkHoverTextColor: FORMA_DOM_PAGE_PALETTE.text,
            dropdownDirection: "bottom",
            mobileMode: "disclosure",
            orientation: "horizontal",
            linkPaddingX: 12,
            linkPaddingY: 8,
            linkRadius: 32,
            navChrome: {
              navPillBackground: "rgba(255,255,255,.04)",
              navPillRadius: 40,
              navPillPaddingX: 4,
              navPillPaddingY: 4,
              transitionMs: 180,
            },
          },
        },
        menuCta("menu-desktop-cta", "Zacznij projekt", true, {
          tablet: { visibility: { visible: false } },
          mobile: { visibility: { visible: false } },
        }),
        menuCta("menu-responsive-cta", "Umów konsultację", false, {
          tablet: { visibility: { visible: true } },
          mobile: { visibility: { visible: true } },
        }),
      ],
      responsive: {
        tablet: {
          layout: { paddingX: 12, paddingY: 10 },
          navProps: { itemGap: 3, linkPaddingX: 6, linkPaddingY: 8, fontSize: 13 },
        },
        mobile: {
          layout: { paddingX: 10, paddingY: 10 },
          navProps: { orientation: "vertical", itemGap: 4, linkPaddingX: 10, linkPaddingY: 10 },
        },
      },
    },
  ],
});

const FORMA_DOM_MENU_APPEARANCE = {
  surfaceColor: "rgba(8,17,31,.62)",
  linkColor: FORMA_DOM_PAGE_PALETTE.muted,
  linkHoverColor: "rgba(255,255,255,.08)",
  linkActiveColor: "rgba(255,255,255,.12)",
  linkHoverTextColor: FORMA_DOM_PAGE_PALETTE.text,
  itemGap: 8,
  paddingY: 12,
  paddingX: 16,
  alignment: "space-between",
  fontSize: 14,
  fontWeight: 600,
  textTransform: "none",
  borderColor: "rgba(255,255,255,.12)",
  borderWidth: 1,
  shadow: "md",
  sticky: true,
  dropdownDirection: "bottom",
  mobileMode: "disclosure",
  orientation: "horizontal",
  linkPaddingX: 12,
  linkPaddingY: 8,
  linkRadius: 32,
} as const;

export const buildPrimaryMenu = (): ResourceSeed => ({
  key: "primary",
  desired: {
    name: "Główna nawigacja",
    location: "primary",
    status: "published",
    items: [
      ["Start", "home"],
      ["Oferta", "oferta"],
      ["Projekty", "projekty"],
      ["Proces", "proces"],
      ["Cennik", "cennik"],
      ["O nas", "o-nas"],
      ["Kontakt", "kontakt"],
    ].map(([label, key], orderIndex) => ({
      id: `00000000-0000-4000-8000-${String(570 + orderIndex).padStart(12, "0")}`,
      label,
      href: null,
      pageId: pageRef(key!),
      parentId: null,
      orderIndex,
      settings: {},
    })),
    document: cleanJsonObject(
      JSON.parse(
        JSON.stringify(normalizeMenuDocumentV2ForWrite(buildExactFormaDomMenuDocument()))
      ) as object
    ),
    appearance: normalizeMenuAppearance(FORMA_DOM_MENU_APPEARANCE),
  },
});

const footerHouse = () =>
  createPageBlockV2("customSvg", {
    id: "footer-house-mark",
    props: {
      svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M7 25.5 24 10l17 15.5v15.7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V25.5Z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M17 43V28h14v15" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
      drawIn: false,
      label: "FormaDom",
    },
    style: { textColor: FORMA_DOM_PAGE_PALETTE.aqua },
  });

export const buildFooterTemplate = (): ResourceSeed => {
  const document = normalizePageDocumentV2ForWrite({
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {
      template: "page-v2",
      showInNav: false,
      background: FORMA_DOM_PAGE_PALETTE.background,
    },
    sections: [
      section(
        "footer-main",
        "Stopka",
        [
          group("footer-brand-column", [
            footerHouse(),
            button("footer-brand-link", "FormaDom", "/", { variant: "link" }),
            text("footer-brand-subline", "Domy z charakterem", {
              textColor: FORMA_DOM_PAGE_PALETTE.text,
              fontWeight: "bold",
            }),
            text(
              "footer-brand-copy",
              "Nowoczesne projekty domów jednorodzinnych, adaptacje, koncepcje premium i wizualizacje, które pomagają podjąć dobrą decyzję jeszcze przed budową."
            ),
          ]),
          group("footer-menu-column", [
            heading("footer-menu-title", "Menu", "h3"),
            button("footer-menu-offer", "Oferta", "/oferta", { variant: "link" }),
            button("footer-menu-projects", "Projekty", "/projekty", { variant: "link" }),
            button("footer-menu-process", "Proces", "/proces", { variant: "link" }),
            button("footer-menu-pricing", "Cennik", "/cennik", { variant: "link" }),
          ]),
          group("footer-contact-column", [
            heading("footer-contact-title", "Kontakt", "h3"),
            button(
              "footer-contact-email",
              "kontakt@formadom.studio",
              "mailto:kontakt@formadom.studio",
              {
                variant: "link",
              }
            ),
            button("footer-contact-phone", "+48 500 100 200", "tel:+48500100200", {
              variant: "link",
            }),
            text("footer-contact-location", "Warszawa / praca zdalna w całej Polsce"),
          ]),
          group("footer-start-column", [
            heading("footer-start-title", "Start projektu", "h3"),
            text(
              "footer-start-copy",
              "Masz działkę, inspiracje albo tylko ogólną wizję? Przekujemy to w konkretny plan."
            ),
            button("footer-start-cta", "Wyślij brief", "/kontakt", { variant: "ghost" }),
          ]),
          group(
            "footer-bottom-row",
            [
              text("footer-copyright", "© 2026 FormaDom Studio. Projekt demo."),
              text("footer-motto", "Minimalizm · komfort · nowoczesność"),
            ],
            { direction: "row", wrap: true, style: { colSpan: 4 } }
          ),
        ],
        {
          layout: { columns: 4, maxWidth: 1240 },
          style: { background: FORMA_DOM_PAGE_PALETTE.backgroundSecondary },
        }
      ),
    ],
  });
  const desired = normalizePageTemplateCreateInput({
    name: "Stopka FormaDom",
    slug: "footer",
    description: "Publiczna stopka strony FormaDom.",
    category: "navigation",
    status: "published",
    document,
  });
  return { key: "footer", desired: cleanJsonObject(desired) };
};

export const buildShellSettings = (): ResourceSeed[] => {
  const fontStack =
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const tokens = {
    colors: {
      primary: FORMA_DOM_PAGE_PALETTE.aqua,
      secondary: FORMA_DOM_PAGE_PALETTE.violet,
      accent: FORMA_DOM_PAGE_PALETTE.mint,
    },
    neutrals: {
      bg: FORMA_DOM_PAGE_PALETTE.background,
      surface: FORMA_DOM_PAGE_PALETTE.backgroundSecondary,
      border: FORMA_DOM_PAGE_PALETTE.line,
      text: FORMA_DOM_PAGE_PALETTE.text,
    },
    radius: { sm: "18px", md: "18px", lg: "28px", xl: "28px" },
    typography: { sans: fontStack, display: fontStack },
  };
  assertTokenOverrides(tokens);
  return [
    { key: "site.name", desired: { value: "FormaDom Studio" } },
    { key: "site.locale", desired: { value: "pl" } },
    { key: "site.homepageId", desired: { value: pageRef("home") } },
    { key: "site.navigationMenuId", desired: { value: { ref: "menu", key: "primary" } } },
    {
      key: "site.footerTemplateId",
      desired: { value: { ref: "page_template", key: "footer" } },
    },
    { key: "design.tokens", desired: { value: tokens } },
  ];
};
