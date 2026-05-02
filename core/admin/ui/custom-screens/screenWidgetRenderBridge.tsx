import type { ReactNode } from "react";

import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import { applyBindingsToBlocks } from "../../../services/customScreens/bindingResolver";
import { ScreenFieldGroupBlock } from "../../../widgets/core/screenFieldGroup";
import { ScreenFieldValueBlock } from "../../../widgets/core/screenFieldValue";
import { ScreenRecordHeaderBlock } from "../../../widgets/core/screenRecordHeader";
import { ScreenTwoColumnBlock } from "../../../widgets/core/screenTwoColumn";
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
  switch (block.type) {
    case "screen-record-header":
      return <ScreenRecordHeaderBlock data={block.data} variant={block.variant ?? "card"} />;
    case "screen-field-value":
      return <ScreenFieldValueBlock data={block.data} variant={block.variant ?? "stacked"} />;
    case "screen-field-group":
      return (
        <ScreenFieldGroupBlock
          data={block.data}
          variant={block.variant ?? "card"}
          slots={block.slots}
          previewDevice={previewDevice}
          pageDefaults={pageDefaults}
          renderBlock={renderNestedBlock}
        />
      );
    case "screen-two-column":
      return (
        <ScreenTwoColumnBlock
          data={block.data}
          variant={block.variant ?? "balanced"}
          slots={block.slots}
          previewDevice={previewDevice}
          pageDefaults={pageDefaults}
          renderBlock={renderNestedBlock}
        />
      );
    default:
      return (
        <WidgetRenderer block={block} previewDevice={previewDevice} pageDefaults={pageDefaults} />
      );
  }
}
