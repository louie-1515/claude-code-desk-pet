import test from "node:test";
import assert from "node:assert/strict";

function createElementStub() {
  return {
    style: {},
    className: "",
    textContent: "",
    setAttribute() {},
    appendChild() {},
    addEventListener() {},
    setPointerCapture() {},
    querySelector() {
      return createElementStub();
    }
  };
}

async function importRendererWithStubs() {
  // Ensure any intervals created by the renderer won't keep the test process alive.
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms, ...rest) => {
    const t = realSetInterval(fn, ms, ...rest);
    t?.unref?.();
    return t;
  };

  const sprite = createElementStub();
  const stage = createElementStub();
  const phaseLabel = createElementStub();
  const phaseMessage = createElementStub();
  const shell = createElementStub();
  const bubble = createElementStub();

  globalThis.document = {
    body: { style: {} },
    getElementById(id) {
      if (id === "pet-sprite") return sprite;
      if (id === "pet-stage") return stage;
      if (id === "phase-label") return phaseLabel;
      if (id === "phase-message") return phaseMessage;
      return createElementStub();
    },
    createElement() {
      return createElementStub();
    },
    querySelector(sel) {
      if (sel === ".pet-shell") return shell;
      if (sel === ".bubble") return bubble;
      return createElementStub();
    }
  };

  globalThis.window = {
    addEventListener() {},
    petApi: {
      async getBootPayload() {
        return {
          pet: {
            cell: { width: 100, height: 100 },
            atlas: { columns: 1, rows: 1 },
            animations: {
              idle: { row: 0, frames: 1, frameDurationMs: 120 }
            }
          },
          spriteFile: "E:\\project\\assets\\sprite.png",
          windowState: { petScale: 1, hideBubbleOnIdle: false },
          state: { phase: "idle", message: "hi" }
        };
      },
      watchState() {},
      watchSettings() {},
      beginWindowDrag() {},
      updateWindowDrag() {},
      endWindowDrag() {},
      focusTerminal() {},
      openProjectRoot() {},
      showContextMenu() {},
      async resizePet() {
        return { petScale: 1 };
      },
      async endPetResize() {}
    }
  };

  const mod = await import("../pet-app/renderer.js");
  await new Promise(resolve => setTimeout(resolve, 0));
  return mod;
}

test("shouldShowBubble: idle + hideBubbleOnIdle=true hides bubble", async () => {
  const { shouldShowBubble } = await importRendererWithStubs();
  assert.equal(
    shouldShowBubble({ phase: "idle", isDragging: false, hideBubbleOnIdle: true }),
    false
  );
});

test("shouldShowBubble: dragging keeps bubble hidden when idle + hideBubbleOnIdle=true", async () => {
  const { shouldShowBubble } = await importRendererWithStubs();
  assert.equal(
    shouldShowBubble({ phase: "idle", isDragging: true, hideBubbleOnIdle: true }),
    false
  );
});

test("shouldShowBubble: non-idle shows bubble even when hideBubbleOnIdle=true", async () => {
  const { shouldShowBubble } = await importRendererWithStubs();
  assert.equal(
    shouldShowBubble({ phase: "working", isDragging: false, hideBubbleOnIdle: true }),
    true
  );
});
