import assert from "node:assert/strict";
import test from "node:test";
import { moveItemToLayer, normalizeLayers } from "../lib/layers.js";

const items = [
  { id: "alpha", z: 8 },
  { id: "beta", z: 2 },
  { id: "gamma", z: 8 },
];

test("normalizeLayers sorts items and gives every item a contiguous layer", () => {
  const normalized = normalizeLayers(items);

  assert.deepEqual(normalized.map(({ id, z }) => ({ id, z })), [
    { id: "beta", z: 1 },
    { id: "alpha", z: 2 },
    { id: "gamma", z: 3 },
  ]);
  assert.deepEqual(items.map(({ id, z }) => ({ id, z })), [
    { id: "alpha", z: 8 },
    { id: "beta", z: 2 },
    { id: "gamma", z: 8 },
  ]);
});

test("moveItemToLayer clamps requests and preserves all items", () => {
  const movedToFront = moveItemToLayer(items, "beta", 99);
  const movedToBack = moveItemToLayer(movedToFront, "gamma", -10);

  assert.deepEqual(movedToFront.map((item) => item.id), ["alpha", "gamma", "beta"]);
  assert.deepEqual(movedToBack.map((item) => item.id), ["gamma", "alpha", "beta"]);
  assert.deepEqual(movedToBack.map((item) => item.z), [1, 2, 3]);
});
