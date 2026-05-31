# Toggle Block Decision Matrix

| Decision | Researched options | Coderso editor/schema implication |
|---|---|---|
| Keep | Binary/two-state content swap from daisyUI Swap. | Model `states[]` with labels, default state, and panel content/slots; pricing/comparison toggles remain Adapt below. |
| Keep | Segmented control labels from Chakra and Mantine. | Use a clear segmented-control editor model for state labels and ordering. |
| Keep | Accessible pressed/toggle semantics from React Aria. | Renderer must expose state changes through proper button/switch semantics; Radix toggle-group patterns remain Adapt below. |
| Adapt | Toggle groups from Radix, shadcn, and MUI. | Keep this widget focused on content switching; avoid multi-select unless a future task needs it. |
| Adapt | Flowbite switch visual variants. | Map to Coderso visual presets and tokenized size/tone. |
| Adapt | Pricing/comparison toggle from Tailwind Plus. | Support comparison-oriented labels/panels without copying layout. |
| Reject | Arbitrary hidden/show CSS toggles with no accessible state. | State must be explicit, keyboard reachable, and schema validated. |
| Reject | More than a small finite state set by default. | Keep the editor simple; advanced multi-state behavior requires separate approval. |
