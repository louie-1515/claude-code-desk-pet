# 桌宠精灵图生成提示词模板

## 使用说明

1. 先定义你的桌宠：名字、外观、风格
2. 把下面的提示词里的 `{占位符}` 替换成你的设定
3. 到生图大模型（Midjourney / DALL·E / 其他）生成**一张大图**
4. 把生成的图片发给 Claude Code，让它按项目流程处理

---

## 精灵图布局要求

生成一张 **水平 8 列 × 垂直 9 行**、共 72 格的精灵图（sprite sheet）。

- 每格大小：**384 × 416 像素**
- 整图大小：**3072 × 3744 像素**
- 背景：**纯色（绿幕或白色）**，便于自动抠图
- 风格：像素风（pixel art）
- 角色统一放在每个格子**底部居中**，脚底留少量间距

---

## 每行动画说明

| 行 | 动画名 | 帧数 | 用途 | 动作描述 |
|----|--------|------|------|----------|
| 0 | idle | 6 | 待机 | 角色自然站立，轻微呼吸浮动 |
| 1 | running-right | 8 | 向右拖拽 | 角色侧身向右跑动 |
| 2 | running-left | 8 | 向左拖拽 | 角色侧身向左跑动 |
| 3 | waving | 4 | 任务完成 | 角色挥手/欢呼 |
| 4 | jumping | 5 | 跳跃 | 角色原地跳跃 |
| 5 | failed | 8 | 出错 | 角色表现困惑/抱歉 |
| 6 | waiting | 6 | 等待输入 | 角色表现期待/等待 |
| 7 | running | 6 | 忙碌中 | 角色在跑动/忙碌 |
| 8 | review | 6 | 思考中 | 角色在阅读/思考 |

**每行的帧从左到右排列**，第 1 列到第 N 列（N = 该行帧数），多余的列留空。

---

## 提示词模板

将 `{name}` 和 `{appearance}` 替换为你的角色设定后，发给生图模型：

```
A pixel-art sprite sheet for a 2D desktop pet. 
The sprite sheet is a grid of 9 rows x 8 columns. 
Each cell is 384x416 pixels. 
The character is: {name}, {appearance}.

Row 0 (idle, 6 frames): standing naturally, gentle breathing animation, facing front.
Row 1 (running-right, 8 frames): running toward the right, side view.
Row 2 (running-left, 8 frames): running toward the left, side view, mirrored pose.
Row 3 (waving, 4 frames): waving hand or celebrating, happy expression.
Row 4 (jumping, 5 frames): jumping up and down, excited motion.
Row 5 (failed, 8 frames): looking confused or apologetic, head tilted.
Row 6 (waiting, 6 frames): looking expectant, slightly leaning forward, waiting.
Row 7 (running, 6 frames): running/busy motion, focused expression.
Row 8 (review, 6 frames): reading a floating document or thinking, glasses or thoughtful pose.

Character is centered at the bottom of each cell, feet near the bottom edge.
All frames must be the SAME character, consistent size, style and color palette.
Solid green or white background for easy background removal.
Pixel art style, clean edges, minimal anti-aliasing.
16-bit or 32-bit retro game aesthetic.
```

---

## 示例设定

填入上面的模板前，先想清楚：

- **名字：** 月白档案员（示例用）
- **外观：** 穿深蓝色档案员制服，戴圆形眼镜，深棕色短发，16-bit 像素风

替换后发给生图模型，生成整张精灵图，然后把图片发给 Claude Code 处理。
