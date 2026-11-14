import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDrift, validateSource, validateEvidence, REQUIRED_CHECKS } from '../lib/swish-contracts.mjs';
const commit = 'a'.repeat(40);
const source = { repository: 'troonvinyl-ux/SWISH', branch: 'main', commit, backendUrl: 'https://iwgaqieyoahmcjfziwga.backend.onspace.ai', contracts: { app: commit }, review: { status: 'approved', reviewUrl: 'https://github.com/troonvinyl-ux/SwishWeb/pull/1' } };
const now = Date.parse('2026-11-14T12:00:00Z');
const evidence = () => ({ nativeCommit: commit, webSourceDigest: 'digest', backendUrl: source.backendUrl, domain: 'swishflip.co.uk', testedAt: '2026-11-14T10:00:00Z', knownGaps: [], checks: Object.fromEntries(REQUIRED_CHECKS.map(name => [name, { status: 'passed', reviewer: 'reviewer', evidenceUrl: 'https://github.com/troonvinyl-ux/SwishWeb/actions/runs/1' }])) });
test('contract changes and removals require review', () => {
  assert.deepEqual(contractDrift(source.contracts, [{ path: 'app', sha: commit }]), []);
  assert.equal(contractDrift(source.contracts, [{ path: 'app', sha: 'b'.repeat(40) }]).length, 1);
  assert.equal(contractDrift(source.contracts, [])[0].after, null);
});
test('repository and backend cannot silently change', () => {
  assert.doesNotThrow(() => validateSource(source));
  assert.throws(() => validateSource({ ...source, repository: 'other/project' }));
  assert.throws(() => validateSource({ ...source, backendUrl: 'https://other.example' }));
});
test('matching reviewed evidence is eligible, not deployed', () => assert.deepEqual(validateEvidence(evidence(), source, 'digest', now), []));
test('pending source review blocks release', () => assert.ok(validateEvidence(evidence(), { ...source, review: { status: 'pending' } }, 'digest', now).length));
test('modified web source invalidates previous evidence', () => assert.ok(validateEvidence(evidence(), source, 'changed', now).length));
test('missing, stale and future evidence block release', () => {
  const missing = evidence(); delete missing.checks.tenant_isolation;
  assert.ok(validateEvidence(missing, source, 'digest', now).some(message => message.includes('tenant_isolation')));
  assert.ok(validateEvidence({ ...evidence(), testedAt: '2026-10-01' }, source, 'digest', now).length);
  assert.ok(validateEvidence({ ...evidence(), testedAt: '2026-11-15' }, source, 'digest', now).length);
});
test('known gaps and a different backend block release', () => {
  assert.ok(validateEvidence({ ...evidence(), knownGaps: ['Stripe return'] }, source, 'digest', now).length);
  assert.ok(validateEvidence({ ...evidence(), backendUrl: 'other' }, source, 'digest', now).length);
});
