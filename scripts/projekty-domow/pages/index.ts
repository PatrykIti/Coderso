import type { PackageRef, ResourceSeed } from "../../../core/services/kits/fullSitePackage/types";
import { buildAboutPage } from "./about";
import { buildContactPage } from "./contact";
import { buildHomePage } from "./home";
import { buildOfferPage } from "./offer";
import { buildPricingPage } from "./pricing";
import { buildProcessPage } from "./process";
import { buildProjectsPage } from "./projects";

export type FormaDomPageRefs = {
  contentType: PackageRef;
  listingQuery: PackageRef;
  listingTemplate: PackageRef;
  form: PackageRef;
};

export const buildFormaDomPages = (refs: FormaDomPageRefs): ResourceSeed[] => [
  buildHomePage(),
  buildOfferPage(),
  buildProjectsPage({
    contentType: refs.contentType,
    query: refs.listingQuery,
    template: refs.listingTemplate,
  }),
  buildProcessPage(),
  buildPricingPage(),
  buildAboutPage(),
  buildContactPage(refs.form),
];
