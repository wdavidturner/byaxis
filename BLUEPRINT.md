# Blueprint: build a browser-only quadrant mapper

Copy everything below into a coding agent. Replace bracketed values before you send it, or let the agent make sensible visual choices. This is intentionally product-neutral: it should produce a similar tool without copying a name, domain, account, deployment ID, or any other personal artifact.

---

Build a polished, responsive web app named **[PRODUCT NAME]**: a private, browser-only tool for making and exporting visual quadrant maps.

The product should feel like a focused creative tool, not a dashboard. It must be useful with no account and no setup. Use **[TAGLINE]** as the short positioning line. The default visual direction is warm editorial minimalism: an off-white canvas, ink-black typography, restrained color, generous spacing, precise borders, and a quiet Swiss-style interface. Adapt this direction if a different aesthetic is specified.

## Non-negotiable constraints

- The app must work entirely in the browser after it loads.
- Do not add authentication, API routes, a database, analytics, telemetry, upload endpoints, a CMS, cloud storage, or a server-side image pipeline.
- Store the map and user-provided images only in browser storage. Use IndexedDB for the main document. Store uploaded images as data URLs or browser-managed blobs and explain the tradeoff in the README.
- Do not transmit user-created content anywhere. There must be no `fetch`, `XMLHttpRequest`, `FormData`, or network call in the editor path.
- Use Google Fonts only. Prefer a framework integration that bundles the selected fonts at build time rather than requesting fonts at runtime.
- Make the app accessible with semantic controls, visible focus styles, keyboard interaction, labels, and useful screen-reader text.
- Build a normal open-source repository: clean README, license, tests, no owner-specific configuration or deployment identifiers committed.

## Product model

Persist one document with this conceptual shape:

```ts
type Item = {
  id: string;
  label: string;
  x: number;        // percent within the board
  y: number;        // percent within the board
  size: number;     // pixels in the editor
  color: string;
  initials: string;
  src?: string;     // local data URL or blob URL only
  z: number;        // 1 = back, largest = front
};

type MapDocument = {
  title: string;
  subtitle: string;
  xLeft: string;
  xRight: string;
  yTop: string;
  yBottom: string;
  quadrants: [string, string, string, string];
  fontPack: string;
  items: Item[];
};
```

Ship a useful example map on first visit. When loading saved data, normalize older or partial records: ensure each item has a unique contiguous `z` value and a valid font package. Never discard a map merely because an optional newer field is missing.

## Required experience

Create a desktop-first two-column editor that becomes a usable single-column layout on small screens.

### Top bar

- Product wordmark, local-save status, **Add item**, **Export PNG**, and a compact mobile controls toggle.
- State clearly that saving is local to this device.

### Sidebar controls

- Editable title and subtitle.
- Editable left/right/top/bottom axis labels.
- Editable labels for all four quadrants.
- A font-package dropdown with at least four real Google Font pairings, for example:
  - Modernist: Space Grotesk + Inter
  - Editorial: Source Serif 4 + DM Sans
  - Friendly: Manrope + Nunito Sans
  - Technical: IBM Plex Sans + IBM Plex Mono
- A selected-item editor with label, size slider, layer position, back/forward controls, and remove action.
- An **Items** list ordered front-to-back. It must make overlapping objects easy to select, with thumbnail/color swatch, name, and layer number.
- A simple reset-example action and clear-items action, both confirmed before destructive changes.

### Quadrant board

- A clear 2×2 field with visible horizontal and vertical axes, exterior axis labels, and quadrant labels.
- Items positioned with percentages and rendered as draggable rounded squares. An image fills an item with `object-fit: cover`; otherwise render initials over the chosen color.
- Select an item by clicking it. Show obvious selection affordance.
- Use Pointer Events with pointer capture for drag behavior. Keep items within sensible board bounds.
- Support keyboard arrow-key nudging. Hold Shift for a larger step. Delete/Backspace removes the selected item.
- Allow items to overlap. Render by `z`, and make layer reordering deterministic: normalize to 1..n, clamp requested positions, and avoid mutating prior state.

### Add-item modal

The primary action is always **Add item**, never “Add image.” The modal includes:

- Required item-name input.
- Optional image drop zone that accepts drag-and-drop or file selection. Only accept image MIME types. Pre-fill the name from the filename when helpful.
- A 20-color palette in two visual rows. The color remains useful as the fallback/preview even when an image is attached.
- A live preview, Cancel, and Add item action.
- Escape and backdrop-close behavior, a dialog role, labelled heading, and sensible focus management.

### PNG export

- Create the export entirely with the Canvas API, not a server screenshot.
- Wait for `document.fonts.ready` so the current font selection is honored.
- Export at a generous fixed size such as 1600×1200 with the same visual hierarchy as the editor: title, subtitle, axes, quadrant labels, items, and a configurable product-name watermark.
- Draw items strictly back-to-front using ascending `z`. Crop images with cover behavior. Trigger a browser download with a safe filename based on the map title.

## Implementation guidance

- Use React and TypeScript with a modern framework, or an equivalent client-first stack. Keep editor state in one intentional document object and use small, pure utilities for layer behavior.
- Debounce IndexedDB writes so typing and dragging remain responsive. Read from storage only after hydration to avoid server/client mismatch.
- Do not use a component library unless it materially improves accessibility without diluting the visual design. Custom CSS is preferred for this small, distinct product.
- Add a responsive CSS strategy: desktop sidebar, mobile sheet/panel, touch-friendly controls, no hover-only behavior.
- Be defensive around browser APIs: IndexedDB may fail, image decoding may fail, and the app should remain usable with its in-memory document.

## Required test coverage

Add lightweight, fast tests that do not need a real browser:

1. Build the production app and assert the rendered HTML contains the product title, local-save message, Add item action, export action, font control, items list, and privacy promise.
2. Read the editor source and assert it uses IndexedDB, `FileReader`, Pointer Events, drag/drop, Canvas PNG export, and `document.fonts.ready`; assert it does not include upload/network primitives.
3. Unit-test pure layer helpers: sorting/normalization, moving to front/back, clamping out-of-range positions, and no mutation of the original array.
4. Run lint and type checking as part of the documented verification commands.

## Documentation and handoff

Write a README that includes:

- A one-paragraph product description and a preview image or screenshot.
- Features, privacy behavior, local setup, verification commands, concise architecture map, deployment notes, and license.
- Plain-language explanation that browser storage is local to a browser profile and can be cleared with site data.
- No hard-coded personal domain, user handle, project ID, access token, or personalized placeholder content.

Add an MIT license unless a different license is specified. Ensure the final repository contains only the application and its purposeful supporting files—remove unused starter database code, example API routes, authentication helpers, scaffold logos, and deployment-specific IDs.

## Definition of done

The app is visually complete, runs locally, saves a map and local images across reloads, supports overlap and intentional item ordering, exports a faithful PNG, is keyboard and mobile usable, has the tests above passing, and can be published publicly without exposing personal configuration.

Before you finish, report the changed files, the commands run and their results, the chosen storage mechanism, and any limitations of fully browser-local images.

---

Suggested customization variables: `[PRODUCT NAME]`, `[TAGLINE]`, color palette, default example map, visual mood, font packages, watermark text, and license.
