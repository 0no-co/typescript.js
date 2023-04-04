export function createTimerIf(_condition, _measureName, _startMarkName, _endMarkName) {
  return nullTimer;
}

export const nullTimer = {
  enter() {/*noop*/},
  exit() {/*noop*/},
};

export function createTimer(_measureName, _startMarkName, _endMarkName) {
  return nullTimer;
}

