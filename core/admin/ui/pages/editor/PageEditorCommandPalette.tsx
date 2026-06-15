import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BlockOption, SectionOption } from "./pageEditorOptions";

export type PageEditorTemplateOption = {
  id: string;
  name: string;
  description: string | null;
};

const CommandGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const CommandButton = ({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`w-full rounded border p-3 text-left hover:bg-muted ${
      active ? "border-primary bg-primary/10" : ""
    }`}
    aria-current={active ? "true" : undefined}
    data-page-editor-command-active={active ? "true" : "false"}
    onClick={onClick}
  >
    <span className="block text-sm font-semibold">{label}</span>
    <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
  </button>
);

export const PageEditorCommandPalette = ({
  commandQuery,
  commandActiveIndex,
  canInsertSections,
  sections,
  blocks,
  templates,
  showTemplates,
  onQueryChange,
  onKeyDown,
  onAddSection,
  onAddBlock,
  onInsertTemplate,
  onClose,
}: {
  commandQuery: string;
  commandActiveIndex: number;
  canInsertSections: boolean;
  sections: readonly SectionOption[];
  blocks: readonly BlockOption[];
  templates: readonly PageEditorTemplateOption[];
  showTemplates: boolean;
  onQueryChange: (value: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onAddSection: (type: SectionOption["type"]) => void;
  onAddBlock: (type: BlockOption["type"]) => void;
  onInsertTemplate: (id: string) => void;
  onClose: () => void;
}) => (
  <div
    className="absolute inset-0 z-40 flex items-start justify-center overflow-hidden bg-background/50 p-4 backdrop-blur-sm sm:p-6"
    role="dialog"
    aria-label="Command palette"
  >
    <div
      className="flex max-h-[calc(100dvh_-_8rem)] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background p-4 shadow-2xl sm:max-h-[calc(100dvh_-_9rem)]"
      data-page-editor-command-dialog="viewport-safe"
    >
      <div className="flex shrink-0 items-center gap-2 rounded border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent text-sm outline-none"
          value={commandQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search sections and blocks"
          aria-label="Search sections and blocks"
          aria-controls="page-editor-command-results"
          autoFocus
        />
      </div>
      <div
        id="page-editor-command-results"
        className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
        data-page-editor-command-results-scroll="true"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {canInsertSections ? (
            <CommandGroup title="Sections">
              {sections.map((option, index) => (
                <CommandButton
                  key={option.type}
                  label={option.label}
                  description={option.description}
                  active={commandActiveIndex === index}
                  onClick={() => onAddSection(option.type)}
                />
              ))}
            </CommandGroup>
          ) : null}
          <CommandGroup title="Blocks">
            {blocks.map((option, index) => {
              const resultIndex = sections.length + index;
              return (
                <CommandButton
                  key={option.type}
                  label={option.label}
                  description={option.description}
                  active={commandActiveIndex === resultIndex}
                  onClick={() => onAddBlock(option.type)}
                />
              );
            })}
          </CommandGroup>
          {showTemplates && templates.length > 0 ? (
            <CommandGroup title="Page templates">
              {templates.map((option, index) => {
                const resultIndex = sections.length + blocks.length + index;
                return (
                  <CommandButton
                    key={option.id}
                    label={option.name}
                    description={option.description ?? "Insert template sections"}
                    active={commandActiveIndex === resultIndex}
                    onClick={() => onInsertTemplate(option.id)}
                  />
                );
              })}
            </CommandGroup>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex shrink-0 justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  </div>
);
