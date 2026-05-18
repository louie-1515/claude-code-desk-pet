import test from "node:test";
import assert from "node:assert/strict";

import { dragDirectionFromDelta, resolveDisplayState, resolveDragDirection } from "../pet-app/view-model.js";

test("dragDirectionFromDelta ignores tiny movement and detects left/right", () => {
  assert.equal(dragDirectionFromDelta(4), null);
  assert.equal(dragDirectionFromDelta(18), "right");
  assert.equal(dragDirectionFromDelta(-18), "left");
});

test("resolveDisplayState prefers drag animation over normal phase animation", () => {
  const draggingRight = resolveDisplayState({ phase: "idle", dragDirection: "right" });
  const draggingLeft = resolveDisplayState({ phase: "tool_running", dragDirection: "left" });
  const normal = resolveDisplayState({ phase: "done", dragDirection: null });

  assert.equal(draggingRight.animation, "running-right");
  assert.equal(draggingLeft.animation, "running-left");
  assert.equal(normal.animation, "waving");
});

test("resolveDragDirection keeps the previous direction through tiny pauses and slow movement", () => {
  assert.equal(resolveDragDirection({ deltaX: 18, currentDirection: null, threshold: 4 }), "right");
  assert.equal(resolveDragDirection({ deltaX: 1, currentDirection: "right", threshold: 4 }), "right");
  assert.equal(resolveDragDirection({ deltaX: -1, currentDirection: "left", threshold: 4 }), "left");
  assert.equal(resolveDragDirection({ deltaX: -8, currentDirection: "right", threshold: 4 }), "left");
  assert.equal(resolveDragDirection({ deltaX: 0, currentDirection: null, threshold: 4, fallbackDirection: "left" }), "left");
});
