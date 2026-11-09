import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function loadNicheModule() {
  const source = await readFile(resolve(root, 'src/lib/niche.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  const diagnostics = compiled.diagnostics?.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(diagnostics.length, 0, 'niche.ts must transpile without TypeScript errors');
  const sourceUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
  return import(sourceUrl);
}

const niche = await loadNicheModule();
const routeAliases = {
  coins: 'coins',
  mx: 'motocross',
  bikes: 'bicycles',
  bicycle: 'bicycles',
  threads: 'clothing',
  cards: 'trading_cards',
  antique_flipper: 'antiques',
  fossil_flipper: 'fossils',
  beauty_flipper: 'beauty',
  tech_flipper: 'tech',
  surplus: 'surplus_flip',
  tunes_flip: 'tunes_flip',
  'tunes-flip': 'tunes_flip',
  tunes: 'tunes_flip',
  music: 'tunes_flip',
  vinyl_records: 'tunes_flip',
  collectibles: 'collectibles',
  collectibles_flipper: 'collectibles',
  'collectibles-flipper': 'collectibles',
};

for (const [alias, expectedNiche] of Object.entries(routeAliases)) {
  assert.equal(niche.normaliseNicheId(alias), expectedNiche, `${alias} must resolve to ${expectedNiche}`);
  const defaultSpecialist = niche.getDefaultSpecialistForNiche(expectedNiche);
  assert.ok(
    niche.getSpecialistIdsForNiche(expectedNiche).includes(defaultSpecialist),
    `${expectedNiche} capture/import specialist must be visible to its inventory filter`,
  );
}

const canonicalNiches = [
  'coins', 'motocross', 'bicycles', 'clothing', 'trading_cards', 'antiques',
  'fossils', 'beauty', 'tech', 'surplus_flip', 'tunes_flip', 'collectibles',
];
assert.deepEqual(
  Object.keys(niche.NICHE_SPECIALISTS).sort(),
  [...canonicalNiches].sort(),
  'the web niche registry must expose every native production product',
);
assert.deepEqual(niche.getSpecialistIdsForNiche('tunes_flip'), ['vinyl_records']);
assert.equal(niche.getDefaultSpecialistForNiche('tunes_flip'), 'vinyl_records');
assert.deepEqual(niche.getSpecialistIdsForNiche('collectibles'), ['collectibles']);
assert.equal(niche.getDefaultSpecialistForNiche('collectibles'), 'collectibles');

const [capture, importer, inventory, workspace, scanFlow, entry, ebayHub] = await Promise.all([
  readFile(resolve(root, 'src/pages/NicheCapture.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/EbayImport.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/Inventory.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/NicheWorkspace.tsx'), 'utf8'),
  readFile(resolve(root, 'src/lib/sharedScanFlow.ts'), 'utf8'),
  readFile(resolve(root, 'src/pages/NicheEntry.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/EbayHub.tsx'), 'utf8'),
]);

assert.match(capture, /specialist_id:\s*canonicalSpecialistId/);
assert.match(capture, /getDefaultSpecialistForNiche\(canonicalNiche\)/);
assert.match(importer, /const specialistId = getDefaultSpecialistForNiche\(activeNiche\)/);
assert.doesNotMatch(importer, /const NICHE_SPECIALIST/);
assert.match(inventory, /getSpecialistIdsForNiche\(niche\)/);
assert.match(capture, /tunes_flip/);
assert.match(capture, /collectibles/);
assert.match(scanFlow, /tunes_flip/);
assert.match(scanFlow, /collectibles/);
assert.match(workspace, /id: 'tunes_flip'/);
assert.match(workspace, /id: 'collectibles'/);
assert.match(workspace, /items!inner\(specialist_id\)/);
assert.match(entry, /name: 'Tunes Flip'/);
assert.match(entry, /name: 'Collectibles Flipper'/);
assert.match(ebayHub, /useCurrentTenantId/);
assert.doesNotMatch(ebayHub, /from\('tenant_memberships'\)/);

console.log('All twelve niche route, capture, workspace, inventory, import, and eBay mappings are aligned.');

