import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Block, EditorMode, WidgetDefinition } from "./types";
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

  const editorState = block.editor ?? { mode: "wizard", wizardCompleted: false };
  const childCount = Array.isArray(block.children) ? block.children.length : 0;
  const supportsChildren = Boolean(widget.canHaveChildren);

  if (!editorState.wizardCompleted) {
    return (
      <WizardPanel
        widget={widget}
        block={block}
        onChange={onChange}
        onComplete={() => onChange(applyWizardSelection(block))}
      />
    );
  }

  return (
    <>
      {supportsChildren ? (
        <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Nested blocks: {childCount}. Use the Insert dialog to add widgets inside
          this block.
        </div>
      ) : null}
      <Tabs
        value={editorState.mode}
        onValueChange={(mode) =>
          onChange({
            ...block,
            editor: { ...editorState, mode: mode as EditorMode },
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
          onChange={onChange}
          onComplete={() => onChange(applyWizardSelection(block))}
        />
      </TabsContent>
      <TabsContent value="visual">
        <VisualPanel widget={widget} block={block} onChange={onChange} />
      </TabsContent>
      <TabsContent value="advanced">
        <AdvancedPanel block={block} widget={widget} onChange={onChange} />
      </TabsContent>
      </Tabs>
    </>
  );
}
