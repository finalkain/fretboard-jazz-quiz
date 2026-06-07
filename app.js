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
const CAGED_SHAPES = {
  C: { name: 'C', anchorString: 1, offsetMin: -3, offsetMax: 2 },
  A: { name: 'A', anchorString: 1, offsetMin: -1, offsetMax: 2 },
  G: { name: 'G', anchorString: 0, offsetMin: -3, offsetMax: 0 },
  E: { name: 'E', anchorString: 0, offsetMin: -1, offsetMax: 2 },
  D: { name: 'D', anchorString: 2, offsetMin: -1, offsetMax: 2 },
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
const FN_NUT_H      = 30;
const FN_FRET1_H    = 50;
const FN_RATIO      = Math.pow(2, -1 / 12);
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
      if (tone === 'avoid') {
        cell.classList.add('fn-avoid');
        dot.textContent = '×';
      } else {
        cell.classList.add('fn-scale');
        dot.textContent = spellingToString(ctx.toneSpellings[idx]);
      }
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

// Scale view play buttons
document.getElementById('scaleAscBtn').addEventListener('click', playScaleAsc);
document.getElementById('scaleDescBtn').addEventListener('click', playScaleDesc);
document.getElementById('scaleChordBtn').addEventListener('click', playScaleChord);


const scaleHelpDialog = document.getElementById('scaleHelpDialog');
document.getElementById('scaleHelpBtn').addEventListener('click', () => {
  if (typeof scaleHelpDialog.showModal === 'function') scaleHelpDialog.showModal();
  else scaleHelpDialog.setAttribute('open', '');
});
document.getElementById('homeHelpBtn').addEventListener('click', openHelp);

// ── View navigation ───────────────────────────
const VALID_VIEWS = ['home','quiz','scales','practice'];
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

  if (name === 'scales')   initScaleViewer();
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
