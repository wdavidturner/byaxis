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
- Intentional Dave/Arc overlap to exercise stacking behavior.
- Fixed left sidebar generated from the full live item list, including image thumbnails and layer numbers.
- Sidebar rows that select and highlight the matching canvas item, including items added later.
- Live names sourced from the visible canvas labels, so direct text edits immediately update the sidebar.
- Selected-item controls for renaming, changing shape and color, reordering, and deleting without using the native right style panel.
- The native tldraw style panel remains available for drawing and editing every non-item canvas shape.
- Durable controls for bringing the selected item to the front or moving it backward one item layer.
- Expandable sidebar form with a name field, image picker, drag-and-drop, and preview.
- Uploaded images embedded directly in the `.tldraw` document and grouped with their visible labels.
- Embedded document script that survives save and reopen.

New image items are selected as soon as they are created and work with the same rename, selection, deletion, and layer controls as the included examples. Their uploaded artwork remains their visual appearance; shape and color controls apply to color-backed items.

## Security and privacy

Everything stays in the local `.tldraw` file. The embedded script uses only the tldraw editor APIs and does not make network requests.

Document scripts run when their file is opened. Only open scriptable `.tldraw` files from sources you trust, just as you would with a macro-enabled document or executable project.
