import test from "node:test";
import assert from "node:assert/strict";

import { getPointerPoint, normalizeScreenPoint } from "../pet-app/drag-coordinates.js";

test("getPointerPoint prefers the main-process cursor position when available", () => {
  const point = getPointerPoint(
    {
      getCursorScreenPoint() {
        return { x: 640, y: 820 };
      }
    },
    { x: 900, y: 600 }
  );

  assert.deepEqual(point, { x: 640, y: 820 });
});

test("normalizeScreenPoint preserves renderer screen coordinates without extra scaling", () => {
  const point = normalizeScreenPoint(
    {
      screenToDipPoint(value) {
        return { x: value.x / 1.5, y: value.y / 1.5 };
      }
    },
    { x: 900, y: 600 }
  );

  assert.deepEqual(point, { x: 900, y: 600 });
});

test("normalizeScreenPoint falls back to rounded coordinates when conversion is unavailable", () => {
  const point = normalizeScreenPoint({}, { x: 512.4, y: 288.6 });
  assert.deepEqual(point, { x: 512, y: 289 });
});
