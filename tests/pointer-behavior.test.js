import test from "node:test";
import assert from "node:assert/strict";

import { shouldIgnoreMouseEventsForTarget } from "../pet-app/pointer-behavior.js";

function createTarget(selectors = []) {
  return {
    closest(selectorList) {
      const expected = selectorList.split(",").map(entry => entry.trim());
      return selectors.some(selector => expected.includes(selector)) ? this : null;
    }
  };
}

test("shouldIgnoreMouseEventsForTarget keeps pet interactions active on the pet stage", () => {
  assert.equal(
    shouldIgnoreMouseEventsForTarget({
      target: createTarget([".pet-stage"])
    }),
    false
  );
});

test("shouldIgnoreMouseEventsForTarget keeps bubble interactions active while the bubble is visible", () => {
  assert.equal(
    shouldIgnoreMouseEventsForTarget({
      target: createTarget([".bubble"])
    }),
    false
  );
});

test("shouldIgnoreMouseEventsForTarget ignores clicks on transparent background", () => {
  assert.equal(
    shouldIgnoreMouseEventsForTarget({
      target: createTarget([".pet-shell"])
    }),
    true
  );
});

test("shouldIgnoreMouseEventsForTarget does not enable click-through while dragging or resizing", () => {
  assert.equal(
    shouldIgnoreMouseEventsForTarget({
      target: null,
      isDragging: true
    }),
    false
  );

  assert.equal(
    shouldIgnoreMouseEventsForTarget({
      target: null,
      isResizing: true
    }),
    false
  );
});
