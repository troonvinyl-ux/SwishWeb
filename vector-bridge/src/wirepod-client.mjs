function endpoint(config, path, params = {}) {
  const url = new URL(`/api-sdk/${path}`, config.wirePodUrl);
  url.searchParams.set('serial', config.serial);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url;
}

async function callWirePod(config, path, params, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint(config, path, params), { method: 'POST' });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 240);
    throw new Error(`WirePod ${path} failed (${response.status}): ${message || response.statusText}`);
  }
}

export function privacySafeSpeech(value) {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^a-zA-Z0-9,.!? '’-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!text) throw new Error('Refusing an empty Vector announcement.');
  return text.slice(0, 220);
}

export async function say(config, phrase, fetchImpl = fetch) {
  const text = privacySafeSpeech(phrase);
  await callWirePod(config, 'assume_behavior_control', { priority: 'high' }, fetchImpl);
  try {
    await callWirePod(config, 'say_text', { text }, fetchImpl);
  } finally {
    await callWirePod(config, 'release_behavior_control', {}, fetchImpl).catch(() => {});
  }
}

export async function verifyRobot(config, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint(config, 'get_battery'), { method: 'GET' });
  if (!response.ok) throw new Error(`WirePod battery check failed (${response.status}).`);
  return response.json().catch(() => ({}));
}
