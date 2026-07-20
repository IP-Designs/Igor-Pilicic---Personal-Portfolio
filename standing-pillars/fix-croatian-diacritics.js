#!/usr/bin/env node
/**
 * Fix Croatian diacritics in HR HTML files.
 * Run once: node fix-croatian-diacritics.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Comprehensive Croatian word replacements (case-sensitive pairs)
// Order matters: longer/more specific words first to avoid partial matches
const REPLACEMENTS = [
  // ---- Č / č ----
  ['pristupacne', 'pristupačne'],
  ['pristupacna', 'pristupačna'],
  ['usporucujem', 'usporučujem'],
  ['isporucujem', 'isporučujem'],
  ['Isporucujem', 'Isporučujem'],
  ['uskladenost', 'usklađenost'],
  ['uskladenosti', 'usklađenosti'],
  ['mogucnost', 'mogućnost'],
  ['mogucnosti', 'mogućnosti'],
  ['pracenje', 'praćenje'],
  ['Pracenje', 'Praćenje'],
  ['osiguracujem', 'osiguračujem'],
  ['preciznocu', 'preciznoću'],
  ['pocetna', 'početna'],
  ['Pocetna', 'Početna'],
  ['pocetak', 'početak'],
  ['opcenito', 'općenito'],
  ['ocekivanjima', 'očekivanjima'],
  ['oznacava', 'označava'],
  ['oznacite', 'označite'],
  ['sacuvati', 'sačuvati'],
  ['Sacuvati', 'Sačuvati'],
  ['cinjenica', 'činjenica'],
  ['cinjenice', 'činjenice'],
  ['podaci', null], // fine
  ['pracenja', 'praćenja'],
  ['placate', 'plaćate'],
  ['placam', 'plaćam'],
  ['placanje', 'plaćanje'],
  ['potpisete', 'potpišete'],
  ['tocno', 'točno'],
  ['Tocno', 'Točno'],
  ['tocka', 'točka'],
  ['tocku', 'točku'],
  ['znace', 'znači'],
  ['znaci', 'znači'],
  ['Znaci', 'Znači'],
  ['Sto', 'Što'],
  ['sto', 'što'],
  ['znacajno', 'značajno'],
  ['znacajne', 'značajne'],
  ['znacenje', 'značenje'],
  ['kljucne', 'ključne'],
  ['kljucni', 'ključni'],
  ['kljucno', 'ključno'],
  ['ukljucuje', 'uključuje'],
  ['ukljucuju', 'uključuju'],
  ['ukljucen', 'uključen'],
  ['producira', null], // fine
  ['ucestalo', 'učestalo'],
  ['ucenje', 'učenje'],
  ['pomocnik', 'pomoćnik'],
  ['pomoci', 'pomoći'],
  ['pomoc', 'pomoć'],
  ['pomocni', 'pomoćni'],
  ['sacuva', 'sačuva'],
  ['recenica', 'rečenica'],
  ['recenice', 'rečenice'],
  ['vecinu', 'većinu'],
  ['vecina', 'većina'],
  ['vec', 'već'],
  ['Vec', 'Već'],
  ['osjeca', 'osjeća'],
  ['osjecati', 'osjećati'],
  ['osjecaj', 'osjećaj'],
  ['osjecaju', 'osjećaju'],
  ['trositi', 'trošiti'],
  ['troskova', 'troškova'],
  ['troskovi', 'troškovi'],
  ['trosak', 'trošak'],
  ['prica', 'priča'],
  ['price', 'priče'],
  ['pricu', 'priču'],
  ['Prica', 'Priča'],
  ['obicno', 'obično'],
  ['obicna', 'obična'],
  ['razlicite', 'različite'],
  ['razliciti', 'različiti'],
  ['razlicitih', 'različitih'],
  ['specificne', 'specifične'],
  ['specificno', 'specifično'],
  ['specificna', 'specifična'],
  ['tehnicke', 'tehničke'],
  ['tehnicko', 'tehničko'],
  ['tehnicka', 'tehnička'],
  ['tehnicku', 'tehničku'],
  ['tehnickih', 'tehničkih'],
  ['prakticno', 'praktično'],
  ['prakticna', 'praktična'],
  ['natjecaji', 'natječaji'],
  ['natjecaja', 'natječaja'],
  ['natjecaje', 'natječaje'],
  ['dobavljaca', 'dobavljača'],
  ['dobavljaci', 'dobavljači'],
  ['dobavljacu', 'dobavljaču'],
  ['dobavljacima', 'dobavljačima'],
  ['koracima', 'koracima'], // fine
  ['osiguracus', 'osiguračuš'],

  // ---- Š / š ----
  ['zastita', 'zaštita'],
  ['Zastita', 'Zaštita'],
  ['zastite', 'zaštite'],
  ['zastititi', 'zaštititi'],
  ['zastiten', 'zaštićen'],
  ['rjesenja', 'rješenja'],
  ['rjesenje', 'rješenje'],
  ['rjesavanje', 'rješavanje'],
  ['rjesavanja', 'rješavanja'],
  ['posteno', 'pošteno'],
  ['posten', 'pošten'],
  ['postenu', 'poštenu'],
  ['postenom', 'poštenom'],
  ['Posteno', 'Pošteno'],
  ['Posten', 'Pošten'],
  ['saslusam', 'saslušam'],
  ['slusan', 'slušan'],
  ['Slusam', 'Slušam'],
  ['slusam', 'slušam'],
  ['prosiriti', 'proširiti'],
  ['prosireno', 'prošireno'],
  ['sire', 'šire'],
  ['siroko', 'široko'],
  ['Istrazite', 'Istražite'],
  ['istrazite', 'istražite'],
  ['istrazujem', 'istražujem'],
  ['Istrazujem', 'Istražujem'],
  ['isto', null], // fine
  ['trziste', 'tržište'],
  ['trzista', 'tržišta'],
  ['trzisni', 'tržišni'],
  ['trznica', 'tržnica'],
  ['nista', 'ništa'],
  ['Nista', 'Ništa'],
  ['predlozak', 'predložak'],
  ['predlozaka', 'predložaka'],
  ['predlozke', 'predloške'],
  ['slozenost', 'složenost'],
  ['slozeno', 'složeno'],
  ['slozene', 'složene'],
  ['pozeljno', 'poželjno'],
  ['uopce', 'uopće'],
  ['Uopce', 'Uopće'],
  ['iskustvo', null], // fine
  ['jasnoce', 'jasnoće'],
  ['jasnocu', 'jasnoću'],
  ['vrijednosce', 'vrijednoće'],

  // ---- Ž / ž ----
  ['zasluzuje', 'zaslužuje'],
  ['zasluzuju', 'zaslužuju'],
  ['Zasluzuje', 'Zaslužuje'],
  ['Zasluzuju', 'Zaslužuju'],
  ['mozemo', 'možemo'],
  ['Mozemo', 'Možemo'],
  ['mozete', 'možete'],
  ['Mozete', 'Možete'],
  ['moze', 'može'],
  ['Moze', 'Može'],
  ['pomaze', 'pomaže'],
  ['Pomaze', 'Pomaže'],
  ['pokazat', 'pokazat'], // fine
  ['pokazem', 'pokažem'],
  ['pokazujem', 'pokazujem'], // fine
  ['zargona', 'žargona'],
  ['Zargona', 'Žargona'],
  ['zargon', 'žargon'],
  ['Zargo', 'Žargo'],
  ['Zasto', 'Zašto'],
  ['zasto', 'zašto'],
  ['Zato', null], // fine - different word
  ['vazno', 'važno'],
  ['Vazno', 'Važno'],
  ['vazne', 'važne'],
  ['vaznih', 'važnih'],
  ['zivot', 'život'],
  ['zivota', 'života'],
  ['polozaj', 'položaj'],
  ['polozaja', 'položaja'],
  ['nedokazano', null], // fine
  ['analizirati', null], // fine
  ['pouzdan', null], // fine - no diacritics needed
  ['pouzdanost', null], // fine
  ['drzanje', 'držanje'],
  ['odrzavanje', 'održavanje'],
  ['Odrzavanje', 'Održavanje'],
  ['odrzavanja', 'održavanja'],
  ['podrzava', 'podržava'],
  ['realizirati', null], // fine
  ['rezultati', null], // fine

  // ---- Ć / ć ----
  ['kuce', 'kuće'],
  ['buducnost', 'budućnost'],
  ['buducnosti', 'budućnosti'],
  ['sigurnocu', 'sigurnošću'],
  ['podrska', 'podrška'],
  ['Podrska', 'Podrška'],
  ['podrsku', 'podršku'],
  ['preporucam', 'preporučam'],
  ['Preporucam', 'Preporučam'],
  ['preporucujem', 'preporučujem'],
  ['preporuku', null], // fine
  ['nestajem', null], // fine
  ['azurirati', 'ažurirati'],
  ['funkcionalnosti', null], // fine
  ['funkcionalnost', null], // fine
  ['vracam', 'vraćam'],
  ['vraca', 'vraća'],
  ['regulatorne', null], // fine

  // ---- Đ / đ ----
  ['nadeno', 'nađeno'],
  ['nadete', 'nađete'],
  ['nademo', 'nađemo'],
  ['medunarodne', 'međunarodne'],
  ['medunarodnih', 'međunarodnih'],
  ['pronadite', 'pronađite'],
  ['pronadu', 'pronađu'],
  ['gladni', null], // fine
  ['udete', 'uđete'],
  // Pilicic stays as is (proper name, user choice)

  // ---- Additional common words ----
  ['nesto', 'nešto'],
  ['Nesto', 'Nešto'],
  ['cesta', 'česta'],
  ['ceste', 'česte'],
  ['cesto', 'često'],
  ['Cesto', 'Često'],
  ['cak', 'čak'],
  ['Cak', 'Čak'],
  ['cete', 'ćete'],
  ['Culi', 'Čuli'],
  ['culi', 'čuli'],
  ['cu', 'ću'],
  ['cemo', 'ćemo'],
  ['trazi', 'traži'],
  ['Trazi', 'Traži'],
  ['pretrazuju', 'pretražuju'],
  ['pretrazite', 'pretražite'],
  ['muci', 'muči'],
  ['vas', 'vaš'],
  ['Vas', 'Vaš'],
  ['vase', 'vaše'],
  ['Vase', 'Vaše'],
  ['vasem', 'vašem'],
  ['vaseg', 'vašeg'],
  ['vasim', 'vašim'],
  ['vasu', 'vašu'],
  ['Vasu', 'Vašu'],
  ['vasi', 'vaši'],
  ['Vasi', 'Vaši'],
  ['rucno', 'ručno'],
  ['Rucno', 'Ručno'],
  ['ducan', 'dućan'],
  ['ducana', 'dućana'],
  ['dugorocno', 'dugoročno'],
  ['Dugorocno', 'Dugoročno'],
  ['posaljite', 'pošaljite'],
  ['Posaljite', 'Pošaljite'],
  ['kosta', 'košta'],
  ['Odlucujete', 'Odlučujete'],
  ['odlucujete', 'odlučujete'],
  ['Opusten', 'Opušten'],
  ['opusten', 'opušten'],
  ['uzivo', 'uživo'],
  ['Uzivo', 'Uživo'],
  ['cista', 'čista'],
  ['Cista', 'Čista'],
  ['korisnicima', 'korisnicima'], // fine
  ['Sjednem', null], // fine
  ['angazman', 'angažman'],
  ['angazmana', 'angažmana'],
  ['tehnicki', 'tehnički'],
  ['Tehnicki', 'Tehnički'],
  ['vlasnicki', 'vlasnički'],
  ['Vlasnicki', 'Vlasnički'],
  ['regulatorne', null], // fine
  ['dostizno', 'dostižno'],
];

// Only process words that actually need changing
const activeReplacements = REPLACEMENTS.filter(([_, replacement]) => replacement !== null);

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  for (const [wrong, correct] of activeReplacements) {
    // Use word boundary-aware regex to avoid partial matches
    // Match the word only when surrounded by non-letter chars or start/end
    const re = new RegExp('(?<![a-zA-ZčćšžđČĆŠŽĐ])' + escapeRegex(wrong) + '(?![a-zA-ZčćšžđČĆŠŽĐ])', 'g');
    const matches = content.match(re);
    if (matches) {
      content = content.replace(re, correct);
      changes += matches.length;
    }
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ${path.relative(ROOT, filePath)}: ${changes} replacements`);
  }
  return changes;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Collect HR HTML files
function collectHrFiles(dir) {
  let files = [];
  const skip = ['node_modules', '.git'];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectHrFiles(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

console.log('Fixing Croatian diacritics...\n');

const hrDir = path.join(ROOT, 'hr');
const hrFiles = collectHrFiles(hrDir);
let totalChanges = 0;

for (const f of hrFiles) {
  totalChanges += fixFile(f);
}

// Also fix the deep link text in main index.html (Istrazite -> Istražite)
const mainIndex = path.join(ROOT, 'index.html');
// Don't process main index - it's English

console.log(`\nDone: ${totalChanges} total replacements across ${hrFiles.length} files.`);
