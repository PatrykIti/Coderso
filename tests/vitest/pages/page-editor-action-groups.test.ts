import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  patchBlockControlForDevice,
  patchSectionControlForDevice,
  sanitizePageSectionStylePatch,
  setBlockVisibleForBreakpoint,
  setSectionVisibleForBreakpoint,
} from "../../../core/services/pages/pageEditorMutationActions";
import type { PageEditorControlDefinition } from "../../../core/services/pages/pageEditorControlRegistry";

const control = (
  id: string,
  overridePath: readonly string[],
  input: PageEditorControlDefinition["input"] = "text"
): PageEditorControlDefinition => ({
  id,
  panel: "content",
  target: id.startsWith("section.") ? "section" : "block",
  label: id,
  path: overridePath,
  overridePath,
  input,
  responsive: true,
});

test("block control mutations sanitize href and media values before draft writes", () => {
  const button = createPageBlockV2("button", {
    props: { label: "Open", href: "/safe", target: "self" },
  });
  const unsafeButton = patchBlockControlForDevice(
    button,
    "desktop",
    control("button.href", ["props", "href"]),
    "javascript:alert(1)"
  );
  expect(unsafeButton.props.href).toBeNull();

  const image = createPageBlockV2("image", {
    props: { src: "/uploads/safe.jpg", alt: "Safe" },
  });
  const unsafeImage = patchBlockControlForDevice(
    image,
    "mobile",
    control("image.src", ["props", "src"], "media"),
    "data:text/html,<svg onload=alert(1)>"
  );
  expect(unsafeImage.responsive?.mobile?.props?.src).toBeNull();
});

test("collection content type mutation still clears stale query ids", () => {
  const collection = createPageBlockV2("collection", {
    props: { contentTypeId: "ct-old", queryId: "query-old", limit: 6 },
  });
  const next = patchBlockControlForDevice(
    collection,
    "desktop",
    control("collection.contentTypeId", ["props", "contentTypeId"], "select"),
    "ct-new"
  );
  expect(next.props.contentTypeId).toBe("ct-new");
  expect(next.props.queryId).toBeNull();
});

test("section control and style patch mutations sanitize unsafe CSS values", () => {
  const section = createPageSectionV2("hero");
  const next = patchSectionControlForDevice(
    section,
    "desktop",
    control("section.style.accent", ["style", "accent"], "color"),
    "red;}body{display:none"
  );
  expect(next.style.accent).toBeNull();

  expect(
    sanitizePageSectionStylePatch({
      backgroundImage: "javascript:alert(1)",
      background: "linear-gradient(90deg, #000, #fff)",
    })
  ).toEqual({ backgroundImage: null, background: "linear-gradient(90deg, #000, #fff)" });
});

test("visibility mutations write base and breakpoint override paths", () => {
  const section = createPageSectionV2("hero");
  expect(setSectionVisibleForBreakpoint(section, "desktop", false).visibility.visible).toBe(false);
  expect(
    setSectionVisibleForBreakpoint(section, "tablet", false).responsive.tablet?.visibility?.visible
  ).toBe(false);

  const block: PageBlockV2 = createPageBlockV2("text");
  expect(setBlockVisibleForBreakpoint(block, "desktop", false).visibility.visible).toBe(false);
  expect(
    setBlockVisibleForBreakpoint(block, "mobile", false).responsive?.mobile?.visibility
  ).toEqual({ visible: false });
});
