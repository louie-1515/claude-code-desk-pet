import test from "node:test";
import assert from "node:assert/strict";

import { createPetWindowOptions, defaultWindowSize } from "../pet-app/window-options.js";

test("createPetWindowOptions locks the desk pet window to a stable size", () => {
  assert.deepEqual(defaultWindowSize, { width: 208, height: 299 });

  const options = createPetWindowOptions({
    preload: "E:/project/pet-app/preload.js",
    stateFile: "E:/project/bridge/state/claude-state.json",
    petConfigFile: "E:/project/assets/pet.json",
    spriteFile: "E:/project/assets/spritesheet.png",
    projectRoot: "E:/project"
  });

  assert.equal(options.width, defaultWindowSize.width);
  assert.equal(options.height, defaultWindowSize.height);
  assert.equal(options.minWidth, defaultWindowSize.width);
  assert.equal(options.maxWidth, defaultWindowSize.width);
  assert.equal(options.minHeight, defaultWindowSize.height);
  assert.equal(options.maxHeight, defaultWindowSize.height);
  assert.equal(options.useContentSize, true);
  assert.equal(options.resizable, false);
  assert.equal(options.transparent, true);
  assert.equal(options.frame, false);
});

test("createPetWindowOptions accepts a scaled window size while preserving fixed shell behavior", () => {
  const options = createPetWindowOptions({
    preload: "E:/project/pet-app/preload.js",
    stateFile: "E:/project/bridge/state/claude-state.json",
    petConfigFile: "E:/project/assets/pet.json",
    spriteFile: "E:/project/assets/spritesheet.png",
    projectRoot: "E:/project",
    windowSize: { width: 208, height: 299 }
  });

  assert.equal(options.width, 208);
  assert.equal(options.height, 299);
  assert.equal(options.minWidth, 208);
  assert.equal(options.maxWidth, 208);
  assert.equal(options.minHeight, 299);
  assert.equal(options.maxHeight, 299);
});
