# Claude 桌宠右键菜单、待机隐藏气泡与形象切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Claude 桌宠补上窗口右键菜单、仅待机时隐藏气泡、以及内置形象切换三项能力，并保持现有拖动、缩放、托盘与状态桥接稳定。

**Architecture:** 复用现有 `window-state.json` 持久化窗口与展示偏好；新增内置形象注册表统一描述当前可切换角色；把托盘菜单抽成共享模板，托盘和窗口右键都从同一处生成；Renderer 单独实现气泡可见性逻辑，不把它塞进动画状态机。

**Tech Stack:** Electron、Node.js 原生测试、现有 preload IPC 桥、现有 JSON 状态文件

---

## File Map

### Existing files to modify

- `E:\codex\ClaudeCode桌宠\pet-app\window-state.js`
  - 扩展窗口状态归一化，支持 `selectedPetId` 与 `hideBubbleOnIdle`
- `E:\codex\ClaudeCode桌宠\pet-app\main.js`
  - 接入共享菜单、右键菜单 IPC、当前形象解析、切换形象与设置切换
- `E:\codex\ClaudeCode桌宠\pet-app\preload.js`
  - 暴露当前设置、当前形象信息、弹出右键菜单与设置更新订阅
- `E:\codex\ClaudeCode桌宠\pet-app\renderer.js`
  - 接入待机气泡隐藏逻辑与右键菜单触发
- `E:\codex\ClaudeCode桌宠\pet-app\web-preferences.js`
  - 透传当前形象资源参数名如果接口需要微调

### New files to create

- `E:\codex\ClaudeCode桌宠\pet-app\pet-registry.js`
  - 定义内置形象注册表与默认形象解析
- `E:\codex\ClaudeCode桌宠\pet-app\menu-template.js`
  - 构造共享菜单模板
- `E:\codex\ClaudeCode桌宠\tests\window-state.test.js`
  - 设置持久化归一化测试
- `E:\codex\ClaudeCode桌宠\tests\pet-registry.test.js`
  - 内置形象注册表与默认回退测试
- `E:\codex\ClaudeCode桌宠\tests\menu-template.test.js`
  - 共享菜单模板测试
- `E:\codex\ClaudeCode桌宠\tests\renderer-bubble-visibility.test.js`
  - 待机隐藏气泡渲染逻辑测试

---

### Task 1: 扩展窗口状态存储结构

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\window-state.js`
- Create: `E:\codex\ClaudeCode桌宠\tests\window-state.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { defaultWindowState, normalizeWindowStateForStorage } from "../pet-app/window-state.js";

test("normalizeWindowStateForStorage keeps display preferences with defaults", () => {
  const state = normalizeWindowStateForStorage({ x: 10.2, y: 19.7, petScale: 0.97 });
  assert.deepEqual(state, {
    x: 10,
    y: 20,
    petScale: 0.97,
    selectedPetId: "default",
    hideBubbleOnIdle: false
  });
});

test("normalizeWindowStateForStorage sanitizes invalid preferences", () => {
  const state = normalizeWindowStateForStorage({
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: 42,
    hideBubbleOnIdle: "yes"
  });
  assert.deepEqual(state, {
    x: 1,
    y: 2,
    petScale: 1,
    selectedPetId: "default",
    hideBubbleOnIdle: false
  });
});

