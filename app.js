(() => {
'use strict';

// ── Music theory data ─────────────────────────
const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];

// Strings indexed 0..5 where 0 = 6th string (low E), 5 = 1st string (high E)
// Display label = 6 - index (so idx 0 → "6번 줄")
const STRING_OPEN_PC = [4, 9, 2, 7, 11, 4]; // E A D G B E

// `degrees` = letter positions (1=root letter, 3=skip-one letter, etc.)
// Drives proper enharmonic spelling: a chord tone always lands on the
// expected letter, accidental adjusts to hit the right pitch.
const CHORD_TYPES = {
  'maj7':   { symbol: 'maj7',  intervals: [0,4,7,11], degrees: [1,3,5,7], labels: ['R','3','5','7']   },
  'm7':     { symbol: 'm7',    intervals: [0,3,7,10], degrees: [1,3,5,7], labels: ['R','♭3','5','♭7'] },
  '7':      { symbol: '7',     intervals: [0,4,7,10], degrees: [1,3,5,7], labels: ['R','3','5','♭7']  },
  'm7b5':   { symbol: 'm7♭5',  intervals: [0,3,6,10], degrees: [1,3,5,7], labels: ['R','♭3','♭5','♭7']},
  'dim7':   { symbol: 'dim7',  intervals: [0,3,6,9],  degrees: [1,3,5,7], labels: ['R','♭3','♭5','♭♭7']},
  'mMaj7':  { symbol: 'mMaj7', intervals: [0,3,7,11], degrees: [1,3,5,7], labels: ['R','♭3','5','7']  },
  'maj7#5': { symbol: 'maj7♯5',intervals: [0,4,8,11], degrees: [1,3,5,7], labels: ['R','3','♯5','7']  },
  '7#5':    { symbol: '7♯5',   intervals: [0,4,8,10], degrees: [1,3,5,7], labels: ['R','3','♯5','♭7'] },
  '7b5':    { symbol: '7♭5',   intervals: [0,4,6,10], degrees: [1,3,5,7], labels: ['R','3','♭5','♭7'] },
  '7sus4':  { symbol: '7sus4', intervals: [0,5,7,10], degrees: [1,4,5,7], labels: ['R','4','5','♭7']  },
};

// ── Scales (intervals + degrees + role classification) ─
// degree numbers drive enharmonic letter selection (same engine as chords).
// roleByDegree: 'chord' (R/3/5/7), 'tension' (2/4/6), 'avoid' (per-scale).
const SCALES = {
  'major':      { name: '메이저 (Ionian)',           intervals:[0,2,4,5,7,9,11], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[4]   },
  'lydian':     { name: '리디안',                    intervals:[0,2,4,6,7,9,11], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[]    },
  'mixolydian': { name: '믹솔리디안',                intervals:[0,2,4,5,7,9,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[4]   },
  'natminor':   { name: '내추럴 마이너 (Aeolian)',   intervals:[0,2,3,5,7,8,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[6]   },
  'harmonic':   { name: '하모닉 마이너',             intervals:[0,2,3,5,7,8,11], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[6]   },
  'melodic':    { name: '멜로딕 마이너',             intervals:[0,2,3,5,7,9,11], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[]    },
  'dorian':     { name: '도리안',                    intervals:[0,2,3,5,7,9,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[]    },
  'phrygian':   { name: '프리지안',                  intervals:[0,1,3,5,7,8,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[2,6] },
  'locrian':    { name: '로크리안',                  intervals:[0,1,3,5,6,8,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[2]   },
  'altered':    { name: '얼터드 (Super Locrian)',    intervals:[0,1,3,4,6,8,10], degrees:[1,2,3,4,5,6,7], chordTones:[1,3,5,7], avoid:[]    },
  'majpent':    { name: '메이저 펜타토닉',           intervals:[0,2,4,7,9],      degrees:[1,2,3,5,6],     chordTones:[1,3,5],   avoid:[]    },
  'minpent':    { name: '마이너 펜타토닉',           intervals:[0,3,5,7,10],     degrees:[1,3,4,5,7],     chordTones:[1,3,5,7], avoid:[]    },
  'blues':      { name: '블루스',                    intervals:[0,3,5,6,7,10],   degrees:[1,3,4,5,5,7],   chordTones:[1,3,5,7], avoid:[]    },
};

// CAGED shape boxes — each shape anchors on one string; box spans
// [anchorFret + offsetMin, anchorFret + offsetMax] around the root.
// 0 = string 6 (low E), 1 = string 5 (A), 2 = string 4 (D).
// 6-fret windows so each position contains a full one-octave run for all
// 7-note scales (4-fret boxes skipped notes mid-octave, e.g. B in C
// harmonic minor / G shape). Centers preserved → positions still march
// up the neck (C: 0-5, A: 1-6, G: 4-9, E: 6-11, D: 7-12 for key C).
const CAGED_SHAPES = {
  C: { name: 'C', anchorString: 1, offsetMin: -3, offsetMax: 2 },
  A: { name: 'A', anchorString: 1, offsetMin: -2, offsetMax: 3 },
  G: { name: 'G', anchorString: 0, offsetMin: -4, offsetMax: 1 },
  E: { name: 'E', anchorString: 0, offsetMin: -2, offsetMax: 3 },
  D: { name: 'D', anchorString: 2, offsetMin: -3, offsetMax: 2 },
};

// ── Enharmonic spelling (music-theory correct) ────────
// LETTERS[0..6] = A..G. LETTER_PC[i] = natural pitch class for that letter.
const LETTERS = ['A','B','C','D','E','F','G'];
const LETTER_PC = [9, 11, 0, 2, 4, 5, 7];

// All reasonable spellings of each root pitch class as {letter idx, acc}.
const ROOT_SPELLINGS = {
  0:  [{letter:2,acc:0}],
  1:  [{letter:2,acc:1}, {letter:3,acc:-1}],
  2:  [{letter:3,acc:0}],
  3:  [{letter:3,acc:1}, {letter:4,acc:-1}],
  4:  [{letter:4,acc:0}],
  5:  [{letter:5,acc:0}],
  6:  [{letter:5,acc:1}, {letter:6,acc:-1}],
  7:  [{letter:6,acc:0}],
  8:  [{letter:6,acc:1}, {letter:0,acc:-1}],
  9:  [{letter:0,acc:0}],
  10: [{letter:0,acc:1}, {letter:1,acc:-1}],
  11: [{letter:1,acc:0}],
};

function accidentalSymbol(acc) {
  if (acc === 0) return '';
  if (acc === 1) return '♯';
  if (acc === 2) return '𝄪';
  if (acc === -1) return '♭';
  if (acc === -2) return '𝄫';
  return acc > 0 ? '♯'.repeat(acc) : '♭'.repeat(-acc);
}
const spellingToString = (s) => LETTERS[s.letter] + accidentalSymbol(s.acc);

// Spell a chord tone: given root letter + degree, fix the letter, adjust accidental.
function spellChordTone(rootLetter, degree, intervalSemitones, rootPc) {
  const letterIdx = (rootLetter + (degree - 1)) % 7;
  const expectedPc = LETTER_PC[letterIdx];
  const actualPc = (rootPc + intervalSemitones) % 12;
  let acc = ((actualPc - expectedPc + 18) % 12) - 6; // range -6..5, typically -2..2
  return { letter: letterIdx, acc };
}

// Score = total absolute accidentals; heavy penalty for double accidentals.
// Small tiebreaker bias against sharps so when D♯ vs E♭ are equally clean,
// E♭ wins (closer to traditional jazz fake-book spelling).
function scoreSpelling(rootSpelling, chord, rootPc) {
  let s = Math.abs(rootSpelling.acc);
  if (rootSpelling.acc > 0) s += 0.1;
  chord.intervals.forEach((iv, idx) => {
    const t = spellChordTone(rootSpelling.letter, chord.degrees[idx], iv, rootPc);
    s += Math.abs(t.acc);
    if (Math.abs(t.acc) >= 2) s += 5;
    if (t.acc > 0) s += 0.05;
  });
  return s;
}

// Pick the cleaner enharmonic root (D♯ vs E♭ etc.) per-chord, then derive tone spellings.
function chordContext(rootPc, chord) {
  const cands = ROOT_SPELLINGS[rootPc];
  let best = cands[0];
  let bestScore = scoreSpelling(best, chord, rootPc);
  for (let i = 1; i < cands.length; i++) {
    const s = scoreSpelling(cands[i], chord, rootPc);
    if (s < bestScore) { best = cands[i]; bestScore = s; }
  }
  const toneSpellings = chord.intervals.map((iv, idx) =>
    spellChordTone(best.letter, chord.degrees[idx], iv, rootPc)
  );
  const flats  = toneSpellings.filter(t => t.acc < 0).length + (best.acc < 0 ? 1 : 0);
  const sharps = toneSpellings.filter(t => t.acc > 0).length + (best.acc > 0 ? 1 : 0);
  return { rootSpelling: best, toneSpellings, usesFlat: flats > sharps };
}

const FRETS = 12;

const noteName = (pc, useFlat = settings.preferFlats) =>
  (useFlat ? NOTES_FLAT : NOTES_SHARP)[pc];
const fretPC = (stringIdx, fret) => (STRING_OPEN_PC[stringIdx] + fret) % 12;

// Chord-context-aware spelling: if pc matches one of the current chord's
// tones, use that tone's proper spelling (e.g., B♭ instead of A♯ in a
// G♭maj7 context). Otherwise, fall back to the context's flat/sharp bias.
function noteInContext(pc) {
  if (!current || !current.ctx) return noteName(pc);
  const idx = current.chord.intervals.findIndex(iv => (current.root + iv) % 12 === pc);
  if (idx >= 0) return spellingToString(current.ctx.toneSpellings[idx]);
  return noteName(pc, current.ctx.usesFlat);
}

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

  const ctx = chordContext(root, chord);
  const q = { root, key, chord, stringIdx, mode: settings.mode, ctx };
  if (settings.mode === 'A') {
    const toneIdx = Math.floor(Math.random() * chord.intervals.length);
    q.toneIdx = toneIdx;
    q.targetInterval = chord.intervals[toneIdx];
    q.targetPC = (root + q.targetInterval) % 12;
    q.toneLabel = chord.labels[toneIdx];
    q.toneSpelling = ctx.toneSpellings[toneIdx];
  } else {
    q.targetPCs = chord.intervals.map(i => (root + i) % 12);
    q.toneLabels = chord.labels;
    q.toneSpellings = ctx.toneSpellings;
  }
  return q;
}

// ── Fretboard rendering ───────────────────────
const fretboardEl = document.getElementById('fretboard');

// Generic fretboard grid builder — used by both quiz and scale views.
function buildFretboardGrid(rootEl, onCellClick) {
  rootEl.innerHTML = '';

  // Row 1: corner + fret labels (frets 0..12 left→right)
  const corner = document.createElement('div');
  corner.className = 'fret-label corner';
  rootEl.appendChild(corner);
  for (let f = 0; f <= FRETS; f++) {
    const lbl = document.createElement('div');
    lbl.className = 'fret-label';
    if (f === 0) lbl.classList.add('fret-0-label');
    lbl.textContent = f;
    rootEl.appendChild(lbl);
  }

  // Rows 2..7: for each string (idx 0 = string 6 / low E on top), label then 13 cells
  for (let s = 0; s < 6; s++) {
    const h = document.createElement('div');
    h.className = 'string-header';
    h.dataset.string = s;
    h.textContent = `${6 - s}`;
    rootEl.appendChild(h);

    for (let f = 0; f <= FRETS; f++) {
      const cell = document.createElement('div');
      cell.className = `cell fret-${f}`;
      cell.dataset.string = s;
      cell.dataset.fret = f;
      if (onCellClick) cell.addEventListener('click', onCellClick);
      rootEl.appendChild(cell);
    }
  }

  // Inlay dots — absolutely positioned so they don't disturb grid auto-flow.
  const fretCenter = (f) => `calc(32px + (100% - 32px) * ${f + 0.5} / 13)`;
  const stringBoundary = (i) => `calc(22px + (100% - 22px) * ${i} / 6)`;
  const addInlay = (f, boundaryIdx) => {
    const d = document.createElement('div');
    d.className = 'inlay-dot';
    d.style.left = fretCenter(f);
    d.style.top = stringBoundary(boundaryIdx);
    rootEl.appendChild(d);
  };
  [3, 5, 7, 9].forEach(f => addInlay(f, 3));
  addInlay(12, 2);
  addInlay(12, 4);
}

function buildFretboard() { buildFretboardGrid(fretboardEl, onCellTap); }

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
      cell.textContent = noteInContext(pc);
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

// ── Audio synthesis (offline, Web Audio API) ──────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Soft pluck-like tone: triangle fundamental + sine octave through a
// lowpass with an ADSR envelope. Sounds reasonably string-like.
function playNote(midi, when = 0, duration = 1.2, vel = 0.28) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const freq = midiToFreq(midi);

  const o1 = ctx.createOscillator();
  o1.type = 'triangle'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = freq * 2;
  const g1 = ctx.createGain(); g1.gain.value = vel;
  const g2 = ctx.createGain(); g2.gain.value = vel * 0.3;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(8000, freq * 6);
  lp.Q.value = 0.7;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.55, t0 + 0.12);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  o1.connect(g1); g1.connect(env);
  o2.connect(g2); g2.connect(env);
  env.connect(lp); lp.connect(ctx.destination);

  const stopAt = t0 + duration + 0.05;
  o1.start(t0); o2.start(t0);
  o1.stop(stopAt); o2.stop(stopAt);
}

// Octave so the chord sits around C3..B4 — pleasant range, no muddiness.
const CHORD_BASE_MIDI = 48; // C3
function currentChordMidis() {
  if (!current) return [];
  return current.chord.intervals.map((iv) => CHORD_BASE_MIDI + current.root + iv);
}
function playArpeggio() {
  const midis = currentChordMidis();
  const gap = 0.32;
  midis.forEach((m, i) => playNote(m, i * gap, 0.55, 0.3));
}
function playChordTogether() {
  const midis = currentChordMidis();
  // Lower per-voice gain to avoid clipping when stacked.
  midis.forEach((m) => playNote(m, 0, 1.6, 0.18));
}

function renderTonesPanel() {
  if (!current) { tonesPanel.innerHTML = ''; return; }
  const chips = current.chord.intervals.map((iv, idx) => {
    const note = spellingToString(current.ctx.toneSpellings[idx]);
    const label = current.chord.labels[idx];
    const isRoot = idx === 0;
    return `<button type="button" class="tone-chip${isRoot ? ' is-root' : ''}" data-idx="${idx}" aria-label="${note} ${label} 듣기">
      <span class="tn-note">${note}</span>
      <span class="tn-label">${label}</span>
    </button>`;
  }).join('');
  const controls = `<div class="tones-play">
    <button type="button" class="play-btn" data-play="arp" aria-label="한 음씩 듣기">♪ 한 음씩</button>
    <button type="button" class="play-btn" data-play="chord" aria-label="동시에 듣기">♬ 동시</button>
  </div>`;
  tonesPanel.innerHTML = chips + controls;

  tonesPanel.querySelectorAll('.tone-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const idx = +chip.dataset.idx;
      const iv = current.chord.intervals[idx];
      playNote(CHORD_BASE_MIDI + current.root + iv, 0, 1.2, 0.32);
    });
  });
  tonesPanel.querySelectorAll('.play-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.play === 'arp') playArpeggio();
      else playChordTogether();
    });
  });
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
  qRoot.textContent = spellingToString(current.ctx.rootSpelling);
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
      feedbackEl.textContent = `정답! ${noteInContext(pc)}`;
      feedbackEl.className = 'feedback good';
      vibrate(30);
      if (settings.autoNext) setTimeout(nextQuestion, 700);
    } else {
      cell.classList.add('wrong');
      stats.streak = 0;
      feedbackEl.textContent = `오답. 정답은 ${spellingToString(current.toneSpelling)}.`;
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
    const names = current.toneSpellings.map(spellingToString).join(' / ');
    feedbackEl.textContent = `정답! ${names}`;
    feedbackEl.className = 'feedback good';
    vibrate(30);
  } else {
    stats.streak = 0;
    const miss = missing.map(noteInContext).join(', ');
    const ex = extra.map(noteInContext).join(', ');
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

// Auto-show quiz help the first time the user enters the quiz view
const FIRST_RUN_KEY = 'fretquiz.seen.help.v1';

modeBtn.addEventListener('click', () => {
  settings.mode = settings.mode === 'A' ? 'B' : 'A';
  saveSettings();
  applyModeUI();
  document.querySelectorAll('input[name="mode"]').forEach(r => r.checked = r.value === settings.mode);
  nextQuestion();
});

nextBtn.addEventListener('click', nextQuestion);
submitBtn.addEventListener('click', submitModeB);

// ── Scale viewer ──────────────────────────────────
// MIDI for open strings (low E to high E)
const STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// Shared state — both views read from this
let scaleState = { root: 0, scale: 'major', shape: 'E' };

// Scale view DOM refs
const scaleFretboardEl = document.getElementById('scaleFretboard');
const scaleRootList    = document.getElementById('scaleRootList');
const scaleTypeList    = document.getElementById('scaleTypeList');
const scaleShapeList   = document.getElementById('scaleShapeList');
const scaleSummaryEl   = document.getElementById('scaleSummary');

function computeBox(rootPc, shapeKey) {
  if (shapeKey === 'ALL') return { start: 0, end: 12 };
  const sh = CAGED_SHAPES[shapeKey];
  if (!sh) return { start: 0, end: 12 };
  const open = STRING_OPEN_PC[sh.anchorString];
  let anchorFret = (rootPc - open + 12) % 12;
  let start = anchorFret + sh.offsetMin;
  let end   = anchorFret + sh.offsetMax;
  if (start < 0) {
    const shift = Math.ceil(-start / 12) * 12;
    start += shift; end += shift;
  }
  return { start: Math.max(0, start), end: Math.min(FRETS, end) };
}

function classifyTone(scale, idx) {
  if (idx === 0) return 'root';
  const deg = scale.degrees[idx];
  if (scale.avoid.includes(deg)) return 'avoid';
  if (scale.chordTones.includes(deg)) return 'chord';
  return 'tension';
}

// ── Scale view: original grid fretboard ───────────
function onScaleCellTap(e) {
  const s = +e.currentTarget.dataset.string;
  const f = +e.currentTarget.dataset.fret;
  playNote(STRING_OPEN_MIDI[s] + f, 0, 0.9, 0.32);
}

function renderScaleViewer() {
  const scale = SCALES[scaleState.scale];
  const ctx   = chordContext(scaleState.root, scale);
  const box   = computeBox(scaleState.root, scaleState.shape);

  scaleFretboardEl.querySelectorAll('.cell').forEach(cell => {
    const s = +cell.dataset.string;
    const f = +cell.dataset.fret;
    cell.classList.remove('scale-note','note-root','note-chord','note-tension','note-avoid','in-box');
    cell.textContent = '';
    const pc  = fretPC(s, f);
    const idx = scale.intervals.findIndex(iv => (scaleState.root + iv) % 12 === pc);
    if (idx >= 0) {
      const role = classifyTone(scale, idx);
      cell.classList.add('scale-note', `note-${role}`);
      cell.textContent = spellingToString(ctx.toneSpellings[idx]);
    }
    if (f >= box.start && f <= box.end) cell.classList.add('in-box');
  });

  renderRootPicker();
  scaleSummaryEl.textContent =
    `${spellingToString(ctx.rootSpelling)} ${scale.name} · ${scaleState.shape === 'ALL' ? '전체' : scaleState.shape + '형'}`;
}

// ── Generic picker helpers ─────────────────────────
// Build buttons in a container only if empty, then sync selection state.
function buildRootPickerIn(container, onPick) {
  if (!container.children.length) {
    for (let pc = 0; pc < 12; pc++) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'pick-chip'; btn.dataset.pc = pc;
      btn.addEventListener('click', () => onPick(pc));
      container.appendChild(btn);
    }
  }
  const scale = SCALES[scaleState.scale];
  container.querySelectorAll('.pick-chip').forEach(btn => {
    const pc  = +btn.dataset.pc;
    btn.textContent = spellingToString(chordContext(pc, scale).rootSpelling);
    btn.classList.toggle('on', pc === scaleState.root);
  });
}

