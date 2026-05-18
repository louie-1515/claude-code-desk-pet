import { resolveDisplayState, resolveDragDirection, shouldKeepHovering } from "./view-model.js";
import { getDisplayCellSize, getPetWindowSize } from "./display-metrics.js";

const sprite = document.getElementById("pet-sprite");
const stage = document.getElementById("pet-stage");
const phaseLabel = document.getElementById("phase-label");
const phaseMessage = document.getElementById("phase-message");
const bubble = document.querySelector(".bubble");

const resizeHandle = document.createElement("span");
resizeHandle.className = "pet-resize-handle";
resizeHandle.setAttribute("aria-hidden", "true");
stage.appendChild(resizeHandle);

let petConfig = null;
let frameTimer = null;
let currentAnimation = null;
let currentFrame = 0;
let latestState = null;
let dragState = null;
let displayCell = null;
let petScale = 1;
let resizeState = null;
let isHovering = false;
let lastDragDirection = "right";
let hideBubbleOnIdle = false;
let hasWindowFocus = true;

export function shouldShowBubble({ phase, isDragging, hideBubbleOnIdle }) {
  if (isDragging) return true;
  if (phase !== "idle") return true;
  if (hideBubbleOnIdle) return false;
  return true;
}

function getAnimation(animationName) {
  const animations = petConfig?.animations;
  if (!animations || typeof animations !== "object") {
    return null;
  }
  const animation = animations[animationName];
  if (!animation || typeof animation.row !== "number" || typeof animation.frames !== "number") {
    return null;
  }
  return {
    row: animation.row,
    frames: Math.max(1, animation.frames),
    frameDurationMs: Math.max(16, Number(animation.frameDurationMs ?? 120))
  };
}

function pickFallbackAnimationName() {
  const animations = petConfig?.animations;
  if (!animations || typeof animations !== "object") {
    return null;
  }
  const names = Object.keys(animations);
  return names.length ? names[0] : null;
}

function setSpriteFallbackFrame() {
  // Clear the animation timer and show a stable frame instead of crashing/blanking.
  clearInterval(frameTimer);
  frameTimer = null;
  currentAnimation = null;
  currentFrame = 0;
  if (!displayCell) {
    return;
  }
  sprite.style.width = `${displayCell.width}px`;
  sprite.style.height = `${displayCell.height}px`;
  sprite.style.backgroundPosition = `0px 0px`;
}

function setSpriteFrame(animationName, frameIndex) {
  const animation = getAnimation(animationName);
  if (!animation) {
    setSpriteFallbackFrame();
    return false;
  }
  sprite.style.width = `${displayCell.width}px`;
  sprite.style.height = `${displayCell.height}px`;
  sprite.style.backgroundPosition = `${-frameIndex * displayCell.width}px ${-animation.row * displayCell.height}px`;
  return true;
}

function startAnimation(animationName) {
  if (!petConfig || currentAnimation === animationName) {
    return;
  }
  const requested = animationName;
  const animation = getAnimation(requested);
  if (!animation) {
    const fallback = pickFallbackAnimationName();
    if (fallback && fallback !== requested) {
      console.warn(`[desk-pet] Missing animation "${requested}", falling back to "${fallback}".`);
      startAnimation(fallback);
      return;
    }
    console.warn(`[desk-pet] Missing animation "${requested}" and no fallback is available. Rendering a static frame.`);
    phaseMessage.textContent = "动画缺失，已降级为静态显示。";
    setSpriteFallbackFrame();
    return;
  }
  currentAnimation = animationName;
  currentFrame = 0;
  clearInterval(frameTimer);
  setSpriteFrame(animationName, currentFrame);
  frameTimer = setInterval(() => {
    currentFrame = (currentFrame + 1) % animation.frames;
    setSpriteFrame(animationName, currentFrame);
  }, animation.frameDurationMs);
}

function renderView() {
  const phase = latestState?.phase ?? "idle";
  const showBubble = shouldShowBubble({
    phase,
    isDragging: Boolean(dragState),
    hideBubbleOnIdle
  });
  if (bubble) {
    bubble.style.display = showBubble ? "" : "none";
    bubble.setAttribute("aria-hidden", showBubble ? "false" : "true");
  }
  const ui = resolveDisplayState({ phase, dragDirection: dragState?.direction ?? null });
  phaseLabel.textContent = ui.label;
  phaseMessage.textContent = dragState?.direction ? ui.message : latestState?.message || ui.message;
  isHovering = shouldKeepHovering({
    isHovering,
    phase,
    isDragging: Boolean(dragState),
    hasWindowFocus
  });
  if (!isHovering) {
    startAnimation(ui.animation);
  }
}

function renderState(state) {
  latestState = state;
  renderView();
}

