import test from "node:test";
import assert from "node:assert/strict";

import { resolveActiveProjectPath } from "../pet-app/project-paths.js";

test("resolveActiveProjectPath prefers cwd when available", () => {
  assert.equal(
    resolveActiveProjectPath(
      { cwd: "E:/codex/current-task", projectDir: "E:/codex/fallback-project" },
      "E:/codex/ClaudeCode桌宠"
    ),
    "E:/codex/current-task"
  );
});

test("resolveActiveProjectPath falls back to projectDir", () => {
  assert.equal(
    resolveActiveProjectPath(
      { projectDir: "E:/codex/fallback-project" },
      "E:/codex/ClaudeCode桌宠"
    ),
    "E:/codex/fallback-project"
  );
});

test("resolveActiveProjectPath falls back to desk pet project root", () => {
  assert.equal(
    resolveActiveProjectPath(null, "E:/codex/ClaudeCode桌宠"),
    "E:/codex/ClaudeCode桌宠"
  );
});
