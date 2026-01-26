import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { containerTokens, spacingTokens, type LayoutValue } from "./types";
import { sanitizeLayout } from "./blockUtils";

type LayoutPanelProps = {
  value: LayoutValue;
  onChange: (next: LayoutValue) => void;
};

export function LayoutPanel({ value, onChange }: LayoutPanelProps) {
  const update = (next: LayoutValue) => onChange(sanitizeLayout(next));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Container
        </label>
        <Select
          value={value.container}
          onValueChange={(next) =>
            update({ ...value, container: next as LayoutValue["container"] })
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Container" />
          </SelectTrigger>
          <SelectContent>
            {containerTokens.map((token) => (
              <SelectItem key={token} value={token}>
                {token}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Padding top
          </label>
          <Select
            value={value.padding.top}
            onValueChange={(next) =>
              update({
                ...value,
                padding: { ...value.padding, top: next as LayoutValue["padding"]["top"] },
              })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Top" />
            </SelectTrigger>
            <SelectContent>
              {spacingTokens.map((token) => (
                <SelectItem key={token} value={token}>
                  {token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Padding bottom
          </label>
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
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Bottom" />
            </SelectTrigger>
            <SelectContent>
              {spacingTokens.map((token) => (
                <SelectItem key={token} value={token}>
                  {token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Margin top
          </label>
          <Select
            value={value.margin.top}
            onValueChange={(next) =>
              update({
                ...value,
                margin: { ...value.margin, top: next as LayoutValue["margin"]["top"] },
              })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Top" />
            </SelectTrigger>
            <SelectContent>
              {spacingTokens.map((token) => (
                <SelectItem key={token} value={token}>
                  {token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">
            Margin bottom
          </label>
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
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Bottom" />
            </SelectTrigger>
            <SelectContent>
              {spacingTokens.map((token) => (
                <SelectItem key={token} value={token}>
                  {token}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
