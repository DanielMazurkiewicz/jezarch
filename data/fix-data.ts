/**
 * fix-data.ts — one-shot data repair for the inventory JSON files.
 *
 * What it does (in place, with .bak backups):
 * 1. Document topographic signatures: combined unit signature + original item
 *    number (verbatim), e.g. unit "298-I" + doc "nr 1" -> "298-I/nr 1".
 *    Docs without an item number keep the bare unit signature.
 * 2. Unit -> document inheritance (plain copy into the document object when the
 *    document field is empty): creator, creationDate, creationPlace,
 *    documentType, dimensions, binding, condition, documentLanguage, seals.
 *    numberOfPages / contentDescription are NOT inherited (they describe the
 *    whole unit, not an individual item).
 * 3. Creation dates normalized to yyyy-mm-dd / yyyy-mm / yyyy (also for ranges
 *    like "yyyy-yyyy" and lists of dates). The original value is preserved in
 *    remarks as a normalization note. Place names found inside the date field
 *    are moved to creationPlace when it is empty, otherwise noted in remarks.
 * 4. Units get the same date normalization applied.
 *
 * Usage: bun data/fix-data.ts [file ...]   (default: units.json + processed/*)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Date normalization
// ---------------------------------------------------------------------------

const stripDiacritics = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '');

function romanToInt(s: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === undefined) return null;
    const v = map[ch];
    if (!v) return null;
    const nextCh = s[i + 1];
    const next = nextCh === undefined ? 0 : (map[nextCh] ?? 0);
    if (next > v) total -= v; else total += v;
  }
  return total;
}

/** Read a named capture group from a dynamic-RegExp match (groups are string|undefined). */
function grp(m: RegExpMatchArray | null, name: string): string | null {
  const v = m?.groups?.[name];
  return v ?? null;
}

function monthFromName(name: string): number | null {
  const n = stripDiacritics(name).toLowerCase().trim().replace(/\.$/, '');
  if (!n) return null;
  const MONTHS: [string[], number][] = [
    [['styczn', 'styczen'], 1],
    [['lut'], 2],
    [['mar'], 3],
    [['kwi'], 4],
    [['maj', 'maja'], 5],
    [['czer', 'czerv'], 6],
    [['lip'], 7],
    [['sierp'], 8],
    [['wrz', 'wrzes'], 9],
    [['pazdziern'], 10],
    [['listopad', 'listop', 'lis'], 11],
    [['grudzien', 'grudni'], 12],
    [['januar'], 1],
    [['februari'], 2],
    [['mart'], 3],
    [['april', 'aprili'], 4],
    [['mai', 'maio'], 5],
    [['juni'], 6],
    [['julii', 'jul'], 7],
    [['august'], 8],
    [['septemb', 'sept'], 9],
    [['octob'], 10],
    [['novemb'], 11],
    [['decemb'], 12],
  ];
  for (const [stems, m] of MONTHS) {
    if (stems.some(st => n.startsWith(st))) return m;
  }
  return null;
}

const ROMAN = String.raw`M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})`;
const DAY = String.raw`(?:3[0-1]|[12]\d|[1-9])`;
// month: roman I..XII OR a name (with Polish/Latin inflection endings); named capture
function monthRe(name: string): string {
  return String.raw`(?<${name}>(?:${ROMAN})|[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż.]+)(?:iej|ego|a|i|u|ów|em|ym|ie|ów|ej|y|ą|ę)?`;
}

/** Resolve a month token (roman or name) to 1-12. */
function resolveMonth(token: string | null | undefined): number | null {
  if (!token) return null;
  const r = romanToInt(token.toUpperCase());
  if (r !== null && r >= 1 && r <= 12) return r;
  return monthFromName(token);
}

