import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { getDisplayCellSize } from "../pet-app/display-metrics.js";

const pet = JSON.parse(readFileSync(new URL("../assets/pet.json", import.meta.url), "utf8"));

test("runtime sprite sheet uses a 2x cell while preserving the compact display size", () => {
  assert.deepEqual(pet.cell, { width: 384, height: 416 });
  assert.deepEqual(getDisplayCellSize(pet.cell), { width: 134, height: 146 });
});

test("drag animations keep the Codex-compatible row mapping", () => {
  assert.equal(pet.animations["running-right"].row, 1);
  assert.equal(pet.animations["running-left"].row, 2);
  assert.equal(pet.animations.jumping.row, 4);
});
