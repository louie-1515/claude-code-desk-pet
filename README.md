# Claude Code Desk Pet

一个给 Claude Code CLI 用的自定义桌面宠物。项目通过官方 `statusLine` 和 `hooks` 感知 Claude 的状态，用 Electron 渲染一个浮动像素角色，并支持多形象切换。

## 这项目现在能做什么

- 根据 Claude 状态切换动画：待机、思考、忙碌、等待、完成、出错
- 左键拖动桌宠，显示左右奔跑动画
- 悬停待机角色时播放跳跃互动
- 右键桌宠或右键托盘图标，打开同一套功能菜单
- 菜单里切换“待机时隐藏气泡”
- 菜单里切换内置角色
- Windows 桌面快捷方式启动桌宠 + Claude Code CLI

当前内置角色：

- `月白档案员`
- `晨光信使`

---

## 快速开始

```bash
npm install
npm run setup
npm start
```

然后把 `hooks/settings.template.json` 合并到 `~/.claude/settings.json`，并把其中的 `__PROJECT_ROOT__` 替换为**桌宠项目本身**的绝对路径，也就是这个仓库根目录。这个占位符的作用是让 Claude 能找到桌宠自己的 `bridge/claude-hook.js`。

---

## 交互说明

- **悬停**：待机时跳跃
- **单击**：唤出或聚焦 Claude Code 终端；完成态/审批态会顺手退出该瞬时状态
- **双击**：打开 Claude 当前正在操作的工作目录；如果当前拿不到工作目录，再回退到桌宠项目目录
- **拖拽**：移动桌宠，拖动中显示左右奔跑动画
- **右击**：打开和托盘一致的菜单；其中“打开当前工作目录”与双击遵循同一条规则，“打开当前形象目录”会直接跳到当前选中角色的 `assets/pets/<pet-id>/`
- **右下角拖拽**：缩放人物，气泡大小不跟着变

---

## 角色系统

### 目录结构

每个角色都建议放在：

```text
assets/pets/<pet-id>/
```

目录里至少包含：

```text
assets/pets/<pet-id>/pet.json
assets/pets/<pet-id>/spritesheet.png
```

例如：

```text
assets/pets/yuebai-archivist/pet.json
assets/pets/yuebai-archivist/spritesheet.png
assets/pets/xiaokou/pet.json
assets/pets/xiaokou/spritesheet.png
```

### `pet.json` 最小结构

```json
{
  "id": "my-pet",
  "displayName": "我的桌宠",
  "description": "我的 Claude Code 桌宠",
  "cell": { "width": 384, "height": 416 },
  "atlas": { "columns": 8, "rows": 9 },
  "animations": {
    "idle":          { "row": 0, "frames": 6, "frameDurationMs": 180 },
    "running-right": { "row": 1, "frames": 8, "frameDurationMs": 120 },
    "running-left":  { "row": 2, "frames": 8, "frameDurationMs": 120 },
    "waving":        { "row": 3, "frames": 4, "frameDurationMs": 150 },
    "jumping":       { "row": 4, "frames": 5, "frameDurationMs": 150 },
    "failed":        { "row": 5, "frames": 8, "frameDurationMs": 160 },
    "waiting":       { "row": 6, "frames": 6, "frameDurationMs": 170 },
    "running":       { "row": 7, "frames": 6, "frameDurationMs": 130 },
    "review":        { "row": 8, "frames": 6, "frameDurationMs": 150 }
  }
}
```

### 固定的 9 行状态映射

这套 sprite sheet 不是随便排的，行序是固定的：

| 行号 | 动画 ID | 运行时用途 |
|------|---------|------------|
| 0 | `idle` | 默认待机 |
| 1 | `running-right` | 向右拖动桌宠 |
| 2 | `running-left` | 向左拖动桌宠 |
| 3 | `waving` | 完成态 |
| 4 | `jumping` | 悬停 idle 角色 |
| 5 | `failed` | 出错 |
| 6 | `waiting` | 等待输入 / 等待确认 |
| 7 | `running` | 工具运行中 |
| 8 | `review` | 思考 / 阅读 |

不要改动这 9 行顺序。提示词模板已经按这套结构写好了，见 [PROMPT_TEMPLATE.md](./PROMPT_TEMPLATE.md)。

---

## 图标规则

这个项目里有两类你最常看到的图标：

1. **桌面快捷方式图标**
2. **托盘隐藏区图标**

默认建议让它们保持同一个视觉来源。

### 当前共享图标文件

项目默认使用：

```text
launcher/Claude 桌宠.ico
```

- `npm run setup` 创建桌面快捷方式时，会把这个 `.ico` 写进 `.lnk`
- 托盘图标默认也会优先使用这个 `.ico`

### 如果你想自定义图标

最稳的做法是：

1. 替换 `launcher/Claude 桌宠.ico`
2. 如果某个角色要显示不同托盘图标，再去 [pet-registry.js](./pet-app/pet-registry.js) 里给该角色改 `trayIconFile`
3. 重新运行：

```bash
npm run setup
```

这样桌面快捷方式图标和托盘图标就更容易保持一致。

### 重要说明

当前项目的“切换角色”会切换运行时角色资源，但**不会自动为每个角色生成独立桌面快捷方式**。  
桌面快捷方式依然是项目级入口，默认只认 `launcher/Claude 桌宠.ico`。

---

## 新增一个可切换角色

如果你要往项目里加一只新角色，而不是替换现有角色，步骤分成两部分：

