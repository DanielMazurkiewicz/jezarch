const BASE_URL = process.argv[2] || 'http://localhost:8080';
// The bootstrap admin password is random unless the server was started with
// JEZARCH_INITIAL_ADMIN_PASSWORD set. Provide it here or as the 2nd CLI argument.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || process.argv[3] || 'admin';

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
  try { json = JSON.parse(text); } catch { }
  return { status: res.status, body: json, text };
}

async function main() {
  console.log(`Seeding JezArch at ${BASE_URL}...\n`);

  // 1. Login as admin (created by DB init)
  console.log('--- Logging in as admin ---');
  const login = await api('POST', '/api/user/login', { login: 'admin', password: ADMIN_PASSWORD });
  if (login.status !== 200) {
    console.error('Failed to login as admin. Make sure the server is running and pass the bootstrap admin password (env SEED_ADMIN_PASSWORD, 2nd CLI argument, or start the server with JEZARCH_INITIAL_ADMIN_PASSWORD=admin).');
    console.error(login.text);
    process.exit(1);
  }
  const adminToken = login.body.token;
  console.log(`  Admin token: ${adminToken.slice(0, 8)}...`);

  // 2. Create additional users
  console.log('\n--- Creating users ---');
  const users = [
    { login: 'employee1', password: 'Employee1', role: 'employee' },
    { login: 'employee2', password: 'Employee2', role: 'employee' },
    { login: 'regular1', password: 'Regular1', role: 'user' },
    { login: 'regular2', password: 'Regular2', role: 'user' },
  ];

  for (const u of users) {
    const create = await api('POST', '/api/user/create', {
      login: u.login,
      password: u.password,
    });
    // 429 = rate-limited: the user most likely already exists from an earlier run;
      // the role PATCH below fails loudly if it really is missing.
    if (create.status === 201 || create.status === 409 || create.status === 429) {
      const roleRes = await api('PATCH', `/api/user/by-login/${u.login}`, { role: u.role }, adminToken);
      console.log(`  ${u.login} (${u.role}): ${create.status === 409 ? 'already exists' : 'created'}`);
    } else {
      console.error(`  Failed to create ${u.login}:`, create.text);
    }
  }

  // 3. Create tags
  console.log('\n--- Creating tags ---');
  const tags = [
    { name: 'Historical', description: 'Historical documents and records' },
    { name: 'Financial', description: 'Financial reports and statements' },
    { name: 'Legal', description: 'Legal documents and contracts' },
    { name: 'Personnel', description: 'Personnel and HR records' },
    { name: 'Technical', description: 'Technical documentation and specs' },
    { name: 'Confidential', description: 'Confidential or restricted access' },
  ];

  const tagIds: Record<string, number> = {};
  for (const t of tags) {
    const res = await api('PUT', '/api/tag', t, adminToken);
    if (res.status === 201 || res.status === 200) {
      tagIds[t.name] = res.body.tagId ?? res.body.tagId;
      console.log(`  ${t.name}: tagId=${res.body.tagId}`);
    } else {
      console.error(`  Failed to create tag ${t.name}:`, res.text);
    }
  }

  // Idempotency: backfill IDs for tags that already existed (409 on create)
  {
    const all = await api('GET', '/api/tags', undefined, adminToken);
    if (all.status === 200 && Array.isArray(all.body)) {
      for (const t of all.body) {
        if (tagIds[t.name] === undefined) tagIds[t.name] = t.tagId;
      }
    }
  }

  // 4. Assign tags to regular users
  console.log('\n--- Assigning tags to users ---');
  const userTagAssignments = [
    { user: 'regular1', tags: ['Historical', 'Financial'] },
    { user: 'regular2', tags: ['Legal', 'Technical'] },
  ];
  for (const a of userTagAssignments) {
    const ids = a.tags.map(t => tagIds[t]).filter(Boolean);
    const res = await api('PUT', `/api/user/by-login/${a.user}/tags`, { tagIds: ids }, adminToken);
    console.log(`  ${a.user}: tags ${a.tags.join(', ')} (${res.status})`);
  }

  // 5. Create signature components
  console.log('\n--- Creating signature components ---');
  const components = [
    { name: 'Fonds', description: 'Highest level archival grouping', index_type: 'dec' },
    { name: 'Series', description: 'Group of related records', index_type: 'roman' },
    { name: 'Subseries', description: 'Subdivision within a series', index_type: 'small_char' },
  ];

  const componentIds: Record<string, number> = {};
  for (const c of components) {
    const res = await api('PUT', '/api/signature/component', c, adminToken);
    if (res.status === 201) {
      componentIds[c.name] = res.body.signatureComponentId;
      console.log(`  ${c.name}: id=${res.body.signatureComponentId}`);
    } else {
      console.error(`  Failed to create component ${c.name}:`, res.text);
    }
  }

  // Idempotency: backfill IDs for components that already existed (409 on create)
  {
    const all = await api('GET', '/api/signature/components', undefined, adminToken);
    if (all.status === 200 && Array.isArray(all.body)) {
      for (const c of all.body) {
        if (componentIds[c.name] === undefined) componentIds[c.name] = c.signatureComponentId;
      }
    }
  }

  // 6. Create signature elements
  console.log('\n--- Creating signature elements ---');
  const fondsElements = [
    { name: 'Municipal Archive', component: 'Fonds', index: '1' },
    { name: 'State Archive', component: 'Fonds', index: '2' },
  ];
  const elementIds: Record<string, number> = {};

  for (const e of fondsElements) {
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      index: e.index,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    } else {
      console.error(`  Failed to create element:`, res.text);
    }
  }

  // Create series under the first fonds
  const seriesElements = [
    { name: 'Administrative Records', component: 'Series', parent: 'Municipal Archive' },
    { name: 'Financial Records', component: 'Series', parent: 'Municipal Archive' },
    { name: 'Personnel Files', component: 'Series', parent: 'Municipal Archive' },
  ];

  for (const e of seriesElements) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    } else {
      console.error(`  Failed to create element:`, res.text);
    }
  }

  // 7. Create archive documents
  console.log('\n--- Creating archive documents ---');
  const docs = [
    {
      type: 'document',
      title: 'Annual Financial Report 2023',
      creator: 'Finance Department',
      creationDate: '2023-12-31',
      topographicSignature: 'F-2023-001',
      descriptiveSignatureElementIds: [[elementIds['Municipal Archive'], elementIds['Financial Records']]],
      numberOfPages: '45',
      isDigitized: true,
      tagIds: [tagIds['Financial'], tagIds['Historical']],
    },
    {
      type: 'document',
      title: 'Employment Contract - John Doe',
      creator: 'HR Department',
      creationDate: '2022-06-15',
      topographicSignature: 'HR-2022-042',
      descriptiveSignatureElementIds: [[elementIds['Municipal Archive'], elementIds['Personnel Files']]],
      isDigitized: true,
      tagIds: [tagIds['Personnel'], tagIds['Legal']],
    },
    {
      type: 'unit',
      title: 'Building Permit Records 2020-2024',
      creator: 'City Planning Office',
      creationDate: '2020-2024',
      topographicSignature: 'BP-SERIES-001',
      tagIds: [tagIds['Legal']],
    },
    {
      type: 'document',
      title: 'Server Infrastructure Technical Specs',
      creator: 'IT Department',
      creationDate: '2024-03-20',
      numberOfPages: '120',
      isDigitized: false,
      tagIds: [tagIds['Technical'], tagIds['Confidential']],
    },
  ];

  const docIds: number[] = [];
  for (const d of docs) {
    const res = await api('PUT', '/api/archive/document', d, adminToken);
    if (res.status === 201) {
      docIds.push(res.body.archiveDocumentId);
      console.log(`  "${d.title}": id=${res.body.archiveDocumentId}`);
    } else {
      console.error(`  Failed to create "${d.title}":`, res.text);
    }
  }

  // 7b. Soft-delete one sample document to demonstrate the delete/restore workflow
  const deletedIds: number[] = [];
  if (docIds.length > 0) {
    const delId = docIds[docIds.length - 1];
    const delRes = await api('DELETE', `/api/archive/document/id/${delId}`, undefined, adminToken);
    if (delRes.status === 204) {
      deletedIds.push(delId);
      console.log(`  Soft-deleted sample document: id=${delId}`);
    } else {
      console.error(`  Failed to soft-delete document id=${delId}:`, delRes.text);
    }
  }

  // 8. Create notes
  console.log('\n--- Creating notes ---');
  const notes = [
    { title: 'Archival Assessment', content: 'Preliminary assessment of fonds condition completed.', shared: false, tagIds: [tagIds['Historical']] },
    { title: 'Digitization Plan', content: 'Next batch of documents scheduled for digitization in Q2.', shared: true, tagIds: [tagIds['Technical']] },
    { title: 'Accession Note', content: 'New accession of municipal records from 1950-1960 received.', shared: true },
  ];

  for (const n of notes) {
    const res = await api('PUT', '/api/note', n, adminToken);
    if (res.status === 201) {
      const note = res.body;
      console.log(`  "${n.title}": id=${note.noteId}`);
    } else {
      console.error(`  Failed to create note "${n.title}":`, res.text);
    }
  }

  console.log('\n--- Seeding complete ---');
  console.log(`Users: ${users.length + 1} (including admin)`);
  console.log(`Tags: ${tags.length}`);
  console.log(`Components: ${components.length}`);
  console.log(`Elements: ${Object.keys(elementIds).length}`);
  console.log(`Documents: ${docIds.length} (${deletedIds.length} soft-deleted)`);
  console.log(`Notes: ${notes.length}`);
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
