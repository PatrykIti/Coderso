import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Block, WidgetDefinition } from "./types";
import { AdvancedPanel } from "./AdvancedPanel";
import { VisualPanel } from "./VisualPanel";
import { WizardPanel } from "./WizardPanel";
import { applyWizardSelection } from "./blockUtils";

export type BlockSettingsProps = {
  block?: Block | null;
  widget?: WidgetDefinition;
  onChange: (next: Block) => void;
};

export function BlockSettings({ block, widget, onChange }: BlockSettingsProps) {
  if (!block || !widget) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Select a block to edit its settings.
      </div>
    );
  }

  if (!block.editor.wizardCompleted) {
    return (
      <WizardPanel
        widget={widget}
        block={block}
        onComplete={(variant) => onChange(applyWizardSelection(block, variant))}
      />
    );
  }

  return (
    <Tabs
      value={block.editor.mode}
      onValueChange={(mode) =>
        onChange({
          ...block,
          editor: { ...block.editor, mode: mode as Block["editor"]["mode"] },
        })
      }
      className="gap-4"
    >
      <TabsList variant="line">
        <TabsTrigger value="wizard">Wizard</TabsTrigger>
        <TabsTrigger value="visual">Visual</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      <TabsContent value="wizard">
        <WizardPanel
          widget={widget}
          block={block}
          onComplete={(variant) => onChange(applyWizardSelection(block, variant))}
        />
      </TabsContent>
      <TabsContent value="visual">
        <VisualPanel
          widget={widget}
          selected={block.variant}
          onSelect={(variant) => onChange({ ...block, variant })}
        />
      </TabsContent>
      <TabsContent value="advanced">
        <AdvancedPanel block={block} onChange={onChange} />
      </TabsContent>
    </Tabs>
  );
}
