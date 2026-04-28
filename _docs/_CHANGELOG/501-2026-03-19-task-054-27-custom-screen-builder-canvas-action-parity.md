# 501. TASK-054-27 custom screen builder canvas action parity

**Date:** 2026-03-19  
**Version:** 0.1.0  
**Tasks:** TASK-054-27

## Key Changes

### Custom Screen Builder
- Moved primary screen-builder actions out of the shell header and into the sticky top canvas area.
- Aligned the custom screen builder action placement with the page builder pattern.
- Kept breadcrumbs/status in the shell header while moving mutating actions closer to the canvas workflow.

### Validation
- Added regression coverage for the updated custom screen builder action layout.
