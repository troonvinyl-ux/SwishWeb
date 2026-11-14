import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
const read = path => readFile(path, 'utf8');
const [routes, onboarding, login, queries, editor, hub, account, auth, backend] = await Promise.all([
  'src/App.tsx', 'src/pages/Onboarding.tsx', 'src/pages/LoginPage.tsx', 'src/hooks/useSupabaseQuery.ts', 'src/pages/ListingEditor.tsx', 'src/pages/EbayHub.tsx', 'src/pages/EbayAccount.tsx', 'src/contexts/AuthContext.tsx', 'src/lib/supabase.ts',
].map(read));
assert.match(routes, /path="\/ebay\/account" element=\{<EbayAccount/);
assert.match(routes, /path="\/niches" element=\{<NicheEntry/);
assert.match(routes, /path="\*" element=\{<NotFound/);
assert.doesNotMatch(onboarding, /ebay-auth-url|from\('ebay_accounts'\)/);
assert.match(onboarding, /marketplace_connectors/);
assert.match(onboarding, /eq\('tenant_id', tenantId\)/);
assert.match(onboarding, /navigate\('\/ebay'\)/);
assert.doesNotMatch(login, /replace\(\/\\\\D/);
assert.match(login, /getProductForEntry/);
assert.doesNotMatch(login, /standalone|Subscriber accounts do not switch/);
assert.doesNotMatch(queries, /postgres_changes|\.channel\(/);
assert.match(queries, /refetchIntervalInBackground: false/);
assert.match(auth, /qc\.clear\(\)/);
assert.doesNotMatch(editor, /from\('tenant_memberships'\)/);
assert.match(editor, /PublishConfirmation/);
assert.match(editor, /verification\?\.passed/);
assert.match(hub, /useEbayHubActions/);
const actions = await read('src/hooks/useEbayHubActions.ts');
const recovery = await read('src/hooks/useEbayOAuthRecovery.ts');
assert.match(actions, /beginEbayOAuth/);
assert.match(recovery, /isEbayOAuthPending/);
assert.match(actions, /start_subscriber_authorization/);
assert.doesNotMatch(actions, /window\.location/);
assert.doesNotMatch(account, /credential_ref|select\('\*'\)/);
assert.match(account, /can_list,can_publish,can_reprice,can_read_orders,can_fulfil/);
assert.match(backend, /validatePublicBackendKey\(key\)/);
for (const path of ['src/lib/publicBackendKey.ts', 'src/lib/ebayOAuthPending.ts', 'src/pages/EbayAccount.tsx']) {
  const compiled = ts.transpileModule(await read(path), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics?.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error).length || 0, 0, `${path} must transpile`);
}
const keySource = ts.transpileModule(await read('src/lib/publicBackendKey.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { validatePublicBackendKey } = await import(`data:text/javascript;base64,${Buffer.from(keySource).toString('base64')}`);
const key = claims => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const claims = { role: 'anon', ref: 'iwgaqieyoahmcjfziwga', exp: Math.ceil(Date.now() / 1000) + 1000 };
assert.equal(validatePublicBackendKey(key(claims)), key(claims));
assert.throws(() => validatePublicBackendKey(key({ ...claims, role: 'service_role' })));
assert.throws(() => validatePublicBackendKey(key({ ...claims, ref: 'other_project' })));
assert.throws(() => validatePublicBackendKey(key({ ...claims, exp: 1 })));
console.log('Web routing, onboarding, polling, publication guards and public-key regressions passed. Live workflow acceptance remains separate.');
