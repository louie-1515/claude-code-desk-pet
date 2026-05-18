import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

import { normalizeClaudeEvent } from "./normalize-event.js";
import { writeState } from "./state-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_FILE = fileURLToPath(import.meta.url);
const STATE_FILE = path.join(__dirname, "state", "claude-state.json");
const PET_CONFIG = path.join(__dirname, "..", "assets", "pet.json");

let petDisplayName = null;

function getPetName() {
  if (petDisplayName) return petDisplayName;
  try {
    if (existsSync(PET_CONFIG)) {
      const pet = JSON.parse(readFileSync(PET_CONFIG, "utf8"));
      petDisplayName = pet.displayName ?? pet.id ?? null;
    }
  } catch { /* use fallback */ }
  return petDisplayName;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      raw += chunk;
    });
    process.stdin.on("end", () => resolve(raw.trim()));
    process.stdin.on("error", reject);
  });
}

export function parseHookPayload(raw, logError = console.error) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload;
    }
  } catch (error) {
    logError("[claude-hook] ignored malformed stdin JSON:", error);
    return null;
  }

  logError("[claude-hook] ignored non-object stdin payload");
  return null;
}

export function formatStatusLine(saved, petName = "Claude") {
  const dirName = saved.cwd ? path.basename(saved.cwd) : "workspace";
  const modelName = saved.modelDisplayName ?? "Claude";
  let suffix = "";
  if (saved.contextWindow?.usedPercentage != null) {
    const pct = Math.round(saved.contextWindow.usedPercentage);
    suffix = ` · ${pct}%`;
  }
  return `${petName} · ${modelName} · ${dirName}${suffix}`;
}

export async function runHook(
  raw,
  {
    logError = console.error,
    normalizeEvent = normalizeClaudeEvent,
    writeStateImpl = writeState,
    stateFile = STATE_FILE,
    getPetNameImpl = getPetName
  } = {}
) {
  const payload = parseHookPayload(raw, logError);
  if (!payload) {
    return { ignored: true };
  }

  const next = normalizeEvent(payload);
  const saved = await writeStateImpl(stateFile, next);
  if (next.sourceEvent === "Status") {
    return { statusLine: formatStatusLine(saved, getPetNameImpl() ?? "Claude") };
  }

  return { saved };
}

async function main() {
  const raw = await readStdin();
  const result = await runHook(raw);
  if (result.statusLine) {
    process.stdout.write(result.statusLine);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) {
  main().catch(error => {
    console.error("[claude-hook] failed:", error);
    process.exitCode = 1;
  });
}
