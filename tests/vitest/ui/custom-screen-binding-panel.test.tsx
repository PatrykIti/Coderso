import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { FieldBindingPanel } from "../../../core/admin/ui/custom-screens/FieldBindingPanel";

test("FieldBindingPanel renders empty state without selected block", () => {
  const html = renderToString(
    <FieldBindingPanel selectedBlock={null} value={[]} fields={[]} onChange={() => undefined} />
  );

  expect(html).toContain("Select a screen widget block to configure field bindings.");
});

test("FieldBindingPanel renders existing bindings for a selected block", () => {
  const html = renderToString(
    <FieldBindingPanel
      selectedBlock={{
        id: "hero-1",
        type: "hero",
        data: {
          heading: {
            title: "Welcome",
          },
        },
      }}
      value={[
        {
          id: "binding-1",
          widgetId: "hero-1",
          propPath: "heading.title",
          field: "headline",
          mode: "readwrite",
        },
      ]}
      fields={[
        {
          id: "field-headline",
          name: "headline",
          type: "text",
          label: "Headline",
        },
      ]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Field bindings");
  expect(html).toContain("heading.title");
  expect(html).toContain("Content field");
  expect(html).toContain("Mode");
});

test("FieldBindingPanel prefers content prop paths for screen record header bindings", () => {
  const html = renderToString(
    <FieldBindingPanel
      selectedBlock={{
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Untitled record",
          subtitle: "Preview subtitle",
          description: "Preview description",
          badge: "Draft",
          align: "start",
          style: {
            frameBackground: "#fff",
          },
        },
      }}
      value={[
        {
          id: "binding-1",
          widgetId: "header-1",
          propPath: "title",
          field: "title",
          mode: "readwrite",
        },
      ]}
      fields={[
        {
          id: "field-project-title",
          name: "projectTitle",
          type: "text",
          label: "Project title",
        },
      ]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain('option value="subtitle"');
  expect(html).toContain('option value="description"');
  expect(html).toContain('option value="badge"');
  expect(html).toContain("Available widget props");
  expect(html).toContain("Add a binding for this widget prop.");
  expect(html).not.toContain('option value="align"');
  expect(html).not.toContain('option value="style.frameBackground"');
});
