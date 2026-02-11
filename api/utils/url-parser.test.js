// Test for URL parsing utilities
import { parseCreatorSlugFromPath, parseRoomFromPath, getCreatorSlug, isValidCreatorSlug } from './url-parser.js';

// Test parseCreatorSlugFromPath
console.log('Testing parseCreatorSlugFromPath...');

const testCases = [
  { input: '/r/alice', expected: { creatorSlug: 'alice', roomSlug: null } },
  { input: '/r/alice/vip', expected: { creatorSlug: 'alice', roomSlug: 'vip' } },
  { input: '/r/bob-smith', expected: { creatorSlug: 'bob-smith', roomSlug: null } },
  { input: '/r/creator_123/room-456', expected: { creatorSlug: 'creator_123', roomSlug: 'room-456' } },
  { input: '/other/path', expected: { creatorSlug: null, roomSlug: null } },
  { input: null, expected: { creatorSlug: null, roomSlug: null } }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = parseCreatorSlugFromPath(input);
  const match = result.creatorSlug === expected.creatorSlug && result.roomSlug === expected.roomSlug;
  if (match) {
    console.log(`✓ ${input || 'null'} → ${JSON.stringify(result)}`);
    passed++;
  } else {
    console.log(`✗ ${input || 'null'} → Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
});

// Test parseRoomFromPath
console.log('\nTesting parseRoomFromPath...');

const roomTestCases = [
  { input: '/room/alice', expected: { modelName: 'alice', roomSlug: 'main' } },
  { input: '/room/alice/vip', expected: { modelName: 'alice', roomSlug: 'vip' } },
  { input: '/room/bob-smith/private', expected: { modelName: 'bob-smith', roomSlug: 'private' } },
  { input: '/other/path', expected: { modelName: null, roomSlug: null } }
];

roomTestCases.forEach(({ input, expected }) => {
  const result = parseRoomFromPath(input);
  const match = result.modelName === expected.modelName && result.roomSlug === expected.roomSlug;
  if (match) {
    console.log(`✓ ${input} → ${JSON.stringify(result)}`);
    passed++;
  } else {
    console.log(`✗ ${input} → Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
});

// Test isValidCreatorSlug
console.log('\nTesting isValidCreatorSlug...');

const validationTests = [
  { input: 'alice', expected: true },
  { input: 'bob-smith', expected: true },
  { input: 'creator_123', expected: true },
  { input: 'ab', expected: false }, // too short
  { input: 'Alice', expected: false }, // uppercase
  { input: 'alice@bob', expected: false }, // invalid character
  { input: null, expected: false },
  { input: '', expected: false }
];

validationTests.forEach(({ input, expected }) => {
  const result = isValidCreatorSlug(input);
  if (result === expected) {
    console.log(`✓ isValidCreatorSlug(${JSON.stringify(input)}) = ${result}`);
    passed++;
  } else {
    console.log(`✗ isValidCreatorSlug(${JSON.stringify(input)}) → Expected ${expected}, got ${result}`);
    failed++;
  }
});

// Test getCreatorSlug with mock requests
console.log('\nTesting getCreatorSlug...');

const mockRequests = [
  { 
    req: { query: { slug: 'alice' } }, 
    expected: 'alice',
    description: 'query parameter'
  },
  { 
    req: { body: { creatorSlug: 'bob' } }, 
    expected: 'bob',
    description: 'body parameter'
  },
  { 
    req: { url: '/r/charlie' }, 
    expected: 'charlie',
    description: 'URL path'
  },
  { 
    req: { query: { slug: 'alice' }, url: '/r/bob' }, 
    expected: 'alice',
    description: 'query takes precedence'
  },
  { 
    req: {}, 
    expected: null,
    description: 'empty request'
  }
];

mockRequests.forEach(({ req, expected, description }) => {
  const result = getCreatorSlug(req);
  if (result === expected) {
    console.log(`✓ ${description} → ${result}`);
    passed++;
  } else {
    console.log(`✗ ${description} → Expected ${expected}, got ${result}`);
    failed++;
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
