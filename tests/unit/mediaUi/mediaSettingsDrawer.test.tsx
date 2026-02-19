import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MediaSettingsDrawer } from "../../../core/admin/ui/media/MediaSettingsDrawer";

test("MediaSettingsDrawer renders delivery access controls", () => {
  const html = renderAdminUi(
    <MediaSettingsDrawer
      open
      onOpenChange={() => undefined}
      accessMode="public"
      isLoading={false}
      isSaving={false}
      error={null}
      success={null}
      onAccessModeChange={() => undefined}
      onSave={() => undefined}
    />
  );

  expect(html).toContain("Media settings");
  expect(html).toContain("Delivery access");
  expect(html).toContain("Access mode");
});