### A. 先把资源做出来

推荐的交互方式不是让用户自己改模板，而是：

1. 用户先对 Codex 或 Claude 描述角色
2. Codex 或 Claude 根据 [PROMPT_TEMPLATE.md](./PROMPT_TEMPLATE.md) 自动整理成最终生图提示词
3. 用户去生图；如果当前就是 Codex，也可以直接生图
4. Codex 或 Claude 继续引导用户把生成结果整理成角色资源

建议让用户这样描述：

> 帮我给 Claude Code 桌宠新增一个可切换角色。角色叫 {名字}，形象是 {外观描述}，风格偏 {风格偏好}。

Codex / Claude 应继续引导：

1. 帮用户补全角色设定
2. 用模板生成最终提示词
3. 提醒用户必须保持 8 列 × 9 行和固定状态映射
4. 引导用户把生成图发回当前项目进行整理

拿到生图结果后，再做下面这些事：

1. 确认行序符合固定状态映射
2. 准备好 `pet.json`
3. 放入：

```text
assets/pets/<pet-id>/
```

### B. 再把资源接入项目

编辑 [pet-registry.js](./pet-app/pet-registry.js)，在 `builtInPets` 里新增一项：

```js
{
  id: "morning-messenger",
  name: "晨光信使",
  petConfigFile: path.join(projectRoot, "assets", "pets", "morning-messenger", "pet.json"),
  spriteFile: path.join(projectRoot, "assets", "pets", "morning-messenger", "spritesheet.png"),
  trayIconFile: path.join(projectRoot, "launcher", "Claude 桌宠.ico")
}
```

只有注册到这里，它才会出现在“切换形象”菜单里。

接好后重启桌宠即可。

---

## 从零创建一只新桌宠

如果你现在还没有资源，完整流程是：

1. 用户先对 Codex 或 Claude 描述想要的角色
2. Codex 或 Claude 根据 [PROMPT_TEMPLATE.md](./PROMPT_TEMPLATE.md) 生成最终提示词
3. 用户去生图；如果当前就是 Codex，可以直接生图
4. 用户把 sprite sheet 发回当前会话
5. Codex 或 Claude 继续引导并整理出：
   - `pet.json`
   - `spritesheet.png`
6. 放进 `assets/pets/<pet-id>/`
7. 在 [pet-registry.js](./pet-app/pet-registry.js) 注册
8. 如有需要，更新 `launcher/Claude 桌宠.ico`
9. 运行：

```bash
npm run setup
npm test
npm start
```

### “创建桌宠”和“新增角色”的区别

- **创建桌宠**：重点是把一套新资源做出来
- **新增角色**：重点是把现成资源接入当前项目，并让它出现在切换菜单里

这两个流程会复用同一套资源结构，但不是一回事。

---

## Claude 状态如何映射到动作

项目通过 `hooks/settings.template.json` 把 Claude 的 hook 事件写到桥接层，再由桌宠读取状态文件切换动作。

主要映射：

- `Status`：`idle`
- `UserPromptSubmit`：`thinking`
- `PreToolUse`：`tool_running` 或 `needs_approval`
- `PostToolUse`：`thinking`
- `PostToolUseFailure`：`error`
- `Notification`：`needs_approval` 或 `waiting_input`
- `Stop` / `SubagentStop`：`done`

运行时动画映射在 [view-model.js](./pet-app/view-model.js) 里。

---

## 启动器与快捷方式

Windows 相关入口：

| 文件 | 用途 |
|------|------|
| [launch-claude-pet.ps1](./launcher/launch-claude-pet.ps1) | 同时启动桌宠和 Claude Code CLI，带去重 |
| [focus-or-launch-claude.ps1](./launcher/focus-or-launch-claude.ps1) | 单击桌宠时聚焦或启动 Claude |
| [启动桌宠.bat](./launcher/启动桌宠.bat) | 桌面快捷方式入口 |
| [setup-desktop.js](./scripts/setup-desktop.js) | 创建桌面快捷方式 |

---

## 项目结构

```text
assets/
  pets/                 角色资源目录
bridge/
  state/                运行时状态文件
hooks/                  Claude Code settings 模板
launcher/               Windows 启动脚本和共享图标
pet-app/                Electron 桌宠应用
scripts/                setup 脚本
source/                 原始素材
tests/                  测试
tools/                  构建脚本
PROMPT_TEMPLATE.md      生图提示词模板
```

---

## 测试

```bash
npm test
```

当前测试覆盖：

- 状态桥接
- 窗口行为
- 资源配置
- 右键菜单模板
- 角色注册表
- 待机隐藏气泡逻辑

---

## 给接手这个项目的人

如果你是新来的用户、Claude、Codex，先记住这几条：

1. **角色资源统一放 `assets/pets/<pet-id>/`**
2. **固定 9 行动作映射不能改顺序**
3. **新角色要进菜单，必须改 `pet-registry.js`**
4. **桌面快捷方式和托盘图标默认共用 `launcher/Claude 桌宠.ico`**
5. **提示词模板是运行时友好的，不是普通插画提示词**
6. **用户应该描述角色，由 Codex / Claude 负责生成提示词并一路引导，不要把模板直接丢给用户改占位符**
7. **如果你想把这套流程装成可复用 skill，仓库里已经附带模板：`skill/desk-pet-role-workflow/SKILL.md`；安装到本地 skills 目录后即可使用**

做到这七条，基本就不会把这个项目接歪。
