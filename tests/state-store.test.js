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

test("writeState throws when the atomic rename fails so callers do not assume success", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "claude-pet-write-fail-"));
  const file = path.join(dir, "claude-state.json");
  const calls = [];

  await assert.rejects(
    () =>
      writeState(
        file,
        {
          sessionId: "session-11",
          phase: "idle",
          updatedAt: "2026-05-17T12:00:00.000Z"
        },
        {
          mkdir: async () => {},
          writeFile: async tempPath => {
            calls.push(["writeFile", tempPath]);
          },
          rename: async () => {
            const error = new Error("file is locked");
            error.code = "EPERM";
            throw error;
          },
          unlink: async tempPath => {
            calls.push(["unlink", tempPath]);
          }
        }
      ),
    /Failed to persist Claude pet state/
  );

  assert.equal(calls[0][0], "writeFile");
  assert.equal(calls[1][0], "unlink");
});
