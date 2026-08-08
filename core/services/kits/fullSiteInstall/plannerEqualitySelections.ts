import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  formActions,
  formFields,
  forms,
  listingQueries,
  listingTemplates,
  menuItems,
  menus,
  pages,
  pageTemplates,
  settings,
} from "../../../db/schema";

export const SETTING_PLANNER_EQUALITY_SELECTION = {
  value: settings.value,
} as const;

export const CONTENT_TYPE_PLANNER_EQUALITY_SELECTION = {
  name: contentTypes.name,
  slug: contentTypes.slug,
  schema: contentTypes.schema,
  status: contentTypes.status,
  config: contentTypes.config,
} as const;

export const FORM_PLANNER_EQUALITY_SELECTION = {
  name: forms.name,
  slug: forms.slug,
  status: forms.status,
  description: forms.description,
  successMessage: forms.successMessage,
  successRedirectUrl: forms.successRedirectUrl,
  submissionAccess: forms.submissionAccess,
  settings: forms.settings,
} as const;

export const FORM_FIELD_PLANNER_EQUALITY_SELECTION = {
  id: formFields.id,
  type: formFields.type,
  label: formFields.label,
  name: formFields.name,
  required: formFields.required,
  settings: formFields.settings,
  orderIndex: formFields.orderIndex,
} as const;

export const FORM_ACTION_PLANNER_EQUALITY_SELECTION = {
  id: formActions.id,
  type: formActions.type,
  label: formActions.label,
  enabled: formActions.enabled,
  continueOnError: formActions.continueOnError,
  condition: formActions.condition,
  config: formActions.config,
  orderIndex: formActions.orderIndex,
} as const;

export const PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION = {
  name: pageTemplates.name,
  slug: pageTemplates.slug,
  description: pageTemplates.description,
  category: pageTemplates.category,
  status: pageTemplates.status,
  document: pageTemplates.document,
} as const;

export const LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION = {
  name: listingTemplates.name,
  slug: listingTemplates.slug,
  description: listingTemplates.description,
  layout: listingTemplates.layout,
  config: listingTemplates.config,
} as const;

export const CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION = {
  contentTypeId: contentEntries.typeId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  data: contentEntries.data,
} as const;

export const LISTING_QUERY_PLANNER_EQUALITY_SELECTION = {
  name: listingQueries.name,
  description: listingQueries.description,
  query: listingQueries.query,
} as const;

export const DETAIL_PAGE_PLANNER_EQUALITY_SELECTION = {
  name: detailPageDocuments.name,
  contentTypeId: detailPageDocuments.contentTypeId,
  currentDocument: detailPageDocuments.currentDocument,
} as const;

export const PAGE_PLANNER_EQUALITY_SELECTION = {
  slug: pages.slug,
  title: pages.title,
  status: pages.status,
  currentData: pages.currentData,
} as const;

export const MENU_PLANNER_EQUALITY_SELECTION = {
  name: menus.name,
  location: menus.location,
  status: menus.status,
  settings: menus.settings,
} as const;

export const MENU_ITEM_PLANNER_EQUALITY_SELECTION = {
  id: menuItems.id,
  label: menuItems.label,
  href: menuItems.href,
  pageId: menuItems.pageId,
  parentId: menuItems.parentId,
  orderIndex: menuItems.orderIndex,
  settings: menuItems.settings,
} as const;
