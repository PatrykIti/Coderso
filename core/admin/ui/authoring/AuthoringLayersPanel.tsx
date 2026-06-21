import type { AuthoringSelectionTarget } from "./authoringSelection";
import { isSameAuthoringSelection } from "./authoringSelection";

export type AuthoringLayerNode = {
  id: string;
  label: string;
  kind: "section" | "block";
  type?: string;
  target: AuthoringSelectionTarget;
  children?: AuthoringLayerNode[];
};

export type AuthoringLayersPanelProps = {
  label?: string;
  nodes: readonly AuthoringLayerNode[];
  selection: AuthoringSelectionTarget | null;
  onSelect: (target: AuthoringSelectionTarget) => void;
};

const LayerRows = ({
  nodes,
  selection,
  onSelect,
  depth = 0,
}: {
  nodes: readonly AuthoringLayerNode[];
  selection: AuthoringSelectionTarget | null;
  onSelect: (target: AuthoringSelectionTarget) => void;
  depth?: number;
}) => (
  <div className="space-y-1" role={depth === 0 ? "tree" : "group"}>
    {nodes.map((node) => {
      const selected = isSameAuthoringSelection(selection, node.target);
      return (
        <div key={`${node.kind}:${node.id}`} className="space-y-1">
          <button
            type="button"
            role="treeitem"
            aria-selected={selected}
            className={`flex w-full min-w-0 items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs ${
              selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
            style={{ paddingLeft: 8 + depth * 12 }}
            data-authoring-layer-node={node.id}
            data-authoring-layer-kind={node.kind}
            onClick={() => onSelect(node.target)}
          >
            <span className="truncate">{node.label}</span>
            {node.type ? (
              <span className="ml-2 shrink-0 uppercase text-muted-foreground">{node.type}</span>
            ) : null}
          </button>
          {node.children && node.children.length > 0 ? (
            <LayerRows
              nodes={node.children}
              selection={selection}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ) : null}
        </div>
      );
    })}
  </div>
);

export function AuthoringLayersPanel({
  label = "Layers",
  nodes,
  selection,
  onSelect,
}: AuthoringLayersPanelProps) {
  return (
    <div className="space-y-3" aria-label={label} data-authoring-layers-panel="true">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">Select sections and blocks on the canvas.</p>
      </div>
      {nodes.length > 0 ? (
        <LayerRows nodes={nodes} selection={selection} onSelect={onSelect} />
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          Nothing on the canvas yet.
        </div>
      )}
    </div>
  );
}
