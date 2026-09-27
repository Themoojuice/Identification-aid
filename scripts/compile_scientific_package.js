const fs = require('fs');
const path = require('path');
const { buildScientificPackage, canonical, sha256 } = require('./lib/scientific-importer');

const root = path.resolve(__dirname, '..');
const compiledDirectory = path.join(root, 'data', 'compiled');
const publicDirectory = path.join(root, 'public', 'data');

const scientificPackage = buildScientificPackage(root);
const serialized = `${canonical(scientificPackage)}\n`;

fs.mkdirSync(compiledDirectory, { recursive: true });
fs.mkdirSync(publicDirectory, { recursive: true });
fs.writeFileSync(path.join(compiledDirectory, 'scientific-package.json'), serialized);
fs.writeFileSync(path.join(publicDirectory, 'scientific-package.json'), serialized);

const aliases = `${canonical({
  format: 'australian-salticidae-id-aliases@1',
  packageVersion: scientificPackage.packageVersion,
  aliases: scientificPackage.identities.aliases,
})}\n`;
fs.writeFileSync(path.join(compiledDirectory, 'id-aliases.json'), aliases);

const losslessness = `${canonical({
  format: 'australian-salticidae-losslessness-inventory@1',
  packageVersion: scientificPackage.packageVersion,
  ...scientificPackage.losslessness,
})}\n`;
fs.writeFileSync(path.join(compiledDirectory, 'losslessness-inventory.json'), losslessness);

console.log(
  `Scientific package prepared: ${scientificPackage.validation.lucid.taxa} Lucid entities, ` +
  `${scientificPackage.validation.lucid.states} states, ${scientificPackage.model.taxonConcepts.length} concepts, ` +
  `${scientificPackage.validation.reviewIssues} open issues; SHA-256 ${sha256(serialized)}.`,
);
