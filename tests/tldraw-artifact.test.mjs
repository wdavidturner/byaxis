import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const artifactUrl = new URL("../tldraw/byaxis.tldraw", import.meta.url);
const artifactPath = fileURLToPath(artifactUrl);
const execFileAsync = promisify(execFile);

test("ships a non-empty native tldraw artifact", async () => {
  const [artifact, metadata] = await Promise.all([
    readFile(artifactUrl),
    stat(artifactUrl),
  ]);

  assert.ok(metadata.size > 10_000, "expected the document to contain its canvas and embedded script");
  assert.deepEqual([...artifact.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], "expected a ZIP-based .tldraw archive");
});

test("embeds the local image-item UI", async () => {
  const [{ stdout: configScript }, { stdout: mainScript }, { stdout: sidebarScript }] = await Promise.all([
    execFileAsync("unzip", ["-p", artifactPath, "script/config.js"]),
    execFileAsync("unzip", ["-p", artifactPath, "script/main.js"]),
    execFileAsync("unzip", ["-p", artifactPath, "script/sidebar.js"]),
  ]);

  assert.match(configScript, /ByaxisSidebar/);
  assert.match(sidebarScript, /\+ Add item/);
  assert.match(sidebarScript, /type: "files"/);
  assert.match(sidebarScript, /accept: "image\/\*"/);
  assert.match(sidebarScript, /Move backward/);
  assert.match(sidebarScript, /getSortedChildIdsForParent/);
  assert.match(sidebarScript, /renderPlaintextFromRichText/);
  assert.match(sidebarScript, /SHAPE_OPTIONS/);
  assert.match(sidebarScript, /COLOR_OPTIONS/);
  assert.match(sidebarScript, /Delete item/);
  assert.match(configScript, /StylePanel/);
  assert.match(configScript, /if \(selectedItemId\) return null/);
  assert.doesNotMatch(mainScript, /geo\("control-panel"/);
});
