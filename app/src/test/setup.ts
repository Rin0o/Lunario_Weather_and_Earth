import '@testing-library/jest-dom/vitest';
// An in-memory IndexedDB with all its classes (IDBRequest, IDBKeyRange…), as in a browser.
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has <dialog> but not its modal methods: enough of them for components/Modal.tsx.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

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
