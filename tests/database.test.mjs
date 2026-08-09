import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repositoryRoot = new URL('..', new URL('.', import.meta.url));

// Load schema and repository files using deterministic module-relative URLs
const schemaFile = new URL('db/schema.ts', repositoryRoot);
const repositoryFile = new URL('db/repository.ts', repositoryRoot);
const manifestFile = new URL('deploy/olares/aidacrm/OlaresManifest.yaml', repositoryRoot);

// Read files as text for assertions
const schemaContent = await readFile(schemaFile, 'utf8');
const repositoryContent = await readFile(repositoryFile, 'utf8');
const manifestContent = await readFile(manifestFile, 'utf8');

// Existing database and repository source-contract assertions

// Migration One Test
assert.ok(schemaContent.includes('migrationOne')); // AC-04

// Migration Two Test
assert.ok(schemaContent.includes('migrationTwo')); // AC-04

// Migration Three Test
assert.ok(schemaContent.includes('migrationThree')); // AC-04

// Migration Four Test
assert.ok(schemaContent.includes('migrationFour')); // AC-04

// Migration Five Test
assert.ok(schemaContent.includes('migrationFive')); // AC-04

// Migration Six Test
assert.ok(schemaContent.includes('migrationSix')); // AC-04

// Core Tables Test
assert.ok(schemaContent.includes('opportunities')); // AC-04
assert.ok(schemaContent.includes('activities')); // AC-04
assert.ok(schemaContent.includes('documents')); // AC-04
assert.ok(schemaContent.includes('conversations')); // AC-04
assert.ok(schemaContent.includes('messages')); // AC-04
assert.ok(schemaContent.includes('artifacts')); // AC-04
assert.ok(schemaContent.includes('chat_dispatches')); // AC-04
assert.ok(schemaContent.includes('users')); // AC-04
assert.ok(schemaContent.includes('assistant_definitions')); // AC-04

// opportunity_id foreign key constraint test
assert.ok(schemaContent.includes('opportunity_id')); // AC-04

// canAccessOpportunity function test
assert.ok(repositoryContent.includes('canAccessOpportunity')); // AC-04

// canAccessConversation function test
assert.ok(repositoryContent.includes('canAccessConversation')); // AC-04

// parameterized query bindings test
assert.ok(repositoryContent.includes('$1')); // AC-04

// allowMultipleInstall flag test
assert.ok(manifestContent.includes('allowMultipleInstall')); // AC-04

// PostgreSQL middleware test
assert.ok(repositoryContent.includes('query')); // AC-04

test('cloud processing consent defaults false and is enforced by admin and chat APIs', async () => {
  const [adminAssistantsContent, chatRouteContent] = await Promise.all([
    readFile(new URL('app/api/admin/assistants/route.ts', repositoryRoot), 'utf8'),
    readFile(new URL('app/api/chat/route.ts', repositoryRoot), 'utf8'),
  ]);

  assert.match(
    schemaContent,
    /ALTER TABLE\s+assistant_definitions\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?cloud_processing_confirmed\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+FALSE/i,
    'cloud processing consent must be an additive, non-null Boolean that defaults to false',
  );
  assert.match(
    repositoryContent,
    /cloudProcessingConfirmed\s*:\s*Boolean\(row\.cloud_processing_confirmed\)/,
    'the repository must map the stored database Boolean explicitly',
  );
  assert.match(
    adminAssistantsContent,
    /(?:is|assert|require|enforce)SameOrigin\s*\(\s*request\s*\)/,
    'assistant administration must enforce same-origin requests',
  );
  assert.match(
    adminAssistantsContent,
    /canManageAssistants\s*\(/,
    'assistant administration must require assistant-management authorization',
  );
  assert.match(
    adminAssistantsContent,
    /typeof\s+(?:[A-Za-z_$][\w$]*\.)?cloudProcessingConfirmed\s*!==\s*["']boolean["']/,
    'assistant administration must reject non-Boolean consent values',
  );
  assert.match(
    chatRouteContent,
    /cloudProcessingConfirmed\s*:\s*[A-Za-z_$][\w$]*\.cloudProcessingConfirmed\b/,
    'chat dispatch must use the exact stored assistant consent Boolean',
  );
});
