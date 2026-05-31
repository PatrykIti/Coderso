import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  containerTokens,
  spacingTokens,
  type LayoutValue,
  type WidgetLayoutDefaults,
} from "./types";
import { resolveSharedBlockLayoutState, sanitizeLayout } from "./blockUtils";
import { WidgetControlRow } from "../../widgets/editors/WidgetEditorControls";

type LayoutPanelProps = {
  value: LayoutValue;
  pageDefaults?: WidgetLayoutDefaults;
  onChange: (next: LayoutValue) => void;
};

const inheritableContainerTokens = ["inherit", ...containerTokens] as const;
const inheritableSpacingTokens = ["inherit", ...spacingTokens] as const;

const optionLabel = (value: string) =>
  value === "inherit" ? "Inherit page default" : value === "none" ? "None" : value;

const spacingSummaryLabel = (value: string) => (value === "none" ? "None" : value.toUpperCase());

export function LayoutPanel({ value, pageDefaults, onChange }: LayoutPanelProps) {
  const update = (next: LayoutValue) => onChange(sanitizeLayout(next));
  const layoutState = resolveSharedBlockLayoutState(value, pageDefaults);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground" data-builder-layout-inheritance-summary>
        Inherited values keep the page section default until you choose a token. Current effective
        padding is top {spacingSummaryLabel(layoutState.padding.top.effective)}, bottom{" "}
        {spacingSummaryLabel(layoutState.padding.bottom.effective)}.
      </p>
      <WidgetControlRow id="builder.layout.container" label="Content width" path="layout.container">
        {(fieldProps) => (
          <Select
            value={value.container}
            onValueChange={(next) =>
              update({ ...value, container: next as LayoutValue["container"] })
            }
          >
            <SelectTrigger
              id={fieldProps.id}
              aria-labelledby={fieldProps["aria-labelledby"]}
              aria-describedby={fieldProps["aria-describedby"]}
            >
              <SelectValue placeholder="Container" />
            </SelectTrigger>
            <SelectContent>
              {inheritableContainerTokens.map((token) => (
                <SelectItem key={token} value={token}>
                  {optionLabel(token)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-2">
        <WidgetControlRow
          id="builder.layout.padding-top"
          label="Top padding"
          path="layout.padding.top"
        >
          {(fieldProps) => (
            <Select
              value={value.padding.top}
              onValueChange={(next) =>
                update({
                  ...value,
                  padding: { ...value.padding, top: next as LayoutValue["padding"]["top"] },
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Top" />
              </SelectTrigger>
              <SelectContent>
                {inheritableSpacingTokens.map((token) => (
                  <SelectItem key={token} value={token}>
                    {optionLabel(token)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="builder.layout.padding-bottom"
          label="Bottom padding"
          path="layout.padding.bottom"
        >
          {(fieldProps) => (
            <Select
              value={value.padding.bottom}
              onValueChange={(next) =>
                update({
                  ...value,
                  padding: {
                    ...value.padding,
                    bottom: next as LayoutValue["padding"]["bottom"],
                  },
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Bottom" />
              </SelectTrigger>
              <SelectContent>
                {inheritableSpacingTokens.map((token) => (
                  <SelectItem key={token} value={token}>
                    {optionLabel(token)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="builder.layout.margin-top"
          label="Top margin"
          path="layout.margin.top"
        >
          {(fieldProps) => (
            <Select
              value={value.margin.top}
              onValueChange={(next) =>
                update({
                  ...value,
                  margin: { ...value.margin, top: next as LayoutValue["margin"]["top"] },
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Top" />
              </SelectTrigger>
              <SelectContent>
                {inheritableSpacingTokens.map((token) => (
                  <SelectItem key={token} value={token}>
                    {optionLabel(token)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
        <WidgetControlRow
          id="builder.layout.margin-bottom"
          label="Bottom margin"
          path="layout.margin.bottom"
        >
          {(fieldProps) => (
            <Select
              value={value.margin.bottom}
              onValueChange={(next) =>
                update({
                  ...value,
                  margin: {
                    ...value.margin,
                    bottom: next as LayoutValue["margin"]["bottom"],
                  },
                })
              }
            >
              <SelectTrigger
                id={fieldProps.id}
                aria-labelledby={fieldProps["aria-labelledby"]}
                aria-describedby={fieldProps["aria-describedby"]}
              >
                <SelectValue placeholder="Bottom" />
              </SelectTrigger>
              <SelectContent>
                {inheritableSpacingTokens.map((token) => (
                  <SelectItem key={token} value={token}>
                    {optionLabel(token)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </WidgetControlRow>
      </div>
    </div>
  );
}
