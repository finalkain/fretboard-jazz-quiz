(() => {
'use strict';

// ── Music theory data ─────────────────────────
const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];

// Strings indexed 0..5 where 0 = 6th string (low E), 5 = 1st string (high E)
// Display label = 6 - index (so idx 0 → "6번 줄")
const STRING_OPEN_PC = [4, 9, 2, 7, 11, 4]; // E A D G B E

const CHORD_TYPES = {
  'maj7':   { symbol: 'maj7',  intervals: [0,4,7,11], labels: ['R','3','5','7']   },
  'm7':     { symbol: 'm7',    intervals: [0,3,7,10], labels: ['R','♭3','5','♭7'] },
  '7':      { symbol: '7',     intervals: [0,4,7,10], labels: ['R','3','5','♭7']  },
  'm7b5':   { symbol: 'm7♭5',  intervals: [0,3,6,10], labels: ['R','♭3','♭5','♭7']},
  'dim7':   { symbol: 'dim7',  intervals: [0,3,6,9],  labels: ['R','♭3','♭5','♭♭7']},
  'mMaj7':  { symbol: 'mMaj7', intervals: [0,3,7,11], labels: ['R','♭3','5','7']  },
  'maj7#5': { symbol: 'maj7♯5',intervals: [0,4,8,11], labels: ['R','3','♯5','7']  },
  '7#5':    { symbol: '7♯5',   intervals: [0,4,8,10], labels: ['R','3','♯5','♭7'] },
  '7b5':    { symbol: '7♭5',   intervals: [0,4,6,10], labels: ['R','3','♭5','♭7'] },
  '7sus4':  { symbol: '7sus4', intervals: [0,5,7,10], labels: ['R','4','5','♭7']  },
};

const FRETS = 12;

const noteName = (pc) => (settings.preferFlats ? NOTES_FLAT : NOTES_SHARP)[pc];
const fretPC = (stringIdx, fret) => (STRING_OPEN_PC[stringIdx] + fret) % 12;

// ── Persistent settings ───────────────────────
const SETTINGS_KEY = 'fretquiz.settings.v1';
const STATS_KEY = 'fretquiz.stats.v1';

const defaultSettings = {
  mode: 'A',
  preferFlats: false,
  showNotes: false,
  autoNext: true,
  haptic: true,
  hideStringNote: false,
  chordTypes: Object.fromEntries(Object.keys(CHORD_TYPES).map(k => [k, true])),
  strings: [true, true, true, true, true, true], // idx 0..5
};
let settings = loadSettings();
let stats = loadStats();

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(defaultSettings);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultSettings), ...parsed,
             chordTypes: { ...defaultSettings.chordTypes, ...(parsed.chordTypes || {}) } };
  } catch { return structuredClone(defaultSettings); }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { streak: 0, correct: 0, total: 0 };
  } catch { return { streak: 0, correct: 0, total: 0 }; }
}
function saveStats() { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }

// ── Question state ────────────────────────────
let current = null;
let answered = false;
let tappedSet = new Set(); // for mode B: pitch classes the user has correctly identified

function activeChordTypes() {
  return Object.keys(CHORD_TYPES).filter(k => settings.chordTypes[k]);
}
function activeStringIndices() {
  return settings.strings.map((on, i) => on ? i : -1).filter(i => i >= 0);
}

function generateQuestion() {
  const types = activeChordTypes();
  const strs = activeStringIndices();
  if (!types.length || !strs.length) return null;

  const root = Math.floor(Math.random() * 12);
  const key = types[Math.floor(Math.random() * types.length)];
  const chord = CHORD_TYPES[key];
  const stringIdx = strs[Math.floor(Math.random() * strs.length)];

  const q = { root, key, chord, stringIdx, mode: settings.mode };
  if (settings.mode === 'A') {
    const toneIdx = Math.floor(Math.random() * 4);
    q.toneIdx = toneIdx;
    q.targetInterval = chord.intervals[toneIdx];
    q.targetPC = (root + q.targetInterval) % 12;
    q.toneLabel = chord.labels[toneIdx];
  } else {
    q.targetPCs = chord.intervals.map(i => (root + i) % 12);
    q.toneLabels = chord.labels;
  }
  return q;
}

// ── Fretboard rendering ───────────────────────
const fretboardEl = document.getElementById('fretboard');

