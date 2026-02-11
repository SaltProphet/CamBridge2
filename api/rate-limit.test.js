import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

try {
  const middleware = read('middleware.js');
  assert(middleware.includes('CREATE TABLE IF NOT EXISTS rate_limits'), 'middleware should create persistent rate_limits table');
  assert(middleware.includes('export async function consumeRateLimit'), 'middleware should export storage-backed consumeRateLimit');
  assert(middleware.includes('export function buildRateLimitKey(endpoint, actor)'), 'middleware should expose key helper');

  const authStart = read('auth/start.js');
  assert(authStart.includes("buildRateLimitKey('auth:start', `email:${normalizedEmail}`)"), 'auth/start should key by endpoint + email');
  assert(authStart.includes('const MAGIC_LINK_MAX_REQUESTS = 5;'), 'auth/start should keep 5/hour magic-link limit');

  const joinRequest = read('join-request.js');
  assert(joinRequest.includes("buildRateLimitKey('join-request', `user:${userId}:creator:${creator.id}`)"), 'join-request should key by endpoint + actor');
  assert(joinRequest.includes('const JOIN_REQUEST_MAX_REQUESTS = 10;'), 'join-request should keep 10/hour join-request limit');

  console.log('rate-limit.test.js passed');
} catch (error) {
  console.error('rate-limit.test.js failed:', error.message);
  process.exit(1);
}