function endDrag() {
  if (!dragState) {
    return;
  }
  if (!dragState.didMove) {
    window.petApi.focusTerminal();
  } else {
    window.petApi.endWindowDrag(dragState.lastScreenX, dragState.lastScreenY);
  }
  dragState = null;
  isHovering = false;
  renderView();
}

function handlePointerMove(event) {
  if (!dragState) {
    return;
  }
  const frameDeltaX = event.screenX - dragState.lastScreenX;
  const frameDeltaY = event.screenY - dragState.lastScreenY;

  dragState.lastScreenX = event.screenX;
  dragState.lastScreenY = event.screenY;

  // While dragging, keep the animation in the drag state and only update the facing direction
  // when movement is clear enough to be intentional.
  dragState.direction = resolveDragDirection({
    deltaX: frameDeltaX,
    currentDirection: dragState.direction,
    threshold: 4,
    fallbackDirection: lastDragDirection
  });
  lastDragDirection = dragState.direction;

  const totalDeltaX = event.screenX - dragState.startScreenX;
  const totalDeltaY = event.screenY - dragState.startScreenY;
  if (Math.abs(totalDeltaX) > 6 || Math.abs(totalDeltaY) > 6) {
    dragState.didMove = true;
  }

  window.petApi.updateWindowDrag(event.screenX, event.screenY);
  renderView();
}

function applyPetScale(nextScale) {
  petScale = nextScale;
  displayCell = getDisplayCellSize(petConfig.cell, petScale);
  const windowSize = getPetWindowSize(petConfig.cell, petScale);
  document.body.style.width = `${windowSize.width}px`;
  document.body.style.height = `${windowSize.height}px`;
  document.querySelector(".pet-shell").style.width = `${windowSize.width}px`;
  document.querySelector(".pet-shell").style.height = `${windowSize.height}px`;
  stage.style.width = `${displayCell.width + 16}px`;
  stage.style.height = `${displayCell.height + 6}px`;
  sprite.style.backgroundSize = `${petConfig.atlas.columns * displayCell.width}px ${petConfig.atlas.rows * displayCell.height}px`;
  if (currentAnimation) {
    setSpriteFrame(currentAnimation, currentFrame);
  }
}

async function boot() {
  const payload = await window.petApi.getBootPayload();
  petConfig = payload.pet;
  sprite.style.backgroundImage = `url("file:///${payload.spriteFile.replace(/\\/g, "/")}")`;
  sprite.style.backgroundRepeat = "no-repeat";
  petScale = payload.windowState?.petScale ?? 1;
  hideBubbleOnIdle = Boolean(payload.windowState?.hideBubbleOnIdle);
  applyPetScale(petScale);
  renderState(payload.state);
  window.petApi.watchState(renderState);
  window.petApi.watchSettings(settings => {
    hideBubbleOnIdle = Boolean(settings?.hideBubbleOnIdle);
    renderView();
  });
}

stage.addEventListener("pointerdown", event => {
  if (event.button !== 0) {
    return;
  }
  isHovering = false;
  dragState = {
    startScreenX: event.screenX,
    startScreenY: event.screenY,
    lastScreenX: event.screenX,
    lastScreenY: event.screenY,
    direction: lastDragDirection,
    didMove: false
  };
  stage.setPointerCapture(event.pointerId);
  window.petApi.beginWindowDrag(event.screenX, event.screenY);
  renderView();
});

stage.addEventListener("pointermove", handlePointerMove);
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("dblclick", () => {
  window.petApi.openProjectRoot();
});

stage.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
  isHovering = false;
  hasWindowFocus = false;
  renderView();
  window.petApi.showContextMenu(event.screenX, event.screenY);
});

resizeHandle.addEventListener("pointerdown", event => {
  if (event.button !== 0) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  resizeState = {
    pointerId: event.pointerId,
    startScreenX: event.screenX
  };
  resizeHandle.setPointerCapture(event.pointerId);
});

resizeHandle.addEventListener("pointermove", async event => {
  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  const deltaX = event.screenX - resizeState.startScreenX;
  resizeState.startScreenX = event.screenX;
  const result = await window.petApi.resizePet(deltaX);
  if (result?.petScale) {
    applyPetScale(result.petScale);
  }
});

async function endResize(event) {
  if (!resizeState || resizeState.pointerId !== event.pointerId) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  resizeState = null;
  await window.petApi.endPetResize();
}

resizeHandle.addEventListener("pointerup", endResize);
resizeHandle.addEventListener("pointercancel", endResize);

stage.addEventListener("pointerenter", () => {
  if (dragState || !petConfig || latestState?.phase !== "idle") return;
  isHovering = true;
  startAnimation("jumping");
});

stage.addEventListener("pointerleave", () => {
  isHovering = false;
  if (!dragState) renderView();
});

window.addEventListener("blur", () => {
  hasWindowFocus = false;
  isHovering = false;
  renderView();
});

window.addEventListener("focus", () => {
  hasWindowFocus = true;
  renderView();
});

boot();
