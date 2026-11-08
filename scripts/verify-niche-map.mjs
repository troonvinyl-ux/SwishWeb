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
  threads: 'clothing',
  cards: 'trading_cards',
  antique_flipper: 'antiques',
  fossil_flipper: 'fossils',
  beauty_flipper: 'beauty',
  tech_flipper: 'tech',
  surplus: 'surplus_flip',
};

for (const [alias, expectedNiche] of Object.entries(routeAliases)) {
  assert.equal(niche.normaliseNicheId(alias), expectedNiche, `${alias} must resolve to ${expectedNiche}`);
  const defaultSpecialist = niche.getDefaultSpecialistForNiche(expectedNiche);
  assert.ok(
    niche.getSpecialistIdsForNiche(expectedNiche).includes(defaultSpecialist),
    `${expectedNiche} capture/import specialist must be visible to its inventory filter`,
  );
}

const [capture, importer, inventory] = await Promise.all([
  readFile(resolve(root, 'src/pages/NicheCapture.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/EbayImport.tsx'), 'utf8'),
  readFile(resolve(root, 'src/pages/Inventory.tsx'), 'utf8'),
]);

assert.match(capture, /specialist_id:\s*canonicalSpecialistId/);
assert.match(capture, /getDefaultSpecialistForNiche\(canonicalNiche\)/);
assert.match(importer, /const specialistId = getDefaultSpecialistForNiche\(activeNiche\)/);
assert.doesNotMatch(importer, /const NICHE_SPECIALIST/);
assert.match(inventory, /getSpecialistIdsForNiche\(niche\)/);

console.log('Niche route, capture, import, and inventory mappings are aligned.');
