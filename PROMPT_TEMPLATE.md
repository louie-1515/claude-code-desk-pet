# 桌宠精灵图生成提示词模板

## 使用说明

推荐流程不是让用户自己改模板，而是：

1. 用户先描述角色：名字、外观、身份气质、主色、风格偏好
2. Codex 或 Claude 根据这份模板自动整理出最终提示词
3. 用户拿着最终提示词去生图；如果当前就是 Codex，也可以直接生图
4. 生成图回传后，Codex 或 Claude 继续引导后续的切图、抠图、注册

也就是说，这份模板主要是给 **Codex / Claude 生成提示词时使用**，不是默认让最终用户自己去手改占位符。

---

## 这份模板要解决什么问题

这套模板不是只为了“画得好看”，更重要的是让生成结果能**稳定接入桌宠运行时**。

必须同时满足：

1. **固定 9 行状态映射**
2. **固定角色体型基准**
3. **固定站位基线**
4. **左右拖动跑成对匹配**
5. **多余列留空**

如果行序、体型、站位不稳定，后面即使抠图干净，桌宠运行时也会出现动作映射错位、切换角色忽大忽小、拖动方向观感不对等问题。

---

## 精灵图布局要求

生成一张 **8 列 × 9 行** 的 sprite sheet，共 72 格。

- 每格大小：**384 × 416 像素**
- 整图大小：**3072 × 3744 像素**
- 背景：**纯白或纯绿纯色背景**
- 风格：**清晰像素风**
- 角色：**每一格都必须是同一个角色**
- 站位：**底部居中**
- 脚底基线：角色最低点应稳定落在距底边 **12 到 18 px**
- 体型基准：角色整体高度应稳定占每格高度 **78% 到 82%**
- 宽度基准：左右最宽轮廓应稳定占每格宽度 **60% 到 68%**
- 同一张表内所有帧的人物体积误差尽量控制在 **3% 以内**

不要让某几帧突然画得特别大、特别小、特别高、特别低。

---

## 固定行序与状态语义

**下面这 9 行顺序是固定的，不能改。**

| 行 | 动画 ID | 帧数 | 运行时用途 | 必须画成什么 |
|----|---------|------|------------|--------------|
| 0 | `idle` | 6 | 默认待机 | 正面站立，轻微呼吸、眨眼 |
| 1 | `running-right` | 8 | 向右拖动桌宠 | 角色必须朝右跑，侧身，明显向右运动 |
| 2 | `running-left` | 8 | 向左拖动桌宠 | 角色必须朝左跑，和上一行成对匹配 |
| 3 | `waving` | 4 | 任务完成 | 小幅挥手、轻庆祝，不要夸张大动作 |
| 4 | `jumping` | 5 | 鼠标悬停 idle 角色 | 原地小跳，只改变上下运动，不改变角色体型 |
| 5 | `failed` | 8 | 出错 / 失败 | 困惑、抱歉、失落、恢复 |
| 6 | `waiting` | 6 | 等待输入 / 等待确认 | 安静期待、轻微前倾、等待回应 |
| 7 | `running` | 6 | 工具运行中 / 忙碌中 | 忙碌工作态，不是左右拖动跑 |
| 8 | `review` | 6 | 思考 / 阅读 / 查看资料 | 阅读、查看文档、思考资料 |

**硬约束：**

- 不允许改动行序
- 不允许把两个状态合并成一行
- 不允许把某一行换成你觉得“更好看”的别的动作
- 每行有效帧必须从左到右连续排列
- 多余的列必须留空，不能塞额外动作、特效或装饰

---

## 动作一致性要求

### 1. 左右拖动跑

`running-right` 和 `running-left` 必须是完全对应的一对：

- 同一体型
- 同一镜头距离
- 同一角色比例
- 同一站位基线
- 只改变朝向和跑步节奏

不能把左跑画成更近、更大、更正面，也不能把右跑画成更远、更小。

### 2. 跳跃

`jumping` 只能表现“原地小跳”：

- 角色大小与 `idle` 基本一致
- 变化主要来自上下位移与轻微肢体变化
- 不要画成大幅腾空
- 不要让整个人物比例发生变化

### 3. 忙碌 vs 思考

`running` 和 `review` 不要混淆：

- `running` = 工具运行中，忙碌处理任务
- `review` = 思考、查看、阅读资料

`running` 不应该只是静止看文档，`review` 也不应该画成左右奔跑。

### 4. 待机 vs 等待

`idle` 和 `waiting` 也不要混淆：

- `idle` = 自然待机
- `waiting` = 明显在等你、期待输入或确认

---

## 负面约束

这一部分建议分成两层理解：

### 第一层：结构性约束（固定，不建议放开）

这些不是审美偏好，而是为了保证 sprite sheet 能稳定接入桌宠系统。下面这些内容应尽量明确禁止：

