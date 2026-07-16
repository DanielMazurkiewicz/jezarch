const BASE_URL = process.argv[2] || 'http://localhost:8080';

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
  console.log(`Seeding JezArch with English data at ${BASE_URL}...\n`);

  // 1. Login as admin
  console.log('--- Logging in as admin ---');
  const login = await api('POST', '/api/user/login', { login: 'admin', password: 'admin' });
  if (login.status !== 200) {
    console.error('Failed to login as admin. Make sure the server is running.');
    console.error(login.text);
    process.exit(1);
  }
  const adminToken = login.body.token;
  console.log(`  Admin token: ${adminToken.slice(0, 8)}...`);

  // 2. Create users
  console.log('\n--- Creating users ---');
  const users = [
    { login: 'archivist1', password: 'Archivist1', role: 'employee' },
    { login: 'archivist2', password: 'Archivist2', role: 'employee' },
    { login: 'researcher1', password: 'Researcher1', role: 'user' },
    { login: 'researcher2', password: 'Researcher2', role: 'user' },
  ];

  for (const u of users) {
    const create = await api('POST', '/api/user/create', {
      login: u.login,
      password: u.password,
    });
    if (create.status === 201 || create.status === 409) {
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
    { name: 'Manuscripts', description: 'Hand-written manuscripts and codices' },
    { name: 'Incunabula', description: 'Early printed books before 1501' },
    { name: 'Newspapers', description: 'Historic newspapers and periodicals' },
    { name: 'Cartography', description: 'Historic maps, charts, and atlases' },
    { name: 'RareBooks', description: 'Rare and valuable printed books' },
    { name: 'Literature', description: 'Literary works and poetry' },
  ];

  const tagIds: Record<string, number> = {};
  for (const t of tags) {
    const res = await api('PUT', '/api/tag', t, adminToken);
    if (res.status === 201 || res.status === 200) {
      tagIds[t.name] = res.body.tagId;
      console.log(`  ${t.name}: tagId=${res.body.tagId}`);
    } else {
      console.error(`  Failed to create tag ${t.name}:`, res.text);
    }
  }

  // 4. Assign tags to users
  console.log('\n--- Assigning tags to users ---');
  const userTagAssignments = [
    { user: 'researcher1', tags: ['Historical', 'Manuscripts', 'Incunabula'] },
    { user: 'researcher2', tags: ['Newspapers', 'Cartography', 'RareBooks'] },
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
    { name: 'Year', description: 'Year of creation or publication', index_type: 'dec' },
    { name: 'Location', description: 'Place of creation or publication', index_type: 'small_char' },
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

  // 6. Create signature elements
  console.log('\n--- Creating signature elements ---');

  // Fonds elements
  const fondsElements = [
    { name: 'The British Library', component: 'Fonds', index: '1' },
    { name: 'The National Archives UK', component: 'Fonds', index: '2' },
    { name: 'Library of Congress', component: 'Fonds', index: '3' },
    { name: 'Bodleian Library, Oxford', component: 'Fonds', index: '4' },
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
    }
  }

  // Series elements under The British Library
  const seriesBL = [
    { name: 'Medieval Manuscripts', component: 'Series', parent: 'The British Library' },
    { name: 'Incunabula', component: 'Series', parent: 'The British Library' },
    { name: 'Newspapers & Periodicals', component: 'Series', parent: 'The British Library' },
  ];

  for (const e of seriesBL) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    }
  }

  // Series elements under The National Archives UK
  const seriesTNA = [
    { name: 'Domesday & Medieval Records', component: 'Series', parent: 'The National Archives UK' },
    { name: 'Parliamentary Papers', component: 'Series', parent: 'The National Archives UK' },
  ];

  for (const e of seriesTNA) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    }
  }

  // Series elements under Library of Congress
  const seriesLOC = [
    { name: 'Cartographic Collection', component: 'Series', parent: 'Library of Congress' },
    { name: 'Rare Book Collection', component: 'Series', parent: 'Library of Congress' },
  ];

  for (const e of seriesLOC) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    }
  }

  // Series elements under Bodleian Library, Oxford
  const seriesBod = [
    { name: 'Western Manuscripts', component: 'Series', parent: 'Bodleian Library, Oxford' },
    { name: 'Early Printed Books', component: 'Series', parent: 'Bodleian Library, Oxford' },
  ];

  for (const e of seriesBod) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    }
  }

  // Subseries elements
  const subseriesElements = [
    { name: 'Illuminated Manuscripts', component: 'Subseries', parent: 'Medieval Manuscripts' },
    { name: 'Broadsides', component: 'Subseries', parent: 'Incunabula' },
    { name: 'Portolan Charts', component: 'Subseries', parent: 'Cartographic Collection' },
  ];

  for (const e of subseriesElements) {
    const parentIds = elementIds[e.parent] ? [elementIds[e.parent]] : [];
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds[e.component],
      name: e.name,
      parentIds,
    }, adminToken);
    if (res.status === 201) {
      elementIds[e.name] = res.body.signatureElementId;
      console.log(`  ${e.name} (${e.component}): id=${res.body.signatureElementId}`);
    }
  }

  // Year elements
  const yearElements = ['1086', '1215', '1455', '1507', '1543', '1623', '1662', '1687', '1704', '1733', '1776', '1785', '1788', '1805', '1827'];
  for (const y of yearElements) {
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds['Year'],
      name: y,
      index: y,
    }, adminToken);
    if (res.status === 201) {
      elementIds[y] = res.body.signatureElementId;
      console.log(`  Year ${y}: id=${res.body.signatureElementId}`);
    }
  }

  // Location elements
  const locationElements = ['London', 'Mainz', 'Wittenberg', 'Augsburg', 'Oxford', 'Boston', 'Philadelphia', 'Paris', 'Washington D.C.', 'Venice'];
  for (const l of locationElements) {
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds['Location'],
      name: l,
    }, adminToken);
    if (res.status === 201) {
      elementIds[l] = res.body.signatureElementId;
      console.log(`  ${l}: id=${res.body.signatureElementId}`);
    }
  }

  // 7. Create archive documents
  console.log('\n--- Creating archive documents ---');

  const BL = elementIds['The British Library'];
  const TNA = elementIds['The National Archives UK'];
  const LOC = elementIds['Library of Congress'];
  const BOD = elementIds['Bodleian Library, Oxford'];
  const MM = elementIds['Medieval Manuscripts'];
  const INC = elementIds['Incunabula'];
  const NP = elementIds['Newspapers & Periodicals'];
  const DMR = elementIds['Domesday & Medieval Records'];
  const PP = elementIds['Parliamentary Papers'];
  const CC = elementIds['Cartographic Collection'];
  const RBC = elementIds['Rare Book Collection'];
  const WM = elementIds['Western Manuscripts'];
  const EPB = elementIds['Early Printed Books'];
  const IM = elementIds['Illuminated Manuscripts'];
  const BR = elementIds['Broadsides'];
  const PCH = elementIds['Portolan Charts'];

  const docs = [
    {
      type: 'document',
      title: 'Gutenberg Bible — leaf',
      creator: 'Johann Gutenberg',
      creationDate: 'c. 1455',
      topographicSignature: 'BL-INC-0001',
      descriptiveSignatureElementIds: [[BL, INC], [elementIds['1455']], [elementIds['Mainz']]],
      numberOfPages: '2',
      documentType: 'Incunabulum',
      dimensions: '39 × 28 cm',
      binding: 'Unbound, single vellum leaf',
      condition: 'Good, slight toning at edges',
      documentLanguage: 'Latin',
      contentDescription: 'A single vellum leaf from the Gutenberg Bible (42-line Bible), the first major book printed in the West using movable type. Contains text from the Book of Numbers.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.bl.uk/gutenberg',
      tagIds: [tagIds['Historical'], tagIds['Incunabula']],
    },
    {
      type: 'document',
      title: 'Codex Sinaiticus — fragment',
      creator: 'Early Christian scribes',
      creationDate: '4th century',
      topographicSignature: 'BL-MM-0001',
      descriptiveSignatureElementIds: [[BL, MM, IM]],
      numberOfPages: '4',
      documentType: 'Manuscript on vellum',
      dimensions: '38 × 34 cm',
      binding: 'Loose leaves',
      condition: 'Fair, text faded in places',
      documentLanguage: 'Greek',
      contentDescription: 'Four leaves from the Codex Sinaiticus, one of the oldest extant manuscripts of the Greek Bible, dating from the mid-4th century. Found at St. Catherine\'s Monastery, Sinai.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.codexsinaiticus.org',
      tagIds: [tagIds['Historical'], tagIds['Manuscripts']],
    },
    {
      type: 'document',
      title: 'Magna Carta — Lincoln Cathedral copy',
      creator: 'Royal Chancery of King John',
      creationDate: '1215',
      topographicSignature: 'BL-MM-0002',
      descriptiveSignatureElementIds: [[BL, MM], [elementIds['1215']], [elementIds['London']]],
      numberOfPages: '1',
      documentType: 'Royal charter on vellum',
      dimensions: '48 × 38 cm',
      binding: 'Unbound, matted',
      condition: 'Fair, some fading of text, seal missing',
      documentLanguage: 'Latin',
      contentDescription: 'One of four surviving original copies of Magna Carta, issued by King John at Runnymede in 1215. The Lincoln Cathedral copy is one of the best preserved.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.bl.uk/magna-carta',
      tagIds: [tagIds['Historical'], tagIds['Manuscripts']],
    },
    {
      type: 'document',
      title: 'The Canterbury Tales — Ellesmere Manuscript',
      creator: 'Geoffrey Chaucer',
      creationDate: 'c. 1400–1410',
      topographicSignature: 'BL-MM-0003',
      descriptiveSignatureElementIds: [[BL, MM], [elementIds['London']]],
      numberOfPages: '240',
      documentType: 'Illuminated manuscript',
      dimensions: '30 × 21 cm',
      binding: 'Brown morocco, gilt edges, 19th-century binding',
      condition: 'Excellent, complete with 23 miniatures',
      documentLanguage: 'Middle English',
      contentDescription: 'The Ellesmere manuscript of Chaucer\'s Canterbury Tales, one of the most famous manuscripts in English literature. Contains 23 beautifully illuminated miniatures of the storytellers.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.bl.uk/ellesmere',
      tagIds: [tagIds['Manuscripts'], tagIds['Literature']],
    },
    {
      type: 'document',
      title: 'Mr. William Shakespeares Comedies, Histories, & Tragedies — First Folio',
      creator: 'William Shakespeare',
      creationDate: '1623',
      topographicSignature: 'BOD-EPB-0001',
      descriptiveSignatureElementIds: [[BOD, EPB], [elementIds['1623']], [elementIds['London']]],
      numberOfPages: '908',
      documentType: 'Printed book (folio)',
      dimensions: '33 × 22 cm',
      binding: 'Calfskin, 17th-century binding',
      condition: 'Good, title page restored, minor foxing',
      documentLanguage: 'Early Modern English',
      contentDescription: 'First collected edition of Shakespeare\'s plays, printed in London by Isaac Jaggard. Contains 36 plays, 18 of which were printed for the first time. Includes the Droeshout portrait.',
      isDigitized: true,
      digitizedVersionLink: 'https://bodleian.ox.ac.uk/shakespeare-first-folio',
      tagIds: [tagIds['Historical'], tagIds['RareBooks'], tagIds['Literature']],
    },
    {
      type: 'document',
      title: 'Philosophiæ Naturalis Principia Mathematica',
      creator: 'Sir Isaac Newton',
      creationDate: '1687',
      topographicSignature: 'BL-RBC-0001',
      descriptiveSignatureElementIds: [[BL, INC], [elementIds['1687']], [elementIds['London']]],
      numberOfPages: '510',
      documentType: 'Printed book (quarto)',
      dimensions: '25 × 20 cm',
      binding: 'Contemporary calf, rebacked',
      condition: 'Good, some annotations in Newton\'s hand',
      documentLanguage: 'Latin',
      contentDescription: 'First edition of Newton\'s Principia Mathematica, published by the Royal Society. Lays out the laws of motion and universal gravitation. This copy contains marginal notes by Newton himself.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.bl.uk/newton-principia',
      tagIds: [tagIds['RareBooks']],
    },
    {
      type: 'document',
      title: 'The Boston News-Letter — First Issue',
      creator: 'John Campbell',
      creationDate: '1704',
      topographicSignature: 'LOC-NP-0001',
      descriptiveSignatureElementIds: [[LOC, RBC], [elementIds['1704']], [elementIds['Boston']]],
      numberOfPages: '4',
      documentType: 'Newspaper',
      dimensions: '32 × 20 cm',
      binding: 'Loose sheets',
      condition: 'Fair, paper brittle along edges',
      documentLanguage: 'English',
      contentDescription: 'The first continuously published newspaper in British America. Issue No. 1 contains news from Europe, shipping reports from Boston Harbor, and advertisements.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/boston-news-letter',
      tagIds: [tagIds['Newspapers'], tagIds['Historical']],
    },
    {
      type: 'document',
      title: 'The Birds of America — Double Elephant Folio',
      creator: 'John James Audubon',
      creationDate: '1827–1838',
      topographicSignature: 'LOC-RBC-0002',
      descriptiveSignatureElementIds: [[LOC, RBC], [elementIds['1827']], [elementIds['London']]],
      numberOfPages: '435 plates',
      documentType: 'Copperplate engravings',
      dimensions: '100 × 68 cm',
      binding: 'Half-morocco, elephant folio',
      condition: 'Good, some plates with light offsetting',
      documentLanguage: 'English',
      contentDescription: 'Audubon\'s monumental work depicting all known bird species of North America. Hand-colored copperplate engravings in double elephant folio format. One of the most valuable printed books.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/audubon',
      tagIds: [tagIds['RareBooks']],
    },
    {
      type: 'document',
      title: 'The Federalist Papers — First Bound Edition',
      creator: 'Alexander Hamilton, James Madison, John Jay',
      creationDate: '1788',
      topographicSignature: 'LOC-RBC-0003',
      descriptiveSignatureElementIds: [[LOC, RBC], [elementIds['1788']], [elementIds['Philadelphia']]],
      numberOfPages: '610',
      documentType: 'Printed book',
      dimensions: '21 × 13 cm',
      binding: 'Contemporary tree calf',
      condition: 'Good, tight binding, minimal foxing',
      documentLanguage: 'English',
      contentDescription: 'First bound edition of the Federalist Papers, the collection of 85 essays advocating for ratification of the United States Constitution. Published by J. & A. McLean in New York.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/federalist-papers',
      tagIds: [tagIds['Historical']],
    },
    {
      type: 'document',
      title: 'Universalis Cosmographia — Waldseemüller\'s World Map',
      creator: 'Martin Waldseemüller',
      creationDate: '1507',
      topographicSignature: 'LOC-CC-0001',
      descriptiveSignatureElementIds: [[LOC, CC, PCH], [elementIds['1507']], [elementIds['Augsburg']]],
      numberOfPages: '1',
      documentType: 'Wall map (woodcut)',
      dimensions: '128 × 233 cm (12 sheets)',
      binding: 'Unbound, mounted on linen',
      condition: 'Fair, some sheets foxed, one small tear',
      documentLanguage: 'Latin',
      contentDescription: 'The first map to use the name "America" for the New World. A 12-sheet woodcut wall map by cartographer Martin Waldseemüller. The only surviving copy known to exist.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/waldseemuller',
      tagIds: [tagIds['Cartography'], tagIds['Historical']],
    },
    {
      type: 'document',
      title: 'Declaration of Independence — Dunlap Broadside',
      creator: 'Continental Congress (printed by John Dunlap)',
      creationDate: '1776',
      topographicSignature: 'LOC-RBC-0004',
      descriptiveSignatureElementIds: [[LOC, RBC], [elementIds['1776']], [elementIds['Philadelphia']]],
      numberOfPages: '1',
      documentType: 'Broadside',
      dimensions: '45 × 38 cm',
      binding: 'Unbound, framed',
      condition: 'Fair, some creasing and edge wear',
      documentLanguage: 'English',
      contentDescription: 'One of approximately 200 copies of the first printed version of the Declaration of Independence, printed by John Dunlap on the night of July 4, 1776.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/declaration-dunlap',
      tagIds: [tagIds['Historical'], tagIds['Manuscripts']],
    },
    {
      type: 'document',
      title: 'The Domesday Book — Great Domesday',
      creator: 'Royal Survey of William the Conqueror',
      creationDate: '1086',
      topographicSignature: 'TNA-DMR-0001',
      descriptiveSignatureElementIds: [[TNA, DMR], [elementIds['1086']], [elementIds['London']]],
      numberOfPages: '382',
      documentType: 'Medieval manuscript',
      dimensions: '38 × 25 cm',
      binding: 'Original oak boards, leather spine, metal bosses',
      condition: 'Fair, pages darkened, some edge damage',
      documentLanguage: 'Latin',
      contentDescription: 'The Great Domesday Book, the principal record of the Domesday survey of England commissioned by William the Conqueror. Contains detailed information on landholdings, resources, and population.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.nationalarchives.gov.uk/domesday',
      tagIds: [tagIds['Historical'], tagIds['Manuscripts']],
    },
    {
      type: 'document',
      title: 'De Humani Corporis Fabrica Libri Septem',
      creator: 'Andreas Vesalius',
      creationDate: '1543',
      topographicSignature: 'BOD-EPB-0002',
      descriptiveSignatureElementIds: [[BOD, EPB], [elementIds['1543']], [elementIds['Venice']]],
      numberOfPages: '663',
      documentType: 'Printed book (folio)',
      dimensions: '40 × 28 cm',
      binding: 'Contemporary pigskin over boards',
      condition: 'Good, woodcut illustrations well preserved',
      documentLanguage: 'Latin',
      contentDescription: 'First edition of Vesalius\'s groundbreaking work on human anatomy, considered one of the most important scientific books ever written. Contains over 200 woodcut illustrations.',
      isDigitized: true,
      digitizedVersionLink: 'https://bodleian.ox.ac.uk/vesalius',
      tagIds: [tagIds['RareBooks']],
    },
    {
      type: 'document',
      title: 'Poor Richard\'s Almanack — First Edition',
      creator: 'Benjamin Franklin',
      creationDate: '1733',
      topographicSignature: 'LOC-RBC-0005',
      descriptiveSignatureElementIds: [[LOC, RBC], [elementIds['1733']], [elementIds['Philadelphia']]],
      numberOfPages: '24',
      documentType: 'Almanac',
      dimensions: '18 × 11 cm',
      binding: 'Stitched paper wrappers',
      condition: 'Poor, covers detached, text block intact',
      documentLanguage: 'English',
      contentDescription: 'The first edition of Benjamin Franklin\'s famous almanac, published under the pseudonym Richard Saunders. Contains weather predictions, proverbs, and astronomical tables.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/franklin-almanack',
      tagIds: [tagIds['Newspapers']],
    },
    {
      type: 'unit',
      title: 'Tolkien\'s Middle-earth Manuscript Collection',
      creator: 'J.R.R. Tolkien',
      creationDate: '1917–1973',
      topographicSignature: 'BOD-WM-0001',
      descriptiveSignatureElementIds: [[BOD, WM]],
      contentDescription: 'A collection of manuscripts, maps, and draft materials related to J.R.R. Tolkien\'s legendarium, including drafts of The Lord of the Rings, The Silmarillion, and original maps of Middle-earth.',
      tagIds: [tagIds['Manuscripts'], tagIds['Literature']],
    },
    {
      type: 'document',
      title: 'The Daily Universal Register (later The Times) — First Issue',
      creator: 'John Walter',
      creationDate: '1785',
      topographicSignature: 'BL-NP-0001',
      descriptiveSignatureElementIds: [[BL, NP], [elementIds['1785']], [elementIds['London']]],
      numberOfPages: '4',
      documentType: 'Newspaper',
      dimensions: '36 × 23 cm',
      binding: 'Loose sheets',
      condition: 'Poor, paper darkened and brittle',
      documentLanguage: 'English',
      contentDescription: 'The first issue of The Daily Universal Register, which was renamed The Times in 1788. Contains news, parliamentary reports, and commercial advertisements.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.bl.uk/newspapers',
      tagIds: [tagIds['Newspapers'], tagIds['Historical']],
    },
    {
      type: 'document',
      title: 'Atlas Maior, sive Cosmographia Blaviana',
      creator: 'Joan Blaeu',
      creationDate: '1662',
      topographicSignature: 'LOC-CC-0002',
      descriptiveSignatureElementIds: [[LOC, CC], [elementIds['1662']], [elementIds['London']]],
      numberOfPages: '11 volumes',
      documentType: 'Atlas',
      dimensions: '53 × 33 cm',
      binding: 'Full vellum, gilt tooling',
      condition: 'Good, maps hand-coloured, minor offsetting',
      documentLanguage: 'Latin',
      contentDescription: 'The Atlas Maior by Joan Blaeu, the most magnificent atlas ever published. This 11-volume Latin edition contains over 600 double-page maps of the known world.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/blaeu-atlas',
      tagIds: [tagIds['Cartography']],
    },
    {
      type: 'unit',
      title: 'The Gutenberg Galaxy — Early Printing Collection',
      creator: 'Various printers (Gutenberg, Fust, Schöffer, Caxton)',
      creationDate: '1455–1500',
      topographicSignature: 'BL-INC-ZB-001',
      descriptiveSignatureElementIds: [[BL, INC, BR]],
      contentDescription: 'A curated collection of 32 incunabula representing the first 50 years of European printing. Includes works from Mainz, Venice, Paris, and London, showcasing the spread of the printing press.',
      tagIds: [tagIds['Historical'], tagIds['Incunabula']],
    },
    {
      type: 'document',
      title: 'Lewis & Clark Expedition — Manuscript Map of the American West',
      creator: 'William Clark',
      creationDate: '1805',
      topographicSignature: 'LOC-CC-0003',
      descriptiveSignatureElementIds: [[LOC, CC], [elementIds['1805']], [elementIds['Washington D.C.']]],
      numberOfPages: '1',
      documentType: 'Manuscript map',
      dimensions: '67 × 50 cm',
      binding: 'Unbound, linen-backed',
      condition: 'Fair, ink faded, some staining',
      documentLanguage: 'English',
      contentDescription: 'Manuscript map of the American West drawn by William Clark during the Lewis and Clark Expedition. Shows the route of the Corps of Discovery from the Missouri River to the Pacific Ocean.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.loc.gov/lewis-clark-map',
      tagIds: [tagIds['Cartography'], tagIds['Manuscripts']],
    },
    {
      type: 'document',
      title: 'The Diary of Samuel Pepys — Original Manuscript',
      creator: 'Samuel Pepys',
      creationDate: '1660–1669',
      topographicSignature: 'BOD-WM-0002',
      descriptiveSignatureElementIds: [[BOD, WM], [elementIds['London']]],
      numberOfPages: '3,012',
      documentType: 'Manuscript (bound volumes)',
      dimensions: '20 × 16 cm (each volume)',
      binding: 'Contemporary calf, six volumes',
      condition: 'Good, written in Sheltonian shorthand',
      documentLanguage: 'English',
      contentDescription: 'The original manuscript diary of Samuel Pepys, covering the years 1660–1669. Written in cipher (Thomas Shelton\'s shorthand), it documents the Great Plague, the Great Fire of London, and daily life in Restoration England.',
      isDigitized: true,
      digitizedVersionLink: 'https://www.pepysdiary.com/manuscript',
      tagIds: [tagIds['Manuscripts'], tagIds['Historical']],
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

  // 8. Create notes
  console.log('\n--- Creating notes ---');
  const notes = [
    { title: 'Preservation Assessment of Medieval Manuscripts', content: 'Initial condition assessment of the medieval manuscript collection at the British Library. Majority require mechanical cleaning and environmental monitoring. Urgent: illuminated manuscripts showing pigment flaking.', shared: false, tagIds: [tagIds['Manuscripts']] },
    { title: 'Digitization Schedule — Rare Books', content: 'Next batch of rare books scheduled for digitization in Q2. Includes 47 items from the Library of Congress Rare Book Collection. Priority: pre-1600 imprints and Americana.', shared: true, tagIds: [tagIds['RareBooks']] },
    { title: 'New Acquisition — 16th-Century Atlas', content: 'Acquired at Christie\'s London: a 1595 edition of Mercator\'s Atlas. Requires authentication and preliminary cataloging. Potential addition to the Cartographic Collection.', shared: true, tagIds: [tagIds['Cartography'], tagIds['Historical']] },
    { title: 'Conservation Treatment Plan — Domesday Book', content: 'The Great Domesday Book requires stabilization. Fragile edges and darkened pages. Proposed treatment: surface cleaning, tear repairs, custom box enclosure. Budget approval pending.', shared: false, tagIds: [tagIds['Manuscripts']] },
    { title: 'Cataloging Workflow for Newspaper Collection', content: 'New workflow for cataloging the 18th-century newspaper holdings. 314 titles identified for processing. Estimated completion: 8 months. Integration with online finding aids planned.', shared: true, tagIds: [tagIds['Newspapers']] },
  ];

  for (const n of notes) {
    const res = await api('PUT', '/api/note', n, adminToken);
    if (res.status === 201) {
      console.log(`  "${n.title}": id=${res.body.noteId}`);
    } else {
      console.error(`  Failed to create note "${n.title}":`, res.text);
    }
  }

  console.log('\n--- Seeding complete ---');
  console.log(`Users: ${users.length + 1} (including admin)`);
  console.log(`Tags: ${tags.length}`);
  console.log(`Signature components: ${components.length}`);
  console.log(`Signature elements: ${Object.keys(elementIds).length}`);
  console.log(`Archive documents: ${docIds.length}`);
  console.log(`Notes: ${notes.length}`);
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
