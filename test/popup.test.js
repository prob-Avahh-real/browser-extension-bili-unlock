import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEl, readSource, runInSandbox } from './dom-stub.js';

const src = readSource('popup.js');

const flush = () => new Promise((resolve) => setImmediate(resolve));

function loadPopup({ enabled = true } = {}) {
  const toggle = makeEl('input');
  toggle.id = 'enable-toggle';
  toggle.checked = false;
  const refreshBtn = makeEl('button');
  refreshBtn.id = 'refresh-btn';

  const document = {
    getElementById: (id) =>
      id === 'enable-toggle' ? toggle : id === 'refresh-btn' ? refreshBtn : null,
  };

  const calls = { sendMessage: [], tabsSendMessage: [], reloads: [] };
  const chrome = {
    runtime: {
      sendMessage: (msg) => {
        calls.sendMessage.push(msg);
        return Promise.resolve(msg.type === 'state-request' ? { enabled } : { ok: true });
      },
    },
    tabs: {
      query: async () => [{ id: 7 }],
      sendMessage: async (tabId, msg) => {
        calls.tabsSendMessage.push({ tabId, ...msg });
        return {};
      },
      reload: (id) => calls.reloads.push(id),
    },
  };

  runInSandbox(src, { document, chrome, console });
  return { toggle, refreshBtn, calls };
}

test('popup reflects enabled state from background', async () => {
  const { toggle } = loadPopup({ enabled: true });
  await flush();
  assert.equal(toggle.checked, true);
});

test('popup reflects disabled state from background', async () => {
  const { toggle } = loadPopup({ enabled: false });
  await flush();
  assert.equal(toggle.checked, false);
});

test('toggle change saves state and notifies active tab', async () => {
  const { toggle, calls } = loadPopup({ enabled: true });
  await flush();
  toggle.checked = false;
  await toggle.fire('change');
  await flush();
  assert.ok(calls.sendMessage.some((m) => m.type === 'save-state' && m.enabled === false));
  assert.ok(calls.tabsSendMessage.some((m) => m.type === 'toggle-enabled' && m.enabled === false));
});

test('refresh button reloads the active tab', async () => {
  const { refreshBtn, calls } = loadPopup();
  await flush();
  await refreshBtn.fire('click');
  await flush();
  assert.deepEqual(calls.reloads, [7]);
});