function buildScalePickerIn(container, onPick) {
  if (!container.children.length) {
    Object.entries(SCALES).forEach(([key, def]) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'pick-chip'; btn.dataset.scale = key;
      btn.textContent = def.name;
      btn.addEventListener('click', () => onPick(key));
      container.appendChild(btn);
    });
  }
  container.querySelectorAll('.pick-chip').forEach(btn =>
    btn.classList.toggle('on', btn.dataset.scale === scaleState.scale));
}

function buildShapePickerIn(container, onPick) {
  if (!container.children.length) {
    ['C','A','G','E','D','ALL'].forEach(key => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'pick-chip'; btn.dataset.shape = key;
      btn.textContent = key === 'ALL' ? '전체' : key;
      btn.addEventListener('click', () => onPick(key));
      container.appendChild(btn);
    });
  }
  container.querySelectorAll('.pick-chip').forEach(btn =>
    btn.classList.toggle('on', btn.dataset.shape === scaleState.shape));
}

// Scale view picker render fns (used by initScaleViewer & renderScaleViewer)
function renderRootPicker()  { buildRootPickerIn(scaleRootList,    pc  => { scaleState.root  = pc;  renderRootPicker();  renderScaleViewer(); }); }
function renderScalePicker() { buildScalePickerIn(scaleTypeList,   key => { scaleState.scale = key; renderScalePicker(); renderScaleViewer(); }); }
function renderShapePicker() { buildShapePickerIn(scaleShapeList,  key => { scaleState.shape = key; renderShapePicker(); renderScaleViewer(); }); }


// ── Shared play functions ─────────────────────────
function scaleNotesInBox() {
  const scale = SCALES[scaleState.scale];
  const box   = computeBox(scaleState.root, scaleState.shape);
  const notes = [];
  for (let s = 0; s < 6; s++) {
    for (let f = box.start; f <= box.end; f++) {
      const pc = fretPC(s, f);
      if (scale.intervals.some(iv => (scaleState.root + iv) % 12 === pc))
        notes.push({ s, f, midi: STRING_OPEN_MIDI[s] + f });
    }
  }
  notes.sort((a, b) => a.midi - b.midi);
  const seen = new Set();
  return notes.filter(n => seen.has(n.midi) ? false : (seen.add(n.midi), true));
}

