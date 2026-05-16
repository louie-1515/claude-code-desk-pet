import test from "node:test";
import assert from "node:assert/strict";

import {
  clampPositionToWorkArea,
  defaultWindowPosition,
  settleDraggedWindowPosition,
  snapWindowPosition,
  windowCenterPoint
} from "../pet-app/window-behavior.js";

test("defaultWindowPosition places the pet near the bottom-right corner", () => {
  const position = defaultWindowPosition({
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 260, height: 320 }
  });

  assert.deepEqual(position, { x: 1156, y: 556 });
});

test("clampPositionToWorkArea keeps the pet inside the visible work area", () => {
  const position = clampPositionToWorkArea({
    point: { x: 1400, y: 800 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 260, height: 320 }
  });

  assert.deepEqual(position, { x: 1180, y: 580 });
});

test("snapWindowPosition gently snaps when close to an edge", () => {
  const position = snapWindowPosition({
    point: { x: 8, y: 554 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 260, height: 320 }
  });

  assert.deepEqual(position, { x: 24, y: 556 });
});

test("snapWindowPosition leaves the pet alone when far from edges", () => {
  const position = snapWindowPosition({
    point: { x: 500, y: 300 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 260, height: 320 }
  });

  assert.deepEqual(position, { x: 500, y: 300 });
});

test("settleDraggedWindowPosition preserves an arbitrary drop point inside the screen", () => {
  const position = settleDraggedWindowPosition({
    point: { x: 512, y: 288 },
    workArea: { x: 0, y: 0, width: 1440, height: 900 },
    windowSize: { width: 260, height: 320 }
  });

  assert.deepEqual(position, { x: 512, y: 288 });
});

test("windowCenterPoint uses the actual window center for display selection", () => {
  assert.deepEqual(
    windowCenterPoint({
      point: { x: 512, y: 288 },
      windowSize: { width: 208, height: 248 }
    }),
    { x: 616, y: 412 }
  );
});
