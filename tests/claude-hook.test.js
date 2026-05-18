import test from "node:test";
import assert from "node:assert/strict";

import { formatStatusLine, parseHookPayload, runHook } from "../bridge/claude-hook.js";

test("parseHookPayload returns an empty object for blank stdin", () => {
  assert.deepEqual(parseHookPayload("   "), {});
});

test("parseHookPayload ignores malformed json instead of throwing", () => {
  const errors = [];
  const payload = parseHookPayload("{bad json", (...args) => {
    errors.push(args);
  });

  assert.equal(payload, null);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0][0]), /ignored malformed stdin json/i);
});

test("runHook skips state writes for malformed input", async () => {
  let writeCalls = 0;
  const result = await runHook("{bad json", {
    logError: () => {},
    normalizeEvent: () => {
      throw new Error("should not normalize malformed payload");
    },
    writeStateImpl: async () => {
      writeCalls += 1;
    }
  });

  assert.deepEqual(result, { ignored: true });
  assert.equal(writeCalls, 0);
});

test("runHook returns a formatted status line for Status events", async () => {
  const result = await runHook(
    JSON.stringify({
      hook_event_name: "Status",
      session_id: "session-12"
    }),
    {
      normalizeEvent: payload => ({
        sourceEvent: payload.hook_event_name,
        cwd: "E:/codex/ClaudeCode桌宠",
        modelDisplayName: "Sonnet",
        contextWindow: { usedPercentage: 42.4 }
      }),
      writeStateImpl: async (_stateFile, next) => next,
      getPetNameImpl: () => "小克"
    }
  );

  assert.equal(result.statusLine, "小克 · Sonnet · ClaudeCode桌宠 · 42%");
});

test("formatStatusLine falls back to workspace and Claude defaults", () => {
  assert.equal(formatStatusLine({}, "小克"), "小克 · Claude · workspace");
});
