#!/usr/bin/env node
// Scrapes official EN backpack detail data from the Global API for every
// backpack in list.json (the R/SR/SSR base backpacks; SSSR are CN-only so far).
// Run with: node scrape-detail-en.js

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const LIST_PATH = path.join(__dirname, 'list.json');
const OUT_PATH   = path.join(__dirname, 'detail-en.json');
const BASE_URL  = 'https://usma-activity.tentree-games.com/common/infodata/mQuery.do';
const PARAMS    = 'appkey=1722917077707&target=backpack_data&type=detail&lang=en';
const DELAY_MS  = 400; // be polite between requests

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchBackpack(id) {
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
  const backpacks = list.data.data;

  console.log(`Found ${backpacks.length} backpacks. Starting fetch...\n`);

  const results = [];
  for (let i = 0; i < backpacks.length; i++) {
    const b = backpacks[i];
    process.stdout.write(`[${i + 1}/${backpacks.length}] ${b.ID} ${b.name} ... `);
    try {
      const detail = await fetchBackpack(b.ID);
      results.push({ ...b, detail });
      console.log('OK');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.push({ ...b, detail: null, error: err.message });
    }
    if (i < backpacks.length - 1) await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.detail).length;
  console.log(`\nDone. ${ok}/${backpacks.length} succeeded → ${OUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
