#!/usr/bin/env node
// Scrapes module (SSR only) level-detail data from the CN API, keyed by catalog ID.
// Run with: node scrape-modules.js

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const LIST_PATH = path.join(__dirname, 'list-cn.json');
const OUT_PATH  = path.join(__dirname, 'modules-raw.json');
const BASE_URL  = 'https://ma-activity.zlongame.com/common/infodata/mQuery.do';
const PARAMS    = 'appkey=1616148215678&target=module_props&type=detail';
const DELAY_MS  = 400; // be polite between requests

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchModule(id) {
  const url = `${BASE_URL}?${PARAMS}&query=${encodeURIComponent(id)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON: ' + body.slice(0, 80))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
  // Note: the ID in list-cn.json does NOT match the local module ID referenced
  // on mechs (mechs use a family code + level, e.g. "40044"). Modules must be
  // matched to mech data by name; the local ID is only meaningful per-mech.
  const ssrModules = list.data.data.filter(m => m.quality === 'SSR');

  console.log(`Found ${ssrModules.length} SSR modules. Starting fetch...\n`);

  const results = [];
  for (let i = 0; i < ssrModules.length; i++) {
    const m = ssrModules[i];
    process.stdout.write(`[${i + 1}/${ssrModules.length}] ${m.name} (${m.ID}) ... `);
    try {
      const detail = await fetchModule(m.ID);
      results.push({ ...m, detail });
      console.log('OK');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ ...m, detail: null, error: err.message });
    }
    if (i < ssrModules.length - 1) await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.detail).length;
  console.log(`\nDone. ${ok}/${ssrModules.length} succeeded → ${OUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
