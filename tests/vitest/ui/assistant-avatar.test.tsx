import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AssistantAvatar } from "../../../core/admin/ui/assistant/AssistantAvatar";

test("AssistantAvatar does not render when disabled", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled={false} assetUrl={null} state="idle" />
  );

  expect(html).toBe("");
});

test("AssistantAvatar renders placeholder fallback", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled assetUrl={null} state="idle" />
  );

  expect(html).toContain("Assistant avatar");
  expect(html).toContain("Placeholder");
  expect(html).toContain("Optional avatar can use image, video, or glb asset URL");
});

test("AssistantAvatar renders image mode for image assets", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled assetUrl="https://cdn.example.com/avatar.png" state="answer" />
  );

  expect(html).toContain("Image");
  expect(html).toContain("Assistant avatar");
  expect(html).toContain("avatar.png");
});

test("AssistantAvatar renders glb fallback copy for 3D assets", () => {
  const html = renderAdminUi(
    <AssistantAvatar enabled assetUrl="https://cdn.example.com/assistant.glb" state="thinking" />
  );

  expect(html).toContain("3D asset");
  expect(html).toContain("3D avatar asset configured");
});
