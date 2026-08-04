import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../ui/styles.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8');

test('actual UI exposes context, navigation, states and all required work areas', () => {
  assert.match(html, /lang="de"/u);
  assert.match(html, /Aktive Verkaufschance/u);
  assert.match(html, /id="opportunity-dialog"/u);
  assert.match(html, /Termine & Aufgaben/u);
  assert.match(html, /Notizen & Dokumente/u);
  assert.match(html, /Opportunity Copilot/u);
  assert.match(html, /Artefakte/u);
  assert.match(html, /role="alert"/u);
  assert.match(html, /aria-live="polite"/u);
  assert.match(html, /Keine Nachricht oder Aktion wird extern versendet/u);
});

test('responsive and accessibility contracts are implemented in production CSS', () => {
  assert.match(css, /:focus-visible/u);
  assert.match(css, /@media \(max-width: 760px\)/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(css, /\.mobile-nav/u);
  assert.match(css, /color: #0d4f9e/u);
});

test('browser code renders untrusted values as text and never accepts a tenant selector', () => {
  assert.match(script, /textContent/u);
  assert.match(script, /replaceChildren/u);
  assert.doesNotMatch(script, /innerHTML/u);
  assert.doesNotMatch(script, /\/api\/tenants\//u);
  assert.match(script, /selectedDocumentIds/u);
  assert.match(script, /invalid_document_scope|Verkaufschance/u);
});
