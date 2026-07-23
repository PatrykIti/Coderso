import { expect, test } from "vitest";

import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import { normalizeAssistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/policySchema";
import {
  getFieldPolicy,
  getFilterPolicy,
  getResourcePolicy,
  resolveResourcePolicyFromPrompt,
} from "../../../core/services/assistant/operationPolicy/policyLookup";

test("assistantOperationPolicy includes migrated CMS and admin resources", () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);

  expect(Object.keys(policy.resources).sort()).toEqual([
    "access-log",
    "admin-search",
    "advanced-search",
    "analytics",
    "appointments",
    "audit-log",
    "backup",
    "booking",
    "commerce",
    "content-type",
    "custom-screen",
    "dashboard",
    "detail-page",
    "entry",
    "filters",
    "form",
    "i18n",
    "import-export",
    "listing-query",
    "listing-template",
    "media",
    "mega-menu",
    "menu",
    "menu-item",
    "page",
    "page-template",
    "plugin-store",
    "popups",
    "portal",
    "post",
    "redirect",
    "reviews",
    "role",
    "seo-document",
    "settings-api-keys",
    "settings-assistant",
    "settings-email",
    "settings-general",
    "settings-integrations",
    "settings-ip-allowlist",
    "settings-login-alerts",
    "settings-root",
    "settings-security",
    "settings-security-sessions",
    "settings-site",
    "settings-storage",
    "settings-webhooks",
    "solution-kit",
    "theme",
    "user",
    "widget-template",
  ]);
});

test("assistantOperationPolicy covers page actions aliases filters and fields", () => {
  const page = getResourcePolicy(assistantOperationPolicy, "page");
  if (!page) throw new Error("missing_page_policy");

  expect(resolveResourcePolicyFromPrompt(assistantOperationPolicy, "usun strony")).toBe(page);
  expect(getFilterPolicy(page, "status")?.values?.published).toContain("opublikowane");
  expect(getFieldPolicy(page, "tytuł")?.action).toMatchObject({
    type: "page.update",
    patchPath: ["title"],
  });
  expect(Object.values(page.actions).map((action) => action.type)).toEqual(
    expect.arrayContaining(["page.upsert", "page.update", "page.delete"])
  );
  expect(Object.values(page.actions).map((action) => action.type)).not.toContain(
    "page.widget.patch"
  );
  expect(page.destructive).toMatchObject({
    requireReview: true,
    allowAllWhenFiltered: true,
    allowAllUnfiltered: false,
  });
});

test("assistantOperationPolicy covers form visibility and actions", () => {
  const form = getResourcePolicy(assistantOperationPolicy, "form");
  if (!form) throw new Error("missing_form_policy");

  expect(resolveResourcePolicyFromPrompt(assistantOperationPolicy, "formularz kontaktowy")).toBe(
    form
  );
  expect(getFilterPolicy(form, "visibility")?.values?.public).toContain("publiczny");
  expect(getFieldPolicy(form, "dostęp")?.action).toMatchObject({
    type: "form.update",
    patchPath: ["submissionAccess"],
  });
  expect(Object.values(form.actions).map((action) => action.type)).toEqual(
    expect.arrayContaining([
      "form.upsert",
      "form.update",
      "form.archive",
      "form.delete",
      "form.automation.upsert",
    ])
  );
  expect(form.secrets).toMatchObject({
    redacted: true,
    providerAllowed: false,
  });
});

test("assistantOperationPolicy covers listing query and template action fields", () => {
  const query = getResourcePolicy(assistantOperationPolicy, "listing-query");
  const template = getResourcePolicy(assistantOperationPolicy, "listing-template");
  if (!query || !template) throw new Error("missing_listing_policy");

  expect(getFieldPolicy(query, "limit")?.action).toMatchObject({
    type: "listing-query.update",
    patchPath: ["limit"],
  });
  expect(getFieldPolicy(query, "filtry")?.action?.type).toBe("listing-query.filters.patch");
  expect(getFieldPolicy(template, "layout")?.enumValues).toEqual([
    "grid",
    "list",
    "table",
    "calendar",
    "map",
  ]);
  expect(getFieldPolicy(template, "karta")?.action?.type).toBe("listing-template.card.patch");
  expect(Object.values(template.actions).map((action) => action.type)).toEqual(
    expect.arrayContaining([
      "listing-template.upsert",
      "listing-template.update",
      "listing-template.delete",
      "listing-template.card.patch",
    ])
  );
});

test("assistantOperationPolicy covers content entries screens widgets and media", () => {
  const contentType = getResourcePolicy(assistantOperationPolicy, "content-type");
  const entry = getResourcePolicy(assistantOperationPolicy, "entry");
  const screen = getResourcePolicy(assistantOperationPolicy, "custom-screen");
  const detailPage = getResourcePolicy(assistantOperationPolicy, "detail-page");
  const widget = getResourcePolicy(assistantOperationPolicy, "widget-template");
  const media = getResourcePolicy(assistantOperationPolicy, "media");
  if (!contentType || !entry || !screen || !detailPage || !widget || !media) {
    throw new Error("missing_content_policy");
  }

  expect(Object.values(contentType.actions).map((action) => action.type)).toEqual(
    expect.arrayContaining(["content-type.upsert", "content-type.field.add", "content-type.delete"])
  );
  expect(getFieldPolicy(contentType, "pola")?.action?.type).toBe("content-type.field.add");
  expect(getFieldPolicy(entry, "media")?.action?.type).toBe("media.reference.attach");
  expect(getFilterPolicy(screen, "status")?.values?.active).toContain("opublikowane");
  expect(Object.values(screen.actions).map((action) => action.type)).toEqual(
    expect.arrayContaining([
      "custom-screen.upsert",
      "custom-screen.update",
      "custom-screen.delete",
      "custom-screen.block.patch",
    ])
  );
  expect(
    resolveResourcePolicyFromPrompt(assistantOperationPolicy, "pokaż detail page Products")
  ).toBe(detailPage);
  expect(detailPage.actions.update).toMatchObject({
    type: "detail-page.upsert",
    mode: "gated",
  });
  expect(getFieldPolicy(widget, "headline")?.action?.type).toBe("widget-template.block.patch");
  expect(widget).toMatchObject({
    label: "Retired Widget Compatibility",
    operations: ["inspect", "find", "update", "delete"],
    coverage: {
      state: "legacy-maintenance",
      task: "TASK-184-07",
    },
  });
  expect(Object.values(widget.actions)).toEqual([
    expect.objectContaining({ type: "widget-template.update", mode: "executable" }),
    expect.objectContaining({ type: "widget-template.delete", mode: "executable" }),
    expect.objectContaining({ type: "widget-template.block.patch", mode: "executable" }),
  ]);
  expect(media.actions.upload).toMatchObject({ type: "none", mode: "gated" });
  expect(media.actions.attachReference.type).toBe("media.reference.attach");
});
