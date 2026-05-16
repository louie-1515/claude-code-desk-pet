# Claude Code Desk Pet

一个给 Claude Code CLI 用的自定义桌面宠物。通过官方 `statusLine` 和 `hooks` 接口感知 Claude 的状态，用 Electron 渲染一个浮动的像素风角色。

## 效果

对话框底部会显示状态栏：`月白档案员 · Opus 4.7 · my-project · 45%`

桌宠窗口会根据 Claude 的状态切换动画：待机、思考、跑工具、等你输入、等你审批、完成、出错。拖拽桌宠会切换跑步动画，右下角拖拽可缩放人物。

---

## 快速开始（已生成好精灵图的用户）

```bash
npm install
npm run setup   # 创建桌面快捷方式（Windows）
npm start
```

把 `hooks/settings.template.json` 合并到 `~/.claude/settings.json`（将 `__PROJECT_ROOT__` 替换为本项目路径）。

---

## 创建你自己的桌宠

整个流程由 Claude Code 辅助完成。你需要做的是告诉 Claude 你想要的角色，然后去生图大模型跑一次提示词。

### 步骤 1：告诉 Claude 你的角色

在 Claude Code 对话中输入：

> 帮我创建一个 Claude Code 桌宠。角色叫 {名字}，形象是 {外观描述}。

Claude 会根据你的描述生成提示词，参考 `PROMPT_TEMPLATE.md`。

### 步骤 2：去生图大模型生成精灵图

复制 Claude 给出的提示词，到任意生图模型（Midjourney、DALL·E、ComfyUI 等）生成一张精灵图。要求：

- **9 行 × 8 列** 网格布局
- 每格 **384 × 416 像素**，整图 **3072 × 3744 像素**
- 纯色背景（绿幕或白色），方便自动抠图
- 每行动画说明见下方「精灵图规范」

### 步骤 3：把图片发回给 Claude

将生成的精灵图直接拖入 Claude Code 对话。Claude 会：

1. 读取 `assets/pet.json` 结构，理解动画行映射
2. 从精灵图中按行提取每一帧
3. 自动抠图、裁剪、缩放、组装到 `assets/spritesheet.png`
4. 更新 `assets/pet.json` 中的角色名字和动画配置
5. 生成 `launcher/` 下的桌面图标（`.ico`）
6. 更新桌面快捷方式图标

### 步骤 4：安装运行

```bash
npm install
npm run setup   # 自动生成图标和桌面快捷方式
npm start
```

### 步骤 5：接入 Claude Code

将 `hooks/settings.template.json` 合并到 `~/.claude/settings.json`，把 `__PROJECT_ROOT__` 替换为本项目的绝对路径（用正斜杠）。

状态栏的名字会自动读取 `assets/pet.json` 中的 `displayName`。

---

## 精灵图规范

精灵图为 **8 列 × 9 行**网格，每格 384 × 416 像素。每行是一个动画序列，帧从左到右排列。多余的列留空。

| 行号 | 动画 ID | 帧数 | 触发器 | 动作描述 |
|------|---------|------|--------|----------|
| 0 | `idle` | 6 | 默认/待机 | 角色站立，轻微呼吸浮动 |
| 1 | `running-right` | 8 | 向右拖拽桌宠 | 角色侧身向右跑 |
| 2 | `running-left` | 8 | 向左拖拽桌宠 | 角色侧身向左跑 |
| 3 | `waving` | 4 | 任务完成（Stop/SessionEnd） | 角色挥手或欢呼 |
| 4 | `jumping` | 5 | 保留（当前未使用） | 角色原地跳跃 |
| 5 | `failed` | 8 | PostToolUseFailure / 出错 | 角色困惑或抱歉 |
| 6 | `waiting` | 6 | Notification（非审批类） | 角色期待，等待输入 |
| 7 | `running` | 6 | PreToolUse（工具运行中） | 角色跑动或忙碌 |
| 8 | `review` | 6 | UserPromptSubmit / PostToolUse（思考中） | 角色阅读或思考 |

**`assets/pet.json` 结构：**

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

如果你手动调整了动画帧数，记得更新 `frames` 字段。

---

## Hook 事件参考

Claude Code 通过以下 hook 事件驱动桌宠状态。模板位于 `hooks/settings.template.json`。

