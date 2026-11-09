import { getCompanionStatus, statusPhrase } from './swish-client.mjs';
import { say } from './wirepod-client.mjs';

const ALLOWED_COMMANDS = new Set(['test', 'status']);

export function parseCommand(value) {
  const command = String(value ?? '').trim().toLowerCase();
  if (!ALLOWED_COMMANDS.has(command)) throw new Error('Unsupported companion command.');
  return command;
}

export async function executeCommand(config, command, dependencies = {}) {
  const getStatus = dependencies.getCompanionStatus || getCompanionStatus;
  const speak = dependencies.say || say;
  const normalized = parseCommand(command);
  const phrase = normalized === 'test'
    ? 'Swish and Vector are connected. Your desk companion is ready.'
    : statusPhrase(await getStatus(config));
  await speak(config, phrase);
  return { command: normalized, spoken: phrase };
}
