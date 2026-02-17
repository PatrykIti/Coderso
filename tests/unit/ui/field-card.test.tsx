import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { Type } from "lucide-react";

import { FieldCard } from "../../../core/admin/ui/content-types/FieldCard";

test("FieldCard renders field details", () => {
  const html = renderAdminUi(
    <FieldCard
      name="Title"
      typeLabel="String"
      description="Main headline"
      badges={["Required"]}
      icon={<Type className="h-4 w-4" />}
      expanded
      settings={{
        displayName: "Title",
        apiId: "title",
        fieldType: "text",
        description: "Main headline",
        validation: { required: true, unique: false, limitLength: false },
        helpText: "Shown on cards",
      }}
    />
  );

  expect(html).toContain("Title");
  expect(html).toContain("Required");
  expect(html).toContain("Display name");
});
