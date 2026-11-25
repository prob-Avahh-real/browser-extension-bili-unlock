import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEl, plain, readSource, runInSandbox } from './dom-stub.js';

const src = readSource('content.js');

function makeVideo(overrides = {}) {
  return {
    readyState: 4,
    playbackRate: 1,
    defaultPlaybackRate: 1,
    currentTime: 100,
    duration: 200,
    isConnected: true,
    ...overrides,
  };
}

function loadContent({
  hostname = 'www.bilibili.com',
  videos = [makeVideo()],
  storage = {},
  enabledResponse = { enabled: true },
} = {}) {
  const head = makeEl('head');
  const body = makeEl('body');
  const documentElement = makeEl('html');
  const storeSet = [];

  const document = {
    readyState: 'complete',
    documentElement,
    head,
    body,
    getElementById: () => null,
    createElement: (tag) => makeEl(tag),
    querySelector: (sel) => (sel === 'video' ? videos[0] ?? null : null),
    querySelectorAll: (sel) => (sel === 'video' ? videos : []),
    addEventListener: () => {},
  };

  const chrome = {
    storage: {
      local: {
        set: (obj) => storeSet.push(obj),
        get: (_keys, cb) => cb({ ...storage }),
      },
      sync: {
        set: () => {},
        get: (_keys, cb) => cb({}),
      },
    },
    runtime: {
      onMessage: { addListener: () => {} },
      sendMessage: (_msg, cb) => cb(enabledResponse),
    },
  };

  const sandbox = {
    document,
    location: { hostname },
    chrome,
    MutationObserver: class {
      constructor(cb) {
        this.cb = cb;
      }
      observe() {}
      disconnect() {}
    },
    MouseEvent: class {},
    console,
  };

  runInSandbox(src, sandbox);

  const panel = () => body.children.find((c) => c.id === 'video-unlock-panel') || null;

  function clickButton(attrs) {
    const panelEl = panel();
    assert.ok(panelEl, 'panel should exist');
    const button = { isConnected: true, getAttribute: (name) => attrs[name] ?? null };
    panelEl.fire('click', { target: { closest: (sel) => (sel === 'button' ? button : null) } });
    return button;
  }

  return { body, head, videos, storeSet, panel, clickButton };
}

test('injects panel and styles on bilibili when a video is present', () => {
  const { panel, head } = loadContent();
  assert.ok(panel(), 'panel appended to body');
  assert.ok(head.children.some((c) => c.id === 'video-unlock-style'), 'style injected');
});

test('does not inject panel on non-bilibili hosts', () => {
  const { panel } = loadContent({ hostname: 'example.com' });
  assert.equal(panel(), null);
});

test('does not inject panel when extension is disabled', () => {
  const { panel } = loadContent({ enabledResponse: { enabled: false } });
  assert.equal(panel(), null);
});

test('speed button sets playbackRate and persists state', () => {
  const video = makeVideo();
  const { clickButton, storeSet } = loadContent({ videos: [video] });
  clickButton({ 'data-speed': '2' });
  assert.equal(video.playbackRate, 2);
  assert.equal(video.defaultPlaybackRate, 2);
  assert.deepEqual(plain(storeSet.at(-1)), { videoUnlockSpeed: 2, videoUnlockQuality: 'auto' });
});

test('rewind/forward buttons seek by 30s and clamp to bounds', () => {
  const video = makeVideo({ currentTime: 100, duration: 200 });
  const { clickButton } = loadContent({ videos: [video] });
  clickButton({ 'data-action': 'rewind' });
  assert.equal(video.currentTime, 70);
  clickButton({ 'data-action': 'forward' });
  assert.equal(video.currentTime, 100);
});

test('seek clamps at zero and duration', () => {
  const video = makeVideo({ currentTime: 10, duration: 40 });
  const { clickButton } = loadContent({ videos: [video] });
  clickButton({ 'data-action': 'rewind' });
  assert.equal(video.currentTime, 0);
  video.currentTime = 35;
  clickButton({ 'data-action': 'forward' });
  assert.equal(video.currentTime, 40);
});

test('restores persisted speed on init', () => {
  const video = makeVideo();
  loadContent({ videos: [video], storage: { videoUnlockSpeed: 1.5 } });
  assert.equal(video.playbackRate, 1.5);
  assert.equal(video.defaultPlaybackRate, 1.5);
});
