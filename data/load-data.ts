#!/usr/bin/env bun
/**
 * JezArch data loader — imports the AI-converted inventory units from ./units.json
 * (produced from data/source: Grzebień_Inwentarz.pdf + docx working inventories)
 * into a running JezArch instance via its REST API.
 *
 * Usage (from anywhere):
 *   bun data/load-data.ts [baseUrl] [adminPassword]
 *   e.g.:  bun data/load-data.ts http://localhost:8080 admin
 * Password can also come from env SEED_ADMIN_PASSWORD.
 *
 * Behavior:
 *  - Creates each unit (type "unit") and its child documents (type "document",
 *    linked via parentUnitArchiveDocumentId).
 *  - Idempotent: units whose topographicSignature already exists in the app are
 *    skipped; progress is tracked in .load-state.json so an interrupted run can be
 *    resumed safely.
 */

import { readFileSync } from 'node:fs';

const BASE_URL = process.argv[2] || 'http://localhost:8080';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || process.argv[3] || 'admin';
const UNITS_FILE = new URL('./units.json', import.meta.url);
const STATE_FILE = new URL('./.load-state.json', import.meta.url);

// Field length limits from the backend zod schema (defensive clipping)
const LIMITS: Record<string, number> = {
  topographicSignature: 500,
  creationPlace: 255,
  numberOfPages: 50,
  documentType: 100,
  dimensions: 100,
  binding: 100,
  condition: 255,
  documentLanguage: 50,
  contentDescription: 10000,
  seals: 10000,
  additionalInformation: 10000,
};

function clip(v: unknown, max?: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = token;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = undefined;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, body: json, text };
}

interface SrcDocument {
  title?: string | null;
  creator?: string | null;
  creationDate?: string | null;
  numberOfPages?: string | null;
  topographicSignature?: string | null;
}
interface SrcUnit {
  topographicSignature?: string | null;
  title?: string | null;
  creator?: string | null;
  creationDate?: string | null;
  creationPlace?: string | null;
  numberOfPages?: string | null;
  documentType?: string | null;
  dimensions?: string | null;
  binding?: string | null;
  condition?: string | null;
  documentLanguage?: string | null;
  contentDescription?: string | null;
  seals?: string | null;
  remarks?: string | null;
  isDigitized?: boolean;
  documents?: SrcDocument[];
  source?: string | null;
  sourceFile?: string | null;
}

async function findUnitBySignature(token: string, signature: string): Promise<number | null> {
  const res = await api('POST', '/api/archive/documents/search', {
    query: [{ field: 'topographicSignature', condition: 'EQ', value: signature }],
    page: 1,
    pageSize: 5,
  }, token);
  if (res.status !== 200 || !Array.isArray(res.body?.data)) return null;
  const hit = res.body.data.find((d: any) => d.type === 'unit' && d.topographicSignature === signature);
  return hit ? hit.archiveDocumentId : null;
}

function loadState(): { done: string[] } {
  try {
    const raw = readFileSync(STATE_FILE, 'utf8');
    const st = JSON.parse(raw);
    if (Array.isArray(st.done)) return st;
  } catch { /* no state yet */ }
  return { done: [] };
}
function saveState(state: { done: string[] }) {
  Bun.write(STATE_FILE, JSON.stringify(state, null, 1));
}

async function main() {
  const units: SrcUnit[] = JSON.parse(readFileSync(UNITS_FILE, 'utf8'));
  console.log(`Loading ${units.length} units from ${UNITS_FILE.pathname} into ${BASE_URL}...\n`);

  console.log('--- Logging in as admin ---');
  const login = await api('POST', '/api/user/login', { login: 'admin', password: ADMIN_PASSWORD });
  if (login.status !== 200) {
    console.error('Failed to login as admin. Is the server running? Pass the bootstrap admin password (env SEED_ADMIN_PASSWORD or 2nd CLI argument; start the server with JEZARCH_INITIAL_ADMIN_PASSWORD=...).');
    console.error(login.text);
    process.exit(1);
  }
  const token = login.body.token;

  const state = loadState();
  const doneSet = new Set(state.done);
  let created = 0, skippedExisting = 0, skippedDone = 0, failed = 0, docsCreated = 0;

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const sig = clip(u.topographicSignature, LIMITS.topographicSignature);
    const key = sig ?? `__index_${i}`;

    if (doneSet.has(key)) { skippedDone++; continue; }

    const title = clip(u.title) || 'Jednostka bez tytułu';
    let unitId: number | null = null;

    if (sig) {
      unitId = await findUnitBySignature(token, sig);
      if (unitId) { skippedExisting++; state.done.push(key); continue; }
    }

    const payload: Record<string, unknown> = {
      type: 'unit',
      topographicSignature: sig,
      title,
      creator: clip(u.creator) || 'NN',
      creationDate: clip(u.creationDate) || 'nieznana',
      creationPlace: clip(u.creationPlace, LIMITS.creationPlace),
      numberOfPages: clip(u.numberOfPages, LIMITS.numberOfPages),
      documentType: clip(u.documentType, LIMITS.documentType),
      dimensions: clip(u.dimensions, LIMITS.dimensions),
      binding: clip(u.binding, LIMITS.binding),
      condition: clip(u.condition, LIMITS.condition),
      documentLanguage: clip(u.documentLanguage, LIMITS.documentLanguage),
      contentDescription: clip(u.contentDescription, LIMITS.contentDescription),
      seals: clip(u.seals, LIMITS.seals),
      remarks: clip(u.remarks),
      isDigitized: Boolean(u.isDigitized),
    };

    const createRes = await api('PUT', '/api/archive/document', payload, token);
    if (createRes.status !== 201) {
      failed++;
      console.error(`  FAILED unit "${sig ?? title}": ${createRes.status} ${createRes.text.slice(0, 200)}`);
      continue;
    }
    unitId = createRes.body.archiveDocumentId;
    created++;

    // child documents
    const docs: SrcDocument[] = Array.isArray(u.documents) ? u.documents : [];
    for (const d of docs) {
      const docPayload: Record<string, unknown> = {
        type: 'document',
        parentUnitArchiveDocumentId: unitId,
        topographicSignature: clip(d.topographicSignature, LIMITS.topographicSignature),
        title: clip(d.title) || 'Dokument bez tytułu',
        creator: clip(d.creator) || 'NN',
        creationDate: clip(d.creationDate) || 'nieznana',
        numberOfPages: clip(d.numberOfPages, LIMITS.numberOfPages),
      };
      const docRes = await api('PUT', '/api/archive/document', docPayload, token);
      if (docRes.status === 201) {
        docsCreated++;
      } else {
        console.error(`  FAILED document in unit "${sig}": ${docRes.status} ${docRes.text.slice(0, 200)}`);
      }
    }

    state.done.push(key);
    if (created % 25 === 0) {
      saveState(state);
      console.log(`  progress: ${i + 1}/${units.length} units — created=${created} docs=${docsCreated} skipped(existing)=${skippedExisting} failed=${failed}`);
    }
  }

  saveState(state);
  console.log('\n--- Load complete ---');
  console.log(`Units created:      ${created}`);
  console.log(`Documents created:  ${docsCreated}`);
  console.log(`Skipped (already in app): ${skippedExisting}`);
  console.log(`Skipped (already loaded): ${skippedDone}`);
  console.log(`Failed:             ${failed}`);
}

main().catch(err => {
  console.error('Load script failed:', err);
  process.exit(1);
});
