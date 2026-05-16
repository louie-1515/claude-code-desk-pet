import test from "node:test";
import assert from "node:assert/strict";

import { normalizeClaudeEvent } from "../bridge/normalize-event.js";

test("maps statusLine payload into idle heartbeat state", () => {
  const next = normalizeClaudeEvent({
    hook_event_name: "Status",
    session_id: "session-1",
    cwd: "E:/codex",
    model: { id: "claude-sonnet-4", display_name: "Sonnet" },
    workspace: { current_dir: "E:/codex", project_dir: "E:/codex" },
    version: "1.0.0"
  });

  assert.equal(next.phase, "idle");
  assert.equal(next.sessionId, "session-1");
  assert.equal(next.cwd, "E:/codex");
  assert.equal(next.modelDisplayName, "Sonnet");
});

test("maps notification payload about permission into needs_approval", () => {
  const next = normalizeClaudeEvent({
    hook_event_name: "Notification",
    message: "Claude needs your permission to use Bash",
    session_id: "session-2"
  });

  assert.equal(next.phase, "needs_approval");
  assert.match(next.message, /permission/i);
});

test("maps tool lifecycle payloads into tool_running and thinking", () => {
  const before = normalizeClaudeEvent({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    session_id: "session-3",
    permission_mode: "bypassPermissions"
  });
  const after = normalizeClaudeEvent({
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    session_id: "session-3"
  });

  assert.equal(before.phase, "tool_running");
  assert.equal(before.toolName, "Bash");
  assert.equal(after.phase, "thinking");
});

test("maps PreToolUse for approval-required tools into needs_approval", () => {
  const mode = { permission_mode: "acceptEdits" };
  assert.equal(normalizeClaudeEvent({ ...mode, hook_event_name: "PreToolUse", tool_name: "Edit" }).phase, "needs_approval");
  assert.equal(normalizeClaudeEvent({ ...mode, hook_event_name: "PreToolUse", tool_name: "Write" }).phase, "needs_approval");
  assert.equal(normalizeClaudeEvent({ ...mode, hook_event_name: "PreToolUse", tool_name: "MultiEdit" }).phase, "needs_approval");
  assert.equal(normalizeClaudeEvent({ ...mode, hook_event_name: "PreToolUse", tool_name: "Bash" }).phase, "needs_approval");
  // bypassPermissions never shows approval
  assert.equal(normalizeClaudeEvent({ permission_mode: "bypassPermissions", hook_event_name: "PreToolUse", tool_name: "Edit" }).phase, "tool_running");
});

test("maps tool failure payloads into error", () => {
  const failed = normalizeClaudeEvent({
    hook_event_name: "PostToolUseFailure",
    tool_name: "Bash",
    session_id: "session-4",
    message: "Bash exited with code 1"
  });

  assert.equal(failed.phase, "error");
  assert.equal(failed.toolName, "Bash");
});
