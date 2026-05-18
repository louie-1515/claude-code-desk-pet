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

function withCause(message, cause) {
  const error = new Error(message);
  error.cause = cause;
  return error;
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

export async function writeState(
  filePath,
  incoming,
  fsOps = { mkdir, writeFile, rename, unlink }
) {
  const existing = await loadState(filePath);
  const next = mergeState(existing, incoming);
  await fsOps.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await fsOps.writeFile(tempPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  try {
    await fsOps.rename(tempPath, filePath);
  } catch (error) {
    await fsOps.unlink(tempPath).catch(() => {});
    throw withCause(`Failed to persist Claude pet state to ${filePath}`, error);
  }
  return next;
}
