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
  console.log(`Zasiewanie JezArch danymi polskimi na ${BASE_URL}...\n`);

  // 1. Login as admin
  console.log('--- Logowanie jako admin ---');
  const login = await api('POST', '/api/user/login', { login: 'admin', password: ADMIN_PASSWORD });
  if (login.status !== 200) {
    console.error('Nie udało się zalogować jako admin. Upewnij się, że serwer działa i podaj hasło początkowego administratora (env SEED_ADMIN_PASSWORD, 2. argument CLI lub start serwera z JEZARCH_INITIAL_ADMIN_PASSWORD=admin).');
    console.error(login.text);
    process.exit(1);
  }
  const adminToken = login.body.token;
  console.log(`  Token admina: ${adminToken.slice(0, 8)}...`);

  // 2. Create users
  console.log('\n--- Tworzenie użytkowników ---');
  const users = [
    { login: 'archiwista1', password: 'Archiwista1', role: 'employee' },
    { login: 'archiwista2', password: 'Archiwista2', role: 'employee' },
    { login: 'badacz1', password: 'Badacz123', role: 'user' },
    { login: 'badacz2', password: 'Badacz123', role: 'user' },
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
      if (u.role === 'user') {
        await api('PATCH', `/api/user/by-login/${u.login}/language`, { preferredLanguage: 'pl' }, adminToken);
      }
      console.log(`  ${u.login} (${u.role}): ${create.status === 409 ? 'już istnieje' : 'utworzony'}`);
    } else {
      console.error(`  Nie udało się utworzyć ${u.login}:`, create.text);
    }
  }

  // 3. Create tags
  console.log('\n--- Tworzenie tagów ---');
  const tags = [
    { name: 'Historyczne', description: 'Dokumenty i materiały historyczne' },
    { name: 'Rękopisy', description: 'Rękopisy i manuskrypty' },
    { name: 'Starodruki', description: 'Druki z XVI-XVIII wieku' },
    { name: 'Czasopisma', description: 'Stare czasopisma i gazety' },
    { name: 'Kartografia', description: 'Mapy i atlasy historyczne' },
    { name: 'Archiwalia', description: 'Materiały archiwalne i urzędowe' },
    { name: 'Literatura', description: 'Dzieła literackie i poezja' },
  ];

  const tagIds: Record<string, number> = {};
  for (const t of tags) {
    const res = await api('PUT', '/api/tag', t, adminToken);
    if (res.status === 201 || res.status === 200) {
      tagIds[t.name] = res.body.tagId;
      console.log(`  ${t.name}: tagId=${res.body.tagId}`);
    } else {
      console.error(`  Nie udało się utworzyć tagu ${t.name}:`, res.text);
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

  // 4. Assign tags to users
  console.log('\n--- Przypisywanie tagów użytkownikom ---');
  const userTagAssignments = [
    { user: 'badacz1', tags: ['Historyczne', 'Rękopisy', 'Starodruki'] },
    { user: 'badacz2', tags: ['Czasopisma', 'Kartografia', 'Archiwalia'] },
  ];
  for (const a of userTagAssignments) {
    const ids = a.tags.map(t => tagIds[t]).filter(Boolean);
    const res = await api('PUT', `/api/user/by-login/${a.user}/tags`, { tagIds: ids }, adminToken);
    console.log(`  ${a.user}: tagi ${a.tags.join(', ')} (${res.status})`);
  }

  // 5. Create signature components
  console.log('\n--- Tworzenie komponentów sygnatury ---');
  const components = [
    { name: 'Zespół', description: 'Najwyższy poziom grupowania archiwalnego', index_type: 'dec' },
    { name: 'Seria', description: 'Grupa powiązanych ze sobą rekordów', index_type: 'roman' },
    { name: 'Podseria', description: 'Podział w obrębie serii', index_type: 'small_char' },
    { name: 'Rok', description: 'Rok powstania lub wydania dokumentu', index_type: 'dec' },
    { name: 'Miejscowość', description: 'Miejsce powstania lub przechowywania', index_type: 'small_char' },
  ];

  const componentIds: Record<string, number> = {};
  for (const c of components) {
    const res = await api('PUT', '/api/signature/component', c, adminToken);
    if (res.status === 201) {
      componentIds[c.name] = res.body.signatureComponentId;
      console.log(`  ${c.name}: id=${res.body.signatureComponentId}`);
    } else {
      console.error(`  Nie udało się utworzyć komponentu ${c.name}:`, res.text);
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
  console.log('\n--- Tworzenie elementów sygnatury ---');

  // Zespół elements
  const fondsElements = [
    { name: 'Archiwum Narodowe w Krakowie', component: 'Zespół', index: '1' },
    { name: 'Biblioteka Jagiellońska', component: 'Zespół', index: '2' },
    { name: 'Archiwum Główne Akt Dawnych w Warszawie', component: 'Zespół', index: '3' },
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

  // Seria elements under Archiwum Narodowe w Krakowie
  const seriaANK = [
    { name: 'Rękopisy średniowieczne', component: 'Seria', parent: 'Archiwum Narodowe w Krakowie' },
    { name: 'Starodruki', component: 'Seria', parent: 'Archiwum Narodowe w Krakowie' },
    { name: 'Zbiory kartograficzne', component: 'Seria', parent: 'Archiwum Narodowe w Krakowie' },
  ];

  for (const e of seriaANK) {
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

  // Seria elements under Biblioteka Jagiellońska
  const seriaBJ = [
    { name: 'Inkunabuły', component: 'Seria', parent: 'Biblioteka Jagiellońska' },
    { name: 'Rękopisy literackie', component: 'Seria', parent: 'Biblioteka Jagiellońska' },
    { name: 'Czasopisma XIX-wieczne', component: 'Seria', parent: 'Biblioteka Jagiellońska' },
  ];

  for (const e of seriaBJ) {
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

  // Seria elements under Archiwum Główne Akt Dawnych
  const seriaAGAD = [
    { name: 'Dokumenty państwowe', component: 'Seria', parent: 'Archiwum Główne Akt Dawnych w Warszawie' },
    { name: 'Materiały konstytucyjne', component: 'Seria', parent: 'Archiwum Główne Akt Dawnych w Warszawie' },
  ];

  for (const e of seriaAGAD) {
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

  // Podseria elements
  const podseriaElements = [
    { name: 'Rękopisy iluminowane', component: 'Podseria', parent: 'Rękopisy średniowieczne' },
    { name: 'Druki ulotne', component: 'Podseria', parent: 'Starodruki' },
    { name: 'Mapy rękopiśmienne', component: 'Podseria', parent: 'Zbiory kartograficzne' },
  ];

  for (const e of podseriaElements) {
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

  // Rok elements
  const rokElements = ['1455', '1543', '1597', '1661', '1772', '1774', '1791', '1834', '1859', '1873', '1890'];
  for (const r of rokElements) {
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds['Rok'],
      name: r,
      index: r,
    }, adminToken);
    if (res.status === 201) {
      elementIds[r] = res.body.signatureElementId;
      console.log(`  Rok ${r}: id=${res.body.signatureElementId}`);
    }
  }

  // Miejscowość elements
  const miastoElements = ['Kraków', 'Warszawa', 'Poznań', 'Frombork', 'Paryż', 'Wilno', 'Wrocław', 'Gdańsk', 'Lublin', 'Zamość'];
  for (const m of miastoElements) {
    const res = await api('PUT', '/api/signature/element', {
      signatureComponentId: componentIds['Miejscowość'],
      name: m,
    }, adminToken);
    if (res.status === 201) {
      elementIds[m] = res.body.signatureElementId;
      console.log(`  ${m}: id=${res.body.signatureElementId}`);
    }
  }

  // 7. Create archive documents
  console.log('\n--- Tworzenie dokumentów archiwalnych ---');

  const ANK = elementIds['Archiwum Narodowe w Krakowie'];
  const BJ = elementIds['Biblioteka Jagiellońska'];
  const AGAD = elementIds['Archiwum Główne Akt Dawnych w Warszawie'];
  const RS = elementIds['Rękopisy średniowieczne'];
  const SD = elementIds['Starodruki'];
  const ZK = elementIds['Zbiory kartograficzne'];
  const INK = elementIds['Inkunabuły'];
  const RL = elementIds['Rękopisy literackie'];
  const C19 = elementIds['Czasopisma XIX-wieczne'];
  const DP = elementIds['Dokumenty państwowe'];
  const MK = elementIds['Materiały konstytucyjne'];
  const RI = elementIds['Rękopisy iluminowane'];
  const DU = elementIds['Druki ulotne'];
  const MR = elementIds['Mapy rękopiśmienne'];

  const docs = [
    {
      type: 'document',
      title: 'Biblia Gutenberga — fragment',
      creator: 'Johann Gutenberg',
      creationDate: 'ok. 1455',
      topographicSignature: 'BK-INK-0001',
      descriptiveSignatureElementIds: [[BJ, INK], [elementIds['1455']], [elementIds['Kraków']]],
      numberOfPages: '4',
      documentType: 'Inkunabuł',
      dimensions: '39 × 28 cm',
      binding: 'Pergamin, luźne karty',
      condition: 'Dobry, ślady użycia',
      documentLanguage: 'Łacina',
      contentDescription: 'Fragment 42-wierszowej Biblii Gutenberga, pierwszej drukowanej książki w Europie. Dwie karty ze Starego Testamentu (Księga Rodzaju).',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/gutenberg',
      tagIds: [tagIds['Historyczne'], tagIds['Starodruki']],
    },
    {
      type: 'document',
      title: 'Kronika polska Galla Anonima',
      creator: 'Gall Anonim',
      creationDate: '1113–1116',
      topographicSignature: 'ANK-RS-0001',
      descriptiveSignatureElementIds: [[ANK, RS], [elementIds['Kraków']]],
      numberOfPages: '156',
      documentType: 'Rękopis pergaminowy',
      dimensions: '24 × 17 cm',
      binding: 'Pergamin, oprawa skórzana z XVIII w.',
      condition: 'Zachowana częściowo, brak kilku kart',
      documentLanguage: 'Łacina',
      contentDescription: 'Najstarsza kronika polska, spisana po łacinie. Obejmuje dzieje Polski od czasów legendarnych do 1113 roku. Unikatowy rękopis z XII wieku.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowe.ank.gov.pl/gall',
      tagIds: [tagIds['Historyczne'], tagIds['Rękopisy']],
    },
    {
      type: 'unit',
      title: 'Zbiór rękopisów średniowiecznych z dawnej biblioteki katedralnej',
      creator: 'Biblioteka Kapitulna na Wawelu',
      creationDate: 'X–XV wiek',
      topographicSignature: 'ANK-RS-ZB-001',
      descriptiveSignatureElementIds: [[ANK, RS, RI]],
      contentDescription: 'Zbiór 47 rękopisów iluminowanych pochodzących z biblioteki katedralnej na Wawelu. Obejmuje kodeksy liturgiczne, ewangeliarze i psałterze od X do XV wieku.',
      tagIds: [tagIds['Historyczne'], tagIds['Rękopisy']],
    },
    {
      type: 'document',
      title: 'De revolutionibus orbium coelestium',
      creator: 'Mikołaj Kopernik',
      creationDate: '1543',
      topographicSignature: 'BJ-INK-0002',
      descriptiveSignatureElementIds: [[BJ, INK], [elementIds['1543']], [elementIds['Frombork']]],
      numberOfPages: '405',
      documentType: 'Starodruk',
      dimensions: '28 × 20 cm',
      binding: 'Półskórek z epoki',
      condition: 'Stan dobry, niewielkie ubytki na marginesach',
      documentLanguage: 'Łacina',
      contentDescription: 'Pierwsze wydanie dzieła Kopernika zawierającego heliocentryczną teorię Układu Słonecznego. Druk Johannes Petreius w Norymberdze. Egzemplarz z adnotacjami czytelnika z XVI wieku.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/kopernik',
      tagIds: [tagIds['Starodruki']],
    },
    {
      type: 'document',
      title: 'Kazania Sejmowe',
      creator: 'Piotr Skarga',
      creationDate: '1597',
      topographicSignature: 'BJ-SD-0001',
      descriptiveSignatureElementIds: [[BJ, SD], [elementIds['1597']], [elementIds['Kraków']]],
      numberOfPages: '320',
      documentType: 'Starodruk',
      dimensions: '20 × 15 cm',
      binding: 'Skóra tłoczona z epoki',
      condition: 'Stan dobry, kompletny egzemplarz',
      documentLanguage: 'Polski',
      contentDescription: 'Pierwsze wydanie słynnych kazań sejmowych Piotra Skargi, wydane w Krakowie u Andrzeja Piotrkowczyka. Kazania wzywające do reformy Rzeczypospolitej.',
      isDigitized: false,
      tagIds: [tagIds['Starodruki'], tagIds['Historyczne']],
    },
    {
      type: 'document',
      title: 'Pamiętniki Jana Chryzostoma Paska',
      creator: 'Jan Chryzostom Pasek',
      creationDate: 'ok. 1690',
      topographicSignature: 'BJ-RL-0001',
      descriptiveSignatureElementIds: [[BJ, RL], [elementIds['Wilno']]],
      numberOfPages: '284',
      documentType: 'Rękopis',
      dimensions: '21 × 16 cm',
      binding: 'Półskórek, brak grzbietu',
      condition: 'Stan średni, tekst w wielu miejscach wyblakły',
      documentLanguage: 'Polski',
      contentDescription: 'Rękopis pamiętników szlachcica sandomierskiego opisujących lata 1656–1688. Barwny obraz życia sarmackiego z okresu potopu szwedzkiego i wojen z Turcją.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/pasek',
      tagIds: [tagIds['Rękopisy'], tagIds['Literatura']],
    },
    {
      type: 'document',
      title: 'Gazeta Warszawska — pierwszy numer',
      creator: 'Stefan Łuskina',
      creationDate: '1774',
      topographicSignature: 'BJ-C19-0001',
      descriptiveSignatureElementIds: [[BJ, C19], [elementIds['1774']], [elementIds['Warszawa']]],
      numberOfPages: '4',
      documentType: 'Gazeta',
      dimensions: '34 × 21 cm',
      binding: 'Luźne arkusze',
      condition: 'Stan dobry, papier pożółkły, ślady złożenia',
      documentLanguage: 'Polski',
      contentDescription: 'Pierwszy numer najdłużej ukazującej się polskiej gazety. Zawiera informacje polityczne z kraju i ze świata, ogłoszenia oraz kalendarzyk liturgiczny.',
      isDigitized: true,
      digitizedVersionLink: 'https://polona.pl/gazeta-warszawska',
      tagIds: [tagIds['Czasopisma']],
    },
    {
      type: 'document',
      title: 'Pan Tadeusz — autograf poety',
      creator: 'Adam Mickiewicz',
      creationDate: '1834',
      topographicSignature: 'BJ-RL-0002',
      descriptiveSignatureElementIds: [[BJ, RL], [elementIds['1834']], [elementIds['Paryż']]],
      numberOfPages: '278',
      documentType: 'Rękopis',
      dimensions: '26 × 20 cm',
      binding: 'Półskórek współczesny',
      condition: 'Dobry, drobne poprawki i skreślenia autora',
      documentLanguage: 'Polski',
      contentDescription: 'Autograf poetycki Pana Tadeusza, ostatniego wielkiego poematu epickiego Adama Mickiewicza. Rękopis zawiera liczne poprawki i warianty tekstu.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/mickiewicz',
      tagIds: [tagIds['Rękopisy'], tagIds['Literatura']],
    },
    {
      type: 'document',
      title: 'Mapa Rzeczypospolitej Obojga Narodów z 1772 roku',
      creator: 'Karol de Perthees',
      creationDate: '1772',
      topographicSignature: 'ANK-ZK-0001',
      descriptiveSignatureElementIds: [[ANK, ZK], [elementIds['1772']], [elementIds['Warszawa']]],
      numberOfPages: '1',
      documentType: 'Mapa miedziorytowa',
      dimensions: '95 × 75 cm (arkusz)',
      binding: 'Luźna, oprawiona w passe-partout',
      condition: 'Stan dobry, delikatne przetarcia wzdłuż zagięć',
      documentLanguage: 'Francuski, polski',
      contentDescription: 'Mapa ścienna Rzeczypospolitej w granicach przed I rozbiorem. Miedzioryt kolorowany ręcznie, z kartuszem herbowym i scenami rodzajowymi.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowe.ank.gov.pl/mapa-1772',
      tagIds: [tagIds['Kartografia']],
    },
    {
      type: 'document',
      title: 'Dziennik Poznański — rocznik 1859',
      creator: 'Redakcja Dziennika Poznańskiego',
      creationDate: '1859',
      topographicSignature: 'BJ-C19-0002',
      descriptiveSignatureElementIds: [[BJ, C19], [elementIds['1859']], [elementIds['Poznań']]],
      numberOfPages: '876',
      documentType: 'Czasopismo oprawne',
      dimensions: '30 × 22 cm',
      binding: 'Półskórek, grzbiet z tłoczeniami',
      condition: 'Stan dobry, nieliczne plamy',
      documentLanguage: 'Polski',
      contentDescription: 'Kompletny rocznik 1859 Dziennika Poznańskiego — jednej z najważniejszych gazet wielkopolskich. Zawiera artykuły polityczne, sprawozdania z sejmu pruskiego i ogłoszenia.',
      isDigitized: false,
      tagIds: [tagIds['Czasopisma']],
    },
    {
      type: 'document',
      title: 'Kodeks supraski',
      creator: 'Skrybowie cyryliccy',
      creationDate: 'XI wiek',
      topographicSignature: 'BJ-RS-0002',
      descriptiveSignatureElementIds: [[BJ, RS], [elementIds['Wilno']]],
      numberOfPages: '168',
      documentType: 'Rękopis cyrylicki',
      dimensions: '25 × 18 cm',
      binding: 'Deski w skórze, okucia mosiężne',
      condition: 'Stan średni, brak 12 kart',
      documentLanguage: 'Starocerkiewnosłowiański',
      contentDescription: 'Jeden z najstarszych zabytków piśmiennictwa cyrylickiego. Zawiera teksty liturgiczne i homilie, spisany w XI wieku w skryptorze na Rusi Kijowskiej.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/supraski',
      tagIds: [tagIds['Rękopisy'], tagIds['Historyczne']],
    },
    {
      type: 'document',
      title: 'Statuty Litewskie — I Statut',
      creator: 'Kancelaria Wielkiego Księstwa Litewskiego',
      creationDate: '1529',
      topographicSignature: 'AGAD-DP-0001',
      descriptiveSignatureElementIds: [[AGAD, DP], [elementIds['Wilno']]],
      numberOfPages: '240',
      documentType: 'Rękopis',
      dimensions: '31 × 21 cm',
      binding: 'Aksamit czerwony, tłoczenia złote',
      condition: 'Stan dobry, renowacja w 1928 r.',
      documentLanguage: 'Ruski (starobiałoruski)',
      contentDescription: 'Odpis I Statutu Litewskiego z 1529 roku — pierwszej kodyfikacji prawa litewskiego. Rękopis na pergaminie z iluminowanym inicjałem.',
      isDigitized: true,
      digitizedVersionLink: 'https://agad.gov.pl/statut-litewski',
      tagIds: [tagIds['Archiwalia'], tagIds['Historyczne']],
    },
    {
      type: 'document',
      title: 'Bogurodzica — najstarszy zapis',
      creator: 'Nieznany skryba',
      creationDate: 'ok. 1407',
      topographicSignature: 'BJ-RS-0003',
      descriptiveSignatureElementIds: [[BJ, RS], [elementIds['Kraków']]],
      numberOfPages: '2',
      documentType: 'Rękopis',
      dimensions: '28 × 20 cm',
      binding: 'Karta w oprawie zbiorczej',
      condition: 'Stan średni, tekst częściowo uszkodzony',
      documentLanguage: 'Polski (z lacinizacjami)',
      contentDescription: 'Najstarszy znany zapis najdawniejszej polskiej pieśni religijnej Bogurodzica, wraz z zapisem nutacyjnym. Wpisany na kartę rękopisu łacińskiego.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowa.bj.uj.edu.pl/bogurodzica',
      tagIds: [tagIds['Rękopisy'], tagIds['Literatura']],
    },
    {
      type: 'document',
      title: 'O poprawie Rzeczypospolitej',
      creator: 'Andrzej Frycz Modrzewski',
      creationDate: '1551',
      topographicSignature: 'ANK-SD-0002',
      descriptiveSignatureElementIds: [[ANK, SD], [elementIds['1543']], [elementIds['Kraków']]],
      numberOfPages: '380',
      documentType: 'Starodruk',
      dimensions: '30 × 19 cm',
      binding: 'Skóra cielęca z epoki, tłoczenia',
      condition: 'Stan dobry, brak 2 kart',
      documentLanguage: 'Łacina',
      contentDescription: 'Pierwsze wydanie dzieła Commentariorum de Republica emendanda libri quinque. Traktat o reformie państwa, drukowany w Bazylei. Egzemplarz z exlibrisem bibliofilskim.',
      isDigitized: false,
      tagIds: [tagIds['Starodruki'], tagIds['Historyczne']],
    },
    {
      type: 'document',
      title: 'Treny Jana Kochanowskiego — I wydanie',
      creator: 'Jan Kochanowski',
      creationDate: '1580',
      topographicSignature: 'BJ-SD-0003',
      descriptiveSignatureElementIds: [[BJ, SD, DU], [elementIds['Kraków']]],
      numberOfPages: '48',
      documentType: 'Starodruk',
      dimensions: '19 × 14 cm',
      binding: 'Broszura, brak oprawy',
      condition: 'Stan dobry, papier czerpany, ślady wilgoci',
      documentLanguage: 'Polski',
      contentDescription: 'Pierwsze wydanie Trenów w Drukarni Łazarzowej w Krakowie. Jeden z zaledwie kilku zachowanych egzemplarzy tego wydania.',
      isDigitized: true,
      digitizedVersionLink: 'https://polona.pl/treny-1580',
      tagIds: [tagIds['Starodruki'], tagIds['Literatura']],
    },
    {
      type: 'document',
      title: 'Merkuriusz Polski — pierwsza polska gazeta',
      creator: 'Paweł Pater',
      creationDate: '1661',
      topographicSignature: 'AGAD-DP-0002',
      descriptiveSignatureElementIds: [[AGAD, DP], [elementIds['1661']], [elementIds['Kraków']]],
      numberOfPages: '8',
      documentType: 'Gazeta',
      dimensions: '33 × 20 cm',
      binding: 'Luźne arkusze',
      condition: 'Stan średni, brzegi nadwątlone',
      documentLanguage: 'Polski',
      contentDescription: 'Pierwszy numer Merkuriusza Polskiego — pierwszej polskiej gazety periodycznej. Zawiera wiadomości z wojny polsko-kozackiej i dworu królewskiego.',
      isDigitized: true,
      digitizedVersionLink: 'https://polona.pl/merkuriusz',
      tagIds: [tagIds['Czasopisma'], tagIds['Historyczne']],
    },
    {
      type: 'document',
      title: 'Atlas Świata Mercatora',
      creator: 'Gerardus Mercator',
      creationDate: '1595',
      topographicSignature: 'ANK-ZK-0002',
      descriptiveSignatureElementIds: [[ANK, ZK, MR], [elementIds['1597']], [elementIds['Gdańsk']]],
      numberOfPages: '350',
      documentType: 'Atlas',
      dimensions: '42 × 30 cm',
      binding: 'Skóra tłoczona z okuciami mosiężnymi',
      condition: 'Stan dobry, mapy kolorowane ręcznie',
      documentLanguage: 'Łacina',
      contentDescription: 'Atlas sive cosmographicae meditationes de fabrica mundi — jeden z najważniejszych atlasów w historii kartografii. Egzemplarz z kolekcji Heweliusza.',
      isDigitized: true,
      digitizedVersionLink: 'https://cyfrowe.ank.gov.pl/mercator',
      tagIds: [tagIds['Kartografia']],
    },
    {
      type: 'document',
      title: 'Konstytucja 3 Maja — rękopis',
      creator: 'Stanisław August Poniatowski, Sejm Wielki',
      creationDate: '1791',
      topographicSignature: 'AGAD-MK-0001',
      descriptiveSignatureElementIds: [[AGAD, MK], [elementIds['1791']], [elementIds['Warszawa']]],
      numberOfPages: '14',
      documentType: 'Dokument państwowy',
      dimensions: '35 × 22 cm',
      binding: 'Pergamin, oprawa aksamitna z herbem Rzeczypospolitej',
      condition: 'Stan dobry po konserwacji (2016)',
      documentLanguage: 'Polski',
      contentDescription: 'Oryginalny rękopis Konstytucji 3 Maja 1791 roku. Dokument na pergaminie z podpisami króla Stanisława Augusta Poniatowskiego, marszałków Sejmu Wielkiego i posłów.',
      isDigitized: true,
      digitizedVersionLink: 'https://agad.gov.pl/konstytucja-3-maja',
      tagIds: [tagIds['Historyczne'], tagIds['Rękopisy'], tagIds['Archiwalia']],
    },
    {
      type: 'document',
      title: 'Lalka — rękopis roboczy',
      creator: 'Bolesław Prus',
      creationDate: '1890',
      topographicSignature: 'BJ-RL-0003',
      descriptiveSignatureElementIds: [[BJ, RL], [elementIds['1890']], [elementIds['Warszawa']]],
      numberOfPages: '634',
      documentType: 'Rękopis',
      dimensions: '22 × 18 cm',
      binding: 'Zeszyty szyte, nieliczbowane',
      condition: 'Stan zróżnicowany, część kart mocno zniszczona',
      documentLanguage: 'Polski',
      contentDescription: 'Rękopis roboczy powieści Lalka Bolesława Prusa. Zawiera liczne skreślenia, dopiski na marginesach i warianty fragmentów. Nieocenione źródło do badań nad procesem twórczym pisarza.',
      isDigitized: true,
      digitizedVersionLink: 'https://polona.pl/lalka-rekopis',
      tagIds: [tagIds['Literatura'], tagIds['Rękopisy']],
    },
    {
      type: 'document',
      title: 'Album fotografii Warszawy z 1873 roku',
      creator: 'Konrad Brandel',
      creationDate: '1873',
      topographicSignature: 'ANK-DU-0001',
      descriptiveSignatureElementIds: [[ANK, SD, DU], [elementIds['1873']], [elementIds['Warszawa']]],
      numberOfPages: '60',
      documentType: 'Album fotograficzny',
      dimensions: '35 × 27 cm',
      binding: 'Płótno z tłoczeniami',
      condition: 'Stan dobry, niektóre fotografie z zażółceniami',
      documentLanguage: 'Polski',
      contentDescription: 'Album 60 fotografii Warszawy autorstwa Konrada Brandla, jednego z pierwszych polskich fotografów. Ujęcia architektury, ulic i życia codziennego stolicy.',
      isDigitized: false,
      tagIds: [tagIds['Archiwalia'], tagIds['Historyczne']],
    },
  ];

  const docIds: number[] = [];
  for (const d of docs) {
    const res = await api('PUT', '/api/archive/document', d, adminToken);
    if (res.status === 201) {
      docIds.push(res.body.archiveDocumentId);
      console.log(`  "${d.title}": id=${res.body.archiveDocumentId}`);
    } else {
      console.error(`  Nie udało się utworzyć "${d.title}":`, res.text);
    }
  }

  // 7b. Miękkie usunięcie jednej przykładowej pozycji (demonstracja usuwania/przywracania)
  const deletedIds: number[] = [];
  if (docIds.length > 0) {
    const delId = docIds[docIds.length - 1];
    const delRes = await api('DELETE', `/api/archive/document/id/${delId}`, undefined, adminToken);
    if (delRes.status === 204) {
      deletedIds.push(delId);
      console.log(`  Miękko usunięto przykładową pozycję: id=${delId}`);
    } else {
      console.error(`  Nie udało się miękko usunąć dokumentu id=${delId}:`, delRes.text);
    }
  }

  // 8. Create notes
  console.log('\n--- Tworzenie notatek ---');
  const notes = [
    { title: 'Ocena stanu zachowania rękopisów', content: 'Wstępna ocena stanu zachowania rękopisów średniowiecznych w zbiorze ANK. Większość wymaga konserwacji. Zalecane: oczyszczenie mechaniczne i kontrola klimatu.', shared: false, tagIds: [tagIds['Rękopisy']] },
    { title: 'Plan digitalizacji starodruków', content: 'Kolejna partia starodruków zakwalifikowana do digitalizacji w II kwartale. Obejmuje 47 jednostek z kolekcji Biblioteki Jagiellońskiej. Priorytet: druki z XVI wieku.', shared: true, tagIds: [tagIds['Starodruki']] },
    { title: 'Nowy nabytek — rękopis z XVII w.', content: 'Zakupiono na aukcji w Londynie rękopis pamiętników szlachcica z czasów Jana III Sobieskiego. Wymaga weryfikacji autentyczności i opracowania wstępnego.', shared: true, tagIds: [tagIds['Rękopisy'], tagIds['Historyczne']] },
    { title: 'Konserwacja map z kolekcji ANK', content: 'Mapa Rzeczypospolitej z 1772 r. wymaga pilnej konserwacji. Przetarcia wzdłuż linii zagięć. Zlecono wykonanie passe-partout bezkwasowego.', shared: false, tagIds: [tagIds['Kartografia']] },
    { title: 'Plan skatalogowania czasopism XIX-wiecznych', content: 'Opracowanie nowego inwentarza czasopism XIX-wiecznych z kolekcji BJ. Do skatalogowania 236 tytułów. Przewidywany czas realizacji: 6 miesięcy.', shared: true, tagIds: [tagIds['Czasopisma']] },
  ];

  for (const n of notes) {
    const res = await api('PUT', '/api/note', n, adminToken);
    if (res.status === 201) {
      console.log(`  "${n.title}": id=${res.body.noteId}`);
    } else {
      console.error(`  Nie udało się utworzyć notatki "${n.title}":`, res.text);
    }
  }

  console.log('\n--- Zasiewanie zakończone ---');
  console.log(`Użytkownicy: ${users.length + 1} (z adminem)`);
  console.log(`Tagów: ${tags.length}`);
  console.log(`Komponentów sygnatury: ${components.length}`);
  console.log(`Elementów sygnatury: ${Object.keys(elementIds).length}`);
  console.log(`Dokumentów: ${docIds.length} (w tym usuniętych: ${deletedIds.length})`);
  console.log(`Notatek: ${notes.length}`);
}

main().catch(err => {
  console.error('Skrypt zasiewania nie powiódł się:', err);
  process.exit(1);
});
