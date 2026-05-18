// Create desktop shortcut (.lnk) with pet icon
// Works only on Windows. Safe to run on other platforms (no-op).

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultPetDescriptor } from "../pet-app/pet-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const launcherDir = path.join(projectRoot, "launcher");
const batPath = path.join(launcherDir, "启动桌宠.bat");
const iconPath = path.join(launcherDir, "Claude 桌宠.ico");
const defaultPet = getDefaultPetDescriptor();

if (process.platform !== "win32") {
  console.log("Skipping desktop shortcut setup (not Windows).");
  process.exit(0);
}

// Step 1: Ensure launcher .bat exists
if (!existsSync(batPath)) {
  const batContent = '@echo off\r\ncd /d "%~dp0..\\"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "launcher\\launch-claude-pet.ps1"\r\n';
  mkdirSync(launcherDir, { recursive: true });
  writeFileSync(batPath, batContent);
  console.log("Created launcher batch file.");
}

// Step 2: Generate icon if missing
if (!existsSync(iconPath)) {
  try {
    execSync(`py -c "
import os, json
from PIL import Image
ico = r'${iconPath}'
cfg_path = r'${defaultPet.petConfigFile}'
with open(cfg_path, 'r', encoding='utf-8') as f:
    cfg = json.load(f)
cw, ch = cfg['cell']['width'], cfg['cell']['height']
row = cfg['animations']['idle']['row']
img = Image.open(r'${defaultPet.spriteFile}')
frame = img.crop((0, row * ch, cw, (row + 1) * ch))
ico_img = frame.resize((48, 48), Image.LANCZOS).convert('RGBA')
ico_img.save(ico, format='ICO')
img.close()
print('Icon created')
"`, { stdio: "inherit" });
  } catch {
    console.log("Icon generation skipped (Pillow not available).");
  }
}

const tmpLnk = path.join(process.env.TEMP || process.env.TMP || ".", "_claude_pet_setup.lnk");
const psCode = [
  `$ico = '${iconPath.replace(/\\/g, "\\\\")}'`,
  `$bat = '${batPath.replace(/\\/g, "\\\\")}'`,
  `$tmp = '${tmpLnk.replace(/\\/g, "\\\\")}'`,
  `$final = [Environment]::GetFolderPath('Desktop') + '\\\\Claude 桌宠启动器.lnk'`,
  `if (Test-Path $tmp) { Remove-Item $tmp -Force }`,
  `if (Test-Path $final) { Remove-Item $final -Force }`,
  `$w = New-Object -ComObject WScript.Shell`,
  `$s = $w.CreateShortcut($tmp)`,
  `$s.TargetPath = $bat`,
  `$s.WorkingDirectory = '${projectRoot.replace(/\\/g, "\\\\")}'`,
  `$s.WindowStyle = 7`,
  `$s.IconLocation = "$ico,0"`,
  `$s.Save()`,
  `Move-Item $tmp $final -Force`,
  `Write-Output 'OK'`
].join("; ");

// Write PS1 with UTF-8 BOM to temp file, execute
const tmpPs1 = path.join(process.env.TEMP || ".", "_setup_lnk.ps1");
writeFileSync(tmpPs1, "﻿" + psCode, "utf8");
try {
  execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpPs1}"`, { stdio: "inherit" });
  console.log("Desktop shortcut created.");
} catch (e) {
  console.error("Shortcut creation failed:", e.message);
}