function playScaleAsc() {
  const notes = scaleNotesInBox();
  if (!notes.length) return;
  let si = notes.findIndex(n => n.midi % 12 === scaleState.root);
  if (si < 0) si = 0;
  notes.slice(si).forEach((n, i) => playNote(n.midi, i * 0.22, 0.4, 0.28));
}
function playScaleDesc() {
  const notes = scaleNotesInBox();
  if (!notes.length) return;
  let ei = -1;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].midi % 12 === scaleState.root) { ei = i; break; }
  }
  if (ei < 0) ei = notes.length - 1;
  notes.slice(0, ei + 1).reverse().forEach((n, i) => playNote(n.midi, i * 0.22, 0.4, 0.28));
}
function playScaleChord() {
  const scale = SCALES[scaleState.scale];
  const root  = scaleState.root;
  scale.chordTones.forEach(deg => {
    let idx = -1;
    for (let i = scale.degrees.length - 1; i >= 0; i--) {
      if (scale.degrees[i] === deg) { idx = i; break; }
    }
    if (idx < 0) return;
    playNote(CHORD_BASE_MIDI + root + scale.intervals[idx], 0, 1.6, 0.18);
  });
}

// ── Scale viewer init ─────────────────────────────
let scaleViewerInited = false;
function initScaleViewer() {
  if (scaleViewerInited) return;
  scaleViewerInited = true;
  buildFretboardGrid(scaleFretboardEl, onScaleCellTap);
  renderRootPicker();
  renderScalePicker();
  renderShapePicker();
  renderScaleViewer();
}

// ── Practice view: proportional guitar neck (22 frets) ──────
// Sustained note — returns stop() closure
function startSustainedNote(midi, vel = 0.28) {
  const ctx = getAudioCtx();
  if (!ctx) return () => {};
  const freq = midiToFreq(midi);
  const t0   = ctx.currentTime;

  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine';     o2.frequency.value = freq * 2;
  const g1 = ctx.createGain(); g1.gain.value = vel;
  const g2 = ctx.createGain(); g2.gain.value = vel * 0.3;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = Math.min(7000, freq * 5); lp.Q.value = 0.7;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(1,    t0 + 0.010);
  env.gain.exponentialRampToValueAtTime(0.60, t0 + 0.18);
  o1.connect(g1); g1.connect(env);
  o2.connect(g2); g2.connect(env);
  env.connect(lp); lp.connect(ctx.destination);
  o1.start(t0); o2.start(t0);

  let done = false;
  return () => {
    if (done) return; done = true;
    const now = ctx.currentTime;
    env.gain.cancelScheduledValues(now);
    env.gain.setValueAtTime(env.gain.value, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
    o1.stop(now + 0.25); o2.stop(now + 0.25);
  };
}

const FN_FRETS      = 22;
const FN_RATIO      = Math.pow(2, -1 / 12);
// 1프렛 칸 길이 = 기존 1+2+3프렛을 합친 길이(약 142px). 비율(FN_RATIO)은 유지.
const FN_FRET1_H    = Math.round(50 * (1 + FN_RATIO + FN_RATIO * FN_RATIO));
// 너트(0프렛) 칸도 같은 배율로 확대 — 기존 30:50 비율 유지
const FN_NUT_H      = Math.round(30 * FN_FRET1_H / 50);
const FN_INLAY_SNGL = new Set([3, 5, 7, 9, 15, 17, 19, 21]);

let fnInited  = false;
let fnFretPos = null;
let fnOffset  = 0;
const fnFingers = new Map();

function buildFretNeck() {
  const strRowEl   = document.getElementById('fnStrCol');
  const innerEl    = document.getElementById('fnInner');
  const viewportEl = document.getElementById('fnViewport');

  // ── String label row (top, fixed): corner + str6..str1 left→right ──
  strRowEl.innerHTML = '';
  const corner = document.createElement('div');
  corner.className = 'fn-str-corner';
  strRowEl.appendChild(corner);
  for (let s = 0; s < 6; s++) {
    const lbl = document.createElement('div');
    lbl.className = 'fn-str-lbl-h';
    lbl.textContent = 6 - s;   // s=0 → "6", s=5 → "1"
    strRowEl.appendChild(lbl);
  }

  // ── Fret heights (guitar scale ratio, vertical) ──────────────
  const fretHs = [];
  for (let f = 0; f <= FN_FRETS; f++)
    fretHs.push(f === 0 ? FN_NUT_H : Math.round(FN_FRET1_H * Math.pow(FN_RATIO, f - 1)));
  fnFretPos = [0];
  fretHs.forEach(h => fnFretPos.push(fnFretPos[fnFretPos.length - 1] + h));
  const totalH = fnFretPos[FN_FRETS + 1];

  // ── Inner grid: cols=[fret-num | s0..s5], rows=fret heights ──
  innerEl.innerHTML = '';
  innerEl.style.height = totalH + 'px';
  innerEl.style.width  = '';
  innerEl.style.gridTemplateColumns = '30px repeat(6, 1fr)';
  innerEl.style.gridTemplateRows    = fretHs.map(h => h + 'px').join(' ');

  // For each fret row: fret-num cell + 6 string cells (s=0 left … s=5 right)
  for (let f = 0; f <= FN_FRETS; f++) {
    const fnumEl = document.createElement('div');
    fnumEl.className = 'fn-fnum-cell' + (f === 0 ? ' fn-nut-fnum' : '');
    if (f === 12)               fnumEl.classList.add('has-inlay-double');
    else if (FN_INLAY_SNGL.has(f)) fnumEl.classList.add('has-inlay');
    fnumEl.textContent = f === 0 ? '0' : f;
    innerEl.appendChild(fnumEl);

    for (let s = 0; s < 6; s++) {
      const cell = document.createElement('div');
      cell.className = 'fn-cell' + (f === 0 ? ' fn-nut-cell' : '');
      cell.dataset.s = s;
      cell.dataset.f = f;
      innerEl.appendChild(cell);
    }
  }

  // Touch events
  innerEl.addEventListener('touchstart',  onFnTouchStart,  { passive: false });
  innerEl.addEventListener('touchmove',   onFnTouchMove,   { passive: false });
  innerEl.addEventListener('touchend',    onFnTouchEnd,    { passive: false });
  innerEl.addEventListener('touchcancel', onFnTouchEnd,    { passive: false });

  // ── Vertical slider (top = fret 0 / nut, bottom = fret 22) ──
  // slider.value = fret shown at the top of the viewport (direct mapping)
  const slider = document.getElementById('fnSlider');

  function syncInnerWidth() {
    if (viewportEl && innerEl) innerEl.style.width = viewportEl.clientWidth + 'px';
  }
  function refreshSliderMax() {
    if (!viewportEl || !fnFretPos) return;
    syncInnerWidth();
    const vh = viewportEl.clientHeight;
    // Highest fret we can scroll to without leaving empty space below the neck
    let maxFret = 0;
    for (let f = FN_FRETS; f >= 0; f--) {
      if (fnFretPos[FN_FRETS + 1] - fnFretPos[f] >= vh) { maxFret = f; break; }
    }
    slider.max = maxFret;
    const cur = Math.min(+slider.value, maxFret);
    if (cur !== +slider.value) slider.value = cur;
    fnOffset = fnFretPos[+slider.value];
    innerEl.style.transform = `translateY(${-fnOffset}px)`;
    updateFnFretInfo();
  }
  slider.addEventListener('input', () => {
    fnOffset = fnFretPos[+slider.value];
    innerEl.style.transition = 'none';
    innerEl.style.transform  = `translateY(${-fnOffset}px)`;
    updateFnFretInfo();
  });
  requestAnimationFrame(() => { syncInnerWidth(); refreshSliderMax(); });
  window.addEventListener('resize', refreshSliderMax);

  // Fullscreen toggle
  document.getElementById('fnFullscreenBtn').addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    }
  });
}

function updateFnFretInfo() {
  const slider = document.getElementById('fnSlider');
  const f = +slider.value;  // direct: slider value → top fret
  const el = document.getElementById('fnFretInfo');
  if (el) el.textContent = f === 0 ? '개방' : f + '프렛';
}

function renderFretNeck() {
  if (!fnInited) return;
  const scale = SCALES[scaleState.scale];
  const ctx   = chordContext(scaleState.root, scale);
  const box   = computeBox(scaleState.root, scaleState.shape);

  document.querySelectorAll('#fnInner .fn-cell').forEach(cell => {
    const s  = +cell.dataset.s;
    const f  = +cell.dataset.f;
    const pc = fretPC(s, f);
    const idx = scale.intervals.findIndex(iv => (scaleState.root + iv) % 12 === pc);
    cell.className = 'fn-cell' + (f === 0 ? ' fn-nut-cell' : '');
    if (f >= box.start && f <= box.end) cell.classList.add('fn-in-box');
    cell.innerHTML = '';
    if (idx >= 0) {
      const tone = classifyTone(scale, idx);
      const dot = document.createElement('span');
      dot.className = 'fn-dot';
      // 어보이드 음도 음 이름을 표시(스케일 구성음이므로). 색으로만 구분.
      cell.classList.add(tone === 'avoid' ? 'fn-avoid' : 'fn-scale');
      dot.textContent = spellingToString(ctx.toneSpellings[idx]);
      cell.appendChild(dot);
    }
  });

  const keyBtn   = document.getElementById('fnKeyBtn');
  const scaleBtn = document.getElementById('fnScaleBtn');
  const shapeBtn = document.getElementById('fnShapeBtn');
  if (keyBtn)   keyBtn.textContent   = spellingToString(ctx.rootSpelling);
  if (scaleBtn) scaleBtn.textContent = scale.name;
  if (shapeBtn) shapeBtn.textContent = scaleState.shape === 'ALL' ? '전체' : scaleState.shape + '형';

  if (scaleState.shape !== 'ALL' && fnFretPos) {
    const slider = document.getElementById('fnSlider');
    const maxFret = +slider.max;
    const target = Math.max(0, Math.min(maxFret, box.start > 0 ? box.start - 1 : 0));
    slider.value = target;  // direct
    fnOffset = fnFretPos[target];
    const inner = document.getElementById('fnInner');
    if (inner) { inner.style.transition = 'none'; inner.style.transform = `translateY(${-fnOffset}px)`; }
    updateFnFretInfo();
  }
}

// Touch handlers
function fnCellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.('.fn-cell') || null;
}
function onFnTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const cell = fnCellAt(t.clientX, t.clientY);
    if (!cell) continue;
    const midi = STRING_OPEN_MIDI[+cell.dataset.s] + +cell.dataset.f;
    cell.classList.add('fn-pressed');
    fnFingers.set(t.identifier, { stop: startSustainedNote(midi), cell });
  }
}
function onFnTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const finger = fnFingers.get(t.identifier);
    if (!finger) continue;
    const cell = fnCellAt(t.clientX, t.clientY);
    if (cell && cell !== finger.cell) {
      finger.stop();
      finger.cell.classList.remove('fn-pressed');
      const midi = STRING_OPEN_MIDI[+cell.dataset.s] + +cell.dataset.f;
      finger.stop = startSustainedNote(midi);
      finger.cell = cell;
      cell.classList.add('fn-pressed');
    }
  }
}
function onFnTouchEnd(e) {
  for (const t of e.changedTouches) {
    const finger = fnFingers.get(t.identifier);
    if (finger) {
      finger.stop();
      finger.cell.classList.remove('fn-pressed');
      fnFingers.delete(t.identifier);
    }
  }
}

