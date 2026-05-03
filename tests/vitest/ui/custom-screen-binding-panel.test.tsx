import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  buildBindingFieldOptions,
  FieldBindingPanel,
} from "../../../core/admin/ui/custom-screens/FieldBindingPanel";

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
      selectedWidgetSource="legacy-fallback"
    />
  );

  expect(html).toContain("Legacy compatibility");
  expect(html).toContain("heading.title");
  expect(html).toContain("Content field");
  expect(html).toContain("Mode");
});

test("FieldBindingPanel renders prop-centric cards for selected-entry screen widgets", () => {
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
      selectedWidgetSource="screen-registry"
      selectedWidget={{
        type: "screen-record-header",
        title: "Screen Record Header",
        category: "content",
        variants: [{ id: "card", label: "Card" }],
        schema: {},
        defaults: {},
        dataAccess: { source: "selected-entry", modes: ["read", "write"] },
        bindingTargets: [
          { propPath: "eyebrow", label: "Eyebrow", modes: ["read", "write"] },
          { propPath: "title", label: "Title", modes: ["read", "write"] },
          { propPath: "subtitle", label: "Subtitle", modes: ["read", "write"] },
          { propPath: "description", label: "Description", modes: ["read", "write"] },
          { propPath: "badge", label: "Badge", modes: ["read", "write"] },
        ],
        editor: {
          wizard: () => null,
          visual: () => null,
          advanced: () => null,
        },
        render: () => null,
      }}
    />
  );

  expect(html).toContain("Map widget-owned props");
  expect(html).toContain("Title");
  expect(html).toContain("Subtitle");
  expect(html).toContain("Description");
  expect(html).toContain("Badge");
  expect(html).not.toContain("This saved binding mode is no longer supported");
  expect(html).not.toContain("Binding 1");
  expect(html).not.toContain("Available widget props");
});

test("FieldBindingPanel does not duplicate system and schema fields with the same name", () => {
  expect(
    buildBindingFieldOptions([
      {
        id: "field-title",
        name: "title",
        type: "text",
        label: "Project title",
      },
      {
        id: "field-description",
        name: "description",
        type: "text",
        label: "Description",
      },
    ])
  ).toEqual([
    { value: "title", label: "Title", type: "system", writable: true },
    { value: "slug", label: "Slug", type: "system", writable: true },
    { value: "status", label: "Status", type: "system", writable: false },
    { value: "createdAt", label: "Created", type: "system", writable: false },
    { value: "updatedAt", label: "Updated", type: "system", writable: false },
    { value: "publishedAt", label: "Published", type: "system", writable: false },
    { value: "description", label: "Description", type: "text", writable: true },
  ]);
});
