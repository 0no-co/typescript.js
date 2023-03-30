export function explainIfFileIsRedirectAndImpliedFormat() {
  return;
}

export function fileIncludeReasonToDiagnostics() {
  return; // TODO: Returns DiagnosticMessageChain
}

export function getMatchedFileSpec() {
  return;
}

export function getMatchedIncludeSpec() {
  return true;
}

export const noopFileWatcher = { close() {/*noop*/} };
export const returnNoopFileWatcher = () => noopFileWatcher;

export function isEmittedFileOfProgram(program, file) {
  return !!program && program.isEmittedFile(file);
}
