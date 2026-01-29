import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemeEditorPage } from "../../../core/admin/ui/themes/ThemeEditorPage";
import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

test("ThemesPage renders base layout", () => {
  const html = renderToString(<ThemesPage />);
  expect(html).toContain("Themes");
  expect(html).toContain("Active Theme");
});

test("ThemeEditorPage renders with provided profile", () => {
  const html = renderToString(
    <ThemeEditorPage
      initialProfile={{
        id: "profile-1",
        name: "Studio",
        description: null,
        themeName: "default",
        tokens: {},
        isActive: true,
        routes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }}
      profileId="profile-1"
    />
  );

  expect(html).toContain("Save Changes");
});
