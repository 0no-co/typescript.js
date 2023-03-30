export const perfLogger = {};
export const tracing = null;

export function createTimer() {
  return {
    enter() {},
    exit() {},
  };
}

export const nullTimer = createTimer();
