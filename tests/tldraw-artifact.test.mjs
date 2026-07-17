import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const artifactUrl = new URL("../tldraw/byaxis.tldraw", import.meta.url);

test("ships a non-empty native tldraw artifact", async () => {
  const [artifact, metadata] = await Promise.all([
    readFile(artifactUrl),
    stat(artifactUrl),
  ]);

  assert.ok(metadata.size > 10_000, "expected the document to contain its canvas and embedded script");
  assert.deepEqual([...artifact.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04], "expected a ZIP-based .tldraw archive");
});
