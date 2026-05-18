import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultWindowState,
  normalizeWindowStateForStorage
} from "../pet-app/window-state.js";

test("normalizeWindowStateForStorage keeps display preferences with defaults", () => {
  const state = normalizeWindowStateForStorage({ x: 10.2, y: 19.7, petScale: 0.97 });
  assert.deepEqual(state, {
    x: 10,
    y: 20,
    petScale: 0.95
  });
});

test("normalizeWindowStateForStorage sanitizes invalid preferences", () => {
  const state = normalizeWindowStateForStorage({
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: 42,
    hideBubbleOnIdle: "yes"
  });
  assert.deepEqual(state, {
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: "default",
    hideBubbleOnIdle: false
  });
});

test("normalizeWindowStateForStorage preserves selectedPetId and hideBubbleOnIdle", () => {
  const state = normalizeWindowStateForStorage({
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: "cat",
    hideBubbleOnIdle: true
  });
  assert.deepEqual(state, {
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: "cat",
    hideBubbleOnIdle: true
  });
});

test("defaultWindowState exposes default pet settings", () => {
  assert.deepEqual(defaultWindowState(), {
    x: 0,
    y: 0,
    petScale: 1,
    selectedPetId: "default",
    hideBubbleOnIdle: false
  });
});