// Dialog builders
function buildFnKeyDialog() {
  const grid = document.getElementById('fnKeyGrid');
  if (grid.children.length) return;
  for (let pc = 0; pc < 12; pc++) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fn-pick-btn'; btn.dataset.pc = pc;
    btn.addEventListener('click', () => {
      scaleState.root = pc;
      syncFnKeyDialog();
      renderFretNeck();
      if (scaleViewerInited) renderScaleViewer();
      document.getElementById('fnKeyDialog').close();
    });
    grid.appendChild(btn);
  }
}
function syncFnKeyDialog() {
  const scale = SCALES[scaleState.scale];
  document.querySelectorAll('#fnKeyGrid .fn-pick-btn').forEach(btn => {
    const pc = +btn.dataset.pc;
    btn.textContent = spellingToString(chordContext(pc, scale).rootSpelling);
    btn.classList.toggle('on', pc === scaleState.root);
  });
}
function buildFnScaleDialog() {
  const list = document.getElementById('fnScaleGrid');
  if (list.children.length) return;
  Object.entries(SCALES).forEach(([key, def]) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fn-pick-btn'; btn.dataset.scale = key;
    btn.textContent = def.name;
    btn.addEventListener('click', () => {
      scaleState.scale = key;
      syncFnScaleDialog();
      renderFretNeck();
      if (scaleViewerInited) renderScaleViewer();
      document.getElementById('fnScaleDialog').close();
    });
    list.appendChild(btn);
  });
}
function syncFnScaleDialog() {
  document.querySelectorAll('#fnScaleGrid .fn-pick-btn').forEach(btn =>
    btn.classList.toggle('on', btn.dataset.scale === scaleState.scale));
}

document.getElementById('fnKeyBtn').addEventListener('click', () => {
  buildFnKeyDialog(); syncFnKeyDialog();
  const d = document.getElementById('fnKeyDialog');
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
});
document.getElementById('fnScaleBtn').addEventListener('click', () => {
  buildFnScaleDialog(); syncFnScaleDialog();
  const d = document.getElementById('fnScaleDialog');
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
});
document.getElementById('fnShapeBtn').addEventListener('click', () => {
  const shapes = ['C', 'A', 'G', 'E', 'D', 'ALL'];
  scaleState.shape = shapes[(shapes.indexOf(scaleState.shape) + 1) % shapes.length];
  renderFretNeck();
  if (scaleViewerInited) renderScaleViewer();
});

// Practice view init
function initFretNeck() {
  if (!fnInited) {
    fnInited = true;
    buildFretNeck();
  }
  renderFretNeck();
}

document.getElementById('homeHelpBtn').addEventListener('click', openHelp);

// ── Score Scan (camera → Claude vision → chords) ──────────────
const SCAN_KEY_LS = 'anthropicApiKey';
let scanInited = false;
let scanImage  = null;   // { mediaType, data(base64) }
let lastScan   = null;   // 마지막으로 표시된 결과(저장용)

// 책/페이지별 캐시 (localStorage)
const getBooks   = () => { try { return JSON.parse(localStorage.getItem('scanBooks')   || '[]'); } catch (_) { return []; } };
const setBooks   = (b) => localStorage.setItem('scanBooks', JSON.stringify(b));
const getLibrary = () => { try { return JSON.parse(localStorage.getItem('scanLibrary') || '{}'); } catch (_) { return {}; } };
const setLibrary = (l) => localStorage.setItem('scanLibrary', JSON.stringify(l));
const libKey     = (bookId, page) => bookId + '|' + String(page).trim();

function refreshBookSelect() {
  const sel = document.getElementById('scanBook');
  if (!sel) return;
  const books = getBooks();
  const cur = sel.value;
  sel.innerHTML = '';
  if (!books.length) {
    const o = document.createElement('option');
    o.value = ''; o.textContent = '책 없음 — ＋책'; sel.appendChild(o);
    return;
  }
  books.forEach(bk => {
    const o = document.createElement('option');
    o.value = bk.id; o.textContent = bk.name; sel.appendChild(o);
  });
  if (cur && books.some(b => b.id === cur)) sel.value = cur;
}

// 코드 전체를 한꺼번에(가벼운 스트럼) 재생
function playChord(positions) {
  const ord = (positions || [])
    .filter(p => { const i = 6 - (+p.string); return i >= 0 && i < 6; })
    .sort((a, b) => (+b.string) - (+a.string));   // 6번줄(저음) → 1번줄(고음)
  ord.forEach((pos, i) => {
    const idx = 6 - (+pos.string);
    playNote(STRING_OPEN_MIDI[idx] + (+pos.fret), i * 0.04, 1.8, 0.24);
  });
}

// 따옴표/공백/줄바꿈이 섞여 들어와도 정리 (Anthropic 키엔 공백이 없음)
const cleanKey  = (s) => (s || '').replace(/^[\s'"`]+|[\s'"`]+$/g, '').replace(/\s+/g, '');
const getScanKey = () => cleanKey(localStorage.getItem(SCAN_KEY_LS) || '');

function setScanStatus(msg, isErr) {
  const el = document.getElementById('scanStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', !!isErr);
}

const SCAN_PROMPT =
`당신은 기타 타브(TAB)와 악보를 읽는 전문가입니다.
이미지에 보이는 타브/악보 전체를 처음부터 끝까지 빠짐없이 훑어, 등장하는 모든 코드를 한 번에 추출하세요.
- 왼쪽→오른쪽, 위 줄→아래 줄 순서로 마디를 따라가며 누락 없이 모두 나열하세요.
- 같은 코드가 반복되면 반복된 횟수만큼 모두 포함하세요(중복을 합치지 마세요).
- 코드 기호가 적혀 있으면 그대로 읽고, 타브 숫자만 있으면 동시에 눌리는 음으로 코드를 추정하세요.
- 각 코드의 이름(예: Cmaj7, G, Am7, D7)과 구성음을 제시하세요.
- 타브에 줄/프렛 숫자가 있으면 각 음의 위치를 positions에 담으세요: string은 줄 번호(6=가장 굵은 저음 E … 1=가장 얇은 고음 E), fret은 프렛 번호, note는 그 위치의 실제 음. 코드 기호만 있고 타브가 없으면 positions는 빈 배열로 두세요.
- 코드를 찾지 못하면 chords를 빈 배열로 두고 summary에 이유를 적으세요.`;

const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    chords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          notes:  { type: 'array', items: { type: 'string' } },
          positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                string: { type: 'integer' },   // 6 = lowest E … 1 = highest E
                fret:   { type: 'integer' },
                note:   { type: 'string' },
              },
              required: ['string', 'fret', 'note'],
              additionalProperties: false,
            },
          },
        },
        required: ['symbol', 'notes', 'positions'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['chords', 'summary'],
  additionalProperties: false,
};

function initScan() {
  if (scanInited) return;
  scanInited = true;

  const fileEl     = document.getElementById('scanFile');
  const shootBtn   = document.getElementById('scanShootBtn');
  const runBtn     = document.getElementById('scanRunBtn');
  const preview    = document.getElementById('scanPreview');
  const placeholder= document.getElementById('scanPlaceholder');
  const keyBtn     = document.getElementById('scanKeyBtn');
  const keyDialog  = document.getElementById('scanKeyDialog');
  const keyInput   = document.getElementById('scanKeyInput');
  const pasteBtn   = document.getElementById('scanKeyPaste');

  pasteBtn.addEventListener('click', async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) keyInput.value = t.trim();
      keyInput.focus();
    } catch (_) {
      keyInput.focus();
      keyInput.placeholder = '입력칸을 길게 눌러 붙여넣기 하세요';
    }
  });

  shootBtn.addEventListener('click', () => fileEl.click());

  fileEl.addEventListener('change', () => {
    const f = fileEl.files && fileEl.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      const m = /^data:(.*?);base64,(.*)$/.exec(url);
      if (!m) { setScanStatus('이미지를 읽지 못했어요.', true); return; }
      preview.src = url; preview.hidden = false;
      placeholder.hidden = true;
      scanImage = { mediaType: m[1], data: m[2] };
      runBtn.disabled = false;
      setScanStatus('');
      document.getElementById('scanResult').innerHTML = '';
    };
    reader.readAsDataURL(f);
  });

  runBtn.addEventListener('click', runScan);

  const openKeyDialog = () => {
    keyInput.value = getScanKey();
    if (keyDialog.showModal) keyDialog.showModal(); else keyDialog.setAttribute('open', '');
    keyInput.focus();
  };
  keyBtn.addEventListener('click', openKeyDialog);
  const keyBtn2 = document.getElementById('scanKeyBtn2');
  if (keyBtn2) keyBtn2.addEventListener('click', openKeyDialog);

  keyDialog.addEventListener('close', () => {
    if (keyDialog.returnValue !== 'save') return;
    const k = cleanKey(keyInput.value);
    localStorage.setItem(SCAN_KEY_LS, k);
    if (!k) setScanStatus('API 키가 비워졌습니다.');
    else if (!k.startsWith('sk-ant')) setScanStatus('저장됨 — 다만 키가 sk-ant- 로 시작하지 않아요. 다시 확인해 주세요.', true);
    else setScanStatus('API 키가 저장되었습니다.');
  });

  // ── 책/페이지 캐시 ──
  refreshBookSelect();
  const bookSel = document.getElementById('scanBook');
  const pageInp = document.getElementById('scanPage');
  const bookName = () => (getBooks().find(b => b.id === bookSel.value) || {}).name || '책';

  document.getElementById('scanAddBook').addEventListener('click', () => {
    const name = (prompt('책 이름을 입력하세요') || '').trim();
    if (!name) return;
    const books = getBooks();
    const id = 'b' + Date.now();
    books.push({ id, name });
    setBooks(books);
    refreshBookSelect();
    bookSel.value = id;
    setScanStatus('책 추가됨: ' + name);
  });

  document.getElementById('scanSave').addEventListener('click', () => {
    if (!bookSel.value) { setScanStatus('먼저 ＋책으로 책을 추가/선택하세요.', true); return; }
    const page = (pageInp.value || '').trim();
    if (!page) { setScanStatus('페이지를 입력하세요.', true); return; }
    if (!lastScan || !(lastScan.chords || []).length) { setScanStatus('저장할 결과가 없어요. 먼저 분석하세요.', true); return; }
    const lib = getLibrary();
    lib[libKey(bookSel.value, page)] = lastScan;
    setLibrary(lib);
    setScanStatus(`저장됨: ${bookName()} ${page}p`);
  });

  document.getElementById('scanLoad').addEventListener('click', () => {
    if (!bookSel.value) { setScanStatus('책을 선택하세요.', true); return; }
    const page = (pageInp.value || '').trim();
    if (!page) { setScanStatus('페이지를 입력하세요.', true); return; }
    const entry = getLibrary()[libKey(bookSel.value, page)];
    if (!entry) { setScanStatus(`저장된 결과가 없어요: ${bookName()} ${page}p`, true); return; }
    lastScan = entry;
    renderScanResult(entry);
    setScanStatus(`불러옴: ${bookName()} ${page}p`);
  });
}