function clean(s: string): string {
  // replacements pad with spaces so adjacent tokens never merge ("VIII]1868" -> "VIII 1868")
  return s
    .replace(/\s+/g, ' ')
    .replace(/\[(.*?)\]/g, ' $1 ') // bracketed text: keep the content
    .replace(/[\[\]]/g, ' ') // stray brackets
    .replace(/\(\d{1,4}\?\)/g, ' ') // "(1735?)" style year doubts
    .replace(/\(\?\)/g, ' ')
    .replace(/\?(?=\s*[-–/])/g, '') // "1898?-1904"
    .replace(/\bdie\b/gi, ' ')
    .replace(/\bd\./g, ' ')
    .replace(/\bAnno\b/gi, ' ')
    .replace(/\bA\.?\s?D\.?/gi, ' ')
    .replace(/\bultima\b/gi, ' ')
    .trim()
    .replace(/\?\s*$/, '') // trailing uncertainty marker
    .replace(/^[,\.\-–]+/g, '')
    .replace(/(?<![rt])[,\.\-–]+$/g, '') // trailing punctuation (keep the dot of a trailing r./t.)
    .replace(/\s+(?:r\.|t\.)$/, '') // trailing "r." / "t."
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract a leading place name (1-3 words) before the first date-ish token. */
function stripPlace(s: string): [string | null, string] {
  const words = s.split(' ');
  for (let i = 1; i <= Math.min(3, words.length); i++) {
    const restWords = words.slice(i);
    const first = restWords[0] ?? '';
    // the rest must start with a digit, a roman month, or a month name
    const isDateStart = /^\d/.test(first) || monthFromName(first) !== null
      || (romanToInt(first.toUpperCase()) !== null && restWords.length > 1);
    if (!isDateStart) continue;
    const place = words.slice(0, i).join(' ').replace(/^[,\.\-–]+|[,\.\-–]+$/g, '');
    // a word that is a month name or a roman number is not a place
    const isDateWord = (w: string) => monthFromName(w) !== null || romanToInt(w.toUpperCase()) !== null;
    if (place && /^\p{Lu}/u.test(place) && !words.slice(0, i).some(isDateWord)) {
      return [place, restWords.join(' ')];
    }
  }
  return [null, s];
}

function pad2(n: number): string { return String(n).padStart(2, '0'); }

/** Try to parse a single date expression into yyyy-mm-dd / yyyy-mm / yyyy. */
function tryParseDate(s: string): string | null {
  const t = clean(s);
  if (!t) return null;

  // already-normalized ISO values pass through unchanged (idempotency);
  // month/day must be in range so "1826-28" still reads as an abbreviated range
  let v: string | null;
  let m: RegExpMatchArray | null = t.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (m) {
    const mo = m[2] !== undefined ? Number(m[2]) : null;
    const d = m[3] !== undefined ? Number(m[3]) : null;
    if ((!mo || (mo >= 1 && mo <= 12)) && (!d || (d >= 1 && d <= 31))) return t;
  }

  // year range (incl. slash); swap if reversed (OCR errors)
  m = t.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/);
  if (m) { const a = Number(m[1]!), b = Number(m[2]!); return a <= b ? `${m[1]}-${m[2]}` : `${m[2]}-${m[1]}`; }

  // abbreviated range: 1723/24, 1826-28 (swap if expansion reverses the range)
  m = t.match(/^(\d{4})\s*[-–/]\s*(\d{2})(?:\s*(?:w\.?|r\.?|t\.?))?\s*$/);
  if (m) {
    const y = m[1]!, end = `${y.slice(0, 2)}${m[2]!}`;
    return Number(end) < Number(y) ? `${end}-${y}` : `${y}-${end}`;
  }

  // day month year — many orders
  const dmy = (mm: RegExpMatchArray | null): string | null => {
    if (!mm) return null;
    const d = grp(mm, 'd'), mo = resolveMonth(grp(mm, 'mo')), y = grp(mm, 'y');
    if (!d || !mo || !y) return null;
    return `${y}-${pad2(mo)}-${pad2(Number(d))}`;
  };
  m = t.match(new RegExp(`^(?<d>${DAY})\\s+${monthRe('mo')}\\s+(?<y>\\d{4})$`));
  if ((v = dmy(m))) return v;
  m = t.match(new RegExp(`^(?<y>\\d{4})\\s+${monthRe('mo')}\\s+(?<d>${DAY})$`));
  if ((v = dmy(m))) return v;
  m = t.match(new RegExp(`^${monthRe('mo')}\\s+(?<d>${DAY})\\s+(?<y>\\d{4})$`));
  if ((v = dmy(m))) return v;
  m = t.match(new RegExp(`^(?<d>${DAY})\\s*[-–/]\\s*${monthRe('mo')}\\s+(?<y>\\d{4})$`));
  if ((v = dmy(m))) return v;
  m = t.match(new RegExp(`^(?<d>${DAY})${monthRe('mo')}\\s+(?<y>\\d{4})$`)); // no space: 10IV 1912
  if ((v = dmy(m))) return v;
  m = t.match(new RegExp(`^(?<y>\\d{4})\\s*[-–/]\\s*${monthRe('mo')}\\s+(?<d>${DAY})$`));
  if ((v = dmy(m))) return v;

  // dotted d.m.y
  m = t.match(/^(?:d\.?\s*)?(\d{1,2})[.\s](\d{1,2})[.\s](\d{4})$/);
  if (m) { const d = Number(m[1]!), mo = Number(m[2]!); if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[3]}-${pad2(mo)}-${pad2(d)}`; }

  // multiple days in one month: 8, 9, 17 III 1730 -> month level
  m = t.match(new RegExp(`^(?:\\d{1,2}\\s*,\\s*)+${monthRe('mo')}(?:\\s+(?<y>\\d{4}))?$`));
  if (m) { const mo = resolveMonth(grp(m, 'mo')); if (mo) return grp(m, 'y') ? `${grp(m, 'y')}-${pad2(mo)}` : null; }

  // day range within a month: 3-7 IX 1894, 17/30 VIII 1913 -> month level
  m = t.match(new RegExp(`^(?<d1>${DAY})\\s*[-–/]\\s*\\d{1,2}\\s+${monthRe('mo')}(?:\\s+(?<y>\\d{4}))?$`));
  if (m) { const mo = resolveMonth(grp(m, 'mo')); if (mo) return grp(m, 'y') ? `${grp(m, 'y')}-${pad2(mo)}` : null; }

  // double date sharing a year: 22 VI-1 VII 1901, 19 VIII/ 1 IX 1913 (chronological order)
  m = t.match(new RegExp(`^(?<d1>${DAY})\\s*${monthRe('mo1')}\\s*[-–/]\\s*(?<d2>${DAY})\\s*${monthRe('mo2')}\\s*(?<y>\\d{4})$`));
  if (m) {
    const mo1 = resolveMonth(grp(m, 'mo1'));
    const mo2 = resolveMonth(grp(m, 'mo2'));
    const y = grp(m, 'y'), d1 = grp(m, 'd1'), d2 = grp(m, 'd2');
    if (mo1 && mo2 && y && d1 && d2) {
      const a = `${y}-${pad2(mo1)}-${pad2(Number(d1))}`;
      const b = `${y}-${pad2(mo2)}-${pad2(Number(d2))}`;
      return a <= b ? `${a}/${b}` : `${b}/${a}`;
    }
  }

  // day + month, no year -> "mm-dd" fragment (merged with a year part by caller)
  m = t.match(new RegExp(`^(?<d>${DAY})\\s+${monthRe('mo')}$`));
  if (m) { const mo = resolveMonth(grp(m, 'mo')); const d = grp(m, 'd'); if (mo && d) return `${pad2(mo)}-${pad2(Number(d))}`; }

  // month + year -> yyyy-mm
  m = t.match(new RegExp(`^${monthRe('mo')}\\s+(?<y>\\d{4})$`));
  if (m) { const mo = resolveMonth(grp(m, 'mo')); const y = grp(m, 'y'); if (mo && y) return `${y}-${pad2(mo)}`; }
  m = t.match(new RegExp(`^(?<y>\\d{4})\\s+${monthRe('mo')}$`));
  if (m) { const mo = resolveMonth(grp(m, 'mo')); const y = grp(m, 'y'); if (mo && y) return `${y}-${pad2(mo)}`; }

  // bare year
  m = t.match(/^(\d{4})[.]?\s*(?:w\.?)?$/);
  if (m) return m[1]!;

  // corrupted month with leading digit: "15 7bris 1685" -> day=15, month=7
  m = t.match(/^(\d{1,2})\s*(\d{1,2})?([a-z]{2,})\s+(\d{4})$/i);
  if (m) {
    const lead = m[2] !== undefined ? Number(m[2]) : null;
    const stem = stripDiacritics(m[3]!).toLowerCase();
    const stemMonths: Record<string, number> = { bris: 7, bru: 1 };
    const mo = (lead !== null && lead >= 1 && lead <= 12 ? lead : null) ?? stemMonths[stem] ?? null;
    if (mo) return `${m[4]}-${pad2(mo)}-${pad2(Number(m[1]!))}`;
  }

  return null;
}

const UNDATED_MARKERS = new Set(['b.d.', 'b.r.', 'b. r.', 'brak dat', 'bez daty', 'nn', 'nieznana']);

/** Normalize one date part (no comma-splitting). */
function normalizePart(raw: string): { value: string | null; place?: string | null } {
  let s = clean(raw);
  if (!s) return { value: null };

  // qualifier prefixes: ok., pocz., początek, kon., koniec, c., A./Ao., z roku
  s = s.replace(/^(?:ok\.?|pocz\.?|początek|kon\.?|koniec|c\.?|a\.?|ao|z roku|z r\.)\s+/i, '').trim();
  // relative: po/przed/post/do + date -> keep the date part
  s = s.replace(/^(?:po|przed|post|do)\s+/i, '').trim();

  const [place, rest] = stripPlace(s);
  const body = rest ?? s;

  // century range: XVIII-XIX w., XVII/XVIII w., Wiek XIX-XX (note: clean() may have eaten the dot in "w.")
  let m = body.match(new RegExp(`^(?:wiek|stolecie)\\s*(?<c1>${ROMAN})\\s*[-–/]\\s*(?<c2>${ROMAN})(?:\\s*(?:w\\.?|wiek|stolecie))?\\s*$`, 'i'));
  if (!m) m = body.match(new RegExp(`^(?<c1>${ROMAN})\\s*[-–/]\\s*(?<c2>${ROMAN})(?:\\s*(?:w\\.?|wiek|stolecie))?\\s*$`, 'i'));
  if (m) {
    const c1 = grp(m, 'c1'), c2 = grp(m, 'c2');
    const v1 = c1 ? romanToInt(c1.toUpperCase()) : null, v2 = c2 ? romanToInt(c2.toUpperCase()) : null;
    if (v1 && v2) return { value: `${(v1 - 1) * 100 + 1}-${v2 * 100}`, place };
  }

  // century half: I poł XIX w., II poł. XX w.
  m = body.match(new RegExp(`^(?<h>${ROMAN})\\s+(?:pol|poł|pół)\\.?\\s+(?<c>${ROMAN})(?:\\s*(?:w\\.?|wiek|stolecie))?$`, 'i'));
  if (m) {
    const h = grp(m, 'h'), c = grp(m, 'c');
    const half = h ? romanToInt(h.toUpperCase()) : null, cv = c ? romanToInt(c.toUpperCase()) : null;
    if (half && cv) {
      const start = half === 1 ? (cv - 1) * 100 + 1 : (cv - 1) * 100 + 51;
      const end = half === 1 ? (cv - 1) * 100 + 50 : cv * 100;
      return { value: `${start}-${end}`, place };
    }
  }

  // single century — requires an explicit marker (w./wiek/stolecie) to avoid
  // confusing a bare roman number with a century
  m = body.match(new RegExp(`^(?:wiek|stolecie)\\s*(?<c>${ROMAN})$`, 'i'));
  if (m) { const c = grp(m, 'c'); const v = c ? romanToInt(c.toUpperCase()) : null; if (v && v <= 30) return { value: `${(v - 1) * 100 + 1}-${v * 100}`, place }; }
  m = body.match(new RegExp(`^(?<c>${ROMAN})\\s+(?:w\\.?|wiek|stolecie)$`, 'i'));
  if (m) { const c = grp(m, 'c'); const v = c ? romanToInt(c.toUpperCase()) : null; if (v && v <= 30) return { value: `${(v - 1) * 100 + 1}-${v * 100}`, place }; }

  // Anno YYYY / YYYY in Month / ultima Aprilis Anno 1649
  m = body.match(/^(?:in\s+)?([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż.]+)\s+(\d{4})$/);
  if (m) { const mo = monthFromName(m[1]!); if (mo) return { value: `${m[2]}-${pad2(mo)}`, place }; }
  m = body.match(/^(\d{4})\s+(?:in\s+)?([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż.]+)$/);
  if (m) { const mo = monthFromName(m[2]!); if (mo) return { value: `${m[1]}-${pad2(mo)}`, place }; }

  // od X do Y -> range (years or full dates)
  m = body.match(/^od\s+(.+?)\s+do\s+(.+)$/);
  if (m) {
    const a = normalizePart(m[1]!).value, b = normalizePart(m[2]!).value;
    if (a && b) {
      const bothYears = /^\d{4}$/.test(a) && /^\d{4}$/.test(b);
      return { value: bothYears ? `${a}-${b}` : `${a}/${b}`, place };
    }
  }

  // century label followed by a range (brackets / OCR noise tolerated):
  // "XIX wiek [1848-1862]", "XIX wiek [1827-1828?-1879]" -> the outer range wins
  m = body.match(new RegExp(`^(?<c>${ROMAN})\\s+(?:wiek|stolecie|w\\.?)\\s+.*?(?<y1>\\d{4}).*?[-–].*?(?<y2>\\d{4})$`));
  if (m) {
    const c = grp(m, 'c'), y1s = grp(m, 'y1'), y2s = grp(m, 'y2');
    if (c && y1s && y2s) {
      const cv = romanToInt(c.toUpperCase());
      const y1 = Number(y1s), y2 = Number(y2s);
      if (cv && y1 >= (cv - 1) * 100 + 1 && y2 <= cv * 100) {
        return { value: y1 <= y2 ? `${y1s}-${y2s}` : `${y2s}-${y1s}`, place };
      }
    }
  }

  // bare roman string: >=50 -> year (MDCCCLXVIII); 4..30 -> century (XIX -> 1801-1900)
  if (/^[IVXLCDM]+$/i.test(body)) {
    const v = romanToInt(body.toUpperCase());
    if (v && v >= 50) return { value: String(v).padStart(4, '0'), place };
    if (v && v >= 4 && v <= 30) return { value: `${String((v - 1) * 100 + 1).padStart(4, '0')}-${String(v * 100).padStart(4, '0')}`, place };
  }

  // bare year
  m = body.match(/^(\d{4})[.]?\s*(?:w\.?)?$/);
  if (m) return { value: m[1]!, place };

  // list markers: "1. 12 III 1715" / "2) 1901"
  m = body.match(/^[1-9][.)]\s+(.+)$/);
  if (m) { const r = normalizePart(m[1]!); if (r.value) return r; }

  // full parse
  const parsed = tryParseDate(body);
  if (parsed) return { value: parsed, place };

  // slash-separated pair of ISO dates (a range): keep, swap if reversed
  m = body.match(/^(\d{4}(?:-\d{2})?(?:-\d{2})?)\s*\/\s*(\d{4}(?:-\d{2})?(?:-\d{2})?)$/);
  if (m) {
    const k = (s: string): [number, number, number] => { const p = s.split('-').map(Number); return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]; };
    const ka = k(m[1]!), kb = k(m[2]!);
    const aFirst = ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] < kb[1]) || (ka[0] === kb[0] && ka[1] === kb[1] && ka[2] < kb[2]);
    return { value: aFirst ? `${m[1]}/${m[2]}` : `${m[2]}/${m[1]}`, place };
  }

  // generic "A – B" range where both sides parse (e.g. "28 I 1668 – 21 V 1672",
  // "XII 1821 - 1860", "VII 1894- I 1897") — skipped for already-ISO values
  m = /^\d{4}-\d{2}/.test(body) ? null : body.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (m) {
    const a = normalizePart(m[1]!).value, b = normalizePart(m[2]!).value;
    if (a && b) {
      const bothYears = /^\d{4}$/.test(a) && /^\d{4}$/.test(b);
      // emit in chronological order (idempotent with the slash-pair rule)
      let va = a, vb = b;
      if (bothYears) {
        if (Number(a) > Number(b)) { va = b; vb = a; }
      } else {
        const k = (s: string): [number, number, number] => { const p = s.split('-').map(Number); return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]; };
        const ka = k(a), kb = k(b);
        const aFirst = ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] < kb[1]) || (ka[0] === kb[0] && ka[1] === kb[1] && ka[2] < kb[2]);
        if (!aFirst) { va = b; vb = a; }
      }
      return { value: bothYears ? `${va}-${vb}` : `${va}/${vb}`, place };
    }
  }

  // last resort: a single 4-digit year anywhere in the part (no lists, no century words,
  // never on values that already look normalized or contain an unhandled -/–// separator)
  if (!body.includes(',') && !/wiek|stolecie/i.test(body) && !/^\d{4}-\d{2}/.test(body) && !/-|–|\//.test(body)) {
    m = body.match(/(\d{4})/);
    if (m && (body.match(/\d{4}/g) ?? []).length === 1) return { value: m[1]!, place };
  }

  // digit-free remainder that looks like a proper noun (not a roman number) -> place
  if (!/\d/.test(body) && !/^[IVXLCDM]+$/i.test(body) && /^\p{Lu}/u.test(body)) return { value: null, place: body };

  return { value: null, place };
}

/** Normalize a full creationDate value (may contain multiple dates). */
export function normalizeDate(raw: string | null | undefined): { value: string | null; changed: boolean; place?: string | null } {
  if (!raw || !raw.trim()) return { value: null, changed: false };
  const original = raw.trim();

  // undated markers stay as-is
  if (UNDATED_MARKERS.has(stripDiacritics(original).toLowerCase().replace(/\s+/g, ' '))) {
    return { value: original, changed: false };
  }

  // try the whole string first (handles place prefixes, multiple days in one month).
  // A bare month/day fragment without a year is not a valid standalone value.
  const whole = normalizePart(original);
  if (whole.value && !/^\d{2}(-\d{2})?$/.test(whole.value)) return { value: whole.value, changed: whole.value !== original, place: whole.place };

  // lists: commas/semicolons and conjunctions "i" / "et" / "lub".
  // Split the cleaned string so bracketed conjunctions ("[lub 1908]") also split.
  const parts = clean(original).split(/[,;]|\s+i\s+|\set\s+|\slub\s+/i).map(p => p.trim()).filter(Boolean);
  const results: string[] = [];
  const bareMonths: string[] = [];
  let place: string | undefined;

  for (const part of parts) {
    const r = normalizePart(part);
    if (r.place && !place) place = r.place;
    if (!r.value) continue;
    // "mm" or "mm-dd" fragments wait for a bare year part to merge with
    if (/^\d{2}(-\d{2})?$/.test(r.value)) { bareMonths.push(r.value); continue; }
    results.push(r.value);
  }

  // merge month/day fragments with a bare year (either order); each fragment becomes a full date
  const yi = results.findIndex(x => /^\d{4}$/.test(x));
  if (yi !== -1 && bareMonths.length > 0) {
    const year = results[yi] as string;
    results.splice(yi, 1);
    for (const frag of bareMonths) results.push(`${year}-${frag}`);
  }

  if (results.length === 0) {
    // nothing parseable: keep original value unchanged
    return { value: original, changed: false, place };
  }

  const value = results.join(', ');
  return { value, changed: value !== original, place };
}

// ---------------------------------------------------------------------------
// Fix logic
// ---------------------------------------------------------------------------

interface Doc {
  title?: string | null;
  creator?: string | null;
  creationDate?: string | null;
  numberOfPages?: number | null;
  topographicSignature?: string | null;
  creationPlace?: string | null;
  documentType?: string | null;
  dimensions?: string | null;
  binding?: string | null;
  condition?: string | null;
  documentLanguage?: string | null;
  seals?: string | null;
  remarks?: string | null;
  [k: string]: unknown;
}

interface Unit {
  topographicSignature?: string | null;
  title?: string | null;
  creator?: string | null;
  creationDate?: string | null;
  creationPlace?: string | null;
  numberOfPages?: number | null;
  documentType?: string | null;
  dimensions?: string | null;
  binding?: string | null;
  condition?: string | null;
  documentLanguage?: string | null;
  contentDescription?: string | null;
  seals?: string | null;
  remarks?: string | null;
  isDigitized?: boolean | null;
  documents?: Doc[];
  source?: string | null;
  sourceFile?: string | null;
  [k: string]: unknown;
}

const INHERITABLE = ['creator', 'creationDate', 'creationPlace', 'documentType', 'dimensions', 'binding', 'condition', 'documentLanguage', 'seals'] as const;

interface Stats {
  unitsNoted: number;
  unitDatesNormalized: number;
  docsSigCombined: number;
  docFieldsInherited: number;
  docDatesNormalized: number;
  placesHandled: number;
}

function appendNotes(remarks: string | null | undefined, notes: string[]): string | null {
  if (notes.length === 0) return remarks ?? null;
  const existing = (remarks ?? '').trim();
  const existingLines = new Set(existing ? existing.split('\n') : []);
  const fresh = notes.filter(n => !existingLines.has(`- ${n}`));
  if (fresh.length === 0) return remarks ?? null;
  const block = 'Uwagi normalizacyjne:\n' + fresh.map(n => `- ${n}`).join('\n');
  return existing ? `${existing}\n\n${block}` : block;
}

function applyDateFix(
  holder: { creationDate?: string | null; creationPlace?: string | null },
  ownDate: string | undefined,
): { notes: string[]; normalized: boolean; cleared: boolean } {
  const notes: string[] = [];
  if (!ownDate) return { notes, normalized: false, cleared: false };
  const r = normalizeDate(ownDate);
  let normalized = false;
  let cleared = false;
  if (r.changed && r.value) {
    holder.creationDate = r.value;
    notes.push(`data oryginalna: "${ownDate}"`);
    normalized = true;
  } else if (!r.value) {
    notes.push(`data oryginalna (nieznormalizowana): "${ownDate}"`);
  } else if (!r.changed && r.place && !/\d/.test(ownDate) && r.place.length >= 3) {
    // the whole value is a place name, not a date -> clear it (caller falls back to the unit date)
    cleared = true;
  }
  if (r.place) {
    const cp = (holder.creationPlace ?? '').trim();
    if (!cp) {
      holder.creationPlace = r.place;
      notes.push(`miejsce przeniesione z pola daty: "${r.place}"`);
    } else if (cp !== r.place) {
      notes.push(`miejsce w dacie: "${r.place}"`);
    }
  }
  return { notes, normalized, cleared };
}

function fixDoc(unit: Unit, doc: Doc, stats: Stats, originalUnitSig?: string): void {
  const notes: string[] = [];
  const ownDate = (doc.creationDate ?? '').trim() || undefined;

  // 1. signature: unit sig + original item number (verbatim).
  // Idempotent: strip a previously combined unit prefix (current or pre-rename sig).
  const unitSig = (unit.topographicSignature ?? '').trim();
  let item = (doc.topographicSignature ?? '').trim();
  let stripped = false;
  for (const pfx of [unitSig, originalUnitSig].filter((p): p is string => !!p)) {
    if (item.startsWith(pfx + '/')) { item = item.slice(pfx.length + 1); stripped = true; break; }
  }
  // a bare sig equal to the unit sig came from an empty original item — keep it empty
  if (!stripped && (item === unitSig || (originalUnitSig !== undefined && item === originalUnitSig))) item = '';
  if (unitSig) {
    const newSig = item ? `${unitSig}/${item}` : unitSig;
    if (newSig !== doc.topographicSignature) {
      doc.topographicSignature = newSig;
      stats.docsSigCombined++;
    }
  }

  // 2. inheritance from unit (copy when doc field empty)
  for (const key of INHERITABLE) {
    const dv = doc[key];
    const uv = unit[key];
    if ((dv === null || dv === undefined || dv === '') && uv !== null && uv !== undefined && uv !== '') {
      doc[key] = uv;
      stats.docFieldsInherited++;
    }
  }

  // 3. date normalization of the doc's own original date (captured before inheritance)
  const { notes: dateNotes, normalized, cleared } = applyDateFix(doc, ownDate);
  if (cleared) doc.creationDate = unit.creationDate ?? null;
  notes.push(...dateNotes);
  if (normalized) stats.docDatesNormalized++;
  if (dateNotes.some(n => n.startsWith('miejsce'))) stats.placesHandled++;

  doc.remarks = appendNotes(doc.remarks, notes);
}

function fixUnit(unit: Unit, stats: Stats, originalUnitSig?: string): void {
  const ownDate = (unit.creationDate ?? '').trim() || undefined;
  const { notes, normalized, cleared } = applyDateFix(unit, ownDate);
  if (cleared) unit.creationDate = null;
  if (normalized) stats.unitDatesNormalized++;
  if (notes.some(n => n.startsWith('miejsce'))) stats.placesHandled++;
  for (const doc of unit.documents ?? []) fixDoc(unit, doc, stats, originalUnitSig);
  unit.remarks = appendNotes(unit.remarks, notes);
  if (notes.length) stats.unitsNoted++;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function fixDataFile(path: string): Stats {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const isTopLevelArray = Array.isArray(raw);
  const units = (isTopLevelArray ? raw : raw.units) as Unit[];
  const stats: Stats = { unitsNoted: 0, unitDatesNormalized: 0, docsSigCombined: 0, docFieldsInherited: 0, docDatesNormalized: 0, placesHandled: 0 };

  // Disambiguate duplicate unit signatures (distinct items sharing a shelf number)
  // BEFORE document signatures are built — required for the idempotent upload.
  const sigSeen = new Map<string, number>();
  const renamed = new Map<Unit, string>();
  for (const unit of units) {
    const s = (unit.topographicSignature ?? '').trim();
    if (!s) continue;
    const n = (sigSeen.get(s) ?? 0) + 1;
    sigSeen.set(s, n);
    if (n > 1) {
      renamed.set(unit, s);
      unit.topographicSignature = `${s} (${n})`;
    }
  }

  for (const unit of units) fixUnit(unit, stats, renamed.get(unit));
  for (const [unit, original] of renamed) {
    unit.remarks = appendNotes(unit.remarks, [`sygnatura rozróżniona (duplikat w źródle): "${original}"`]);
    stats.unitsNoted++;
  }

  copyFileSync(path, path + '.bak');
  writeFileSync(path, JSON.stringify(isTopLevelArray ? units : { ...raw, units }, null, 1) + '\n');
  return stats;
}

const DEFAULT_FILES = ['units.json', 'processed/grzebień_do_1820.json', 'processed/inwentarz_298-980.json'];

if (import.meta.main) {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES;
  for (const f of files) {
    const path = join(import.meta.dir, f);
    if (!existsSync(path)) { console.warn(`skip (missing): ${f}`); continue; }
    const stats = fixDataFile(path);
    console.log(`${f}:`);
    console.log(`  units with notes:        ${stats.unitsNoted}`);
    console.log(`  unit dates normalized:   ${stats.unitDatesNormalized}`);
    console.log(`  docs sigs combined:      ${stats.docsSigCombined}`);
    console.log(`  doc fields inherited:    ${stats.docFieldsInherited}`);
    console.log(`  doc dates normalized:    ${stats.docDatesNormalized}`);
    console.log(`  places handled:          ${stats.placesHandled}`);
  }
}
