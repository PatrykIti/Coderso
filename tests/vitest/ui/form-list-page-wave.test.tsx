// @vitest-environment happy-dom
//
// TASK-105-04 forms wave, LEAF A1 — FormListPage branch closure.
// Covers pagination/empty/filter combinations, bulk publish/draft/archive
// confirm + failure paths, create-drawer preference persistence failure,
// submissions navigation, toggle-all, and the remaining row-action
// draft/archive branches. Uses the shared formsPagesWaveFixtures mocks.

import React from "react";
import { expect, test, vi } from "vitest";
import { clickByText, flush, getFormsPageState, mount } from "./formsPagesWaveFixtures";

const formsPageState = getFormsPageState();

const seedForms = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...formsPageState.form,
    id: `form-${index + 1}`,
    name: `Form ${index + 1}`,
    slug: `form-${index + 1}`,
    status: (index % 3 === 0 ? "published" : index % 3 === 1 ? "draft" : "archived") as
      "published" | "draft" | "archived",
    submissionAccess: (index % 2 === 0 ? "public" : "internal") as "public" | "internal",
  }));

test("FormListPage renders paginated stats and filter/empty combinations", async () => {
  formsPageState.formsList = seedForms(12);
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    // Page 1 shows 10 of 12 rows; the footer exposes the pagination contract.
    expect(view.container.textContent).toContain("pagination:forms:10/12");
    expect(view.container.textContent).toContain("Form 1");
    expect(view.container.textContent).not.toContain("Form 12");

    clickByText(view.container, "filter-status-draft");
    await flush();

    // 4 of the 12 seeded forms are drafts -> a single filtered page.
    expect(view.container.textContent).toContain("pagination:forms:4/4");
    // The four draft rows are Form 2/5/8/11; "Form 1 " (with space) avoids the
    // "Form 11" substring trap.
    expect(view.container.textContent).not.toContain("Form 1 ");

    clickByText(view.container, "filter-search-no-match");
    await flush();

    // Non-empty source list + zero matches -> the filter-empty message.
    expect(view.container.textContent).toContain("No forms match your current filters.");
    expect(view.container.textContent).toContain("pagination:forms:0/0");

    clickByText(view.container, "filter-search-clear");
    clickByText(view.container, "filter-status-all");
    await flush();

    expect(view.container.textContent).toContain("pagination:forms:10/12");

    clickByText(view.container, "toggle-all-forms");
    expect(view.container.textContent).toContain("bulk-selected:10");

    clickByText(view.container, "toggle-all-forms");
    expect(view.container.textContent).not.toContain("bulk-selected:");
  } finally {
    view.cleanup();
  }
});

test("filterForms matches name, slug, and description case-insensitively with status/access filters", async () => {
  const { filterForms } = await import("../../../core/admin/ui/forms/FormListPage");
  const rows = seedForms(3);
  const withDescription = { ...rows[0]!, description: "Lead capture funnel" };

  expect(filterForms([withDescription], "LEAD", "all", "all")).toHaveLength(1);
  expect(filterForms([withDescription], "funnel", "all", "all")).toHaveLength(1);
  expect(filterForms([withDescription], "  form-1  ", "all", "all")).toHaveLength(1);
  expect(filterForms(rows, "missing", "all", "all")).toHaveLength(0);
  expect(filterForms(rows, "", "published", "all")).toEqual([rows[0]]);
  expect(filterForms(rows, "", "draft", "all")).toEqual([rows[1]]);
  expect(filterForms(rows, "", "all", "public")).toEqual([rows[0], rows[2]]);
  expect(filterForms(rows, "", "draft", "internal")).toEqual([rows[1]]);
});

test("FormListPage row draft/archive succeed and report failures, and submissions navigates", async () => {
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");
  const view = mount(<FormListPage />);

  try {
    await flush();

    clickByText(view.container, "draft-form-row");
    clickByText(view.container, "archive-form-row");
    clickByText(view.container, "submissions-form-row");
    await flush();

    expect(formsPageState.updateFormCalls).toContainEqual({
      id: "form-1",
      input: { status: "draft" },
    });
    expect(formsPageState.updateFormCalls).toContainEqual({
      id: "form-1",
      input: { status: "archived" },
    });
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/submissions");

    formsPageState.updateError = formsPageState.apiError("Status update rejected");
    clickByText(view.container, "publish-form-row");
    await flush();

    expect(view.container.textContent).toContain("Forms update failed");
    expect(view.container.textContent).toContain("Status update rejected");
  } finally {
    view.cleanup();
  }
});

