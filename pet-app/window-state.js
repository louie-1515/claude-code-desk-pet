import { normalizePetScale, DEFAULT_PET_SCALE } from "./display-metrics.js";

export const DEFAULT_SELECTED_PET_ID = "default";

function normalizeSelectedPetId(value) {
  return typeof value === "string" && value.trim() ? value : DEFAULT_SELECTED_PET_ID;
}

function normalizeHideBubbleOnIdle(value) {
  return value === true;
}

export function normalizeWindowStateForStorage(payload) {
  if (typeof payload?.x !== "number" || typeof payload?.y !== "number") {
    return null;
  }
  const base = {
    x: Math.round(payload.x),
    y: Math.round(payload.y),
    petScale: normalizePetScale(payload.petScale)
  };
  // Keep backward-compatible shape: only persist new preferences when provided.
  if (Object.prototype.hasOwnProperty.call(payload, "selectedPetId")) {
    base.selectedPetId = normalizeSelectedPetId(payload.selectedPetId);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "hideBubbleOnIdle")) {
    base.hideBubbleOnIdle = normalizeHideBubbleOnIdle(payload.hideBubbleOnIdle);
  }
  return base;
}

export function defaultWindowState() {
  return {
    x: 0,
    y: 0,
    petScale: DEFAULT_PET_SCALE,
    selectedPetId: DEFAULT_SELECTED_PET_ID,
    hideBubbleOnIdle: false
  };
}
