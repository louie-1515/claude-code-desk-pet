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

test("renderer does not crash when pet.json is missing an animation key (degrades to static/fallback)", async () => {
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

  let watched = false;
  globalThis.window = {
    addEventListener() {},
    petApi: {
      async getBootPayload() {
        return {
          pet: {
            cell: { width: 100, height: 100 },
            atlas: { columns: 1, rows: 1 },
            // Intentionally omit "jumping" (and most expected keys) to simulate a custom pet.json.
            animations: {
              idle: { row: 0, frames: 1, frameDurationMs: 120 }
            }
          },
          spriteFile: "E:\\project\\assets\\sprite.png",
          windowState: { petScale: 1 },
          state: { phase: "idle", message: "hi" }
        };
      },
      watchState() {
        watched = true;
      },
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

  // Import after globals are in place; renderer boots immediately.
  await import("../pet-app/renderer.js");

  // Give the boot promise a tick to settle.
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(watched, true);
  // Should have set some positioning, not thrown and halted execution.
  assert.ok(typeof sprite.style.backgroundImage === "string");
});