| Hook | 触发时机 | 桌宠状态 |
|------|----------|----------|
| `Status` (statusLine) | 每秒心跳 | `idle`（不覆盖瞬时状态） |
| `UserPromptSubmit` | 用户发送消息 | `thinking`（思考中） |
| `PreToolUse` | 工具开始执行 | `tool_running`（忙碌中） |
| `PostToolUse` | 工具执行完成 | `thinking`（继续思考） |
| `PostToolUseFailure` | 工具执行失败 | `error`（出错） |
| `Notification` | 系统通知 | `needs_approval`（审批类）或 `waiting_input` |
| `Stop` | 本轮结束 | `done`（完成） |
| `SubagentStop` | 子 agent 结束 | `done`（完成） |

**心跳保护：** `Status` 事件不会覆盖瞬时状态（`thinking`、`tool_running`、`needs_approval`、`error`）。

**状态栏输出：** `{displayName} · {modelName} · {dirname} · {contextPercent}%`

`displayName` 来自 `assets/pet.json`，自动适配你的角色名字。

---

## 配置说明

### 更换角色

替换 `assets/spritesheet.png` 和更新 `assets/pet.json` 即可。

### 自定义状态栏格式

编辑 `bridge/claude-hook.js` 中 `main()` 函数的 `process.stdout.write` 行。

### 自定义动画相位

编辑 `pet-app/view-model.js` 中的 `phaseMap`，修改动画映射或气泡文案。

### launch-claude-pet.ps1（Windows 启动器）

`launcher/launch-claude-pet.ps1` 会同时启动 Electron 桌宠和 Claude Code CLI。前提：

- 项目已执行 `npm install`
- Claude Code 已通过 npm 全局安装（`npm install -g @anthropic-ai/claude-code`）

---

## 项目结构

```
├── assets/             ← 运行时精灵图 + pet.json（替换这里即可换角色）
├── bridge/             ← hooks 桥接：事件归一化 + 状态持久化
│   └── state/          ← 运行时状态文件（自动创建，已 gitignore）
├── hooks/              ← Claude Code settings 模板
├── launcher/           ← Windows 启动脚本 + 桌面图标
├── pet-app/            ← Electron 桌宠应用
├── source/             ← 原始素材（月白档案员示例）
├── tests/              ← 测试套件（31 个）
├── tools/              ← 精灵图构建脚本
└── PROMPT_TEMPLATE.md  ← AI 生图提示词模板
```

**三层架构：**
- **Runtime：** `assets/`、`bridge/`、`pet-app/`、`launcher/`
- **Build & Edit：** `source/`、`tools/`
- **Support：** `tests/`、`hooks/`

---

## 给 Claude（AI 处理指南）

当用户把精灵图拖入对话，要求你处理成桌宠时，按以下流程操作：

### 1. 读懂现有结构

```
先读 assets/pet.json，理解 animation 行映射和帧数配置。
```

### 2. 切分精灵图

用 Python Pillow 将用户的大图按 `cell.width × cell.height` 切成 8×9 网格，保存每帧到临时目录。

### 3. 自动抠图

对每帧执行绿幕/白底抠图。参考 `tools/build_yuebai_pet.py` 中的 `alpha_from_background()` 和 `keep_main_sprite()` 逻辑。

### 4. 组装 spritesheet

将每行动画的 N 帧从左到右拼入目标精灵图。第 1 列从 `(0, row × cellH)` 开始，每帧 `cellW` 宽度偏移。

### 5. 更新配置

更新 `assets/pet.json`：
- `id`：英文短 ID
- `displayName`：用户说的角色名字（也是状态栏显示的名字）
- `description`：简短描述
- 各动画的 `frames`：实际有效帧数

### 6. 输出到 assets/

将新精灵图保存为 `assets/spritesheet.png`（覆盖），确保尺寸正确。更新 `assets/pet.json`。

### 7. 生成图标

从 `idle` 动画第一帧提取，缩放到 48×48，保存为 `launcher/Claude 桌宠.ico`。

### 8. 创建桌面快捷方式（Windows）

快捷方式指向 `launcher/启动桌宠.bat`（而非直接嵌 PowerShell 参数，会触发杀软）。图标指向 `launcher/Claude 桌宠.ico`。


### 9. 测试

```bash
npm test     # 验证 31 个测试全部通过
npm start    # 启动桌宠，确认动画正常
```

---

## 技术栈

Node.js · Electron 42 · ESM · node:test · vanilla HTML/CSS/JS · Pillow (Python)