test("defaultWindowState exposes default pet settings", () => {
  assert.deepEqual(defaultWindowState(), {
    x: 0,
    y: 0,
    petScale: 1,
    selectedPetId: "default",
    hideBubbleOnIdle: false
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/window-state.test.js`  
Expected: FAIL because `selectedPetId` and `hideBubbleOnIdle` are not returned yet.

- [ ] **Step 3: Write the minimal implementation**

```js
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
  return {
    x: Math.round(payload.x),
    y: Math.round(payload.y),
    petScale: normalizePetScale(payload.petScale),
    selectedPetId: normalizeSelectedPetId(payload.selectedPetId),
    hideBubbleOnIdle: normalizeHideBubbleOnIdle(payload.hideBubbleOnIdle)
  };
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/window-state.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pet-app/window-state.js tests/window-state.test.js
git commit -m "test: extend stored pet window preferences"
```

---

### Task 2: 建立内置形象注册表

**Files:**
- Create: `E:\codex\ClaudeCode桌宠\pet-app\pet-registry.js`
- Create: `E:\codex\ClaudeCode桌宠\tests\pet-registry.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { DEFAULT_PET_ID, getDefaultPetDescriptor, getPetDescriptorById, listBuiltInPets } from "../pet-app/pet-registry.js";

test("built-in registry includes the default pet", () => {
  const ids = listBuiltInPets().map(pet => pet.id);
  assert.ok(ids.includes(DEFAULT_PET_ID));
});

test("default pet descriptor resolves concrete files", () => {
  const pet = getDefaultPetDescriptor();
  assert.equal(typeof pet.name, "string");
  assert.equal(existsSync(pet.petConfigFile), true);
  assert.equal(existsSync(pet.spriteFile), true);
});

test("unknown pet id falls back to the default descriptor", () => {
  const pet = getPetDescriptorById("missing-id");
  assert.equal(pet.id, DEFAULT_PET_ID);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/pet-registry.test.js`  
Expected: FAIL because the registry module does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const DEFAULT_PET_ID = "default";

const builtInPets = [
  {
    id: DEFAULT_PET_ID,
    name: "月白档案员",
    petConfigFile: path.join(projectRoot, "assets", "pet.json"),
    spriteFile: path.join(projectRoot, "assets", "spritesheet.png"),
    trayIconFile: path.join(projectRoot, "launcher", "Claude 桌宠.ico")
  }
];

export function listBuiltInPets() {
  return builtInPets.map(pet => ({ ...pet }));
}

export function getDefaultPetDescriptor() {
  return listBuiltInPets()[0];
}

export function getPetDescriptorById(id) {
  return listBuiltInPets().find(pet => pet.id === id) ?? getDefaultPetDescriptor();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/pet-registry.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pet-app/pet-registry.js tests/pet-registry.test.js
git commit -m "feat: add built-in pet registry"
```

---

### Task 3: 抽出共享菜单模板

**Files:**
- Create: `E:\codex\ClaudeCode桌宠\pet-app\menu-template.js`
- Create: `E:\codex\ClaudeCode桌宠\tests\menu-template.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildDeskPetMenuTemplate } from "../pet-app/menu-template.js";

test("menu template exposes idle bubble toggle and pet switching submenu", () => {
  const template = buildDeskPetMenuTemplate({
    settings: { hideBubbleOnIdle: true, selectedPetId: "default" },
    pets: [
      { id: "default", name: "月白档案员" },
      { id: "alt", name: "备用形象" }
    ],
    actions: {}
  });

  const bubbleItem = template.find(item => item.label === "待机时隐藏气泡");
  const petSwitcher = template.find(item => item.label === "切换形象");

  assert.equal(bubbleItem.type, "checkbox");
  assert.equal(bubbleItem.checked, true);
  assert.equal(Array.isArray(petSwitcher.submenu), true);
  assert.equal(petSwitcher.submenu[0].type, "radio");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/menu-template.test.js`  
Expected: FAIL because `menu-template.js` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```js
export function buildDeskPetMenuTemplate({ settings, pets, actions }) {
  return [
    { label: "显示/隐藏桌宠", click: actions.toggleWindow },
    { label: "重载桌宠", click: actions.reloadWindow },
    { label: "恢复默认位置", click: actions.resetWindowPosition },
    { label: "打开项目目录", click: actions.openProjectRoot },
    { label: "打开状态文件", click: actions.openStateFile },
    { type: "separator" },
    {
      label: "待机时隐藏气泡",
      type: "checkbox",
      checked: settings.hideBubbleOnIdle === true,
      click: actions.toggleHideBubbleOnIdle
    },
    {
      label: "切换形象",
      submenu: pets.map(pet => ({
        label: pet.name,
        type: "radio",
        checked: pet.id === settings.selectedPetId,
        click: () => actions.selectPet?.(pet.id)
      }))
    },
    { type: "separator" },
    { label: "退出", click: actions.quit }
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/menu-template.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pet-app/menu-template.js tests/menu-template.test.js
git commit -m "feat: extract shared desk pet menu template"
```

---

### Task 4: 接入主进程设置与共享菜单

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\main.js`
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\window-state.js`
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\window-options.js`
- Test: `E:\codex\ClaudeCode桌宠\tests\window-state.test.js`
- Test: `E:\codex\ClaudeCode桌宠\tests\menu-template.test.js`

- [ ] **Step 1: Write the failing integration-oriented assertions**

```js
// Add to tests/window-state.test.js
test("normalizeWindowStateForStorage preserves selectedPetId and hideBubbleOnIdle", () => {
  const state = normalizeWindowStateForStorage({
    x: 11,
    y: 12,
    petScale: 1,
    selectedPetId: "default",
    hideBubbleOnIdle: true
  });
  assert.equal(state.selectedPetId, "default");
  assert.equal(state.hideBubbleOnIdle, true);
});
```

- [ ] **Step 2: Run tests to verify current gaps**

Run: `npm test -- tests/window-state.test.js tests/menu-template.test.js`  
Expected: FAIL or incomplete coverage because `main.js` still builds tray menu inline and does not manage new settings.

- [ ] **Step 3: Implement the shared menu and settings helpers in main**

```js
import { buildDeskPetMenuTemplate } from "./menu-template.js";
import { getDefaultPetDescriptor, getPetDescriptorById, listBuiltInPets } from "./pet-registry.js";

function getCurrentWindowSettings() {
  return readWindowState() ?? defaultWindowState();
}

function writeWindowPreferences(patch) {
  const existing = getCurrentWindowSettings();
  writeWindowState({ ...existing, ...patch });
  return readWindowState() ?? defaultWindowState();
}

function getCurrentPetDescriptor() {
  return getPetDescriptorById(getCurrentWindowSettings().selectedPetId);
}

function buildMenu() {
  const settings = getCurrentWindowSettings();
  const pets = listBuiltInPets();
  return Menu.buildFromTemplate(
    buildDeskPetMenuTemplate({
      settings,
      pets,
      actions: {
        toggleWindow,
        reloadWindow,
        resetWindowPosition,
        openProjectRoot: () => shell.openPath(projectRoot),
        openStateFile: () => shell.openPath(windowStateFile),
        toggleHideBubbleOnIdle: () => {
          const next = writeWindowPreferences({ hideBubbleOnIdle: !settings.hideBubbleOnIdle });
          pushRendererSettings(next);
          refreshMenus();
        },
        selectPet: petId => {
          const next = writeWindowPreferences({ selectedPetId: petId });
          syncTrayForPet(getPetDescriptorById(next.selectedPetId));
          reloadWindow();
          refreshMenus();
        },
        quit: () => app.quit()
      }
    })
  );
}
```

- [ ] **Step 4: Wire tray creation to the shared menu**

```js
function syncTrayForPet(pet) {
  if (!tray) return;
  const iconPath = existsSync(pet.trayIconFile ?? "") ? pet.trayIconFile : iconFile;
  tray.setImage(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip(pet.name ?? "Claude Code 桌宠");
}

function refreshMenus() {
  if (tray) {
    tray.setContextMenu(buildMenu());
  }
}
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- tests/window-state.test.js tests/menu-template.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pet-app/main.js pet-app/window-state.js pet-app/window-options.js tests/window-state.test.js tests/menu-template.test.js
git commit -m "feat: wire shared menu and stored pet preferences"
```

---

### Task 5: 接入当前形象解析与窗口启动资源

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\main.js`
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\preload.js`
- Test: `E:\codex\ClaudeCode桌宠\tests\pet-registry.test.js`
- Test: `E:\codex\ClaudeCode桌宠\tests\web-preferences.test.js`

- [ ] **Step 1: Add the failing contract test for boot payload**

```js
// Add to tests/pet-registry.test.js
test("pet descriptors expose config and sprite paths for boot payload", () => {
  const pet = getDefaultPetDescriptor();
  assert.equal(typeof pet.petConfigFile, "string");
  assert.equal(typeof pet.spriteFile, "string");
});
```

- [ ] **Step 2: Run relevant tests**

Run: `npm test -- tests/pet-registry.test.js tests/web-preferences.test.js`  
Expected: PASS for registry basics, but main/preload still not consuming registry-driven paths.

- [ ] **Step 3: Implement resource resolution in main and preload**

```js
function getCurrentPetResources() {
  const pet = getCurrentPetDescriptor();
  return {
    descriptor: pet,
    petConfigFile: pet.petConfigFile,
    spriteFile: pet.spriteFile
  };
}

// In createWindow()
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
```

- [ ] **Step 4: Extend preload boot payload and settings helpers**

```js
contextBridge.exposeInMainWorld("petApi", {
  async getBootPayload() {
    const [state, pet, windowState, settings] = await Promise.all([
      readJson(stateFile),
      readJson(petConfigFile),
      ipcRenderer.invoke("pet-window-state-read"),
      ipcRenderer.invoke("pet-settings-read")
    ]);
    return {
      state,
      pet,
      windowState,
      settings,
      spriteFile,
      projectRoot
    };
  }
});
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- tests/pet-registry.test.js tests/web-preferences.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pet-app/main.js pet-app/preload.js tests/pet-registry.test.js tests/web-preferences.test.js
git commit -m "feat: resolve active pet resources from registry"
```

---

### Task 6: 接入桌宠窗口右键菜单

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\main.js`
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\preload.js`
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\renderer.js`

- [ ] **Step 1: Write a minimal renderer-facing contract test**

```js
// Add to tests/renderer-fallback.test.js or a new renderer contract test
assert.equal(typeof window.petApi.showContextMenu, "function");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/renderer-fallback.test.js`  
Expected: FAIL because `showContextMenu` is not exposed.

- [ ] **Step 3: Expose and handle the context-menu IPC**

```js
// preload.js
showContextMenu(screenX, screenY) {
  ipcRenderer.send("pet-context-menu", { screenX, screenY });
}

// main.js
ipcMain.on("pet-context-menu", event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const menu = buildMenu();
  menu.popup({ window: win });
});
```

- [ ] **Step 4: Bind right-click in the renderer without affecting drag**

```js
stage.addEventListener("contextmenu", event => {
  event.preventDefault();
  event.stopPropagation();
  window.petApi.showContextMenu(event.screenX, event.screenY);
});
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- tests/renderer-fallback.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pet-app/main.js pet-app/preload.js pet-app/renderer.js tests/renderer-fallback.test.js
git commit -m "feat: open shared menu from pet window right click"
```

---

### Task 7: 实现待机隐藏气泡逻辑

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\pet-app\renderer.js`
- Create: `E:\codex\ClaudeCode桌宠\tests\renderer-bubble-visibility.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";

import { shouldShowBubble } from "../pet-app/renderer.js";

test("idle bubble hides only when the preference is enabled", () => {
  assert.equal(shouldShowBubble({ phase: "idle", dragDirection: null, hideBubbleOnIdle: true }), false);
  assert.equal(shouldShowBubble({ phase: "idle", dragDirection: null, hideBubbleOnIdle: false }), true);
});

test("dragging and non-idle states still show the bubble", () => {
  assert.equal(shouldShowBubble({ phase: "idle", dragDirection: "left", hideBubbleOnIdle: true }), true);
  assert.equal(shouldShowBubble({ phase: "done", dragDirection: null, hideBubbleOnIdle: true }), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/renderer-bubble-visibility.test.js`  
Expected: FAIL because `shouldShowBubble` does not exist yet.

- [ ] **Step 3: Implement the visibility helper and render wiring**

```js
export function shouldShowBubble({ phase, dragDirection, hideBubbleOnIdle }) {
  if (dragDirection) {
    return true;
  }
  if (hideBubbleOnIdle === true && phase === "idle") {
    return false;
  }
  return true;
}

function renderBubbleVisibility() {
  const phase = latestState?.phase ?? "idle";
  const visible = shouldShowBubble({
    phase,
    dragDirection: dragState?.direction ?? null,
    hideBubbleOnIdle: currentSettings.hideBubbleOnIdle
  });
  phaseLabel.parentElement.style.display = visible ? "" : "none";
}
```

- [ ] **Step 4: Subscribe renderer to live settings updates**

```js
window.petApi.watchSettings(nextSettings => {
  currentSettings = nextSettings;
  renderView();
});
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test -- tests/renderer-bubble-visibility.test.js`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add pet-app/renderer.js tests/renderer-bubble-visibility.test.js
git commit -m "feat: hide bubble only while idle when enabled"
```

---

### Task 8: 全量回归、手动验证与文档补充

**Files:**
- Modify: `E:\codex\ClaudeCode桌宠\README.md`
- Test: `E:\codex\ClaudeCode桌宠\tests\*.test.js`

- [ ] **Step 1: Update README for the new controls**

```md
- 右键桌宠可打开与托盘一致的菜单
- 可切换“待机时隐藏气泡”
- 可从“切换形象”子菜单切到内置角色
```

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`  
Expected: PASS across the full suite.

- [ ] **Step 3: Manual verification checklist**

```text
1. 启动桌宠
2. 右键窗口，确认菜单出现
3. 勾选“待机时隐藏气泡”，确认 idle 隐藏、done/error 仍显示
4. 切换形象，确认窗口重载且托盘 tooltip 同步
5. 重启应用，确认设置保留
6. 验证左键拖动、点击聚焦、双击打开目录、右下角缩放仍正常
```

- [ ] **Step 4: Clean temporary test artifacts from `%TEMP%` if new `claude-pet-*` folders were created**

Run: `Get-ChildItem -Path $env:TEMP -Directory -Filter 'claude-pet-*' | Remove-Item -Recurse -Force`  
Expected: no remaining task-generated temp directories.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document context menu and pet switching controls"
```

---

## Self-Review

### Spec coverage

- 右键菜单：Task 3、Task 4、Task 6 覆盖
- 待机隐藏气泡：Task 1、Task 4、Task 7 覆盖
- 内置形象切换：Task 2、Task 4、Task 5 覆盖
- 持久化与回退：Task 1、Task 2、Task 4 覆盖
- 回归与手验：Task 8 覆盖

### Placeholder scan

- 没有 `TODO` / `TBD`
- 每个代码步骤都给了具体片段
- 每个测试步骤都给了具体命令

### Type consistency

- 统一使用 `selectedPetId`
- 统一使用 `hideBubbleOnIdle`
- 统一使用 `buildDeskPetMenuTemplate`
- 统一使用 `getPetDescriptorById`

