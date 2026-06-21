import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AuthoringCommandGroup } from "./authoringCommands";
import { runAuthoringCommand } from "./authoringCommands";

export type AuthoringCommandPaletteProps = {
  groups: readonly AuthoringCommandGroup[];
  query: string;
  activeIndex: number;
  placeholder?: string;
  onQueryChange: (value: string) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
};

export function AuthoringCommandPalette({
  groups,
  query,
  activeIndex,
  placeholder = "Search commands",
  onQueryChange,
  onKeyDown,
  onClose,
}: AuthoringCommandPaletteProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-center overflow-hidden bg-background/50 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-label="Command palette"
      data-authoring-command-palette="true"
    >
      <div className="flex max-h-[calc(100dvh_-_8rem)] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-background p-4 shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 rounded border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            autoFocus
          />
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group, groupIndex) => {
              const commandOffset = groups
                .slice(0, groupIndex)
                .reduce((count, current) => count + current.commands.length, 0);
              return (
                <div key={group.id}>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.commands.map((command, commandIndex) => {
                      const Icon = command.icon;
                      const active = activeIndex === commandOffset + commandIndex;
                      return (
                        <button
                          key={command.id}
                          type="button"
                          className={`flex w-full items-start gap-3 rounded border p-3 text-left hover:bg-muted ${
                            active ? "border-primary bg-primary/10" : ""
                          } disabled:pointer-events-none disabled:opacity-50`}
                          aria-current={active ? "true" : undefined}
                          disabled={command.enabled === false}
                          data-authoring-command-active={active ? "true" : "false"}
                          onClick={() => {
                            void runAuthoringCommand(command);
                          }}
                        >
                          {Icon ? (
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : null}
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{command.label}</span>
                            {command.description ? (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {command.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
}
