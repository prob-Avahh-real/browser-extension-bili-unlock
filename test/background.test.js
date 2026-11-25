import test from 'node:test';
import assert from 'node:assert/strict';
import { plain, readSource, runInSandbox } from './dom-stub.js';

const src = readSource('background.js');

function loadBackground({ stored = {} } = {}) {
  const listeners = {};
  const syncSet = [];
  const chrome = {
    runtime: {
      onInstalled: { addListener: (fn) => (listeners.installed = fn) },
      onMessage: { addListener: (fn) => (listeners.message = fn) },
    },
    storage: {
      sync: {
        set: (obj) => syncSet.push(obj),
        get: (_keys, cb) => cb({ ...stored }),
      },
    },
  };
  runInSandbox(src, { chrome, console });
  return { listeners, syncSet };
}

test('onInstalled defaults enabled to true', () => {
  const { listeners, syncSet } = loadBackground();
  listeners.installed();
  assert.deepEqual(plain(syncSet), [{ enabled: true }]);
});

test('state-request returns enabled true when unset', () => {
  const { listeners } = loadBackground({ stored: {} });
  const responses = [];
  const keepAlive = listeners.message({ type: 'state-request' }, {}, (r) => responses.push(r));
  assert.equal(keepAlive, true);
  assert.deepEqual(plain(responses), [{ enabled: true }]);
});

test('state-request returns enabled false when stored false', () => {
  const { listeners } = loadBackground({ stored: { enabled: false } });
  const responses = [];
  listeners.message({ type: 'state-request' }, {}, (r) => responses.push(r));
  assert.deepEqual(plain(responses), [{ enabled: false }]);
});

test('save-state persists enabled flag', () => {
  const { listeners, syncSet } = loadBackground();
  const responses = [];
  listeners.message({ type: 'save-state', enabled: false }, {}, (r) => responses.push(r));
  assert.deepEqual(plain(syncSet), [{ enabled: false }]);
  assert.deepEqual(plain(responses), [{ ok: true }]);
});

test('ignores unrelated messages', () => {
  const { listeners } = loadBackground();
  const responses = [];
  const result = listeners.message({ type: 'other' }, {}, (r) => responses.push(r));
  assert.equal(result, undefined);
  assert.deepEqual(responses, []);
});
