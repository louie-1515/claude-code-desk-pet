import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, screen } from "electron";

import {
  clampPositionToWorkArea,
  clampResizedWindowPosition,
  defaultWindowPosition,
  snapWindowPosition,
  windowCenterPoint
} from "./window-behavior.js";
import { createPetWindowOptions, defaultWindowSize } from "./window-options.js";
import { getPointerPoint } from "./drag-coordinates.js";
import { getPetWindowSize, normalizePetScale } from "./display-metrics.js";
import { defaultWindowState, normalizeWindowStateForStorage } from "./window-state.js";
import { buildDeskPetMenuTemplate } from "./menu-template.js";
import { getPetDescriptorById, listBuiltInPets } from "./pet-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const stateFile = path.join(projectRoot, "bridge", "state", "claude-state.json");
const windowStateFile = path.join(projectRoot, "bridge", "state", "window-state.json");
const iconFile = path.join(projectRoot, "launcher", "Claude 桌宠.ico");
let mainWindow = null;
let tray = null;
let isQuitting = false;
let dragSession = null;

function getCurrentWindowState() {
  return { ...defaultWindowState(), ...(readWindowState() ?? {}) };
}

function getCurrentPetDescriptor() {
  return getPetDescriptorById(getCurrentWindowState().selectedPetId);
}

function getCurrentPetResources() {
  const descriptor = getCurrentPetDescriptor();
  return {
    descriptor,
    petConfigFile: descriptor.petConfigFile,
    spriteFile: descriptor.spriteFile
  };
}

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
  const existing = getCurrentWindowState();
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
  return JSON.parse(readFileSync(getCurrentPetResources().petConfigFile, "utf8"));
}

function getCurrentPetScale() {
  return getCurrentWindowState().petScale ?? 1;
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
  const saved = getCurrentWindowState();
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

function recreateWindow() {
  const wasVisible = Boolean(mainWindow?.isVisible());
  const wasFocused = Boolean(mainWindow?.isFocused());
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    writeWindowState({ x, y });
    mainWindow.destroy();
  }
  createWindow();
  if (mainWindow && wasVisible) {
    mainWindow.show();
    if (wasFocused) {
      mainWindow.focus();
    }
  }
}

function updateRendererSettings(win = mainWindow) {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send("pet-settings-updated", getCurrentWindowState());
}

function syncTrayForPet(descriptor = getCurrentPetDescriptor()) {
  if (!tray) {
    return;
  }
  const iconPath = existsSync(descriptor.trayIconFile ?? "") ? descriptor.trayIconFile : iconFile;
  tray.setImage(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip(descriptor.name ?? "Claude Code 桌宠");
}

function refreshMenus() {
  if (!tray) {
    return;
  }
  tray.setContextMenu(buildAppMenu());
}

function buildAppMenu() {
  const settings = getCurrentWindowState();
  const sharedItems = buildDeskPetMenuTemplate({
    selectedPetId: settings.selectedPetId,
    hideBubbleOnIdle: settings.hideBubbleOnIdle,
    pets: listBuiltInPets().map(pet => ({
      id: pet.id,
      displayName: pet.name
    })),
    onToggleHideBubbleOnIdle(nextValue) {
      writeWindowState({ hideBubbleOnIdle: nextValue });
      updateRendererSettings();
      refreshMenus();
    },
    onSelectPet(petId) {
      writeWindowState({ selectedPetId: petId });
      syncTrayForPet();
      refreshMenus();
      recreateWindow();
    }
  });

  return Menu.buildFromTemplate([
    { label: "显示/隐藏桌宠", click: toggleWindow },
    { label: "重载桌宠", click: reloadWindow },
    { label: "恢复默认位置", click: resetWindowPosition },
    { label: "打开项目目录", click: () => shell.openPath(projectRoot) },
    { label: "打开状态文件", click: () => shell.openPath(windowStateFile) },
    { type: "separator" },
    ...sharedItems,
    { type: "separator" },
    { label: "退出", click: () => app.quit() }
  ]);
}

function createWindow() {
  const saved = getCurrentWindowState();
  const petScale = saved?.petScale ?? 1;
  const windowSize = getWindowSizeForScale(petScale);
  const resources = getCurrentPetResources();
  mainWindow = new BrowserWindow(
    createPetWindowOptions({
      preload: path.join(__dirname, "preload.js"),
      stateFile,
      petConfigFile: resources.petConfigFile,
      spriteFile: resources.spriteFile,
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
  const descriptor = getCurrentPetDescriptor();
  const fallbackSprite = getCurrentPetResources().spriteFile;
  const image = existsSync(descriptor.trayIconFile ?? iconFile)
    ? nativeImage.createFromPath(descriptor.trayIconFile ?? iconFile)
    : nativeImage.createFromPath(fallbackSprite);
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  syncTrayForPet(descriptor);
  tray.on("click", toggleWindow);
  refreshMenus();
}

function currentWindowStateFor(win) {
  const [x, y] = win.getPosition();
  const saved = getCurrentWindowState();
  return {
    x,
    y,
    petScale: saved?.petScale ?? 1,
    selectedPetId: saved?.selectedPetId,
    hideBubbleOnIdle: saved?.hideBubbleOnIdle
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

  ipcMain.handle("pet-window-state-read", () => getCurrentWindowState());
  ipcMain.handle("pet-resources-read", () => getCurrentPetResources());

  ipcMain.handle("pet-window-resize-pet", (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { petScale: 1, windowSize: defaultWindowSize };
    }
    const saved = currentWindowStateFor(win);
    const nextScale = normalizePetScale(saved.petScale + (payload?.deltaX ?? 0) / 240);
    const windowSize = getWindowSizeForScale(nextScale);
    win.setSize(windowSize.width, windowSize.height);
    const [resizedX, resizedY] = win.getPosition();
    const nextPoint = { x: resizedX, y: resizedY };
    const workArea = getDisplayWorkAreaForWindowPosition(nextPoint, windowSize);
    const clampedPoint = clampResizedWindowPosition({
      point: nextPoint,
      workArea,
      windowSize
    });
    if (clampedPoint.x !== resizedX || clampedPoint.y !== resizedY) {
      win.setPosition(clampedPoint.x, clampedPoint.y);
    }
    const next = {
      x: clampedPoint.x,
      y: clampedPoint.y,
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

  ipcMain.on("pet-context-menu", (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return;
    }
    const [winX, winY] = win.getPosition();
    const x = typeof payload?.screenX === "number" ? Math.round(payload.screenX - winX) : undefined;
    const y = typeof payload?.screenY === "number" ? Math.round(payload.screenY - winY) : undefined;
    buildAppMenu().popup({
      window: win,
      x,
      y
    });
  });

  ipcMain.on("pet-focus-terminal", () => {
    if (existsSync(stateFile)) {
      try {
        const s = JSON.parse(readFileSync(stateFile, "utf8"));
        if (s.phase === "done" || s.phase === "needs_approval") {
          const next = JSON.stringify({ ...s, phase: "idle", isHeartbeat: false, updatedAt: new Date().toISOString() }, null, 2) + "\n";
          writeFileSync(stateFile, next, "utf8");
        }
      } catch {}
    }
    const ps1 = path.join(projectRoot, "launcher", "focus-or-launch-claude.ps1");
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, () => {});
  });

  ipcMain.on("pet-settings-subscribe", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    updateRendererSettings(win);
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