async function runScan() {
  const key = getScanKey();
  if (!key) {
    setScanStatus('먼저 🔑 버튼으로 API 키를 입력하세요.', true);
    document.getElementById('scanKeyBtn').click();
    return;
  }
  if (!scanImage) { setScanStatus('먼저 사진을 촬영/선택하세요.', true); return; }

  const runBtn = document.getElementById('scanRunBtn');
  runBtn.disabled = true;
  setScanStatus('분석 중… (수 초 걸릴 수 있어요)');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: scanImage.mediaType, data: scanImage.data } },
            { type: 'text', text: SCAN_PROMPT },
          ],
        }],
        output_config: { format: { type: 'json_schema', schema: SCAN_SCHEMA } },
      }),
    });
    if (!res.ok) {
      let detail = 'HTTP ' + res.status;
      try { const e = await res.json(); detail = e.error?.message || detail; } catch (_) {}
      throw new Error(detail);
    }
    const data = await res.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) throw new Error('응답을 해석하지 못했어요.');
    renderScanResult(JSON.parse(textBlock.text));
    setScanStatus('');
  } catch (err) {
    setScanStatus('분석 실패: ' + (err.message || err), true);
  } finally {
    runBtn.disabled = false;
  }
}

function renderScanResult(parsed) {
  lastScan = parsed || null;
  const el = document.getElementById('scanResult');
  el.innerHTML = '';
  const chords = (parsed && parsed.chords) || [];
  if (!chords.length) {
    el.innerHTML = '<div class="scan-empty">코드를 찾지 못했어요. 더 또렷한 사진으로 다시 시도해 보세요.</div>';
  } else {
    const list = document.createElement('div');
    list.className = 'scan-chord-list';
    chords.forEach(c => {
      const card = document.createElement('div');
      card.className = 'scan-chord';

      const head = document.createElement('div');
      head.className = 'scan-chord-head';
      const main = document.createElement('div');
      main.className = 'scan-chord-main';
      const sym = document.createElement('div');
      sym.className = 'scan-chord-sym';
      sym.textContent = c.symbol || '?';
      const notes = document.createElement('div');
      notes.className = 'scan-chord-notes';
      notes.textContent = (c.notes || []).join(' · ');
      main.append(sym, notes);
      head.appendChild(main);
      card.appendChild(head);

      const positions = c.positions || [];
      if (positions.length) {
        card.classList.add('has-pos');
        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'scan-chord-play';
        playBtn.textContent = '🔊';
        playBtn.title = '코드 전체 듣기';
        playBtn.addEventListener('click', (e) => { e.stopPropagation(); playChord(positions); });
        head.appendChild(playBtn);
        const detail = document.createElement('div');
        detail.className = 'scan-chord-detail';
        positions.forEach(pos => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'scan-pos';
          row.innerHTML =
            `<span class="scan-pos-loc">${pos.string}번줄 ${pos.fret}프렛</span>` +
            `<span class="scan-pos-note">${pos.note}</span>`;
          row.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = 6 - (+pos.string);   // string 6→idx0 (low E) … 1→idx5
            if (idx >= 0 && idx < 6) playNote(STRING_OPEN_MIDI[idx] + (+pos.fret), 0, 0.9, 0.3);
            row.classList.add('playing');
            setTimeout(() => row.classList.remove('playing'), 250);
          });
          detail.appendChild(row);
        });
        card.appendChild(detail);
        head.addEventListener('click', () => card.classList.toggle('open'));
      }
      list.appendChild(card);
    });
    el.appendChild(list);
  }
  if (parsed && parsed.summary) {
    const s = document.createElement('div');
    s.className = 'scan-summary';
    s.textContent = parsed.summary;
    el.appendChild(s);
  }
}

// ── Claude JSON 호출 헬퍼 (스캔 키 공유) ──────────────────
async function claudeJSON({ prompt, schema, image }) {
  const key = getScanKey();
  if (!key) throw new Error('NO_KEY');
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: prompt });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  });
  if (!res.ok) {
    let detail = 'HTTP ' + res.status;
    try { const e = await res.json(); detail = e.error?.message || detail; } catch (_) {}
    throw new Error(detail);
  }
  const data = await res.json();
  const tb = (data.content || []).find(b => b.type === 'text');
  if (!tb) throw new Error('응답을 해석하지 못했어요.');
  return JSON.parse(tb.text);
}

// ── Real Book (스탠다드 코드 진행 + 마디별 스케일) ─────────
const REALBOOK_SONGS = [
  { t: 'All Of Me' }, { t: 'Autumn Leaves', s: 1 }, { t: 'Bye Bye Blackbird' }, { t: 'Beautiful Love', s: 1 },
  { t: "Billie's Bounce", b: 1 }, { t: 'But Not For Me' }, { t: 'Candy' }, { t: 'Day By Day' },
  { t: 'The Days Of Wine And Roses' }, { t: 'Fly Me To The Moon', s: 1 }, { t: 'I Love You' },
  { t: "I'll Remember April" }, { t: "I'll Close My Eyes" }, { t: 'It Could Happen To You' },
  { t: 'Just Friends' }, { t: 'Lullaby Of Birdland' }, { t: 'Moritat', s: 1 }, { t: 'Mr. P.C.', b: 1 },
  { t: 'Night And Day' }, { t: "Now's The Time", s: 1, b: 1 }, { t: 'Oleo' }, { t: 'Ornithology' },
  { t: 'Satin Doll' }, { t: 'Softly, As In A Morning Sunrise' }, { t: 'Summertime' }, { t: 'St. Thomas', s: 1 },
  { t: 'There Is No Greater Love' }, { t: 'There Will Never Be Another You' }, { t: "Take The 'A' Train" },
  { t: "You'd Be So Nice To Come Home To" },
];

const RB_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    key:   { type: 'string' },
    measures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chords: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                scales: { type: 'array', items: { type: 'string' } },
              },
              required: ['symbol', 'scales'],
              additionalProperties: false,
            },
          },
        },
        required: ['chords'],
        additionalProperties: false,
      },
    },
    keyDoc: {
      type: 'object',
      properties: {
        center: { type: 'string' },
        summary: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
      },
      required: ['center', 'summary', 'steps'],
      additionalProperties: false,
    },
  },
  required: ['title', 'key', 'measures', 'keyDoc'],
  additionalProperties: false,
};

const rbPrompt = (title) =>
`당신은 재즈 화성 전문가입니다. 재즈 스탠다드 "${title}"의 대표적인 코드 진행을 리드시트(Real Book) 형태로 제시하세요.
- key에 조성을 적으세요(예: "C Major", "G minor").
- measures는 곡의 마디 순서대로 담으세요. 각 마디(measure)에는 그 마디에서 연주되는 코드를 chords 배열로 넣으세요(보통 마디당 1개, 때때로 2개).
- AABA·ABAC 등 곡의 전체 폼을 가능한 한 모두 포함하세요(보통 32마디).
- 코드 심볼은 표준 표기로(예: Cmaj7, Am7, D7, G7, Bm7b5, F#m7b5).
- 각 코드마다 즉흥연주에 쓸 수 있는 대표 스케일을 1~3개 scales에 한국어로 적으세요(예: "D 도리안", "G 믹솔리디안", "C 메이저", "A 얼터드", "F 리디안").
- keyDoc: 이 곡의 중심 조성을 코드만 보고 찾는 법을 한국어로 설명하세요. center(중심키), summary(한 줄 요약), steps(ii–V–I·첫끝 코드·종지·임시 전조 등을 근거로 3~6단계).`;

