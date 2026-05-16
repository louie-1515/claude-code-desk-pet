import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, screen } from "electron";

import {
  clampPositionToWorkArea,
  defaultWindowPosition,
  snapWindowPosition,
  windowCenterPoint
} from "./window-behavior.js";
import { createPetWindowOptions, defaultWindowSize } from "./window-options.js";
import { getPointerPoint } from "./drag-coordinates.js";
import { getPetWindowSize, normalizePetScale } from "./display-metrics.js";
import { defaultWindowState, normalizeWindowStateForStorage } from "./window-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const stateFile = path.join(projectRoot, "bridge", "state", "claude-state.json");
const windowStateFile = path.join(projectRoot, "bridge", "state", "window-state.json");
const petConfigFile = path.join(projectRoot, "assets", "pet.json");
const spriteFile = path.join(projectRoot, "assets", "spritesheet.png");
const iconFile = path.join(projectRoot, "launcher", "Claude 桌宠.ico");
let mainWindow = null;
let tray = null;
let isQuitting = false;
let dragSession = null;

function readWindowState() {
  if (!existsSync(windowStateFile)) {
    return null;
  }
  try {
    return normalizeWindowStateForStorage(JSON.parse(readFileSync(windowStateFile, "utf8")));
  } catch {
    return null;
  }
}

function writeWindowState(position) {
  const existing = readWindowState();
  const merged = { ...existing, ...position };
  const next = normalizeWindowStateForStorage(merged);
  if (!next) {
    return;
  }
  mkdirSync(path.dirname(windowStateFile), { recursive: true });
  writeFileSync(windowStateFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function getWindowSize(win = null) {
  if (win) {
    const [width, height] = win.getSize();
    return { width, height };
  }
  const ws = getWindowSizeForScale();
  return { width: ws.width, height: ws.height };
}

function readPetConfig() {
  return JSON.parse(readFileSync(petConfigFile, "utf8"));
}

function getCurrentPetScale() {
  return readWindowState()?.petScale ?? 1;
}

function getWindowSizeForScale(scale = getCurrentPetScale()) {
  return getPetWindowSize(readPetConfig().cell, scale);
}

function getDisplayWorkAreaForPoint(point) {
  return screen.getDisplayNearestPoint(point).workArea;
}

function getDisplayWorkAreaForWindowPosition(point, windowSize) {
  return getDisplayWorkAreaForPoint(windowCenterPoint({ point, windowSize }));
}

function computeInitialWindowPosition() {
  const saved = readWindowState();
  const windowSize = getWindowSize();
  if (saved) {
    const workArea = getDisplayWorkAreaForWindowPosition(saved, windowSize);
    return clampPositionToWorkArea({ point: saved, workArea, windowSize });
  }
  return defaultWindowPosition({
    workArea: screen.getPrimaryDisplay().workArea,
    windowSize
  });
}

function applyWindowPosition(win, position, { snap = false } = {}) {
  const windowSize = getWindowSize(win);
  const point = { x: position.x, y: position.y };
  const workArea = getDisplayWorkAreaForWindowPosition(point, windowSize);
  const next = snap
    ? snapWindowPosition({ point, workArea, windowSize })
    : clampPositionToWorkArea({ point, workArea, windowSize });
  win.setPosition(next.x, next.y);
  writeWindowState(next);
  return next;
}

function resetWindowPosition() {
  if (!mainWindow) {
    return;
  }
  const next = defaultWindowPosition({
    workArea: screen.getPrimaryDisplay().workArea,
    windowSize: getWindowSize(mainWindow)
  });
  applyWindowPosition(mainWindow, next);
}

function reloadWindow() {
  if (!mainWindow) {
    return;
  }
  mainWindow.webContents.reloadIgnoringCache();
}

function createWindow() {
  const saved = readWindowState();
  const petScale = saved?.petScale ?? 1;
  const windowSize = getWindowSizeForScale(petScale);
  mainWindow = new BrowserWindow(
    createPetWindowOptions({
      preload: path.join(__dirname, "preload.js"),
      stateFile,
      petConfigFile,
      spriteFile,
      projectRoot,
      windowSize
    })
  );

  const initialPosition = computeInitialWindowPosition();
  mainWindow.setPosition(initialPosition.x, initialPosition.y);
  writeWindowState(initialPosition);
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  const image = existsSync(iconFile)
    ? nativeImage.createFromPath(iconFile)
    : nativeImage.createFromPath(spriteFile);
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  try {
    const pet = JSON.parse(readFileSync(petConfigFile, "utf8"));
    tray.setToolTip(pet.displayName ?? "Claude Code 桌宠");
  } catch {
    tray.setToolTip("Claude Code 桌宠");
  }
  tray.on("click", toggleWindow);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示/隐藏桌宠", click: toggleWindow },
      { label: "重载桌宠", click: reloadWindow },
      { label: "恢复默认位置", click: resetWindowPosition },
      { label: "打开项目目录", click: () => shell.openPath(projectRoot) },
      { label: "打开状态文件", click: () => shell.openPath(windowStateFile) },
      { type: "separator" },
      { label: "退出", click: () => app.quit() }
    ])
  );
}

