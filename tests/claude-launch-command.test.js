import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const helperFile = path.resolve("launcher", "resolve-claude-launch-command.ps1");
const powershellExe = path.join(
  process.env.SystemRoot ?? "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe"
);

function runResolver(env) {
  const command = [
    `. '${helperFile}'`,
    "$result = Get-ClaudeLaunchCommand",
    "$result | ConvertTo-Json -Compress"
  ].join("; ");
  const output = execFileSync(powershellExe, ["-NoProfile", "-Command", command], {
    cwd: path.resolve("."),
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
  return JSON.parse(output.trim());
}

test("Get-ClaudeLaunchCommand prefers claude on PATH", () => {
  const tempRoot = path.join(os.tmpdir(), `claude-launch-path-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const binDir = path.join(tempRoot, "bin");
  const appData = path.join(tempRoot, "appdata");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(path.join(appData, "npm"), { recursive: true });
  writeFileSync(path.join(binDir, "claude.cmd"), "@echo off\r\necho claude\r\n", "utf8");
  writeFileSync(path.join(appData, "npm", "claude.ps1"), "Write-Output 'fallback'\n", "utf8");

  try {
    const result = runResolver({
      APPDATA: appData,
      PATH: `${binDir};${process.env.PATH ?? ""}`
    });
    assert.equal(result.found, true);
    assert.match(result.command, /claude\.cmd$/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("Get-ClaudeLaunchCommand falls back to APPDATA npm shim", () => {
  const tempRoot = path.join(os.tmpdir(), `claude-launch-fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const appData = path.join(tempRoot, "appdata");
  mkdirSync(path.join(appData, "npm"), { recursive: true });
  const fallbackFile = path.join(appData, "npm", "claude.ps1");
  writeFileSync(fallbackFile, "Write-Output 'fallback'\n", "utf8");

  try {
    const result = runResolver({
      APPDATA: appData,
      PATH: ""
    });
    assert.equal(result.found, true);
    assert.equal(result.command, fallbackFile);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
