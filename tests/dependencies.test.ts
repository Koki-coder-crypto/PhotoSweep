import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
test('the patched decoder keeps the CommonJS query-string contract and handles malformed runs', () => {
  const query = require('query-string');
  assert.equal(query.parse('name=%E5%86%99%E7%9C%9F').name, '写真');
  const malformed = '%FF'.repeat(10000);
  assert.equal(query.parse(`value=${malformed}`).value, malformed);
  const queryRequire = createRequire(require.resolve('query-string'));
  assert.equal(queryRequire('decode-uri-component/package.json').version, '0.5.0');
});
test('the patched uuid retains the Xcode project identifier API', () => {
  const project = require('xcode').project('unused');
  project.hash = { project: { objects: {} } };
  const first = project.generateUuid(), second = project.generateUuid();
  assert.match(first, /^[A-F0-9]{24}$/); assert.notEqual(first, second);
});
