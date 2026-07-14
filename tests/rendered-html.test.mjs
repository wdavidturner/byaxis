import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Byaxis product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Byaxis — Map ideas visually<\/title>/i);
  assert.match(html, /byaxis<span>\.<\/span>/i);
  assert.match(html, /Saved on this device/);
  assert.match(html, /Add item/);
  assert.match(html, /Export PNG/);
  assert.match(html, /Font package/);
  assert.match(html, /Modernist/);
  assert.match(html, /Items/);
  assert.match(html, /Front to back/);
  assert.match(html, /Private by design/);
  assert.match(html, /Your map and images stay in this browser/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("keeps storage and export entirely in the browser", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /indexedDB\.open/);
  assert.match(page, /FileReader/);
  assert.match(page, /canvas\.toDataURL\("image\/png"\)/);
  assert.match(page, /onPointerDown/);
  assert.match(page, /onDrop/);
  assert.match(page, /Add an item/);
  assert.match(page, /color-palette/);
  assert.match(page, /COLORS\.map/);
  assert.match(page, /Drop an image here/);
  assert.doesNotMatch(page, /Add images|Add your first images/);
  assert.match(page, /moveItemToLayer/);
  assert.match(page, /zIndex: item\.z/);
  assert.match(page, /document\.fonts\.ready/);
  assert.doesNotMatch(page, /fetch\(|XMLHttpRequest|FormData/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /Space_Grotesk/);
  assert.match(layout, /Source_Serif_4/);
  assert.match(layout, /IBM_Plex_Mono/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
