#!/usr/bin/env node
/**
 * Language Validator - Standing Pillars
 * Scans all HTML pages for language consistency issues.
 *
 * Usage: node validate-languages.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ERRORS = [];
const WARNINGS = [];

// Expected language per path prefix
function expectedLang(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (rel.startsWith('de/')) return 'de';
  if (rel.startsWith('hr/')) return 'hr';
  return 'en';
}

// Collect all HTML files (skip node_modules, portfolio, simulation)
function collectHtml(dir) {
  const skip = ['node_modules', '.git', 'portfolio', 'simulation', 'docs'];
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectHtml(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

// Simple regex extractor
function attr(html, tag, attribute) {
  const re = new RegExp(`<${tag}[^>]*\\s${attribute}=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? m[1] : null;
}

// Extract text between tags (first match)
function textContent(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
}

// Croatian words that should have diacritics
const CROATIAN_DIACRITIC_WORDS = {
  'zasto': 'zašto', 'sto': 'što', 'cesto': 'često',
  'srece': 'sreće', 'povrsina': 'površina',
  'usluge': null, // fine as-is
  'rjesenja': 'rješenja', 'rjesenje': 'rješenje',
  'dizajn': null, // fine
  'slozenost': 'složenost', 'slozeno': 'složeno',
  'trziste': 'tržište', 'trzista': 'tržišta',
  'pocetna': 'početna', 'pocetak': 'početak',
  'pozeljno': 'poželjno',
  'znacajno': 'značajno',
  'posao': null, // fine
  'zasluzuje': 'zaslužuje',
  'kvaliteta': null, // fine
  'prica': 'priča',
  'jelovnik': null, // fine
  'odrzavanje': 'održavanje',
  'ponasanje': 'ponašanje',
  'ciljeve': null, // fine
  'posteno': 'pošteno', 'posten': 'pošten',
  'korisno': null, // fine
  'iskustvo': null, // fine
  'savjetovanje': null, // fine
  'svetovanje': 'savjetovanje',
  'trznica': 'tržnica',
  'razina': null, // fine
  'vise': 'više',
  'slusam': 'slušam',
  'siguran': null, // fine
  'sigurni': null, // fine
  'vollig': null, // German
  'geschaft': null, // German
  'obicno': 'obično',
  'pomocnik': 'pomoćnik',
  'trositi': 'trošiti', 'troskova': 'troškova',
  'osjecati': 'osjećati', 'osjeca': 'osjeća',
  'otvorite': null, // fine
  'otvoreno': null, // fine
  'otvori': null, // fine
  'zastititi': 'zaštititi', 'zastita': 'zaštita',
  'mogucnost': 'mogućnost',
  'trebali': null, // fine
  'pojmove': null, // fine
  'razgovor': null, // fine
  'pruziti': 'pružiti',
  'pristupacne': 'pristupačne',
  'zargona': 'žargona',
  'zivot': 'život',
  'znaci': 'znači',
  'opcenito': 'općenito',
  'vec': 'već',
  'vidljiviji': null, // fine
  'obrtnici': null, // fine
  'kupce': null, // fine
  'pomaze': 'pomaže',
  'mozemo': 'možemo',
  'placate': 'plaćate',
  'predlozak': 'predložak', 'predlozaka': 'predložaka',
};

// ===== CHECKS =====

function checkHtmlLang(filePath, html) {
  const lang = attr(html, 'html', 'lang');
  const expected = expectedLang(filePath);
  if (!lang) {
    ERRORS.push({ file: filePath, check: 'html-lang', msg: 'Missing <html lang> attribute' });
  } else if (lang !== expected) {
    ERRORS.push({ file: filePath, check: 'html-lang', msg: `<html lang="${lang}"> but expected "${expected}" based on path` });
  }
}

function checkOgLocale(filePath, html) {
  const locale = attr(html, 'meta[^>]*property="og:locale"', 'content') ||
    (() => { const m = html.match(/property="og:locale"\s+content="([^"]+)"/); return m ? m[1] : null; })();
  const expected = expectedLang(filePath);
  const localeMap = { en: 'en_US', de: 'de_AT', hr: 'hr_HR' };
  if (locale && !locale.startsWith(expected)) {
    ERRORS.push({ file: filePath, check: 'og-locale', msg: `og:locale="${locale}" but page language is "${expected}"` });
  }
}

function checkHreflang(filePath, html) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  // Only check service pages and main pages
  if (!rel.includes('services/') && !rel.match(/^(de\/|hr\/)?index\.html$/)) return;

  const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map(m => m[1]);
  const needed = ['en', 'de', 'hr', 'x-default'];
  for (const h of needed) {
    if (!hreflangs.includes(h)) {
      WARNINGS.push({ file: filePath, check: 'hreflang', msg: `Missing hreflang="${h}"` });
    }
  }
}

function checkNavDropdownLanguage(filePath, html) {
  const expected = expectedLang(filePath);

  // Extract dropdown menu content
  const dropdownMatch = html.match(/<div class="nav-dropdown-menu">([\s\S]*?)<\/div>/);
  if (!dropdownMatch) return;

  const dropdown = dropdownMatch[1];

  // Language markers - words unique to each language
  const markers = {
    en: ['All Services', 'Local Business', 'AI Procurement'],
    de: ['Alle Leistungen', 'Lokale Unternehmen', 'KI-Beschaffung'],
    hr: ['Sve usluge', 'Lokalne tvrtke', 'Nabava AI']
  };

  for (const [lang, words] of Object.entries(markers)) {
    if (lang === expected) continue;
    for (const word of words) {
      if (dropdown.includes(word)) {
        ERRORS.push({
          file: filePath,
          check: 'nav-lang-mismatch',
          msg: `Nav dropdown contains "${word}" (${lang}) but page language is "${expected}"`
        });
      }
    }
  }
}

function checkDropdownI18nOnMainPages(filePath, html) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  // Only main pages load i18n.js
  if (!html.includes('i18n.js')) return;

  // Find dropdown links - extract from nav-dropdown-menu to its LAST closing div
  // (skip inner dropdown-divider div)
  const start = html.indexOf('<div class="nav-dropdown-menu">');
  if (start === -1) return;
  let depth = 0, end = start;
  for (let i = start; i < html.length; i++) {
    if (html.slice(i, i + 4) === '<div') depth++;
    if (html.slice(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) { end = i + 6; break; }
    }
  }
  const dropdown = html.slice(start, end);
  const links = [...dropdown.matchAll(/<a\s+([^>]*)>([^<]+)<\/a>/g)];

  for (const link of links) {
    const attrs = link[1];
    const text = link[2].trim();
    if (text === '') continue;

    // Links with data-lang-href should also have data-i18n for their text
    if (attrs.includes('data-lang-href') && !attrs.includes('data-i18n')) {
      WARNINGS.push({
        file: filePath,
        check: 'dropdown-missing-i18n',
        msg: `Dropdown link "${text}" has data-lang-href but no data-i18n - text won't translate at runtime`
      });
    }

    // "All Services" link should have data-i18n too
    if (!attrs.includes('data-lang-href') && !attrs.includes('data-i18n') && !attrs.includes('dropdown-divider')) {
      // Check if the href is an anchor (like #services)
      if (attrs.includes('#services')) {
        WARNINGS.push({
          file: filePath,
          check: 'dropdown-missing-i18n',
          msg: `Dropdown link "${text}" lacks data-i18n - text won't translate at runtime`
        });
      }
    }
  }
}

function checkCroatianDiacritics(filePath, html) {
  const expected = expectedLang(filePath);
  if (expected !== 'hr') return;

  // Remove scripts and style blocks
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  const words = textOnly.toLowerCase().split(/[\s.,;:!?()'"\/\-]+/);
  const found = new Set();

  for (const word of words) {
    if (CROATIAN_DIACRITIC_WORDS[word] && CROATIAN_DIACRITIC_WORDS[word] !== null) {
      found.add(`"${word}" -> "${CROATIAN_DIACRITIC_WORDS[word]}"`);
    }
  }

  if (found.size > 0) {
    WARNINGS.push({
      file: filePath,
      check: 'croatian-diacritics',
      msg: `Missing diacritics: ${[...found].join(', ')}`
    });
  }
}

function checkDeepLinkI18n(filePath, html) {
  // Check service-deep-link elements have data-i18n
  const deepLinks = [...html.matchAll(/<a[^>]*class="service-deep-link"[^>]*>([^<]+)<\/a>/g)];
  for (const link of deepLinks) {
    const tag = link[0];
    const text = link[1].trim();
    if (!tag.includes('data-i18n')) {
      WARNINGS.push({
        file: filePath,
        check: 'deep-link-i18n',
        msg: `Deep link "${text}" lacks data-i18n attribute`
      });
    }
  }
}

function checkLangJsonKeys() {
  const langDir = path.join(ROOT, 'lang');
  const langs = ['en', 'de', 'hr'];
  const allKeys = {};

  for (const lang of langs) {
    const file = path.join(langDir, `${lang}.json`);
    if (!fs.existsSync(file)) {
      ERRORS.push({ file, check: 'lang-json', msg: `Missing translation file: ${lang}.json` });
      continue;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    allKeys[lang] = flattenKeys(data);
  }

  // Check that all languages have the same keys
  if (allKeys.en) {
    for (const lang of ['de', 'hr']) {
      if (!allKeys[lang]) continue;
      for (const key of allKeys.en) {
        if (key.startsWith('_meta.')) continue;
        if (!allKeys[lang].includes(key)) {
          WARNINGS.push({ file: `lang/${lang}.json`, check: 'missing-i18n-key', msg: `Missing key "${key}" (exists in en.json)` });
        }
      }
    }
  }

  // Check that data-i18n keys used in HTML actually exist in JSON
  const htmlFiles = collectHtml(ROOT);
  const usedKeys = new Set();
  for (const f of htmlFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const matches = [...html.matchAll(/data-i18n="([^"]+)"/g)];
    matches.forEach(m => usedKeys.add(m[1]));
  }

  if (allKeys.en) {
    for (const key of usedKeys) {
      // Skip array-style keys (e.g., "services.pillar1Items.0") - handled by i18n.js differently
      if (/\.\d+$/.test(key)) continue;
      if (!allKeys.en.includes(key)) {
        WARNINGS.push({ file: 'lang/en.json', check: 'missing-i18n-key', msg: `data-i18n="${key}" used in HTML but key not found in en.json` });
      }
    }
  }
}

function flattenKeys(obj, prefix) {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function checkCanonicalUrl(filePath, html) {
  const expected = expectedLang(filePath);
  const canonical = (() => {
    const m = html.match(/rel="canonical"\s+href="([^"]+)"/);
    return m ? m[1] : null;
  })();
  if (!canonical) return;

  if (expected === 'de' && !canonical.includes('/de/')) {
    ERRORS.push({ file: filePath, check: 'canonical', msg: `Canonical URL "${canonical}" missing /de/ prefix for German page` });
  }
  if (expected === 'hr' && !canonical.includes('/hr/')) {
    ERRORS.push({ file: filePath, check: 'canonical', msg: `Canonical URL "${canonical}" missing /hr/ prefix for Croatian page` });
  }
  if (expected === 'en' && (canonical.includes('/de/') || canonical.includes('/hr/'))) {
    ERRORS.push({ file: filePath, check: 'canonical', msg: `Canonical URL "${canonical}" has wrong language prefix for English page` });
  }
}

// ===== MAIN =====

console.log('Standing Pillars - Language Validator');
console.log('=====================================\n');

const htmlFiles = collectHtml(ROOT);
console.log(`Scanning ${htmlFiles.length} HTML files...\n`);

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, 'utf8');
  checkHtmlLang(filePath, html);
  checkOgLocale(filePath, html);
  checkHreflang(filePath, html);
  checkNavDropdownLanguage(filePath, html);
  checkDropdownI18nOnMainPages(filePath, html);
  checkCroatianDiacritics(filePath, html);
  checkDeepLinkI18n(filePath, html);
  checkCanonicalUrl(filePath, html);
}

checkLangJsonKeys();

// Report
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log('All checks passed!');
} else {
  if (ERRORS.length > 0) {
    console.log(`ERRORS (${ERRORS.length}):`);
    for (const e of ERRORS) {
      console.log(`  [${e.check}] ${rel(e.file)}`);
      console.log(`    ${e.msg}`);
    }
    console.log();
  }
  if (WARNINGS.length > 0) {
    console.log(`WARNINGS (${WARNINGS.length}):`);
    for (const w of WARNINGS) {
      console.log(`  [${w.check}] ${rel(w.file)}`);
      console.log(`    ${w.msg}`);
    }
    console.log();
  }
}

console.log(`\nSummary: ${ERRORS.length} errors, ${WARNINGS.length} warnings`);
process.exit(ERRORS.length > 0 ? 1 : 0);
