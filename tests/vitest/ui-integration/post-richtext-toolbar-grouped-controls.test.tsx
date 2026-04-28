import React from "react";
import { expect, test } from "vitest";
import { Heading } from "lucide-react";

import {
  PostRichTextToolbar,
  headingLevelActions,
  typeGroupActions,
} from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("writing-canvas toolbar renders grouped type/text/list/code controls", () => {
  const html = renderAdminUi(
    <PostRichTextToolbar profile="writing-canvas" onCommand={() => undefined} />
  );

  expect(html).toContain("Type");
  expect(html).toContain("Text");
  expect(html).toContain("List");
  expect(html).toContain("Code");
});

test("heading level actions include icons for H5 and H6", () => {
  const h5 = headingLevelActions.find((action) => action.id === "heading-5");
  const h6 = headingLevelActions.find((action) => action.id === "heading-6");

  expect(h5?.icon).toBeTruthy();
  expect(h6?.icon).toBeTruthy();
});

test("type dropdown uses generic heading icon", () => {
  const headingType = typeGroupActions.find((action) => action.id === "type-heading");

  expect(headingType?.icon).toBe(Heading);
});

test("heading toolbar profile hides grouped controls that are out of scope", () => {
  const html = renderAdminUi(
    <PostRichTextToolbar profile="heading" onCommand={() => undefined} />
  );

  expect(html).toContain("Type");
  expect(html).toContain("Headings");
  expect(html).not.toContain("List");
  expect(html).not.toContain("Code");
});
