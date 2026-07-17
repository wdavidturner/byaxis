# Byaxis for tldraw Offline

![Byaxis quadrant board inside tldraw Offline](preview.jpg)

This directory contains a self-contained experimental edition of Byaxis built inside [tldraw Offline](https://github.com/tldraw/tldraw-offline).

## Open it

1. Install tldraw Offline for macOS, Windows, or Linux.
2. Download or clone this repository.
3. Open `byaxis.tldraw` from tldraw Offline or your file browser.

The document contains the canvas, example data, and its interaction script. It does not need the Byaxis web app, an account, a database, or a network connection after tldraw Offline is installed.

## Current milestone

- Editable 2×2 quadrant board and labels made from standard tldraw shapes.
- Six draggable color-backed example items.
- Intentional Atlas/Arc overlap to exercise stacking behavior.
- In-canvas item picker for selecting through overlaps.
- Durable controls for bringing the selected item to the front or moving it backward.
- Embedded document script that survives save and reopen.

This is the first useful milestone, not feature parity with the browser app. Local image items, richer editing controls, and export behavior are still future work.

## Security and privacy

Everything stays in the local `.tldraw` file. The embedded script uses only the tldraw editor APIs and does not make network requests.

Document scripts run when their file is opened. Only open scriptable `.tldraw` files from sources you trust, just as you would with a macro-enabled document or executable project.
