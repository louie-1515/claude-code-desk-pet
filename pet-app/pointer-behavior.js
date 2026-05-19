const INTERACTIVE_SELECTORS = ".pet-stage, .bubble";

export function shouldIgnoreMouseEventsForTarget({
  target,
  isDragging = false,
  isResizing = false
}) {
  if (isDragging || isResizing) {
    return false;
  }
  if (!target || typeof target.closest !== "function") {
    return true;
  }
  return !target.closest(INTERACTIVE_SELECTORS);
}
