import { contextBridge, ipcRenderer, shell } from "electron";
import { readFile, watchFile, unwatchFile } from "node:fs";
import path from "node:path";
import { resolveActiveProjectPath } from "./project-paths.js";

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.find(arg => arg.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

const stateFile = readArg("state-file");
const petConfigFile = readArg("pet-config-file");
const spriteFile = readArg("sprite-file");
const projectRoot = readArg("project-root");

function readJson(file) {
  return new Promise(resolve => {
    readFile(file, "utf8", (error, content) => {
      if (error) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(content));
      } catch {
        resolve(null);
      }
    });
  });
}

contextBridge.exposeInMainWorld("petApi", {
  async getBootPayload() {
    const [state, resources, windowState] = await Promise.all([
      readJson(stateFile),
      ipcRenderer.invoke("pet-resources-read"),
      ipcRenderer.invoke("pet-window-state-read")
    ]);
    const pet = await readJson(resources?.petConfigFile ?? petConfigFile);
    return {
      state,
      pet,
      windowState,
      spriteFile: resources?.spriteFile ?? spriteFile,
      projectRoot
    };
  },
  watchState(callback) {
    const handler = async () => {
      callback(await readJson(stateFile));
    };
    watchFile(stateFile, { interval: 400 }, handler);
    return () => unwatchFile(stateFile, handler);
  },
  watchSettings(callback) {
    const channel = (_event, settings) => {
      callback(settings);
    };
    ipcRenderer.on("pet-settings-updated", channel);
    ipcRenderer.send("pet-settings-subscribe");
    return () => ipcRenderer.removeListener("pet-settings-updated", channel);
  },
  async openProjectRoot() {
    const state = await readJson(stateFile);
    return shell.openPath(resolveActiveProjectPath(state, projectRoot));
  },
  showContextMenu(screenX, screenY) {
    ipcRenderer.send("pet-context-menu", { screenX, screenY });
  },
  beginWindowDrag(screenX, screenY) {
    ipcRenderer.send("pet-window-drag-start", { screenX, screenY });
  },
  updateWindowDrag(screenX, screenY) {
    ipcRenderer.send("pet-window-drag-move", { screenX, screenY });
  },
  endWindowDrag(screenX, screenY) {
    ipcRenderer.send("pet-window-drag-end", { screenX, screenY });
  },
  resizePet(deltaX) {
    return ipcRenderer.invoke("pet-window-resize-pet", { deltaX });
  },
  endPetResize() {
    return ipcRenderer.invoke("pet-window-resize-end");
  },
  setMousePassthrough(ignore) {
    ipcRenderer.send("pet-window-set-mouse-passthrough", { ignore });
  },
  focusTerminal() {
    ipcRenderer.send("pet-focus-terminal");
  }
});
