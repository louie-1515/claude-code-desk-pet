import { normalizePetScale, DEFAULT_PET_SCALE } from "./display-metrics.js";

export function normalizeWindowStateForStorage(payload) {
  if (typeof payload?.x !== "number" || typeof payload?.y !== "number") {
    return null;
  }
  return {
    x: Math.round(payload.x),
    y: Math.round(payload.y),
    petScale: normalizePetScale(payload.petScale)
  };
}

export function defaultWindowState() {
  return { x: 0, y: 0, petScale: DEFAULT_PET_SCALE };
}
