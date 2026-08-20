import type { ReactNode } from "react";

export type RuntimeScriptRegistry = {
  registerScript: (id: string, source: string) => void;
  renderScripts: () => ReactNode[];
};

export function createWidgetRuntimeScriptRegistry(): RuntimeScriptRegistry {
  const scripts = new Map<string, string>();

  return {
    registerScript(id, source) {
      if (!scripts.has(id)) {
        scripts.set(id, source);
      }
    },
    renderScripts() {
      return Array.from(scripts.entries()).map(([id, source]) => (
        <script
          key={id}
          type="text/javascript"
          data-coderso-runtime-script={id}
          dangerouslySetInnerHTML={{ __html: source }}
        />
      ));
    },
  };
}

export function renderSharedWidgetRuntimeScript({
  renderContext,
  id,
  source,
}: {
  renderContext?: { runtimeScripts?: RuntimeScriptRegistry };
  id: string;
  source: string;
}): ReactNode {
  const registry = renderContext?.runtimeScripts;
  if (registry) {
    registry.registerScript(id, source);
    return null;
  }

  return (
    <script
      type="text/javascript"
      data-coderso-runtime-script={id}
      dangerouslySetInnerHTML={{ __html: source }}
    />
  );
}
