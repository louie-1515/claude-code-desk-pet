export const phaseMap = {
  idle: { animation: "idle", label: "待命中", message: "Claude 现在很安静。" },
  thinking: { animation: "review", label: "思考中", message: "Claude 正在组织回复。" },
  tool_running: { animation: "running", label: "忙碌中", message: "Claude 正在跑工具。" },
  waiting_input: { animation: "waiting", label: "等你输入", message: "轮到你发话了。" },
  needs_approval: { animation: "waiting", label: "等你确认", message: "Claude 需要你的许可。" },
  done: { animation: "waving", label: "做完啦", message: "这一轮已经收工。" },
  error: { animation: "failed", label: "出错了", message: "这次执行遇到了问题。" }
};

export function dragDirectionFromDelta(deltaX, threshold = 10) {
  if (deltaX >= threshold) {
    return "right";
  }
  if (deltaX <= -threshold) {
    return "left";
  }
  return null;
}

export function resolveDisplayState({ phase, dragDirection }) {
  if (dragDirection === "right") {
    return { animation: "running-right", label: "拖动中", message: "向右拖动桌宠。" };
  }
  if (dragDirection === "left") {
    return { animation: "running-left", label: "拖动中", message: "向左拖动桌宠。" };
  }
  return phaseMap[phase] ?? phaseMap.idle;
}