// Real Book 5th ed.에서 직접 옮긴 코드 진행 (API 없이 사용). m = 마디별 코드 배열.
const REALBOOK_DATA = {
  'All Of Me': { key: 'C Major', m: [
    ['Cmaj7'],['Cmaj7'],['E7'],['E7'],['A7'],['A7'],['Dm7'],['Dm7'],
    ['E7'],['E7'],['Am7'],['Am7'],['D7'],['D7'],['Dm7'],['G7'],
    ['Cmaj7'],['Cmaj7'],['E7'],['E7'],['A7'],['A7'],['Dm7'],['Dm7'],
    ['Fmaj7'],['Fm6'],['Cmaj7','Em7'],['A7'],['Dm7'],['G7'],['C6'],['Ebdim7','Dm7','G7'] ] },
  'Autumn Leaves': { key: 'G Major / E minor', m: [
    ['Am7'],['D7'],['Gmaj7'],['Cmaj7'],['F#m7b5'],['B7'],['Em7'],['Em7'],
    ['Am7'],['D7'],['Gmaj7'],['Cmaj7'],['F#m7b5'],['B7'],['Em7'],['Em7'],
    ['F#m7b5'],['B7'],['Em7'],['Em7'],['Am7'],['D7'],['Gmaj7'],['Gmaj7'],
    ['F#m7b5'],['B7b9'],['Em7','Eb7'],['Dm7','Db7'],['Cmaj7'],['B7b9'],['Em7'],['Em7'] ] },
  'Beautiful Love': { key: 'D minor', m: [
    ['Em7b5'],['A7b9'],['Dm7'],['Dm7'],['Gm7'],['C7'],['Fmaj7'],['Em7b5','A7'],
    ['Dm7'],['Gm7'],['Bb7'],['Em7b5','A7'],['Dm7'],['Gm7'],['Em7b5'],['A7b9'],
    ['Em7b5'],['A7b9'],['Dm7'],['Dm7'],['Gm7'],['C7'],['Fmaj7'],['Em7b5','A7'],
    ['Dm7'],['Gm7'],['Bb7'],['Em7b5','A7'],['Dm7'],['Bb7','A7'],['Dm7'],['Dm7'] ] },
  'Oleo': { key: 'Bb Major', m: [
    ['Bbmaj7','G7'],['Cm7','F7'],['Bbmaj7','G7'],['Cm7','F7'],['Fm7','Bb7'],['Ebmaj7','Ebm6'],['Bbmaj7','G7'],['Cm7','F7'],
    ['Bbmaj7','G7'],['Cm7','F7'],['Bbmaj7','G7'],['Cm7','F7'],['Fm7','Bb7'],['Ebmaj7','Ebm6'],['Bbmaj7','G7'],['Bbmaj7'],
    ['D7'],['D7'],['G7'],['G7'],['C7'],['C7'],['F7'],['F7'],
    ['Bbmaj7','G7'],['Cm7','F7'],['Bbmaj7','G7'],['Cm7','F7'],['Fm7','Bb7'],['Ebmaj7','Ebm6'],['Bbmaj7','G7'],['Bbmaj7'] ] },
  'Satin Doll': { key: 'C Major', m: [
    ['Dm7','G7'],['Dm7','G7'],['Em7','A7'],['Em7','A7'],['Am7','D7'],['Abm7','Db7'],['C6'],['Em7b5','A7b9'],
    ['Dm7','G7'],['Dm7','G7'],['Em7','A7'],['Em7','A7'],['Am7','D7'],['Abm7','Db7'],['C6'],['C6'],
    ['Gm7','C7'],['Gm7','C7'],['Fmaj7'],['Fmaj7'],['Am7','D7'],['Am7','D7'],['Dm7','G7'],['Em7','A7'],
    ['Dm7','G7'],['Dm7','G7'],['Em7','A7'],['Em7','A7'],['Am7','D7'],['Abm7','Db7'],['C6'],['C6'] ] },
  "Take The 'A' Train": { key: 'C Major', m: [
    ['C6'],['C6'],['D7b5'],['D7b5'],['Dm7'],['G7'],['C6'],['C6'],
    ['C6'],['C6'],['D7b5'],['D7b5'],['Dm7'],['G7'],['C6'],['C7'],
    ['Fmaj7'],['Fmaj7'],['Fmaj7'],['Fmaj7'],['D7'],['D7'],['Dm7'],['G7'],
    ['C6'],['C6'],['D7b5'],['D7b5'],['Dm7'],['G7'],['C6'],['C6'] ] },
  'The Days Of Wine And Roses': { key: 'F Major', m: [
    ['Fmaj7'],['Eb7'],['Dm7b5'],['D7'],['Gm7'],['Gm7'],['Bbm7'],['Eb7'],
    ['Am7'],['Dm7'],['Gm7'],['C7'],['Em7b5','A7b9'],['Dm7','G7'],['Gm7'],['C7'],
    ['Fmaj7'],['Eb7'],['Dm7b5'],['D7'],['Gm7'],['Gm7'],['Bbm7'],['Eb7'],
    ['Am7'],['Dm7'],['Bm7b5'],['Bb7'],['Am7','Dm7'],['Gm7','C7'],['F6'],['Gm7','C7'] ] },
  'I Love You': { key: 'F Major', m: [
    ['Gm7b5'],['C7b9'],['Fmaj7'],['Fmaj7'],['Gm7'],['C7'],['Fmaj7'],['Fmaj7'],
    ['Gm7b5'],['C7b9'],['Fmaj7'],['Bm7','E7'],['Amaj7'],['Bm7','E7'],['Amaj7'],['Amaj7'],
    ['Gm7'],['C7'],['Fmaj7'],['Fmaj7'],['Am7b5'],['D7b9'],['Gm7'],['C7'],
    ['Gm7b5'],['C7b9'],['Fmaj7'],['Am7b5','D7'],['Gm7'],['Gm7','C7'],['F6'],['F6'] ] },
  "I'll Remember April": { key: 'G Major', m: [
    ['Gmaj7'],['G6'],['Gmaj7'],['G6'],['Gm7'],['Gm6'],['Gm7'],['Gm6'],
    ['Am7b5'],['D7'],['Bm7b5'],['E7'],['Am7'],['D7'],['G6'],['G#dim7'],
    ['Cm7'],['F7'],['Bbmaj7'],['Gm7'],['Cm7'],['F7'],['Bbmaj7'],['Bb6'],
    ['Am7'],['D7'],['Gmaj7'],['G6'],['F#m7'],['B7'],['Em7'],['Am7','D7'],
    ['Gmaj7'],['G6'],['Gmaj7'],['G6'],['Gm7'],['Gm6'],['Gm7'],['Gm6'],
    ['Am7b5'],['D7'],['Bm7b5'],['E7'],['Am7'],['D7'],['G6'],['G6'] ] },
  'Just Friends': { key: 'G Major', m: [
    ['G7'],['Cmaj7'],['Cmaj7'],['Cm7','F7'],['Gmaj7'],['Gmaj7'],['Bbm7'],['Eb7'],
    ['Am7'],['D7'],['Bm7'],['E7'],['A7'],['A7'],['Am7'],['D7','Db7'],
    ['Cmaj7'],['Cmaj7'],['Cm7'],['F7'],['Gmaj7'],['Gmaj7'],['Bbm7'],['Eb7'],
    ['Am7'],['D7'],['Bm7'],['E7'],['A7'],['Am7','D7'],['G6'],['Dm7','G7'] ] },
  'Lullaby Of Birdland': { key: 'F minor', m: [
    ['Fm7'],['G7','C7'],['Fm7'],['Bbm7','Eb7'],['Abmaj7'],['Fm7','Bbm7'],['Eb7'],['Abmaj7'],
    ['Fm7'],['G7','C7'],['Fm7'],['Bbm7','Eb7'],['Abmaj7'],['Fm7','Bbm7'],['Eb7','Db7'],['C7'],
    ['Abmaj7'],['F7'],['Bbm7'],['Bbm7','Eb7'],['Abmaj7'],['F7'],['Bbm7'],['Bbm7','Eb7'],
    ['Fm7'],['G7','C7'],['Fm7'],['Bbm7','Eb7'],['Abmaj7'],['Fm7','Bbm7'],['Eb7'],['Abmaj7'] ] },
  'Mr. P.C.': { key: 'C minor', m: [
    ['Cm7'],['Cm7'],['Cm7'],['Cm7'],['Fm7'],['Fm7'],['Cm7'],['Cm7'],
    ['Dm7b5'],['G7'],['Cm7'],['G7'] ] },
  'Night And Day': { key: 'C Major', m: [
    ['Dm7b5'],['G7'],['Cmaj7'],['Cmaj7'],['Dm7b5'],['G7'],['Cmaj7'],['Cmaj7'],
    ['F#m7b5'],['Fm7'],['Em7'],['Ebdim7'],['Dm7'],['G7'],['Cmaj7'],['Cmaj7'],
    ['Ebmaj7'],['Ebmaj7'],['Cmaj7'],['Cmaj7'],['Ebmaj7'],['Ebmaj7'],['Cmaj7'],['Cmaj7'],
    ['F#m7b5'],['Fm7'],['Em7'],['Ebdim7'],['Dm7'],['G7','Dm7'],['C6'],['Dm7','G7'] ] },
  'Ornithology': { key: 'G Major', m: [
    ['Gmaj7'],['Gmaj7'],['Gm7','C7'],['Gm7','C7'],['Fmaj7'],['Fmaj7'],['Fm7'],['Bb7'],
    ['Ebmaj7'],['Am7b5','D7'],['Gmaj7'],['Gmaj7'],['Bm7'],['E7'],['Am7'],['D7'],
    ['Gmaj7'],['Gmaj7'],['Gm7','C7'],['Gm7','C7'],['Fmaj7'],['Fmaj7'],['Fm7'],['Bb7'],
    ['Ebmaj7'],['Am7b5','D7'],['Gmaj7'],['A7'],['Am7'],['D7'],['Gmaj7'],['Am7','D7'] ] },
  'There Is No Greater Love': { key: 'Bb Major', m: [
    ['Bbmaj7'],['Eb7'],['Ab7'],['G7'],['C7'],['C7'],['F7'],['F7'],
    ['Bbmaj7'],['Eb7'],['Ab7'],['G7'],['C7'],['Cm7','F7'],['Bb6'],['Bb6'],
    ['Am7b5','D7'],['Gm7'],['Am7b5','D7'],['Gm7'],['Am7b5','D7'],['Gm7'],['C7'],['F7'],
    ['Bbmaj7'],['Eb7'],['Ab7'],['G7'],['C7'],['Cm7','F7'],['Bb6'],['F7'] ] },
  'There Will Never Be Another You': { key: 'Eb Major', m: [
    ['Ebmaj7'],['Ebmaj7'],['Dm7b5'],['G7b9'],['Cm7'],['Cm7'],['Bbm7'],['Eb7'],
    ['Abmaj7'],['Fm7b5','Bb7'],['Ebmaj7'],['Cm7'],['F7'],['Cm7','F7'],['Fm7'],['Bb7'],
    ['Ebmaj7'],['Ebmaj7'],['Dm7b5'],['G7b9'],['Cm7'],['Cm7'],['Bbm7'],['Eb7'],
    ['Abmaj7'],['Fm7b5','Bb7'],['Ebmaj7'],['Gm7','C7'],['Fm7'],['Bb7'],['Eb6'],['Bb7'] ] },
};

