import type { ReactNode } from "react";

import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import { applyBindingsToBlocks } from "../../../services/customScreens/bindingResolver";
import { WidgetRenderer } from "../../../widgets/renderers/widgetRenderer";
import type { DeviceTarget, WidgetBlock, WidgetLayoutDefaults } from "../../../widgets/types";

export function resolveScreenWidgetBlock(input: {
  block: WidgetBlock;
  bindings: CustomScreenBinding[];
  fieldValues: Record<string, unknown>;
}) {
  return applyBindingsToBlocks([input.block], input.bindings, input.fieldValues)[0] ?? input.block;
}

export function ScreenWidgetReadOnlyBlock({
  block,
  previewDevice,
  pageDefaults,
  renderNestedBlock,
}: {
  block: WidgetBlock;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
  renderNestedBlock?: (block: WidgetBlock) => ReactNode;
}) {
  return (
    <WidgetRenderer
      block={block}
      previewDevice={previewDevice}
      pageDefaults={pageDefaults}
      renderBlock={renderNestedBlock}
    />
  );
}
