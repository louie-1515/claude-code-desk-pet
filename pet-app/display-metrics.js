export const DISPLAY_SCALE = 0.35;
export const MIN_PET_SCALE = 0.75;
export const MAX_PET_SCALE = 1.35;
export const DEFAULT_PET_SCALE = 1;
export const STEP_PET_SCALE = 0.05;

const BUBBLE_WIDTH = 194;
const SHELL_H_PADDING = 14;
const MIN_WINDOW_WIDTH = BUBBLE_WIDTH + SHELL_H_PADDING;
const BUBBLE_RESERVED_HEIGHT = 102;
const HORIZONTAL_MARGIN = 58;

export function normalizePetScale(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_PET_SCALE;
  }
  const rounded = Math.round(value / STEP_PET_SCALE) * STEP_PET_SCALE;
  const clamped = Math.min(MAX_PET_SCALE, Math.max(MIN_PET_SCALE, rounded));
  return Number(clamped.toFixed(2));
}

export function getDisplayCellSize(cell, petScale = DEFAULT_PET_SCALE, baseScale = DISPLAY_SCALE) {
  const scale = normalizePetScale(petScale);
  return {
    width: Math.round(cell.width * baseScale * scale),
    height: Math.round(cell.height * baseScale * scale)
  };
}

export function getPetWindowSize(cell, petScale = DEFAULT_PET_SCALE) {
  const displayCell = getDisplayCellSize(cell, petScale);
  return {
    width: Math.max(MIN_WINDOW_WIDTH, displayCell.width + HORIZONTAL_MARGIN),
    height: displayCell.height + BUBBLE_RESERVED_HEIGHT
  };
}
