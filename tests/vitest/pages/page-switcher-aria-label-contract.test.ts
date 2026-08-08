import { describe, expect, it } from "vitest";

import {
  PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH,
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageDocumentV2JsonSchema,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const documentWithSwitcher = (): PageDocumentV2 => ({
  ...createDefaultPageDocumentV2(),
  sections: [
    createPageSectionV2("content", {
      id: "switcher-section",
      blocks: [createPageBlockV2("switcher", { id: "switcher-block" })],
    }),
  ],
});

const withProps = (props: Record<string, unknown>): PageDocumentV2 => {
  const document = structuredClone(documentWithSwitcher());
  document.sections[0]!.blocks[0]!.props = {
    ...document.sections[0]!.blocks[0]!.props,
    ...props,
  };
  return document;
};

describe("Page switcher ariaLabel contract", () => {
  it("allowlists a present-only value without seeding the runtime fallback", () => {
    expect(pageBlockPropKeys.switcher).toEqual(["tabs", "activeIndex", "variant", "ariaLabel"]);
    expect(pageBlockDefaultProps.switcher).not.toHaveProperty("ariaLabel");
    const schema = JSON.stringify(pageDocumentV2JsonSchema);
    expect(schema).toContain('"ariaLabel"');
    expect(schema).toContain(`"maxLength":${PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH}`);
  });

  it("trims and round-trips the authored Polish accessible name", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      withProps({ ariaLabel: "  Wybór stylu domu  " })
    );
    expect(normalized.sections[0]!.blocks[0]!.props.ariaLabel).toBe("Wybór stylu domu");
    expect(normalizeStoredPageDocumentV2ForRead(normalized)).toEqual(normalized);
  });

  it("treats blank as clear and preserves absent normalized JSON identity", () => {
    const absent = normalizePageDocumentV2ForWrite(documentWithSwitcher());
    const cleared = normalizePageDocumentV2ForWrite(withProps({ ariaLabel: "   " }));
    expect(cleared.sections[0]!.blocks[0]!.props).not.toHaveProperty("ariaLabel");
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(absent));
  });

  it("rejects wrong-type, overlong and responsive fresh writes", () => {
    expect(() => normalizePageDocumentV2ForWrite(withProps({ ariaLabel: 12 }))).toThrow(
      "switcher.props.ariaLabel"
    );
    expect(() =>
      normalizePageDocumentV2ForWrite(
        withProps({ ariaLabel: "x".repeat(PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH + 1) })
      )
    ).toThrow("switcher.props.ariaLabel");

    const responsive = documentWithSwitcher();
    responsive.sections[0]!.blocks[0]!.responsive = {
      mobile: { props: { ariaLabel: "Mobilna nazwa" } },
    };
    expect(() => normalizePageDocumentV2ForWrite(responsive)).toThrow("ariaLabel is base-only");
  });

  it("omits malformed stored values without degrading the remaining document", () => {
    const malformed = withProps({ ariaLabel: "x".repeat(PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH + 1) });
    malformed.sections[0]!.blocks[0]!.responsive = {
      tablet: { props: { ariaLabel: "Tablet" } },
    };
    const normalized = normalizeStoredPageDocumentV2ForRead(malformed);
    expect(normalized.sections[0]!.blocks[0]!.props).not.toHaveProperty("ariaLabel");
    expect(normalized.sections[0]!.blocks[0]!.responsive).toBeUndefined();
    expect(normalized.sections[0]!.id).toBe("switcher-section");
  });
});
