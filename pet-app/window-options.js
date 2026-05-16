import { createPetWebPreferences } from "./web-preferences.js";

export const defaultWindowSize = { width: 208, height: 248 };

export function createPetWindowOptions({
  preload,
  stateFile,
  petConfigFile,
  spriteFile,
  projectRoot,
  windowSize = defaultWindowSize
}) {
  return {
    width: windowSize.width,
    height: windowSize.height,
    minWidth: windowSize.width,
    maxWidth: windowSize.width,
    minHeight: windowSize.height,
    maxHeight: windowSize.height,
    useContentSize: true,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: createPetWebPreferences({
      preload,
      stateFile,
      petConfigFile,
      spriteFile,
      projectRoot
    })
  };
}
