import { beforeEach, expect, test, vi } from "vitest";

const getWidgetTemplateMock = vi.hoisted(() => vi.fn());

vi.mock("../../../core/services/widgets/widgetTemplateService", () => ({
  getWidgetTemplate: getWidgetTemplateMock,
}));

import { resolveTemplateSectionRuntimeData } from "../../../core/services/widgets/templateSectionRuntime";

const validTemplateId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  getWidgetTemplateMock.mockReset();
});

test("template section runtime treats non-UUID template ids as missing without querying the database", async () => {
  const resolution = await resolveTemplateSectionRuntimeData(" missing-template-31-05 ", {
    preview: false,
    templateStack: [],
  });

  expect(resolution).toEqual({ blocks: [], error: "template_missing" });
  expect(getWidgetTemplateMock).not.toHaveBeenCalled();
});

test("template section runtime queries only normalized UUID template ids", async () => {
  getWidgetTemplateMock.mockResolvedValueOnce({
    id: validTemplateId,
    name: "Reusable hero",
    status: "published",
    blocks: [{ id: "child-1", type: "dummy", variant: "default", data: {} }],
  });

  const resolution = await resolveTemplateSectionRuntimeData(` ${validTemplateId} `, {
    preview: false,
    templateStack: [],
  });

  expect(getWidgetTemplateMock).toHaveBeenCalledWith(validTemplateId);
  expect(resolution).toMatchObject({
    templateId: validTemplateId,
    templateName: "Reusable hero",
    blocks: [{ id: "child-1", type: "dummy", variant: "default", data: {} }],
  });
});
