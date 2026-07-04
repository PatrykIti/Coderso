import type { ComponentType } from "react";

export type AuthoringCommandIcon = ComponentType<{ className?: string }>;

export type AuthoringCommand = {
  id: string;
  label: string;
  description?: string;
  icon?: AuthoringCommandIcon;
  enabled?: boolean;
  run: () => void | Promise<void>;
};

export type AuthoringCommandGroup = {
  id: string;
  label: string;
  commands: AuthoringCommand[];
};

export async function runAuthoringCommand(command: AuthoringCommand) {
  if (command.enabled === false) return;
  await command.run();
}
