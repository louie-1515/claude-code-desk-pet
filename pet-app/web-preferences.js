export function createPetWebPreferences({
  preload,
  stateFile,
  petConfigFile,
  spriteFile,
  projectRoot
}) {
  return {
    preload,
    sandbox: false,
    additionalArguments: [
      `--state-file=${stateFile}`,
      `--pet-config-file=${petConfigFile}`,
      `--sprite-file=${spriteFile}`,
      `--project-root=${projectRoot}`
    ]
  };
}
