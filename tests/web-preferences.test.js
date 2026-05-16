import test from "node:test";
import assert from "node:assert/strict";

import { createPetWebPreferences } from "../pet-app/web-preferences.js";

test("createPetWebPreferences disables sandbox and forwards preload arguments", () => {
  const preload = "E:/project/pet-app/preload.js";
  const args = {
    stateFile: "E:/project/bridge/state/claude-state.json",
    petConfigFile: "E:/project/assets/pet.json",
    spriteFile: "E:/project/assets/spritesheet.png",
    projectRoot: "E:/project"
  };

  const preferences = createPetWebPreferences({ preload, ...args });

  assert.equal(preferences.preload, preload);
  assert.equal(preferences.sandbox, false);
  assert.deepEqual(preferences.additionalArguments, [
    `--state-file=${args.stateFile}`,
    `--pet-config-file=${args.petConfigFile}`,
    `--sprite-file=${args.spriteFile}`,
    `--project-root=${args.projectRoot}`
  ]);
});