// 코드 심볼 → 추천 스케일(한국어) 자동 매핑
function chordToScales(sym) {
  const mm = /^([A-G][#b]?)(.*)$/.exec(sym || '');
  if (!mm) return [];
  const r = mm[1], q = mm[2];
  const S = (n) => r + ' ' + n;
  if (/maj/.test(q))            return [S('아이오니안'), S('리디안')];
  if (/dim|°/.test(q))          return [S('디미니쉬드')];
  if (/m7b5|ø/.test(q))         return [S('로크리안')];
  if (/m/.test(q))              return [S('도리안'), S('에올리안')];
  if (/alt|7#9|7b9|7#5/.test(q))return [S('얼터드')];
  if (/7b5/.test(q))            return [S('리디안 ♭7'), S('홀톤')];
  if (/sus/.test(q))            return [S('믹솔리디안')];
  if (/7|9|13/.test(q))         return [S('믹솔리디안')];
  return [S('아이오니안'), S('리디안')];   // C, C6, Cmaj 등
}

function buildFixedSong(title, fixed) {
  return {
    title,
    key: fixed.key,
    measures: fixed.m.map(syms => ({ chords: syms.map(s => ({ symbol: s, scales: chordToScales(s) })) })),
  };
}

// 스케일(한국어) → 반음 인터벌
const SCALE_INTERVALS = {
  '아이오니안': [0,2,4,5,7,9,11], '메이저': [0,2,4,5,7,9,11],
  '리디안': [0,2,4,6,7,9,11],
  '믹솔리디안': [0,2,4,5,7,9,10],
  '도리안': [0,2,3,5,7,9,10],
  '에올리안': [0,2,3,5,7,8,10], '내추럴 마이너': [0,2,3,5,7,8,10],
  '프리지안': [0,1,3,5,7,8,10],
  '로크리안': [0,1,3,5,6,8,10],
  '얼터드': [0,1,3,4,6,8,10],
  '디미니쉬드': [0,2,3,5,6,8,9,11],
  '홀톤': [0,2,4,6,8,10],
  '리디안 ♭7': [0,2,4,6,7,9,10],
  '하모닉 마이너': [0,2,3,5,7,8,11],
  '멜로딕 마이너': [0,2,3,5,7,9,11],
};
const NOTE_TO_PC = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,'E#':5,Fb:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11 };

// 스케일 이름("E 믹솔리디안") → 지판 다이어그램 DOM. shape = ALL|C|A|G|E|D
function renderScaleDiagram(scaleName, shape) {
  shape = shape || 'ALL';
  const wrap = document.createElement('div');
  wrap.className = 'rb-fd';
  const mm = /^([A-G][#b]?)\s+(.+)$/.exec(scaleName || '');
  const rootPc = mm ? NOTE_TO_PC[mm[1]] : undefined;
  const ivs = mm ? SCALE_INTERVALS[mm[2].trim()] : undefined;
  if (rootPc == null || !ivs) {
    wrap.innerHTML = '<div class="rb-fd-na">이 스케일의 지판 그림은 아직 준비 중이에요.</div>';
    return wrap;
  }
  const pcs = new Set(ivs.map(i => (rootPc + i) % 12));

  // CAGED 폼 선택 (포지션별 손 위치)
  const forms = document.createElement('div');
  forms.className = 'rb-fd-forms';
  [['ALL','전체'],['C','C형'],['A','A형'],['G','G형'],['E','E형'],['D','D형']].forEach(([sh, label]) => {
    const fb = document.createElement('button');
    fb.type = 'button';
    fb.className = 'rb-fd-form' + (sh === shape ? ' on' : '');
    fb.textContent = label;
    fb.addEventListener('click', () => {
      const nw = renderScaleDiagram(scaleName, sh);
      if (wrap.parentNode) wrap.parentNode.replaceChild(nw, wrap);
    });
    forms.appendChild(fb);
  });
  wrap.appendChild(forms);

  const box = (shape !== 'ALL') ? computeBox(rootPc, shape) : null;   // {start,end} 프렛 범위
  const FR = 12;
  const order = [5,4,3,2,1,0];   // 위=1번줄(고음) … 아래=6번줄(저음)
  const cols = `20px repeat(${FR + 1}, 1fr)`;

  const grid = document.createElement('div');
  grid.className = 'rb-fd-grid';
  grid.style.gridTemplateColumns = cols;
  order.forEach(s => {
    const lbl = document.createElement('div');
    lbl.className = 'rb-fd-strlbl';
    lbl.textContent = 6 - s;
    grid.appendChild(lbl);
    for (let f = 0; f <= FR; f++) {
      const inBox = box ? (f >= box.start && f <= box.end) : true;
      const cell = document.createElement('div');
      cell.className = 'rb-fd-cell' + (f === 0 ? ' nut' : '') + (box && inBox ? ' in-box' : '');
      const pc = (STRING_OPEN_PC[s] + f) % 12;
      if (pcs.has(pc)) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'rb-fd-dot' + (pc === rootPc ? ' root' : '') + (box && !inBox ? ' dim' : '');
        dot.textContent = noteName(pc);
        dot.addEventListener('click', () => playNote(STRING_OPEN_MIDI[s] + f, 0, 0.8, 0.28));
        cell.appendChild(dot);
      }
      grid.appendChild(cell);
    }
  });

  const nums = document.createElement('div');
  nums.className = 'rb-fd-nums';
  nums.style.gridTemplateColumns = cols;
  nums.appendChild(document.createElement('div'));
  for (let f = 0; f <= FR; f++) {
    const n = document.createElement('div');
    n.className = 'rb-fd-num';
    if ([0,3,5,7,9,12].includes(f)) n.textContent = f;
    nums.appendChild(n);
  }
  wrap.append(grid, nums);
  return wrap;
}

let rbInited = false;
let rbCurrentSong = null;   // 현재 표시 중인 곡 데이터
const RB_CACHE = 'realbookCache';
const getRbCache = () => { try { return JSON.parse(localStorage.getItem(RB_CACHE) || '{}'); } catch (_) { return {}; } };
const setRbCache = (c) => localStorage.setItem(RB_CACHE, JSON.stringify(c));

// 중심키 설명 (모두 내장 — API 미사용). 자유롭게 수정/추가하세요.
const REALBOOK_DOC = {
  'All Of Me': {
    center: 'C 메이저',
    summary: '시작·끝이 모두 C이고 Dm7–G7–C 의 ii–V–I 로 닫히는 전형적인 C장조 곡.',
    steps: [
      '첫 코드가 Cmaj7, 마지막이 C6 입니다. 시작과 끝이 같은 C → 으뜸음(중심)이 C일 가능성이 큽니다.',
      '29~31마디 Dm7 → G7 → C6 는 C장조의 ii–V–I 종지입니다. 이 진행이 곡을 C로 확실히 닫아줍니다.',
      '중간의 E7·A7·D7 는 C장조 다이아토닉이 아니라 다음 코드로 끌어주는 세컨더리 도미넌트입니다(E7→Am, A7→Dm, D7→G). 잠깐 색만 줄 뿐 중심키는 그대로입니다.',
      '뼈대 코드(Cmaj7·Dm7·Em7·Fmaj7·G7·Am7)가 C장조 다이아토닉이고 ii–V–I 로 닫히므로 중심키는 C 메이저.',
    ],
  },
  'Autumn Leaves': {
    center: 'G 메이저 / E 마이너 (상대조)',
    summary: '앞부분은 G장조 ii–V–I, 곡은 E단조로 끝나는 상대조 관계의 곡.',
    steps: [
      'Am7 → D7 → Gmaj7 는 G장조의 ii–V–I 입니다. 앞 3마디가 곧바로 G장조를 가리킵니다.',
      'F#m7b5 → B7 → Em 은 E단조의 ii–V–i 입니다(단조라 도미넌트가 B7). 곡을 E단조로 끌어옵니다.',
      'G장조와 E단조는 조표가 같은 상대조(병행조)라 한 곡 안에서 자연스럽게 오갑니다.',
      '마지막 코드가 Em → 끝나는 코드가 중심을 알려주는 강한 단서. 최종 중심은 E 마이너, 큰 틀은 G장조/E단조.',
    ],
  },
  'Beautiful Love': {
    center: 'D 마이너',
    summary: 'Em7b5–A7–Dm 의 단조 ii–V–i 가 반복되고 Dm 으로 끝나는 D단조 곡.',
    steps: [
      'Em7b5 → A7 → Dm 은 D단조의 ii–V–i 입니다(2도 자리의 m7b5 + 도미넌트 A7).',
      '이 ii–V–i 가 곡 곳곳에서 반복되며 D 를 계속 으뜸음으로 확인시켜 줍니다.',
      'Gm7·Bb7·C7 등은 D단조와 가까운 코드로 색을 더할 뿐입니다.',
      '곡이 Dm 으로 끝납니다 → 중심키는 D 마이너.',
    ],
  },
  'Oleo': {
    center: 'Bb 메이저',
    summary: "‘I Got Rhythm’ 코드(리듬 체인지)로 Bbmaj7 로 시작·끝나는 Bb장조 곡.",
    steps: [
      'A파트는 Bbmaj7–G7–Cm7–F7 의 I–VI–ii–V 순환입니다. 첫 코드가 Bbmaj7 → 중심 Bb.',
      'Cm7–F7 은 Bb장조의 ii–V, 다시 Bbmaj7(I)로 돌아옵니다.',
      '브릿지는 D7–G7–C7–F7 로 3도씩 내려가는 도미넌트 연쇄이며, 마지막 F7(V)이 다시 Bb(I)로 풀립니다.',
      '시작과 끝이 Bbmaj7 → 중심키는 Bb 메이저.',
    ],
  },
  'Satin Doll': {
    center: 'C 메이저',
    summary: 'Dm7–G7 의 ii–V 가 반복되고 C 로 풀리는 C장조 곡.',
    steps: [
      '첫 마디부터 Dm7 → G7, 즉 C장조의 ii–V 로 시작합니다.',
      'Em7–A7, Am7–D7, Abm7–Db7 은 다음 ii–V 로 이어주는 연쇄(세컨더리 ii–V)입니다.',
      '이 ii–V 들이 결국 C6(I)로 해결됩니다.',
      '브릿지는 Gm7–C7(잠깐 F장조 쪽), Am7–D7 로 색을 바꾸지만 다시 C 로 돌아옵니다 → 중심키 C 메이저.',
    ],
  },
  "Take The 'A' Train": {
    center: 'C 메이저',
    summary: 'C 로 시작해 D7(#11)–Dm7–G7–C 로 풀리는 C장조 곡.',
    steps: [
      '첫 코드가 C(C6) 입니다. 중심 후보는 C.',
      'D7b5(=D7#11)은 C장조의 II7(리디안 도미넌트)로 특유의 색을 주지만, 이어서 Dm7–G7 의 ii–V 로 연결됩니다.',
      'Dm7 → G7 → C 는 C장조의 ii–V–I 종지입니다.',
      '브릿지는 F(IV)로 잠깐 갔다가 D7–Dm7–G7 로 다시 C 로 돌아옵니다 → 중심키 C 메이저.',
    ],
  },
  'The Days Of Wine And Roses': {
    center: 'F 메이저',
    summary: 'Fmaj7 로 시작하고 Gm7–C7–F 의 ii–V–I 로 닫히는 F장조 곡.',
    steps: [
      '첫 코드가 Fmaj7, 끝이 F6 → 중심 후보는 F.',
      '뒤쪽 Gm7 → C7 → F6 는 F장조의 ii–V–I 종지입니다.',
      'Eb7·Bbm7 은 F장조 밖의 차용 코드(백도어/모달 인터체인지)로 색만 주고 곧 다이아토닉으로 돌아옵니다.',
      'Am7·Dm7·Gm7·C7 같은 다이아토닉 진행이 뼈대 → 중심키 F 메이저.',
    ],
  },
  'I Love You': {
    center: 'F 메이저',
    summary: 'Gm7b5–C7b9–Fmaj7 의 ii–V 로 F 로 도는 곡(중간에 A장조 색).',
    steps: [
      'Gm7b5 → C7b9 → Fmaj7 은 F로 향하는 ii–V–I 입니다.',
      'Gm7–C7–Fmaj7 의 보통 ii–V–I 도 반복되어 F 를 굳힙니다.',
      'B7–E7–Amaj7 부분은 잠깐 A장조로 가는 임시 전조입니다.',
      '끝이 F6 → 중심키 F 메이저.',
    ],
  },
  "I'll Remember April": {
    center: 'G 메이저',
    summary: 'Gmaj7(장)과 Gm7(단)을 오가다 G로 도는 곡, 중간에 Bb장조로 잠깐 전조.',
    steps: [
      '첫 8마디가 Gmaj7/G6 ↔ Gm7/Gm6 — 같은 으뜸음 G의 장·단을 오갑니다.',
      'Am7b5–D7, Am7–D7 는 G로 향하는 ii–V 입니다.',
      'Cm7–F7–Bbmaj7 부분은 Bb장조로 잠깐 전조(G단조의 상대조).',
      'F#m7–B7–Em7 뒤 Am7–D7 로 다시 G 로 돌아오고 G 로 끝 → 중심키 G 메이저.',
    ],
  },
  'Just Friends': {
    center: 'G 메이저',
    summary: 'Cmaj7 근처에서 시작하지만 Am7–D7–G 로 도는 G장조 곡.',
    steps: [
      '시작은 G7–Cmaj7(C쪽 색)이지만 Cm7–F7 로 G장조 쪽으로 끌어옵니다.',
      'Am7 → D7 → G 가 곡 곳곳에서 G장조의 ii–V–I 로 해결됩니다.',
      'Bbm7–Eb7 등은 잠깐의 색이고, 끝이 G6 / Dm7–G7 로 G 를 가리킵니다.',
      '조표(샵 1개)와 종지 → 중심키 G 메이저.',
    ],
  },
  'Lullaby Of Birdland': {
    center: 'F 마이너',
    summary: 'Fm 으로 시작·끝나고 Bbm7–Eb7–Abmaj7(상대조 Ab)를 오가는 F단조 곡.',
    steps: [
      'Fm – G7 C7 – Fm 로 F 가 으뜸음임을 보여줍니다(C7 은 Fm 의 도미넌트 V).',
      'Bbm7 → Eb7 → Abmaj7 은 Ab장조(=F단조의 상대조)의 ii–V–I 로, 두 조를 오갑니다.',
      '브릿지의 F7 → Bbm7 도 도미넌트 움직임.',
      '곡이 Fm 로 끝남 → 중심키 F 마이너(상대조 Ab장조).',
    ],
  },
  'Mr. P.C.': {
    center: 'C 마이너',
    summary: 'Cm7 중심의 12마디 마이너 블루스.',
    steps: [
      '1~8마디가 Cm7 ↔ Fm7(i ↔ iv) — C단조 블루스의 골격.',
      '9~10마디 Dm7b5 → G7 은 C단조의 ii–V(단조의 도미넌트 G7).',
      '11~12마디 Cm7 → G7 로 i 로 해결하고 다시 돕니다.',
      '전체가 Cm7 중심의 마이너 블루스 → 중심키 C 마이너.',
    ],
  },
  'Night And Day': {
    center: 'C 메이저',
    summary: 'Dm7b5–G7–Cmaj7 로 도는 C장조 곡(중간에 Eb장조 색).',
    steps: [
      'Dm7b5 → G7 → Cmaj7 은 C로 향하는 ii–V–I 입니다.',
      'F#m7b5–Fm7–Em7–Ebdim7 의 반음 하행은 다시 Dm7–G7–C 로 이어집니다.',
      'Ebmaj7 부분은 ♭III(Eb장조)로 잠깐 색을 바꾸지만 곧 C 로 복귀.',
      '끝이 C6 → 중심키 C 메이저.',
    ],
  },
  'Ornithology': {
    center: 'G 메이저',
    summary: "‘How High the Moon’ 코드를 빌린 곡으로, Gmaj7 로 도는 G장조.",
    steps: [
      '첫 코드 Gmaj7 → 중심 후보 G.',
      'Gm7–C7(→F), Fm7–Bb7(→Eb) 처럼 ii–V 가 연쇄로 내려가며 잠깐씩 다른 조를 스칩니다.',
      'Ebmaj7 → Am7b5–D7 → Gmaj7 로 다시 G장조로 해결됩니다.',
      'Bm7–E7–Am7–D7 도 G로 향하는 진행 → 중심키 G 메이저.',
    ],
  },
  'There Is No Greater Love': {
    center: 'Bb 메이저',
    summary: 'Bbmaj7 로 시작하고 Cm7–F7–Bb 로 닫히는 Bb장조 곡.',
    steps: [
      '첫 코드 Bbmaj7 → 중심 후보 Bb.',
      'Eb7–Ab7–G7 은 색을 주는 도미넌트들이지만 Cm7 → F7 → Bb 의 ii–V–I 로 풀립니다.',
      'Am7b5–D7–Gm 부분은 잠깐 G단조로 가는 ii–V–i.',
      '끝이 Bb6 → 중심키 Bb 메이저.',
    ],
  },
  'There Will Never Be Another You': {
    center: 'Eb 메이저',
    summary: 'Ebmaj7 로 시작·끝나고 ii–V 로 도는 Eb장조 곡.',
    steps: [
      '첫 코드 Ebmaj7, 끝 Eb6 → 중심 Eb.',
      'Dm7b5 → G7b9 은 잠깐 Cm 쪽을 스치고 Cm7–Bbm7–Eb7 로 다시 Eb 로 향합니다.',
      'Abmaj7(IV) – Fm7b5–Bb7 – Ebmaj7 로 자연스럽게 Eb 로 해결.',
      'Fm7 → Bb7 → Eb 의 ii–V–I 종지 → 중심키 Eb 메이저.',
    ],
  },
};

function renderKeyDoc(title, data, msg) {
  const dlg   = document.getElementById('rbKeyDialog');
  const body  = document.getElementById('rbKeyBody');
  document.getElementById('rbKeyTitle').textContent = title + ' — 중심키 찾기';
  if (!data) {
    const err = msg && /(실패|필요|없)/.test(msg);
    body.innerHTML = `<div class="rb-key-msg${err ? ' err' : ''}">${msg || ''}</div>`;
  } else {
    body.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'rb-key-center';
    c.textContent = '중심키: ' + data.center;
    const s = document.createElement('div');
    s.className = 'rb-key-summary';
    s.textContent = data.summary || '';
    const ol = document.createElement('ol');
    ol.className = 'rb-key-steps';
    (data.steps || []).forEach(st => { const li = document.createElement('li'); li.textContent = st; ol.appendChild(li); });
    body.append(c, s, ol);
  }
  if (dlg.showModal && !dlg.open) dlg.showModal(); else if (!dlg.showModal) dlg.setAttribute('open', '');
}

function analyzeKey() {
  if (!rbCurrentSong) return;
  const title = rbCurrentSong.title;
  // 내장 설명 우선, 없으면 API로 받아온 곡 데이터의 keyDoc 사용
  const doc = REALBOOK_DOC[title] || rbCurrentSong.keyDoc;
  renderKeyDoc(title, doc || null, doc ? '' : '이 곡의 중심키 설명은 아직 준비 중이에요.');
}
const rbStatus = (msg, err) => {
  const el = document.getElementById('rbStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', !!err);
};

function initRealBook() {
  if (rbInited) return;
  rbInited = true;
  renderSongList();
  document.getElementById('rbBackList').addEventListener('click', showSongList);
  document.getElementById('rbKeyBtn').addEventListener('click', analyzeKey);
}

function renderSongList() {
  const el = document.getElementById('rbList');
  el.innerHTML = '';
  const legend = document.createElement('div');
  legend.className = 'rb-legend';
  legend.innerHTML = '<span class="rb-star">★</span> 초보자에게 적당한 곡';
  el.appendChild(legend);
  const cache = getRbCache();
  REALBOOK_SONGS.forEach(song => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rb-song-item' + (song.s ? ' star' : '');
    const title = document.createElement('span');
    title.className = 'rb-song-title';
    if (song.s) {
      const star = document.createElement('span');
      star.className = 'rb-star';
      star.textContent = '★ ';
      title.appendChild(star);
    }
    title.appendChild(document.createTextNode(song.t));
    btn.appendChild(title);
    const tags = document.createElement('span');
    tags.className = 'rb-tags';
    if (song.b) tags.innerHTML += '<span class="rb-tag">블루스</span>';
    if (REALBOOK_DATA[song.t]) tags.innerHTML += '<span class="rb-tag book">교본</span>';
    else if (cache[song.t]) tags.innerHTML += '<span class="rb-tag saved">저장됨</span>';
    btn.appendChild(tags);
    btn.addEventListener('click', () => openSong(song.t));
    el.appendChild(btn);
  });
}

function showSongList() {
  document.getElementById('rbList').hidden = false;
  document.getElementById('rbSong').hidden = true;
  document.getElementById('rbBackList').hidden = true;
  renderSongList();   // 저장됨 표시 갱신
}

async function openSong(title) {
  document.getElementById('rbList').hidden = true;
  document.getElementById('rbSong').hidden = false;
  document.getElementById('rbBackList').hidden = false;
  document.getElementById('rbSongHead').textContent = title;
  document.getElementById('rbSheet').innerHTML = '';
  document.getElementById('rbScalePanel').innerHTML = '';

  if (REALBOOK_DATA[title]) {   // 교본에서 옮긴 정확한 코드 진행 (API 불필요)
    renderSong(buildFixedSong(title, REALBOOK_DATA[title]));
    rbStatus('Real Book 수록 코드 진행');
    return;
  }

  const cache = getRbCache();
  if (cache[title]) { renderSong(cache[title]); rbStatus(''); return; }

  if (!getScanKey()) {
    rbStatus('이 곡을 처음 열려면 API 키가 필요해요. 악보 스캔 화면의 🔑에서 입력하면 공유됩니다.', true);
    return;
  }
  rbStatus('코드 진행 불러오는 중… (수 초 걸릴 수 있어요)');
  try {
    const data = await claudeJSON({ prompt: rbPrompt(title), schema: RB_SCHEMA });
    cache[title] = data; setRbCache(cache);
    renderSong(data); rbStatus('');
  } catch (e) {
    rbStatus(e.message === 'NO_KEY' ? 'API 키가 필요합니다.' : '불러오기 실패: ' + e.message, true);
  }
}

function renderSong(data) {
  const head  = document.getElementById('rbSongHead');
  const sheet = document.getElementById('rbSheet');
  const panel = document.getElementById('rbScalePanel');
  sheet.innerHTML = '';
  panel.innerHTML = '';
  rbCurrentSong = data || null;
  if (!data) return;
  head.textContent = data.title + (data.key ? '  ·  ' + data.key : '');
  (data.measures || []).forEach((m, i) => {
    const cell = document.createElement('div');
    cell.className = 'rb-measure';
    const num = document.createElement('span');
    num.className = 'rb-measure-num';
    num.textContent = i + 1;
    cell.appendChild(num);
    (m.chords || []).forEach(ch => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'rb-chord';
      c.textContent = ch.symbol;
      c.addEventListener('click', () => showSongScales(ch, c));
      cell.appendChild(c);
    });
    sheet.appendChild(cell);
  });
  panel.innerHTML = '<div class="rb-hint">코드를 탭하면 그 코드에서 쓸 수 있는 스케일이 표시됩니다.</div>';
}

function showSongScales(ch, btn) {
  document.querySelectorAll('#rbSheet .rb-chord.sel').forEach(b => b.classList.remove('sel'));
  if (btn) btn.classList.add('sel');
  const panel = document.getElementById('rbScalePanel');
  panel.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'rb-scale-sym';
  h.textContent = ch.symbol;
  panel.appendChild(h);
  const list = document.createElement('div');
  list.className = 'rb-scale-list';
  const diagram = document.createElement('div');
  diagram.className = 'rb-fd-wrap';
  (ch.scales || []).forEach(s => {
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'rb-scale-tag';
    tag.textContent = s;
    tag.addEventListener('click', () => {
      list.querySelectorAll('.rb-scale-tag.on').forEach(t => t.classList.remove('on'));
      tag.classList.add('on');
      diagram.innerHTML = '';
      diagram.appendChild(renderScaleDiagram(s));
    });
    list.appendChild(tag);
  });
  panel.append(list, diagram);
  const first = list.querySelector('.rb-scale-tag');
  if (first) first.click();   // 첫 스케일 지판 자동 표시
}

// ── View navigation ───────────────────────────
const VALID_VIEWS = ['home','quiz','scan','practice','realbook'];
function setView(name) {
  if (!VALID_VIEWS.includes(name)) name = 'home';
  const prev = document.body.dataset.view;
  document.body.dataset.view = name;

  if (name === 'practice') {
    // Lock to landscape when entering practice view
    screen.orientation?.lock?.('landscape').catch(() => {});
  } else if (prev === 'practice') {
    // Unlock when leaving practice view
    try { screen.orientation?.unlock?.(); } catch (_) {}
  }

  if (name === 'scan')     initScan();
  if (name === 'realbook') initRealBook();
  if (name === 'practice') initFretNeck();
  if (name === 'quiz' && !localStorage.getItem(FIRST_RUN_KEY)) {
    setTimeout(() => { openHelp(); localStorage.setItem(FIRST_RUN_KEY, '1'); }, 200);
  }
}
document.querySelectorAll('[data-go]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.go;
    history.pushState({ view: t }, '', '#' + t);
    setView(t);
  });
});
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => history.back());
});
window.addEventListener('popstate', (e) => {
  const view = (e.state && e.state.view) || location.hash.slice(1) || 'home';
  setView(view);
});

// ── Init ─────────────────────────────────────
buildFretboard();
applyModeUI();
applyOptionUI();
syncSettingsUI();
updateScore();
nextQuestion();

// Resolve initial route from URL hash
{
  const initialView = location.hash.slice(1);
  if (initialView && VALID_VIEWS.includes(initialView) && initialView !== 'home') {
    history.replaceState({ view: initialView }, '', '#' + initialView);
    setView(initialView);
  } else {
    setView('home');
  }
}

})();