function buildFretboard() {
  fretboardEl.innerHTML = '';

  // Row 1: corner + fret labels (frets 0..12 left→right)
  const corner = document.createElement('div');
  corner.className = 'fret-label corner';
  fretboardEl.appendChild(corner);
  for (let f = 0; f <= FRETS; f++) {
    const lbl = document.createElement('div');
    lbl.className = 'fret-label';
    if (f === 0) lbl.classList.add('fret-0-label');
    lbl.textContent = f;
    fretboardEl.appendChild(lbl);
  }

  // Rows 2..7: for each string (idx 0 = string 6 / low E on top), label then 13 cells
  for (let s = 0; s < 6; s++) {
    const h = document.createElement('div');
    h.className = 'string-header';
    h.dataset.string = s;
    h.textContent = `${6 - s}`;
    fretboardEl.appendChild(h);

    for (let f = 0; f <= FRETS; f++) {
      const cell = document.createElement('div');
      cell.className = `cell fret-${f}`;
      cell.dataset.string = s;
      cell.dataset.fret = f;
      cell.addEventListener('click', onCellTap);
      fretboardEl.appendChild(cell);
    }
  }

  // Inlay dots — positioned ABSOLUTELY so they don't disturb grid auto-flow.
  // Label col is 32px wide, header row 22px tall.
  // Fret X center: 32px + (containerW - 32px) * (X + 0.5) / 13
  // String-boundary Y (between idx I-1 and I, counting from top): 22px + (containerH - 22px) * I / 6
  const fretCenter = (f) => `calc(32px + (100% - 32px) * ${f + 0.5} / 13)`;
  const stringBoundary = (i) => `calc(22px + (100% - 22px) * ${i} / 6)`;
  const addInlay = (f, boundaryIdx) => {
    const d = document.createElement('div');
    d.className = 'inlay-dot';
    d.style.left = fretCenter(f);
    d.style.top = stringBoundary(boundaryIdx);
    fretboardEl.appendChild(d);
  };
  // Single dots: between strings 4 (idx 2) and 3 (idx 3) → boundary idx = 3
  [3, 5, 7, 9].forEach(f => addInlay(f, 3));
  // Fret 12 double: between strings 5-4 (boundary 2) and strings 3-2 (boundary 4)
  addInlay(12, 2);
  addInlay(12, 4);
}

function updateFretboard() {
  if (!current) return;
  const cells = fretboardEl.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.classList.remove('active-string', 'is-root', 'correct', 'wrong', 'hint', 'tapped');
    const s = +cell.dataset.string;
    const f = +cell.dataset.fret;
    if (s === current.stringIdx) {
      cell.classList.add('active-string');
      const pc = fretPC(s, f);
      cell.textContent = noteName(pc);
      if (pc === current.root) cell.classList.add('is-root');
    } else {
      cell.textContent = '';
    }
  });
  // String header highlight
  fretboardEl.querySelectorAll('.string-header').forEach(h => {
    h.classList.toggle('active', +h.dataset.string === current.stringIdx);
  });
}

// ── Question rendering ────────────────────────
const qRoot = document.getElementById('qRoot');
const qType = document.getElementById('qType');
const qStringLabel = document.getElementById('qStringLabel');
const qStringNote = document.getElementById('qStringNote');
const qTone = document.getElementById('qTone');
const feedbackEl = document.getElementById('feedback');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const streakEl = document.getElementById('streak');
const correctEl = document.getElementById('correct');
const totalEl = document.getElementById('total');
const modeBtn = document.getElementById('modeBtn');
const tonesToggle = document.getElementById('tonesToggle');
const tonesPanel = document.getElementById('tonesPanel');

let tonesOpen = false;

function renderTonesPanel() {
  if (!current) { tonesPanel.innerHTML = ''; return; }
  const chips = current.chord.intervals.map((iv, idx) => {
    const pc = (current.root + iv) % 12;
    const note = noteName(pc);
    const label = current.chord.labels[idx];
    const isRoot = idx === 0;
    return `<span class="tone-chip${isRoot ? ' is-root' : ''}">
      <span class="tn-note">${note}</span>
      <span class="tn-label">${label}</span>
    </span>`;
  }).join('');
  tonesPanel.innerHTML = chips;
}

function setTonesOpen(open) {
  tonesOpen = open;
  tonesPanel.hidden = !open;
  tonesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  tonesToggle.textContent = open ? '구성음 숨기기' : '구성음 보기';
  if (open) renderTonesPanel();
}

