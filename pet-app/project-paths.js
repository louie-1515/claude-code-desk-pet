export function resolveActiveProjectPath(state, fallbackProjectRoot) {
  if (state?.cwd) {
    return state.cwd;
  }
  if (state?.projectDir) {
    return state.projectDir;
  }
  return fallbackProjectRoot;
}
