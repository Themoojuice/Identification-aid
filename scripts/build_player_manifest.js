#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://apps.lucidcentral.org/salticidae/';
const observed = [
  'key/salticidae.json',
  'player/4AE4362F5AC4B0E8494B10D1BF2ED441.cache.js',
  'player/ext/js/base64.min.js', 'player/ext/js/jquery-3.4.1.min.js',
  'player/ext/js/jquery.fancybox.min.js', 'player/ext/js/lz-string.min.js',
  'player/ext/js/snackbar.min.js', 'player/player.nocache.js',
  'player/ext/css/jquery.fancybox.min.css', 'player/ext/css/snackbar.min.css',
  'player/player.css', 'player/gwt/clean/clean.css', 'player/css/animation.min.css',
  'player/css/material-icons.min.css', 'player/css/materialize.min.css',
  'player/images/restartIcon.png', 'player/images/collapseTreeIcon.png',
  'player/images/expandTreeIcon.png', 'player/images/findIcon.png',
  'player/images/featureThumbnailsIcon.png', 'player/images/entityThumbnailsIcon.png',
  'player/images/subsetsIcon.png', 'player/images/bestIcon.png',
  'player/images/pruneIcon.png', 'player/images/differencesIcon.png',
  'player/images/shortcutsIcon.png', 'player/images/whyDiscardedIcon.png',
  'player/images/preferencesIcon.png', 'player/images/helpIcon.png',
  'player/images/aboutIcon.png', 'player/images/entitiesIcon.png',
  'player/images/expandBlack_24.png', 'player/images/textIconBlack_24.png',
  'player/images/featuresIcon.png', 'player/clear.cache.gif',
  'key/salticidae/Media/Thumbs/entities/salticidae/figure_1_morphology.jpg',
];
const bootstrapOnly = [
  'player/4B18E93891BAF0C2E923F399217EF0AF.cache.js',
  'player/77D824785DBB0C278F9007571085BA96.cache.js',
];
const local = {
  'key/salticidae.json': 'source/lucid-original/salticidae.json',
  'player/4AE4362F5AC4B0E8494B10D1BF2ED441.cache.js': 'source/lucid-original/metadata/4AE4362F5AC4B0E8494B10D1BF2ED441.cache.js',
  'player/4B18E93891BAF0C2E923F399217EF0AF.cache.js': 'source/lucid-original/metadata/4B18E93891BAF0C2E923F399217EF0AF.cache.js',
  'player/77D824785DBB0C278F9007571085BA96.cache.js': 'source/lucid-original/metadata/77D824785DBB0C278F9007571085BA96.cache.js',
  'player/ext/js/lz-string.min.js': 'source/lucid-original/metadata/lz-string.min.js',
  'player/player.nocache.js': 'source/lucid-original/metadata/player.nocache.js',
  'player/player.css': 'source/lucid-original/metadata/player.css',
  'key/salticidae/Media/Thumbs/entities/salticidae/figure_1_morphology.jpg': 'source/lucid-original/Media/Thumbs/entities/salticidae/figure_1_morphology.jpg',
};

const records = [...new Set([...observed, ...bootstrapOnly])].map(relative => {
  const localPath = local[relative] || null;
  const full = localPath ? path.join(ROOT, localPath) : null;
  const archived = full && fs.existsSync(full);
  return {
    url: new URL(relative, BASE).href,
    local_path: localPath,
    classification: relative === 'key/salticidae.json' ? 'CORE LOGIC' : 'PLAYER-ONLY / NOT NEEDED',
    discovery: observed.includes(relative) ? 'observed in live player DOM after load' : 'browser permutation discovered in player.nocache.js',
    status: archived ? 'downloaded' : 'observed_live_not_archived',
    bytes: archived ? fs.statSync(full).size : null,
    sha256: archived ? crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') : null,
    notes: archived ? 'Archived for decoder/player forensics.' : 'Generic player presentation/runtime asset; not required for normalized key data.',
  };
});

fs.writeFileSync(path.join(ROOT, 'data', 'manifests', 'player_assets.json'), JSON.stringify({
  format: 'taxonomytool.player-asset-manifest.v1',
  observed_at: new Date().toISOString(),
  live_page: BASE + 'key.html',
  records,
}, null, 2) + '\n');
console.log(`Recorded ${records.length} player resources (${records.filter(x => x.status === 'downloaded').length} archived).`);
