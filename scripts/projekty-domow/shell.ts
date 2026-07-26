import {
  createDefaultMenuDocumentV2,
  normalizeMenuDocumentV2ForWrite,
} from "../../core/services/menus/menuDocumentV2";
import { normalizeMenuAppearance } from "../../core/services/menus/normalizeMenuAppearance";
import { normalizePageTemplateCreateInput } from "../../core/services/pages/pageTemplateLibrarySchema";
import { assertTokenOverrides } from "../../core/services/theme/tokenValidation";
import type { PackageRef, ResourceSeed } from "../../core/services/kits/fullSitePackage/types";
import { button, heading, section, text } from "./pages/shared";
import { buildPageSeed } from "./pages/shared";
import { cleanJsonObject } from "./json";

const pageRef = (key: string): PackageRef => ({ ref: "page", key });

const deterministicMenuDocument = () => {
  const document = createDefaultMenuDocumentV2();
  document.sections[0]!.id = "menu-primary-section";
  document.sections[0]!.blocks.forEach((block, index) => {
    block.id = `menu-primary-block-${index + 1}`;
    if (block.type === "cta-button") {
      block.props = {
        label: "Porozmawiajmy",
        href: "/kontakt",
        target: "self",
        variant: "primary",
        size: "md",
      };
    }
  });
  return normalizeMenuDocumentV2ForWrite(document);
};

export const buildPrimaryMenu = (): ResourceSeed => ({
  key: "primary",
  desired: {
    name: "Menu główne FormaDom",
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
    document: cleanJsonObject(deterministicMenuDocument()),
    appearance: normalizeMenuAppearance({
      surfaceColor: "#07111f",
      linkColor: "#f7fbff",
      linkHoverColor: "#13233a",
      linkActiveColor: "#8ee8ff",
      borderColor: "#26384d",
      sticky: true,
      mobileMode: "disclosure",
    }),
  },
});

export const buildFooterTemplate = (): ResourceSeed => {
  const footerPage = buildPageSeed("footer-source", "Stopka FormaDom", [
    section(
      "footer-main",
      "Stopka",
      [
        heading("footer-brand", "FormaDom", "h2"),
        text("footer-copy", "Nowoczesne projekty domów tworzone z uważnością."),
        button("footer-offer", "Oferta", "/oferta", { variant: "link", size: "sm" }),
        button("footer-projects", "Projekty", "/projekty", { variant: "link", size: "sm" }),
        button("footer-process", "Proces", "/proces", { variant: "link", size: "sm" }),
        button("footer-contact", "Kontakt", "/kontakt", { variant: "link", size: "sm" }),
        text("footer-legal", "© FormaDom. Wszystkie prawa zastrzeżone."),
      ],
      { layout: { columns: 3 } }
    ),
  ]);
  const desired = normalizePageTemplateCreateInput({
    name: "Stopka FormaDom",
    slug: "footer",
    description: "Publiczna stopka strony FormaDom.",
    category: "navigation",
    status: "published",
    document: footerPage.desired.document,
  });
  return { key: "footer", desired: cleanJsonObject(desired) };
};

export const buildShellSettings = (): ResourceSeed[] => {
  const tokens = {
    colors: { primary: "#8ee8ff", secondary: "#8f7cff", accent: "#d8ff7a" },
    neutrals: {
      bg: "#07111f",
      surface: "#0b1628",
      border: "#26384d",
      text: "#f7fbff",
    },
    radius: { sm: "6px", md: "12px", lg: "20px", xl: "30px" },
    typography: {
      sans: '"IBM Plex Sans", Arial, sans-serif',
      display: '"Space Grotesk", Arial, sans-serif',
    },
  };
  assertTokenOverrides(tokens);
  return [
    { key: "site.name", desired: { value: "FormaDom Studio" } },
    { key: "site.locale", desired: { value: "pl" } },
    { key: "site.homepageId", desired: { value: pageRef("home") } },
    {
      key: "site.navigationMenuId",
      desired: { value: { ref: "menu", key: "primary" } },
    },
    {
      key: "site.footerTemplateId",
      desired: { value: { ref: "page_template", key: "footer" } },
    },
    { key: "design.tokens", desired: { value: tokens } },
  ];
};
