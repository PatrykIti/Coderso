import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { FieldSettingsPanel } from "../../../core/admin/ui/forms/FieldSettingsPanel";
import { FormBuilderPage } from "../../../core/admin/ui/forms/FormBuilderPage";
import { FormListPage } from "../../../core/admin/ui/forms/FormListPage";
import { FormRuntimePreviewDialog } from "../../../core/admin/ui/forms/FormRuntimePreviewDialog";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("FormListPage renders list skeleton", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/advanced/forms">
      <FormListPage />
    </AdminRouterProvider>
  );
  expect(html).toContain("Forms");
  expect(html).toContain("New");
});

test("FieldSettingsPanel renders logic and style controls", () => {
  const html = renderToString(
    <FieldSettingsPanel
      field={{
        id: "field-1",
        label: "Name",
        type: "text",
        name: "name",
        required: false,
        settings: {},
      }}
      allFields={[
        {
          id: "field-1",
          label: "Name",
          name: "name",
        },
        {
          id: "field-2",
          label: "Category",
          name: "category",
        },
      ]}
      onChange={() => undefined}
      onSettingsChange={() => undefined}
    />
  );

  expect(html).toContain("Logic");
  expect(html).toContain("Style");
  expect(html).toContain("Field Settings");
});

test("FormBuilderPage renders runtime preview and action logs actions", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/advanced/forms/form-1">
      <FormBuilderPage />
    </AdminRouterProvider>
  );

  expect(html).toContain("Action logs");
  expect(html).toContain("Runtime preview");
});

test("FormRuntimePreviewDialog renders submit controls", () => {
  const html = renderToString(
    <FormRuntimePreviewDialog
      open
      onOpenChange={() => undefined}
      formId="form-1"
      formName="Contact"
      formDescription="Preview form"
      settings={{
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      }}
      fields={[]}
      hasUnsavedChanges={false}
      onOpenLogs={() => undefined}
    />
  );

  expect(html).toContain("Form Runtime Preview");
  expect(html).toContain("Submit preview");
});
