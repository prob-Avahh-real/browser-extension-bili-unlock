import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const proj = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Objects created inside the vm sandbox have a foreign prototype,
// which breaks assert.deepEqual — round-trip through JSON to normalize.
export const plain = (value) => JSON.parse(JSON.stringify(value));

export function readSource(name) {
  return fs.readFileSync(path.join(proj, name), 'utf8');
}

export function makeEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    children: [],
    isConnected: true,
    _listeners: {},
    _html: '',
    textContent: '',
    style: {},
    dataset: {},
    appendChild(child) {
      this.children.push(child);
      child.isConnected = true;
      return child;
    },
    remove() {
      this.isConnected = false;
    },
    addEventListener(type, fn) {
      (this._listeners[type] ??= []).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of this._listeners[type] || []) fn(event);
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getAttribute() {
      return null;
    },
    closest() {
      return null;
    },
    click() {},
    dispatchEvent() {
      return true;
    },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() {
      return this._html;
    },
    set(v) {
      this._html = v;
    },
  });
  return el;
}

export function runInSandbox(source, sandbox) {
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox;
}
