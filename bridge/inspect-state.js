import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeClaudeEvent } from "./normalize-event.js";
import { writeState } from "./state-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "state", "claude-state.json");

const samples = [
  { hook_event_name: "Status", session_id: "demo", cwd: process.cwd(), model: { id: "claude-sonnet-4", display_name: "Sonnet" } },
  { hook_event_name: "UserPromptSubmit", session_id: "demo", message: "Summarize repo" },
  { hook_event_name: "PreToolUse", session_id: "demo", tool_name: "Edit" },
  { hook_event_name: "PostToolUse", session_id: "demo", tool_name: "Edit" },
  { hook_event_name: "Notification", session_id: "demo", message: "Claude needs your permission to use Bash" },
  { hook_event_name: "Stop", session_id: "demo", message: "Done" }
];

async function main() {
  for (const payload of samples) {
    const normalized = normalizeClaudeEvent(payload);
    const saved = await writeState(STATE_FILE, normalized);
    console.log(saved);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
