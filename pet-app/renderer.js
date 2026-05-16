import { dragDirectionFromDelta, resolveDisplayState } from "./view-model.js";
import { getDisplayCellSize, getPetWindowSize } from "./display-metrics.js";

const sprite = document.getElementById("pet-sprite");
const stage = document.getElementById("pet-stage");
const phaseLabel = document.getElementById("phase-label");
const phaseMessage = document.getElementById("phase-message");

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

function setSpriteFrame(animationName, frameIndex) {
  const animation = petConfig.animations[animationName];
  sprite.style.width = `${displayCell.width}px`;
  sprite.style.height = `${displayCell.height}px`;
  sprite.style.backgroundPosition = `${-frameIndex * displayCell.width}px ${-animation.row * displayCell.height}px`;
}

function startAnimation(animationName) {
  if (!petConfig || currentAnimation === animationName) {
    return;
  }
  currentAnimation = animationName;
  currentFrame = 0;
  clearInterval(frameTimer);
  setSpriteFrame(animationName, currentFrame);
  const animation = petConfig.animations[animationName];
  frameTimer = setInterval(() => {
    currentFrame = (currentFrame + 1) % animation.frames;
    setSpriteFrame(animationName, currentFrame);
  }, animation.frameDurationMs);
}

function renderView() {
  const phase = latestState?.phase ?? "idle";
  const ui = resolveDisplayState({ phase, dragDirection: dragState?.direction ?? null });
  phaseLabel.textContent = ui.label;
  phaseMessage.textContent = dragState?.direction ? ui.message : latestState?.message || ui.message;
  if (isHovering && phase !== "idle") {
    isHovering = false;
  }
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
  window.petApi.endWindowDrag(dragState.lastScreenX, dragState.lastScreenY);
  dragState = null;
  renderView();
}

function handlePointerMove(event) {
  if (!dragState) {
    return;
  }
  const frameDeltaX = event.screenX - dragState.lastScreenX;
  const frameDeltaY = event.screenY - dragState.lastScreenY;

  // Dead zone: skip if cursor hasn't moved enough since last processed frame
  if (Math.abs(frameDeltaX) < 2 && Math.abs(frameDeltaY) < 2) {
    return;
  }

  dragState.lastScreenX = event.screenX;
  dragState.lastScreenY = event.screenY;

  // Direction from frame-to-frame delta so slow reversals are detected immediately
  dragState.direction = dragDirectionFromDelta(frameDeltaX, 4);

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
  applyPetScale(petScale);
  renderState(payload.state);
  window.petApi.watchState(renderState);
}

stage.addEventListener("pointerdown", event => {
  if (event.button !== 0) {
    return;
  }
  // Click while done: focus Claude Code terminal instead of dragging
  if (latestState?.phase === "done") {
    window.petApi.focusTerminal();
    return;
  }
  dragState = {
    startScreenX: event.screenX,
    startScreenY: event.screenY,
    lastScreenX: event.screenX,
    lastScreenY: event.screenY,
    direction: null,
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

boot();
