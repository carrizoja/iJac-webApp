import '@testing-library/jest-dom';

// Minimal browser API stubs for React and Firebase under happy-dom.
(globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame =
  (fn: FrameRequestCallback) => setTimeout(fn, 0);
