import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SELECTED_PET_ID } from "./window-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const DEFAULT_PET_ID = DEFAULT_SELECTED_PET_ID;

const builtInPets = [
  {
    id: DEFAULT_PET_ID,
    name: "月白档案员",
    petConfigFile: path.join(projectRoot, "assets", "pets", "yuebai-archivist", "pet.json"),
    spriteFile: path.join(projectRoot, "assets", "pets", "yuebai-archivist", "spritesheet.png"),
    trayIconFile: path.join(projectRoot, "launcher", "Claude 桌宠.ico")
  },
  {
    id: "xiaokou",
    name: "晨光信使",
    petConfigFile: path.join(projectRoot, "assets", "pets", "xiaokou", "pet.json"),
    spriteFile: path.join(projectRoot, "assets", "pets", "xiaokou", "spritesheet.png"),
    trayIconFile: path.join(projectRoot, "launcher", "Claude 桌宠.ico")
  }
];

export function listBuiltInPets() {
  return builtInPets.map(pet => ({ ...pet }));
}

export function getDefaultPetDescriptor() {
  return listBuiltInPets()[0];
}

export function getPetDescriptorById(id) {
  return listBuiltInPets().find(pet => pet.id === id) ?? getDefaultPetDescriptor();
}
