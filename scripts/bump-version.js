#!/usr/bin/env node
/**
 * Version bump script for MewVoice.
 *
 * Updates the four places that must stay in sync:
 *   - desktop/src-tauri/tauri.conf.json   (drives GitHub release tags & installer names)
 *   - desktop/src-tauri/Cargo.toml        (must match tauri.conf.json at Tauri build time)
 *   - desktop/package.json                (kept in sync for developer hygiene)
 *   - worker/src/lib/zip.ts               (embedded in every voice pack for compatibility checks)
 *
 * Usage:
 *   node scripts/bump-version.js <major.minor.patch>
 *
 * Example:
 *   node scripts/bump-version.js 0.3.0
 */

'use strict';

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const newVersion = process.argv[2];

if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Usage: node scripts/bump-version.js <major.minor.patch>');
  process.exit(1);
}

// ── Read current version from tauri.conf.json (single source of truth) ────────
const tauriConfPath = resolve(root, 'desktop/src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
const oldVersion = tauriConf.version;

// ── Monotonicity guard ─────────────────────────────────────────────────────────
function parseSemver(v) {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

const oldParts = parseSemver(oldVersion);
const newParts = parseSemver(newVersion);

if (!oldParts || !newParts) {
  console.error(`Cannot parse version: old="${oldVersion}" new="${newVersion}"`);
  process.exit(1);
}

const isGreater =
  newParts[0] > oldParts[0] ||
  (newParts[0] === oldParts[0] && newParts[1] > oldParts[1]) ||
  (newParts[0] === oldParts[0] && newParts[1] === oldParts[1] && newParts[2] > oldParts[2]);

if (!isGreater) {
  console.error(
    `Version must increase. Current is ${oldVersion}, refusing to set ${newVersion}.`,
  );
  process.exit(1);
}

// ── 1. desktop/src-tauri/tauri.conf.json ─────────────────────────────────────
tauriConf.version = newVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`tauri.conf.json:       ${oldVersion} → ${newVersion}`);

// ── 2. desktop/src-tauri/Cargo.toml ──────────────────────────────────────────
const cargoPath = resolve(root, 'desktop/src-tauri/Cargo.toml');
const cargo = readFileSync(cargoPath, 'utf8');
// Only replace the [package] version line, not dependency versions
const updatedCargo = cargo.replace(
  /^(version\s*=\s*)"[\d.]+"(\s*$)/m,
  `$1"${newVersion}"$2`,
);
if (updatedCargo === cargo) {
  console.error('Cargo.toml: could not find package version line — check the file manually.');
  process.exit(1);
}
writeFileSync(cargoPath, updatedCargo);
console.log(`Cargo.toml:            ${oldVersion} → ${newVersion}`);

// ── 3. desktop/package.json ───────────────────────────────────────────────────
const desktopPkgPath = resolve(root, 'desktop/package.json');
const desktopPkg = JSON.parse(readFileSync(desktopPkgPath, 'utf8'));
desktopPkg.version = newVersion;
writeFileSync(desktopPkgPath, JSON.stringify(desktopPkg, null, 2) + '\n');
console.log(`desktop/package.json:  ${oldVersion} → ${newVersion}`);

// ── 4. worker/src/lib/zip.ts (MEWVOICE_TOOL_VERSION) ─────────────────────────
const zipTsPath = resolve(root, 'worker/src/lib/zip.ts');
const zipTs = readFileSync(zipTsPath, 'utf8');
const updatedZipTs = zipTs.replace(
  /^(export const MEWVOICE_TOOL_VERSION\s*=\s*)'[\d.]+'(;)/m,
  `$1'${newVersion}'$2`,
);
if (updatedZipTs === zipTs) {
  console.error('zip.ts: could not find MEWVOICE_TOOL_VERSION — check the file manually.');
  process.exit(1);
}
writeFileSync(zipTsPath, updatedZipTs);
console.log(`zip.ts TOOL_VERSION:   ${oldVersion} → ${newVersion}`);

console.log(`\nDone. Stage and commit these files, then push to trigger a release build:\n`);
console.log(`  git add desktop/src-tauri/tauri.conf.json`);
console.log(`  git add desktop/src-tauri/Cargo.toml`);
console.log(`  git add desktop/package.json`);
console.log(`  git add worker/src/lib/zip.ts`);
console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
