import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultWindowState,
  normalizeWindowStateForStorage
} from "../pet-app/window-state.js";

test("normalizeWindowStateForStorage preserves position and normalized petScale", () => {
  assert.deepEqual(
    normalizeWindowStateForStorage({ x: 10, y: 20, petScale: 1.24 }),
    { x: 10, y: 20, petScale: 1.25 }
  );
});

test("normalizeWindowStateForStorage defaults invalid scale without moving the window", () => {
  assert.deepEqual(
    normalizeWindowStateForStorage({ x: 10, y: 20, petScale: "large" }),
    { x: 10, y: 20, petScale: 1 }
  );
});

test("normalizeWindowStateForStorage rejects invalid positions", () => {
  assert.equal(normalizeWindowStateForStorage({ x: "10", y: 20, petScale: 1 }), null);
  assert.equal(normalizeWindowStateForStorage({ x: 10, y: null, petScale: 1 }), null);
});

test("defaultWindowState returns sensible defaults", () => {
  const state = defaultWindowState();
  assert.equal(typeof state.x, "number");
  assert.equal(typeof state.y, "number");
  assert.equal(state.petScale, 1);
});