tonesToggle.addEventListener('click', () => setTonesOpen(!tonesOpen));

function renderQuestion() {
  if (!current) {
    qRoot.textContent = '—';
    qType.textContent = '';
    qStringLabel.textContent = '—';
    qStringNote.textContent = '—';
    qTone.textContent = '—';
    feedbackEl.textContent = '코드 타입 또는 줄이 모두 꺼져 있어요. 설정을 확인하세요.';
    feedbackEl.className = 'feedback bad';
    return;
  }
  qRoot.textContent = noteName(current.root);
  qType.textContent = current.chord.symbol;
  qStringLabel.textContent = 6 - current.stringIdx;
  qStringNote.textContent = noteName(STRING_OPEN_PC[current.stringIdx]);
  if (current.mode === 'A') {
    qTone.textContent = current.toneLabel;
  }
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  if (tonesOpen) renderTonesPanel();
}

function updateScore() {
  streakEl.textContent = stats.streak;
  correctEl.textContent = stats.correct;
  totalEl.textContent = stats.total;
}

// ── Interaction ───────────────────────────────
function vibrate(ms) {
  if (settings.haptic && navigator.vibrate) navigator.vibrate(ms);
}

function onCellTap(e) {
  if (!current) return;
  const cell = e.currentTarget;
  const s = +cell.dataset.string;
  if (s !== current.stringIdx) return;
  const f = +cell.dataset.fret;
  const pc = fretPC(s, f);

  if (current.mode === 'A') {
    if (answered) return;
    answered = true;
    stats.total += 1;
    const ok = pc === current.targetPC;
    if (ok) {
      cell.classList.add('correct');
      stats.correct += 1;
      stats.streak += 1;
      feedbackEl.textContent = `정답! ${noteName(pc)}`;
      feedbackEl.className = 'feedback good';
      vibrate(30);
      if (settings.autoNext) setTimeout(nextQuestion, 700);
    } else {
      cell.classList.add('wrong');
      stats.streak = 0;
      feedbackEl.textContent = `오답. 정답은 ${noteName(current.targetPC)}.`;
      feedbackEl.className = 'feedback bad';
      vibrate([40, 60, 40]);
      // Show hints (all correct frets on this string)
      revealCorrectOnString();
    }
    saveStats();
    updateScore();
  } else {
    // Mode B: collect taps, evaluate on submit
    if (answered) return;
    const already = cell.classList.contains('tapped');
    if (already) { cell.classList.remove('tapped'); tappedSet.delete(`${f}`); }
    else { cell.classList.add('tapped'); tappedSet.add(`${f}`); }
  }
}

function revealCorrectOnString() {
  const cells = fretboardEl.querySelectorAll(`.cell.active-string`);
  cells.forEach(cell => {
    if (cell.classList.contains('correct') || cell.classList.contains('wrong')) return;
    const f = +cell.dataset.fret;
    const pc = fretPC(current.stringIdx, f);
    const targets = current.mode === 'A' ? [current.targetPC] : current.targetPCs;
    if (targets.includes(pc)) cell.classList.add('hint');
  });
}

function submitModeB() {
  if (!current || current.mode !== 'B' || answered) return;
  answered = true;
  stats.total += 1;
  const tappedFrets = [...tappedSet].map(Number);
  const tappedPCs = new Set(tappedFrets.map(f => fretPC(current.stringIdx, f)));
  const targetSet = new Set(current.targetPCs);
  const missing = [...targetSet].filter(pc => !tappedPCs.has(pc));
  const extra = [...tappedPCs].filter(pc => !targetSet.has(pc));

  const cells = fretboardEl.querySelectorAll('.cell.active-string');
  cells.forEach(cell => {
    const f = +cell.dataset.fret;
    const pc = fretPC(current.stringIdx, f);
    cell.classList.remove('tapped');
    if (targetSet.has(pc) && tappedPCs.has(pc)) cell.classList.add('correct');
    else if (targetSet.has(pc)) cell.classList.add('hint');
    else if (tappedPCs.has(pc)) cell.classList.add('wrong');
  });

  if (missing.length === 0 && extra.length === 0) {
    stats.correct += 1;
    stats.streak += 1;
    feedbackEl.textContent = `정답! ${current.targetPCs.map(pc => noteName(pc)).join(' / ')}`;
    feedbackEl.className = 'feedback good';
    vibrate(30);
  } else {
    stats.streak = 0;
    const miss = missing.map(noteName).join(', ');
    const ex = extra.map(noteName).join(', ');
    let msg = '오답.';
    if (miss) msg += ` 누락: ${miss}.`;
    if (ex) msg += ` 잘못: ${ex}.`;
    feedbackEl.textContent = msg;
    feedbackEl.className = 'feedback bad';
    vibrate([40, 60, 40]);
  }
  saveStats();
  updateScore();
}

