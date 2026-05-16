const DEFAULT_PHASE = "idle";

function normalizeModel(model) {
  if (!model) {
    return { modelId: null, modelDisplayName: null };
  }
  if (typeof model === "string") {
    return { modelId: model, modelDisplayName: model };
  }
  return {
    modelId: model.id ?? model.name ?? null,
    modelDisplayName: model.display_name ?? model.name ?? model.id ?? null
  };
}

function normalizeWorkspace(payload) {
  return {
    cwd: payload.cwd ?? payload.workspace?.current_dir ?? null,
    projectDir: payload.workspace?.project_dir ?? payload.cwd ?? null
  };
}

function normalizeContextWindow(payload) {
  const cw = payload.context_window;
  if (!cw) {
    return null;
  }
  const usage = cw.current_usage;
  const usedTokens = usage
    ? (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.output_tokens ?? 0)
    : null;
  return {
    contextWindowSize: cw.context_window_size ?? null,
    usedTokens,
    usedPercentage: cw.used_percentage ?? null
  };
}

function inferNotificationPhase(message) {
  if (!message) {
    return "waiting_input";
  }
  if (/permission|approval|approve|edit|change/i.test(message)) {
    return "needs_approval";
  }
  if (/error|failed|denied/i.test(message)) {
    return "error";
  }
  return "waiting_input";
}

export function normalizeClaudeEvent(payload = {}) {
  const sourceEvent = payload.hook_event_name ?? payload.event ?? "Status";
  const workspace = normalizeWorkspace(payload);
  const model = normalizeModel(payload.model);
  const contextWindow = normalizeContextWindow(payload);
  const base = {
    sessionId: payload.session_id ?? payload.sessionId ?? null,
    cwd: workspace.cwd,
    projectDir: workspace.projectDir,
    modelId: model.modelId,
    modelDisplayName: model.modelDisplayName,
    toolName: payload.tool_name ?? payload.toolName ?? null,
    message: payload.message ?? null,
    phase: DEFAULT_PHASE,
    sourceEvent,
    isHeartbeat: false,
    updatedAt: new Date().toISOString(),
    contextWindow
  };

  switch (sourceEvent) {
    case "Status":
      return { ...base, phase: "idle", isHeartbeat: true };
    case "UserPromptSubmit":
      return { ...base, phase: "thinking" };
    case "PreToolUse":
      // Tools that require user approval in acceptEdits/default mode
      if (["Edit", "Write", "MultiEdit", "Bash"].includes(payload.tool_name) && payload.permission_mode !== "bypassPermissions") {
        return { ...base, phase: "needs_approval" };
      }
      return { ...base, phase: "tool_running" };
    case "PostToolUse":
      return { ...base, phase: "thinking" };
    case "PostToolUseFailure":
      return { ...base, phase: "error" };
    case "Notification":
      return {
        ...base,
        phase:
          payload.notification_type === "permission_request"
            ? "needs_approval"
            : inferNotificationPhase(base.message)
      };
    case "Stop":
    case "SessionEnd":
    case "SubagentStop":
      return { ...base, phase: "done" };
    default:
      return base;
  }
}
