import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";

const TRANSIENT_PHASES = new Set(["thinking", "tool_running", "needs_approval", "error", "done", "waiting_input"]);
const STUCK_THRESHOLD_MS = 30_000;

export async function loadState(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function mergeState(existing, incoming) {
  if (!existing) {
    return incoming;
  }

  if (incoming.isHeartbeat && TRANSIENT_PHASES.has(existing.phase)) {
    // Allow heartbeat to overwrite "thinking" if stuck > 30s (e.g. user interrupted)
    if (existing.phase === "thinking" && existing.updatedAt) {
      const age = Date.now() - new Date(existing.updatedAt).getTime();
      if (age > STUCK_THRESHOLD_MS) {
        return { ...existing, ...incoming, isHeartbeat: true };
      }
    }
    return {
      ...existing,
      ...incoming,
      phase: existing.phase,
      toolName: existing.toolName,
      message: existing.message,
      isHeartbeat: true
    };
  }

  return {
    ...existing,
    ...incoming
  };
}

export async function writeState(filePath, incoming) {
  const existing = await loadState(filePath);
  const next = mergeState(existing, incoming);
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  try {
    await rename(tempPath, filePath);
  } catch {
    await unlink(tempPath).catch(() => {});
  }
  return next;
}
