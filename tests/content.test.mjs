import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublished, postURL, taxonomyURL, matchesSearch } from '../src/lib/content-utils.mjs';

const now = new Date('2026-11-22T00:00:00Z');
test('drafts and scheduled posts stay out of all public listings', () => {
  assert.equal(isPublished({ date: '2026-11-21', draft: true }, now), false);
  assert.equal(isPublished({ date: '2026-11-23' }, now), false);
  assert.equal(isPublished({ date: now }, now), true);
  assert.equal(isPublished({ date: 'invalid' }, now), false);
});
test('article and topic URLs encode text without changing nested post paths', () => {
  assert.equal(postURL('guides/my cards'), '/posts/guides/my%20cards/');
  assert.equal(taxonomyURL('tags', 'C++ & 卡片'), '/tags/C%2B%2B%20%26%20%E5%8D%A1%E7%89%87/');
});
test('search handles case, Chinese, full-width input, and multiple terms', () => {
  assert.equal(matchesSearch('Credit Calendar 信用卡 reminders', 'ＣＲＥＤＩＴ 信用卡'), true);
  assert.equal(matchesSearch('Credit Calendar', 'calendar credit'), true);
  assert.equal(matchesSearch('Credit Calendar', 'calendar missing'), false);
  assert.equal(matchesSearch('Credit Calendar', '   '), true);
  assert.equal(matchesSearch('<script> example', '<script>'), true);
});
