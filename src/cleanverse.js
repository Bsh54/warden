import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = {};
  const file = path.join(root, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
export const BASE_URL = env.CLEANVERSE_BASE_URL;
export const API_ID = env.CLEANVERSE_API_ID;

const KEY = Buffer.from(env.CLEANVERSE_API_KEY ?? '', 'base64');
const IV = Buffer.alloc(16, 0);
const ALGO = KEY.length === 32 ? 'aes-256-cbc' : KEY.length === 24 ? 'aes-192-cbc' : 'aes-128-cbc';

export function encrypt(payload) {
  const cipher = crypto.createCipheriv(ALGO, KEY, IV);
  return Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]).toString('base64');
}

export function decrypt(b64) {
  const decipher = crypto.createDecipheriv(ALGO, KEY, IV);
  return Buffer.concat([decipher.update(Buffer.from(b64, 'base64')), decipher.final()]).toString('utf8');
}

const headers = () => ({
  'Content-Type': 'application/json',
  'api-id': API_ID,
  'X-Request-ID': crypto.randomUUID(),
});

export async function postEncrypted(endpoint, body) {
  const res = await fetch(BASE_URL + endpoint, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ data: encrypt(body) }),
  });
  return res.json();
}

export async function postJson(endpoint, body) {
  const res = await fetch(BASE_URL + endpoint, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json();
}