function currentWindowStateFor(win) {
  const [x, y] = win.getPosition();
  const saved = readWindowState();
  return {
    x,
    y,
    petScale: saved?.petScale ?? 1
  };
}

function registerDragHandlers() {
  ipcMain.on("pet-window-drag-start", (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return;
    }
    const [x, y] = win.getPosition();
    const [w, h] = win.getSize();
    const point = getPointerPoint(screen, payload ? { x: payload.screenX, y: payload.screenY } : { x, y });
    dragSession = {
      windowId: win.id,
      winX: x,
      winY: y,
      winW: w,
      winH: h,
      lastSetX: x,
      lastSetY: y,
      cursorX: point.x,
      cursorY: point.y
    };
  });

  ipcMain.on("pet-window-drag-move", (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !dragSession || dragSession.windowId !== win.id) {
      return;
    }
    const point = getPointerPoint(
      screen,
      payload ? { x: payload.screenX, y: payload.screenY } : { x: 0, y: 0 }
    );
    let dX = point.x - dragSession.cursorX;
    let dY = point.y - dragSession.cursorY;

    dragSession.cursorX = point.x;
    dragSession.cursorY = point.y;

    const absDX = Math.abs(dX);
    const absDY = Math.abs(dY);
    const dominant = Math.max(absDX, absDY);
    if (dominant === 0) {
      return;
    }
    if (absDX < dominant * 0.2) { dX = 0; }
    if (absDY < dominant * 0.2) { dY = 0; }
    if (dX === 0 && dY === 0) {
      return;
    }

    dragSession.winX += dX;
    dragSession.winY += dY;
    const newX = Math.round(dragSession.winX);
    const newY = Math.round(dragSession.winY);
    if (newX !== dragSession.lastSetX || newY !== dragSession.lastSetY) {
      dragSession.lastSetX = newX;
      dragSession.lastSetY = newY;
      win.setBounds({ x: newX, y: newY, width: dragSession.winW, height: dragSession.winH });
    }
  });

  ipcMain.on("pet-window-drag-end", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && dragSession && dragSession.windowId === win.id) {
      const [x, y] = win.getPosition();
      const windowSize = getWindowSize(win);
      const workArea = screen.getDisplayNearestPoint({ x, y }).workArea;
      const next = clampPositionToWorkArea({ point: { x, y }, workArea, windowSize });
      if (next.x !== x || next.y !== y) {
        win.setBounds({ x: next.x, y: next.y, width: dragSession.winW, height: dragSession.winH });
      }
      writeWindowState(next);
    }
    dragSession = null;
  });

  ipcMain.handle("pet-window-state-read", () => readWindowState() ?? defaultWindowState());

  ipcMain.handle("pet-window-resize-pet", (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { petScale: 1, windowSize: defaultWindowSize };
    }
    const saved = currentWindowStateFor(win);
    const nextScale = normalizePetScale(saved.petScale + (payload?.deltaX ?? 0) / 240);
    const windowSize = getWindowSizeForScale(nextScale);
    win.setSize(windowSize.width, windowSize.height);
    const next = {
      x: saved.x,
      y: saved.y,
      petScale: nextScale
    };
    writeWindowState(next);
    return { petScale: nextScale, windowSize };
  });

  ipcMain.handle("pet-window-resize-end", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return null;
    }
    const next = currentWindowStateFor(win);
    writeWindowState(next);
    return next;
  });

  ipcMain.on("pet-focus-terminal", () => {
    if (existsSync(stateFile)) {
      try {
        const s = JSON.parse(readFileSync(stateFile, "utf8"));
        if (s.phase === "done") {
          const next = JSON.stringify({ ...s, phase: "idle", isHeartbeat: false, updatedAt: new Date().toISOString() }, null, 2) + "\n";
          writeFileSync(stateFile, next, "utf8");
        }
      } catch {}
    }
    const ps1 = path.join(projectRoot, "launcher", "focus-or-launch-claude.ps1");
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, () => {});
  });
}

app.whenReady().then(() => {
  registerDragHandlers();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  try { unlinkSync(path.join(projectRoot, "launcher", ".pet-lock")); } catch {}
});

app.on("window-all-closed", event => {
  if (!isQuitting) {
    event.preventDefault();
  }
});
