import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import {
  DEFAULT_PET_ID,
  getDefaultPetDescriptor,
  getPetDescriptorById,
  listBuiltInPets
} from "../pet-app/pet-registry.js";

test("built-in registry exposes at least two selectable pets", () => {
  const pets = listBuiltInPets();
  assert.ok(pets.length >= 2);
  assert.ok(pets.some(pet => pet.id === DEFAULT_PET_ID));
});

test("default pet descriptor resolves concrete files", () => {
  const pet = getDefaultPetDescriptor();
  assert.equal(typeof pet.name, "string");
  assert.equal(existsSync(pet.petConfigFile), true);
  assert.equal(existsSync(pet.spriteFile), true);
});

test("unknown pet id falls back to the default descriptor", () => {
  const pet = getPetDescriptorById("missing-id");
  assert.equal(pet.id, DEFAULT_PET_ID);
});
