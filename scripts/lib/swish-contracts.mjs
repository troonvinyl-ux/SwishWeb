import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
export const SOURCE_REPOSITORY = 'troonvinyl-ux/SWISH';
export const EVIDENCE_PATH = 'docs/production-readiness/web-release-evidence.json';
export const REQUIRED_CHECKS = ['same_backend_identity', 'shared_accounts', 'registration_verification', 'tenant_isolation', 'niche_isolation', 'inventory_save_reopen', 'photo_persistence', 'listing_specifics_save_reopen', 'listing_preflight_publish', 'ebay_oauth_return', 'ebay_sync_recovery', 'orders_dispatch', 'stripe_web_return', 'native_workflow_parity', 'web_build_lint'];
export function validateSource(source) {
  if (source.repository !== SOURCE_REPOSITORY || source.branch !== 'main' || !/^[a-f0-9]{40}$/.test(source.commit)) throw new Error('Invalid SWISH source pin.');
  if (source.backendUrl !== 'https://iwgaqieyoahmcjfziwga.backend.onspace.ai') throw new Error('Backend identity changed; an explicit migration review is required.');
  if (!source.contracts || !Object.keys(source.contracts).length || Object.values(source.contracts).some(sha => !/^[a-f0-9]{40}$/.test(sha))) throw new Error('Invalid contract tree snapshot.');
}
export function contractDrift(snapshot, tree) {
  return Object.entries(snapshot).flatMap(([path, sha]) => {
    const current = tree.find(entry => entry.path === path)?.sha ?? null;
    return current === sha ? [] : [{ path, before: sha, after: current }];
  });
}
export async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${SOURCE_REPOSITORY}/${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(process.env.SWISH_SOURCE_TOKEN || process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.SWISH_SOURCE_TOKEN || process.env.GITHUB_TOKEN}` } : {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`SWISH source is unavailable (HTTP ${response.status}). No parity approval is inferred.`);
  return response.json();
}
export async function webSourceDigest() {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(path => path && path !== EVIDENCE_PATH && path !== '.env' && !path.startsWith('.env.')).sort();
  const hash = createHash('sha256');
  for (const path of paths) { hash.update(path); hash.update('\0'); hash.update(await readFile(path)); hash.update('\0'); }
  return hash.digest('hex');
}
export function validateEvidence(evidence, source, digest, now = Date.now()) {
  const failures = [];
  if (source.review?.status !== 'approved' || !/^https:\/\/github\.com\/troonvinyl-ux\/SwishWeb\/pull\/\d+$/.test(source.review?.reviewUrl || '')) failures.push('Source baseline requires a reviewed SwishWeb pull request.');
  if (evidence.webSourceDigest !== digest || evidence.nativeCommit !== source.commit) failures.push('Evidence must match the exact web source digest and pinned native commit.');
  if (evidence.backendUrl !== source.backendUrl || evidence.domain !== 'swishflip.co.uk') failures.push('Evidence targets a different backend or domain.');
  const tested = Date.parse(evidence.testedAt);
  if (!Number.isFinite(tested) || now < tested || now - tested > 7 * 86400000) failures.push('Release evidence must be no older than seven days and not future-dated.');
  if (!Array.isArray(evidence.knownGaps) || evidence.knownGaps.length) failures.push('Unresolved workflow gaps block a full-parity release.');
  for (const name of REQUIRED_CHECKS) {
    const check = evidence.checks?.[name];
    if (check?.status !== 'passed' || !/^https:\/\//.test(check.evidenceUrl || '') || !check.reviewer) failures.push(`Missing reviewed passing evidence: ${name}`);
  }
  return failures;
}
