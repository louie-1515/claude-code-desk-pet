import test from "node:test";
import assert from "node:assert/strict";

import {
  DISPLAY_SCALE,
  DEFAULT_PET_SCALE,
  MAX_PET_SCALE,
  MIN_PET_SCALE,
  STEP_PET_SCALE,
  getDisplayCellSize,
  getPetWindowSize,
  normalizePetScale
} from "../pet-app/display-metrics.js";

test("display scale stays at the compact desk pet size", () => {
  assert.equal(DISPLAY_SCALE, 0.35);
});

test("getDisplayCellSize returns the scaled sprite dimensions", () => {
  const size = getDisplayCellSize({ width: 384, height: 416 });
  assert.deepEqual(size, { width: 134, height: 146 });
});

test("normalizePetScale clamps and rounds user resize values", () => {
  assert.equal(MIN_PET_SCALE, 0.75);
  assert.equal(MAX_PET_SCALE, 1.35);
  assert.equal(DEFAULT_PET_SCALE, 1);
  assert.equal(STEP_PET_SCALE, 0.05);
  assert.equal(normalizePetScale(0.1), 0.75);
  assert.equal(normalizePetScale(2), 1.35);
  assert.equal(normalizePetScale(1.12), 1.1);
  assert.equal(normalizePetScale(Number.NaN), 1);
});

test("getDisplayCellSize only changes the pet sprite size", () => {
  assert.deepEqual(getDisplayCellSize({ width: 384, height: 416 }, 1), { width: 134, height: 146 });
  assert.deepEqual(getDisplayCellSize({ width: 384, height: 416 }, 1.25), { width: 168, height: 182 });
});

test("getPetWindowSize grows and shrinks to fit the scaled pet", () => {
  assert.deepEqual(getPetWindowSize({ width: 384, height: 416 }, 1), { width: 208, height: 248 });
  assert.deepEqual(getPetWindowSize({ width: 384, height: 416 }, 1.25), { width: 226, height: 284 });
  assert.deepEqual(getPetWindowSize({ width: 384, height: 416 }, 0.75), { width: 208, height: 211 });
});
