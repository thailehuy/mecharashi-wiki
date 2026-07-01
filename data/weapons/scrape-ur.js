#!/usr/bin/env node
// Scrapes UR weapon detail data from the CN API.
// Run with: node scrape-ur.js

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const LIST_PATH = path.join(__dirname, 'list-cn.json');
const OUT_PATH  = path.join(__dirname, 'sssr-raw.json');
const BASE_URL  = 'https://ma-activity.zlongame.com/common/infodata/mQuery.do';
const PARAMS    = 'appkey=1616148215678&target=weapon_data&type=detail';
const DELAY_MS  = 400; // be polite between requests

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchWeapon(name) {
  const url = `${BASE_URL}?${PARAMS}&query=${encodeURIComponent(name)}`;
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
  const urWeapons = list.data.data.filter(w => w.quality === 'SSSR');

  console.log(`Found ${urWeapons.length} SSSR weapons. Starting fetch...\n`);

  const results = [];
  for (let i = 0; i < urWeapons.length; i++) {
    const w = urWeapons[i];
    process.stdout.write(`[${i + 1}/${urWeapons.length}] ${w.name} ... `);
    try {
      const detail = await fetchWeapon(w.name);
      results.push({ ...w, detail });
      console.log('OK');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ ...w, detail: null, error: err.message });
    }
    if (i < urWeapons.length - 1) await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.detail).length;
  console.log(`\nDone. ${ok}/${urWeapons.length} succeeded → ${OUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
