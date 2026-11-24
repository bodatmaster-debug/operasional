<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Fluent UI React dialog layout

- Compose dialogs with `DialogSurface` > `DialogBody` > `DialogTitle`, `DialogContent`, and `DialogActions`.
- Keep `DialogActions` as a sibling of `DialogContent`, never inside its scrollable region.
- Prefer Fluent's viewport sizing for `DialogSurface` and `DialogBody`. If overriding the surface height, account for its 24px padding and the body's viewport-minus-48px max-height; conflicting caps can push the body/actions outside the surface.
- For long forms, give `DialogBody` explicit rows (`auto minmax(0, 1fr) auto`) and `minHeight: 0`; make only `DialogContent` scroll with `minHeight: 0` and `overflowY: auto`.
- Verify that growing content scrolls while actions remain visible, including short viewports. Preserve Fluent UI's responsive and short-screen behavior.
- Prefer Fluent UI `makeStyles` for component-specific layout. Tailwind may coexist, but avoid global overrides that compete with Fluent UI component styles; this project uses React, not Vue.
