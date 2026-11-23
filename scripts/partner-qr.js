#!/usr/bin/env node
/*
 * Branded QR code for a partner school's permanent giving link.
 *
 *   node scripts/partner-qr.js --slug rocky-mountain-christian-academy \
 *     --name "Rocky Mountain Christian Academy" --logo path/to/logo.png \
 *     --out path/to/folder [--demo]
 *
 * Encodes https://scholarstreet.org/give/<slug> (override with --url). That
 * URL is a redirect in _redirects, so the destination can change later
 * without reprinting the code.
 *
 * Writes to --out:
 *   <slug>-qr.svg       QR with the logo centred (vector, for print shops)
 *   <slug>-qr.png       the same, 2400px square
 *   <slug>-poster.png   heading + QR + "Scan to Give" line, 2400x3000 (8x10in @300dpi)
 *   <slug>-poster.html  the poster source
 *
 * No new dependencies: the QR matrix comes from this site's own qrcode.js,
 * and PNGs are rendered by headless Microsoft Edge (or Chrome; set BROWSER to
 * the executable path to choose). Error correction is level H (~30% of the
 * code can be lost); the logo covers about 6% of it.
 *
 * School logos and outputs stay OUT of this repo (it is public, and a logo
 * here would read as approved use). Keep them in a local folder.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const qrcode = require('../qrcode.js');

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}

const opt = args(process.argv.slice(2));
if (!opt.slug || !opt.name || !opt.logo || !opt.out) {
  console.error('Usage: node scripts/partner-qr.js --slug <slug> --name "<School name>" --logo <png|jpg|svg> --out <folder> [--demo] [--url <url>] [--heading "..."] [--subheading "..."]');
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(opt.slug)) { console.error('slug must be lowercase-with-hyphens'); process.exit(1); }

const URL_ = opt.url || `https://scholarstreet.org/give/${opt.slug}`;
const HEADING = opt.heading || `Support ${opt.name} Students`;
const SUB = opt.subheading || 'Scan to Give Through Scholar Street';
const DEMO = !!opt.demo;
const OUT = path.resolve(opt.out);
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const logoMime = MIME[path.extname(opt.logo).toLowerCase()];
if (!logoMime) { console.error('logo must be png, jpg, svg or webp'); process.exit(1); }
const logoData = `data:${logoMime};base64,${fs.readFileSync(opt.logo).toString('base64')}`;

// ---- QR matrix ------------------------------------------------------------
const qr = qrcode(0, 'H');
qr.addData(URL_);
qr.make();
const n = qr.getModuleCount();
const QUIET = 4;
const size = n + QUIET * 2;

// Clear an odd-sized centre square (~23% of the width) for the logo. Level H
// recovers far more than this; the decode test in the README checks it.
let hole = Math.round(n * 0.23);
if (hole % 2 !== n % 2) hole++;
const h0 = (n - hole) / 2;
const inHole = (r, c) => r >= h0 && r < h0 + hole && c >= h0 && c < h0 + hole;

let d = '';
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c) && !inHole(r, c)) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
  }
}
const pad = 0.6; // white margin inside the hole, in modules
const lx = QUIET + h0 + pad, lw = hole - pad * 2;
const qrSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
  `<title>${esc(URL_)}</title>` +
  `<rect width="${size}" height="${size}" fill="#fff"/>` +
  `<path d="${d}" fill="#000"/>` +
  `<image href="${logoData}" x="${lx}" y="${lx}" width="${lw}" height="${lw}" preserveAspectRatio="xMidYMid meet"/>` +
  `</svg>`;
fs.writeFileSync(path.join(OUT, `${opt.slug}-qr.svg`), qrSvg);

// ---- Poster ---------------------------------------------------------------
const displayUrl = URL_.replace(/^https?:\/\//, '');
const poster = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(HEADING)}</title>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;800&display=block" rel="stylesheet">
<style>
  html,body{margin:0;background:#fff}
  .page{width:1200px;height:1500px;box-sizing:border-box;padding:110px 120px 90px;position:relative;
    font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;color:#1B2E4B;text-align:center;
    display:flex;flex-direction:column;align-items:center}
  .demo{position:absolute;top:40px;right:44px;border:2px solid #b42318;color:#b42318;border-radius:999px;
    font-size:20px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:6px 18px}
  h1{font-size:68px;line-height:1.08;font-weight:800;margin:0;max-width:960px;letter-spacing:-.01em}
  .rule{width:120px;height:5px;background:#C8A84B;border-radius:3px;margin:38px 0 44px}
  .qr{width:820px;height:820px}
  .qr svg{width:100%;height:100%;display:block}
  .sub{font-size:46px;font-weight:600;margin:40px 0 0}
  .url{font-size:24px;color:#5b6678;margin-top:auto;letter-spacing:.01em}
</style></head><body><div class="page">
${DEMO ? '<div class="demo">Demo only</div>' : ''}
<h1>${esc(HEADING)}</h1>
<div class="rule"></div>
<div class="qr">${qrSvg}</div>
<p class="sub">${esc(SUB)}</p>
<div class="url">${esc(displayUrl)}</div>
</div></body></html>`;
const posterHtml = path.join(OUT, `${opt.slug}-poster.html`);
fs.writeFileSync(posterHtml, poster);

// ---- PNGs via headless Edge/Chrome ----------------------------------------
function findBrowser() {
  const c = [process.env.BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}
function shoot(htmlFile, png, w, h, scale) {
  const b = findBrowser();
  if (!b) { console.warn('No Edge/Chrome found; skipped', path.basename(png)); return; }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'partner-qr-'));
  execFileSync(b, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    `--user-data-dir=${prof}`, `--window-size=${w},${h}`, `--force-device-scale-factor=${scale}`,
    '--virtual-time-budget=8000', `--screenshot=${png}`, 'file:///' + htmlFile.replace(/\\/g, '/')],
    { stdio: 'ignore', timeout: 60000 });
  fs.rmSync(prof, { recursive: true, force: true });
  console.log('wrote', png);
}
const qrHtml = path.join(os.tmpdir(), `partner-qr-${process.pid}.html`);
fs.writeFileSync(qrHtml, `<!doctype html><html><body style="margin:0;background:#fff"><div style="width:800px;height:800px">${qrSvg.replace('<svg ', '<svg width="800" height="800" ')}</div></body></html>`);
shoot(qrHtml, path.join(OUT, `${opt.slug}-qr.png`), 800, 800, 3);
fs.rmSync(qrHtml, { force: true });
shoot(posterHtml, path.join(OUT, `${opt.slug}-poster.png`), 1200, 1500, 2);

console.log(`QR encodes: ${URL_}  (version ${(n - 17) / 4}, level H, ${n}x${n} modules, logo hole ${hole}x${hole})`);
