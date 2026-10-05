// The site has one URL form: the .html one (the homepage is /). Every page
// must declare it as its only canonical, sitemap.xml must list it, and
// _redirects must 301 its extensionless path to it. Mixed forms got pages
// indexed under the wrong URL. Run from the repo root: node --test
// scripts/sync_substack.py generates the sitemap and rules; this catches a
// page added or edited without rerunning it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://scholarstreet.org';
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(path.join(ROOT, 'news')).filter((f) => f.endsWith('.html')).map((f) => `news/${f}`),
];
const urlOf = (page) => `${SITE}/${page === 'index.html' ? '' : page}`;

const sitemap = new Set([...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
const rules = new Map(read('_redirects').split('\n')
  .map((line) => line.trim().split(/\s+/))
  .filter((parts) => parts.length >= 3 && !parts[0].startsWith('#'))
  .map(([from, to, status]) => [from, { to, status }]));

for (const page of pages) {
  test(`${page}: one canonical, its own .html URL`, () => {
    const found = [...read(page).matchAll(/<link rel="canonical" href="([^"]*)">/g)].map((m) => m[1]);
    assert.deepStrictEqual(found, [urlOf(page)]);
  });

  test(`${page}: listed in sitemap.xml`, () => {
    assert.ok(sitemap.has(urlOf(page)), `${urlOf(page)} missing from sitemap.xml`);
  });

  test(`${page}: other forms 301 to it`, () => {
    const from = page === 'index.html' ? '/index.html' : `/${page.slice(0, -'.html'.length)}`;
    const to = page === 'index.html' ? '/' : `/${page}`;
    assert.deepStrictEqual(rules.get(from), { to, status: '301!' });
  });
}

test('sitemap.xml lists only pages that exist', () => {
  const urls = new Set(pages.map(urlOf));
  assert.deepStrictEqual([...sitemap].filter((u) => !urls.has(u)), []);
});