- 不要复杂背景
- 不要地台、场景、家具、地面阴影块
- 不要在留空列里补动作
- 不要角色忽大忽小
- 不要人物在某些帧里飘到半空或沉到底边
- 不要更换服装、发型、道具主设定
- 不要大面积速度线、感叹号、星星、泡泡、符号装饰
- 不要发光特效、粒子雨、漂浮背景物

如果某个状态需要道具，只允许**小型、贴近身体、易抠图的单一道具**，比如一张发光小文档。

### 第二层：风格性约束（默认推荐，可按用户要求覆盖）

下面这些属于默认推荐风格，不是绝对禁止项。  
如果用户明确指定了其他视觉方向，可以适度放宽，但仍必须保持：

- 像素可读性
- 角色轮廓稳定
- 背景易抠
- 体型和站位一致
- 固定行序与状态动作映射不变

默认不建议：

- 过度写实风
- 半写实动漫渲染
- 柔光插画感
- 3D 渲染感
- 水彩、纸纹、草图、厚涂

换句话说，**风格可以自定义，但结构不能散**。

---

## 英文提示词模板

通常应由 Codex / Claude 把用户描述整理成最终提示词，再发给生图模型：

```text
A clean pixel-art sprite sheet for a 2D desktop pet character.

The sheet must be an exact grid of 8 columns by 9 rows.
Each cell must be exactly 384x416 pixels.
The full image must be exactly 3072x3744 pixels.

The character is: {name}, {appearance}.

This sprite sheet is for a runtime-driven desktop pet system, so the row order is fixed and must not be changed.
Do not reorder rows.
Do not merge states.
Do not replace a row with a different action.
Frames in each row must run from left to right continuously, and all unused cells must be left empty.

The same exact character must appear in every frame, with consistent proportions, outfit, silhouette, palette, and camera distance.
Character size must remain highly consistent across all frames.
Character height should stay around 78% to 82% of the cell height.
Character width should stay around 60% to 68% of the cell width.
The character must be bottom-centered in every cell.
The lowest point of the character should stay on a stable baseline about 12 to 18 pixels above the bottom edge.
Do not make some frames much larger, smaller, higher, or lower than others.

Row 0: idle, 6 frames. Front-facing idle stance, gentle breathing, subtle blink, calm neutral expression.
Row 1: running-right, 8 frames. Side-view running toward the right, clearly moving right, compact running cycle.
Row 2: running-left, 8 frames. Side-view running toward the left, matched counterpart of row 1, same scale and same pose logic.
Row 3: waving, 4 frames. Small friendly wave or light celebration, compact motion, not exaggerated.
Row 4: jumping, 5 frames. Small in-place hop for hover interaction, same body scale as idle, only vertical motion changes.
Row 5: failed, 8 frames. Confused, apologetic, disappointed, then slight recovery.
Row 6: waiting, 6 frames. Expectant waiting pose, slightly attentive, as if waiting for user input or approval.
Row 7: running, 6 frames. Busy working state, active task-processing motion, not left/right drag running.
Row 8: review, 6 frames. Reading, checking a small floating document, reviewing information, thoughtful but still compact.

Pixel art only.
Clean crisp edges.
Minimal anti-aliasing.
Retro 16-bit / 32-bit game sprite feel.
Plain solid white or solid green background only.

Structural negative constraints that should remain strict:
no background scene,
no stage platform,
no furniture,
no large ground shadow block,
no props outside the character silhouette area,
no extra decorative symbols in empty cells,
no large VFX,
no floating particles,
no oversized speed lines,
no size drift between frames,
no row reordering,
no incorrect state-action mapping,
no unstable baseline,
no inconsistent costume or hairstyle changes.

Default style constraints, which may be relaxed only if the user explicitly requests a different look:
avoid realistic rendering,
avoid semi-realistic anime rendering,
avoid painterly shading,
avoid watercolor,
avoid sketch texture,
avoid paper texture,
avoid 3D render look,
avoid dramatic lighting.
```

---

## 中文使用提醒

如果你是让 Claude 或其他 AI 帮你二次整理提示词，最好再附一句中文要求：

> 这不是普通插画，而是要接入固定状态映射的桌宠精灵图。请严格保持 9 行固定顺序、统一体型、统一站位、统一镜头距离，多余列留空。视觉风格可以按用户要求调整，但不能破坏这些结构约束。

---

## 示例设定

- **名字：** 月白档案员
- **外观：** 身形小巧的人形少女档案员，深蓝夜空斗篷与帽子，月亮和星星装饰，白色短发，浅色眼睛，温柔安静，像素风，整体清冷但可爱

实际使用时，建议让 Codex / Claude 先根据示例设定自动输出最终提示词，再交给生图模型。
