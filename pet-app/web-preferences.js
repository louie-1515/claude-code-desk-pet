export function createPetWebPreferences({
  preload,
  stateFile,
  petConfigFile,
  spriteFile,
  projectRoot
}) {
  return {
    preload,
    // Explicitly lock down the renderer security posture.
    // This app uses a preload bridge (`window.petApi`) and does not need Node.js in the renderer.
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    // This is a user-facing always-on-top window; devtools should never be exposed in normal usage.
    devTools: false,
    additionalArguments: [
      `--state-file=${stateFile}`,
      `--pet-config-file=${petConfigFile}`,
      `--sprite-file=${spriteFile}`,
      `--project-root=${projectRoot}`
    ]
  };
}