test("FormListPage runs bulk publish, draft, and archive and clears the selection on success", async () => {
  formsPageState.formsList = seedForms(2);
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-publish");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    expect(formsPageState.updateFormCalls.map((call) => call.input.status)).toEqual([
      "published",
      "published",
    ]);
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith("2 forms published.");
    expect(view.container.textContent).not.toContain("bulk-selected:");

    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-draft");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    expect(formsPageState.updateFormCalls.map((call) => call.input.status)).toEqual([
      "published",
      "published",
      "draft",
      "draft",
    ]);

    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-archive");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    expect(formsPageState.updateFormCalls.map((call) => call.input.status)).toEqual([
      "published",
      "published",
      "draft",
      "draft",
      "archived",
      "archived",
    ]);
  } finally {
    view.cleanup();
  }
});

test("FormListPage bulk action partial failure keeps failed targets selected and reports the inline message", async () => {
  formsPageState.formsList = seedForms(2);
  const formsClient = await import("@/services/formsClient");
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    clickByText(view.container, "toggle-all-forms");
    vi.mocked(formsClient.updateForm).mockRejectedValueOnce(new Error("boom"));
    clickByText(view.container, "bulk-action-publish");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    expect(view.container.textContent).toContain("Forms update failed");
    expect(view.container.textContent).toContain("Published 1 form; failed 1.");
    // The failed target stays selected so the operator can retry.
    expect(view.container.textContent).toContain("bulk-selected:1");
  } finally {
    view.cleanup();
  }
});

test("FormListPage bulk delete confirms, deletes, and reports partial failure", async () => {
  formsPageState.formsList = seedForms(2);
  const formsClient = await import("@/services/formsClient");
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-delete");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    // The bulk-delete confirm dialog is the only "Delete selected" surface.
    expect(view.container.textContent).toContain("Delete selected forms?");
    clickByText(view.container, "Delete selected");
    await flush();

    expect(formsPageState.deleteCalls).toEqual(["form-1", "form-2"]);
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith("2 forms deleted.");
    expect(view.container.textContent).not.toContain("bulk-selected:");

    // Partial delete failure keeps the failed target selected.
    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-delete");
    clickByText(view.container, "bulk-action-apply");
    vi.mocked(formsClient.deleteForm).mockRejectedValueOnce(new Error("boom"));
    clickByText(view.container, "Delete selected");
    await flush();

    expect(view.container.textContent).toContain("Forms update failed");
    expect(view.container.textContent).toContain("Deleted 1 form; failed 1.");
    expect(view.container.textContent).toContain("bulk-selected:1");
  } finally {
    view.cleanup();
  }
});

test("FormListPage bulk apply with no pending action is a no-op", async () => {
  formsPageState.formsList = seedForms(2);
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    clickByText(view.container, "toggle-all-forms");
    clickByText(view.container, "bulk-action-apply");
    await flush();

    expect(formsPageState.updateFormCalls).toHaveLength(0);
    expect(formsPageState.deleteCalls).toHaveLength(0);
    // Selection is preserved so the operator can pick an action.
    expect(view.container.textContent).toContain("bulk-selected:2");
  } finally {
    view.cleanup();
  }
});

test("FormListPage persists the open-after-create preference and swallows preference failures", async () => {
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("open-after:true");
    clickByText(view.container, "disable-open-after-create");
    await flush();

    expect(formsPageState.settingsSetCalls).toContainEqual({
      key: "forms.openAfterCreate",
      value: false,
    });
    expect(view.container.textContent).toContain("open-after:false");

    // A failing settings write must not surface an alert or block creation.
    formsPageState.settingsError = new Error("prefs offline");
    clickByText(view.container, "disable-open-after-create");
    await flush();

    expect(view.container.textContent).toContain("open-after:false");
    expect(view.container.textContent).not.toContain("Forms update failed");
  } finally {
    view.cleanup();
  }
});
