import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // No real network in tests: anything that needs data must inject a fake fetch.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Network is disabled in tests'))),
  );
});

afterEach(() => {
  cleanup();
  // Script tests run in the Node environment, which has no localStorage.
  globalThis.localStorage?.clear();
  vi.unstubAllGlobals();
});
