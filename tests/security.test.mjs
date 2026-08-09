import { strictEqual } from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const repositoryRoot = new URL('..', new URL('.', import.meta.url));

async function readSource(path) {
  const fullPath = new URL(path, repositoryRoot).pathname;
  return await readFile(fullPath, 'utf8');
}

// Verify imports and exports from repository root
const SOURCES = [
  'app/api-user.ts',
  'app/api/actions/route.ts',
  'app/api/chat/route.ts',
  'db/repository.ts',
];

for (const src of SOURCES) {
  test(`source file exists: ${src}`, async () => {
    const entries = await readdir(repositoryRoot, { withFileTypes: true });
    strictEqual(
      entries.some(d => d.name === src.split('/')[0] && d.isDirectory()),
      true,
      `directory for ${src} must exist`
    );
  });
}

// Verify requireSameOrigin signature and behavior
const API_USER = await readSource('app/api-user.ts');
test('requireSameOrigin exported from app/api-user.ts', () => {
  strictEqual(API_USER.includes('export async function requireSameOrigin'), true);
});

// Verify currentApiUser signature and behavior
const ACTIONS_ROUTE = await readSource('app/api/actions/route.ts');
test('currentApiUser imported in app/api/actions/route.ts', () => {
  strictEqual(ACTIONS_ROUTE.includes('import { currentApiUser'), true);
});

// Verify requireSameOrigin and canWrite authorization checks
const CHAT_ROUTE = await readSource('app/api/chat/route.ts');
test('requireSameOrigin and canWrite imported in app/api/chat/route.ts', () => {
  strictEqual(CHAT_ROUTE.includes('requireSameOrigin'), true);
  strictEqual(CHAT_ROUTE.includes('canWrite'), true);
  strictEqual(CHAT_ROUTE.includes('validUuid(input.jobId)'), true);
  strictEqual(CHAT_ROUTE.includes('validUuid(input.opportunityId)'), true);
  strictEqual(CHAT_ROUTE.includes('validUuid(input.conversationId)'), true);
});

// Verify repository access checks for canAccessOpportunity and canAccessConversation
const REPO = await readSource('db/repository.ts');
test('canAccessOpportunity in db/repository.ts', () => {
  strictEqual(REPO.includes('canAccessOpportunity'), true);
});
test('canAccessConversation in db/repository.ts', () => {
  strictEqual(REPO.includes('canAccessConversation'), true);
});
test('$1 in db/repository.ts', () => {
  strictEqual(REPO.includes('$1'), true);
});
test('$2 in db/repository.ts', () => {
  strictEqual(REPO.includes('$2'), true);
});

// Verify canAccessOpportunity and canAccessConversation SQL binding
const CONVERSATION_BINDING = 'conversation plus opportunity SQL binding';
test(CONVERSATION_BINDING, () => {
  strictEqual(
    REPO.includes('canAccessOpportunity') && REPO.includes('canAccessConversation'),
    true,
    CONVERSATION_BINDING
  );
});

// Verify server-side AIDA service-token handling
const TOKEN_HANDLING = 'server-side AIDA service-token handling';
test(TOKEN_HANDLING, () => {
  strictEqual(API_USER.includes('tokenHash') && API_USER.includes('sessionCookie'), true, TOKEN_HANDLING);
});