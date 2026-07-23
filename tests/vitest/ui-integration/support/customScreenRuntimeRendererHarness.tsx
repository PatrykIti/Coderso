import React from "react";
import { createRoot } from "react-dom/client";

import { ScreenRuntimeRenderer } from "../../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import type { ContentField } from "../../../../core/admin/ui/content-types/SchemaBuilder";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../../core/services/customScreens/customScreenSchemas";

export const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

export const fields: ContentField[] = [
  { id: "f-headline", name: "headline", type: "text", label: "Headline" },
  { id: "f-score", name: "score", type: "number", label: "Score" },
  { id: "f-cover", name: "cover", type: "media", label: "Cover" },
];
for (const field of fields) Object.freeze(field);
Object.freeze(fields);

export const doc = (blocks: ScreenBlockV1[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [{ id: "section-1", type: "section", data: { title: "Details" }, blocks }],
});

export const render = (
  blocks: ScreenBlockV1[],
  mode: "builder" | "entry" | "preview",
  bindings: ScreenFieldBinding[] = [],
  values: Record<string, unknown> = {},
  extra: Record<string, unknown> = {}
) =>
  mount(
    <ScreenRuntimeRenderer
      document={doc(blocks)}
      bindings={bindings}
      values={values}
      fields={fields}
      mode={mode}
      {...extra}
    />
  );

export const headingBlock: ScreenBlockV1 = {
  id: "heading-1",
  type: "heading",
  data: {
    label: "Title",
    text: "",
    level: 2,
    align: "left",
    field: "headline",
  },
};
Object.freeze(headingBlock.data);
Object.freeze(headingBlock);

export const headingBinding: ScreenFieldBinding = {
  id: "heading-1-text",
  blockId: "heading-1",
  propPath: "text",
  source: "entry",
  field: "headline",
  mode: "read",
};
Object.freeze(headingBinding);

export const mediaUuidA = "55555555-5555-4555-8555-555555555555";
export const mediaUuidB = "66666666-6666-4666-8666-666666666666";
export const mediaUuidC = "77777777-7777-4777-8777-777777777777";

export const staticImageBlock: ScreenBlockV1 = {
  id: "image-static",
  type: "image",
  data: { label: "Logo", fit: "contain", src: "/media/logo.png" },
};
Object.freeze(staticImageBlock.data);
Object.freeze(staticImageBlock);
