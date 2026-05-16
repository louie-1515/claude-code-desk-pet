import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";

import { loadState, writeState } from "../bridge/state-store.js";

test("writes state json and preserves the latest explicit phase over status heartbeats", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "claude-pet-state-"));
  const file = path.join(dir, "claude-state.json");

  await writeState(file, {
    sessionId: "session-10",
    phase: "tool_running",
    toolName: "Bash",
    updatedAt: "2026-05-15T23:30:00.000Z"
  });

  await writeState(file, {
    sessionId: "session-10",
    phase: "idle",
    isHeartbeat: true,
    updatedAt: "2026-05-15T23:30:00.100Z"
  });

  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.phase, "tool_running");
  assert.equal(saved.toolName, "Bash");
});

test("loadState returns null for a missing file", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "claude-pet-load-"));
  const result = await loadState(path.join(dir, "missing.json"));
  assert.equal(result, null);
});
