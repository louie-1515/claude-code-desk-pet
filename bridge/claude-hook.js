import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

import { normalizeClaudeEvent } from "./normalize-event.js";
import { writeState } from "./state-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

async function main() {
  const raw = await readStdin();
  const payload = raw ? JSON.parse(raw) : {};
  const next = normalizeClaudeEvent(payload);
  const saved = await writeState(STATE_FILE, next);
  if (next.sourceEvent === "Status") {
    const dirName = saved.cwd ? path.basename(saved.cwd) : "workspace";
    const modelName = saved.modelDisplayName ?? "Claude";
    let suffix = "";
    if (saved.contextWindow?.usedPercentage != null) {
      const pct = Math.round(saved.contextWindow.usedPercentage);
      suffix = ` · ${pct}%`;
    }
    const petName = getPetName() ?? "Claude";
    process.stdout.write(`${petName} · ${modelName} · ${dirName}${suffix}`);
  }
}

main().catch(error => {
  console.error("[claude-hook] failed:", error);
  process.exitCode = 1;
});