function nextQuestion() {
  answered = false;
  tappedSet = new Set();
  current = generateQuestion();
  renderQuestion();
  updateFretboard();
  document.body.classList.toggle('mode-b', settings.mode === 'B');
  submitBtn.hidden = settings.mode !== 'B';
}

// ── Settings UI ───────────────────────────────
const dialog = document.getElementById('settingsDialog');
const chordTypeList = document.getElementById('chordTypeList');
const stringFilterEl = document.getElementById('stringFilter');

function buildChordTypeUI() {
  chordTypeList.innerHTML = '';
  Object.entries(CHORD_TYPES).forEach(([key, def]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chord-toggle' + (settings.chordTypes[key] ? ' on' : '');
    btn.textContent = def.symbol;
    btn.addEventListener('click', () => {
      settings.chordTypes[key] = !settings.chordTypes[key];
      btn.classList.toggle('on', settings.chordTypes[key]);
      saveSettings();
    });
    chordTypeList.appendChild(btn);
  });
}

function buildStringFilterUI() {
  stringFilterEl.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'string-toggle' + (settings.strings[i] ? ' on' : '');
    btn.textContent = `${6 - i}`;
    btn.addEventListener('click', () => {
      settings.strings[i] = !settings.strings[i];
      btn.classList.toggle('on', settings.strings[i]);
      saveSettings();
    });
    stringFilterEl.appendChild(btn);
  }
}

function syncSettingsUI() {
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.checked = r.value === settings.mode;
    r.addEventListener('change', () => {
      if (r.checked) {
        settings.mode = r.value;
        saveSettings();
        applyModeUI();
        nextQuestion();
      }
    });
  });
  const map = [
    ['optFlats', 'preferFlats'],
    ['optShowNotes', 'showNotes'],
    ['optAutoNext', 'autoNext'],
    ['optHaptic', 'haptic'],
    ['optHideStringNote', 'hideStringNote'],
  ];
  map.forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.checked = settings[key];
    el.addEventListener('change', () => {
      settings[key] = el.checked;
      saveSettings();
      applyOptionUI();
      if (current) { renderQuestion(); updateFretboard(); }
    });
  });
}

function applyModeUI() {
  modeBtn.textContent = settings.mode;
  document.body.classList.toggle('mode-b', settings.mode === 'B');
  submitBtn.hidden = settings.mode !== 'B';
}
function applyOptionUI() {
  document.body.classList.toggle('show-notes', settings.showNotes);
  document.body.classList.toggle('hide-string-note', settings.hideStringNote);
}

// ── Wiring ────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', () => {
  buildChordTypeUI(); buildStringFilterUI();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
});
dialog.addEventListener('close', () => {
  // After settings close, regenerate to honor new constraints
  nextQuestion();
});

const helpDialog = document.getElementById('helpDialog');
function openHelp() {
  if (typeof helpDialog.showModal === 'function') helpDialog.showModal();
  else helpDialog.setAttribute('open', '');
}
document.getElementById('helpBtn').addEventListener('click', openHelp);

// Auto-show help on first visit
const FIRST_RUN_KEY = 'fretquiz.seen.help.v1';
if (!localStorage.getItem(FIRST_RUN_KEY)) {
  setTimeout(() => {
    openHelp();
    localStorage.setItem(FIRST_RUN_KEY, '1');
  }, 200);
}

modeBtn.addEventListener('click', () => {
  settings.mode = settings.mode === 'A' ? 'B' : 'A';
  saveSettings();
  applyModeUI();
  document.querySelectorAll('input[name="mode"]').forEach(r => r.checked = r.value === settings.mode);
  nextQuestion();
});

nextBtn.addEventListener('click', nextQuestion);
submitBtn.addEventListener('click', submitModeB);

// Init
buildFretboard();
applyModeUI();
applyOptionUI();
syncSettingsUI();
updateScore();
nextQuestion();

})();
