# Template Section Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Pattern/category metadata from WordPress and block libraries. | `template-section` should expose template id, category, preview label, and version metadata. |
| Adapt | Detach/sync concept from reusable patterns. | Add explicit source/sync semantics only if runtime already supports reusable templates. |
| Keep | Typed block data from Payload. | Keep schema-first template payloads with normalized nested blocks. |
| Adapt | Gallery previews from shadcn, Flowbite, Tailwind Plus, and LayoutBlocks. | Use preview metadata and category tags; implementation remains Coderso-authored. |
| Adapt | AI prompt hints from LayoutBlocks. | Store research summaries only; do not generate implementation leaves in this slice. |
| Reject | Treating every researched block as a separate Coderso widget. | Keep one template-section contract with variants/presets. |
| Reject | Copy-paste third-party configs/components. | Research archive remains summary-only. |
