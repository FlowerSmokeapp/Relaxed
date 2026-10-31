'use strict';

/* =========================================================
   Relaxed – breathing and relaxation
   ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Data ---------- */

const EX = {
  '478':    { name: '4-7-8 breathing', emo: '🌙', p: [4, 7, 8, 0], min: 3, free: true,
              desc: 'The long exhale slows your heart rate. Great before sleep or when your thoughts are racing.' },
  boks:     { name: 'Box breathing', emo: '◻️', p: [4, 4, 4, 4], min: 4, free: true,
              desc: 'Four equal steps. Brings calm and focus, e.g. before an exam.' },
  hurtig:   { name: 'Quick calm', emo: '🍃', p: [4, 0, 6, 0], min: 2, free: true,
              desc: 'Two minutes with a slightly longer exhale. For when you need to calm down fast.' },
  balance:  { name: 'Balanced 5-5', emo: '🌊', p: [5, 0, 5, 0], min: 5,
              desc: 'A calm, even rhythm of about six breaths per minute.' },
  lang:     { name: 'Long exhale', emo: '🕊️', p: [4, 2, 8, 0], min: 5,
              desc: 'In, a short pause, then a long, slow exhale.' }
};

const SOUNDS = {
  rain:   { name: 'Rain',      emo: '🌧️', free: true },
  waves:  { name: 'Waves',     emo: '🌊', free: true },
  forest: { name: 'Forest',    emo: '🌲' },
  white:  { name: 'White noise', emo: '⚪' }
};

const SITUATIONS = {
  eksamen: {
    name: 'Before an exam', emo: '📚',
    intro: 'We bring your heart rate down and gather your focus, so you can walk in with a clear head.',
    steps: [
      { type: 'breath', ex: 'boks', min: 4 },
      { type: 'text', title: 'One thing at a time', text: 'You have prepared. Read the question calmly, and take it one step at a time.', sec: 20 }
    ]
  },
  sove: {
    name: 'Can’t sleep', emo: '🌙',
    intro: 'We start by slowing your heart rate and finish with sounds you can fall asleep to.',
    steps: [
      { type: 'breath', ex: '478', min: 3 },
      { type: 'scan', min: 5 },
      { type: 'sound', sound: 'rain', min: 30 }
    ]
  },
  fremlaeg: {
    name: 'Nervous before a presentation', emo: '🎤',
    intro: 'Two minutes of long exhales. It tells your body there is no danger.',
    steps: [
      { type: 'breath', ex: 'hurtig', min: 2 },
      { type: 'text', title: 'You’re ready', text: 'Drop your shoulders. It’s completely normal to be a little nervous – it means you care about this.', sec: 15 }
    ]
  },
  haard: {
    name: 'After a hard day', emo: '🌧️',
    intro: 'Get comfortable. We let go of the day with a body scan and the sound of waves.',
    steps: [
      { type: 'scan', min: 10, sound: 'waves' }
    ]
  }
};

const SCAN = [
  { parts: ['whole'], text: 'Find a comfortable position. Close your eyes if you like, and feel the surface beneath you holding you up.' },
  { parts: ['feet'], text: 'Move your attention down to your feet. Notice your toes, your heels and the soles of your feet. Let them grow heavy.' },
  { parts: ['legs'], text: 'Let the calm spread up through your calves, knees and thighs. There is nothing they need to do right now.' },
  { parts: ['belly'], text: 'Notice your belly. Let it rise as you breathe in, and sink as you breathe out.' },
  { parts: ['chest'], text: 'Notice your chest and your back. With every exhale you become a little more relaxed.' },
  { parts: ['armL', 'armR', 'handL', 'handR'], text: 'Let your arms rest heavily. Notice your hands and fingers, and let them go completely.' },
  { parts: ['shoulders', 'neck'], text: 'Let your shoulders sink down, away from your ears. Release the tension in your neck.' },
  { parts: ['head'], text: 'Relax your face. Your jaw, your cheeks, around your eyes and your forehead. Everything is soft.' },
  { parts: ['whole'], text: 'Now feel your whole body at once. Heavy, warm and calm.' },
  { parts: ['whole'], text: 'Stay here as long as you like. When you are ready, slowly move your fingers and toes.' }
];
const SCAN_EXTRA = 'Stay here a little longer. Breathe slowly and calmly.';

/* ---------- Storage ---------- */

const REMINDER_TEXTS = ['Take 2 minutes for yourself 💜', 'A little breather? 🍃', 'Breathe – you deserve a break 🌙', 'How are you feeling today? ☁️'];

const DEFAULTS = {
  onboarded: false, goals: [], premium: false, dark: false,
  vib: true, cues: false, voice: true,
  reminder: { on: false, time: '21:00', text: 'Take 2 minutes for yourself 💜', last: '' },
  sessions: [], custom: []
};
let S = load();
if (!REMINDER_TEXTS.includes(S.reminder.text)) S.reminder.text = REMINDER_TEXTS[0];
function load() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('rolig') || '{}')); }
  catch { return { ...DEFAULTS }; }
}
function save() { localStorage.setItem('rolig', JSON.stringify(S)); }

const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dkey(new Date());

function logSession(minutes, kind, mood) {
  if (minutes < 0.3) return;
  S.sessions.push({ d: today(), m: Math.round(minutes * 10) / 10, k: kind, mood: mood || null });
  save();
}
function minutesByDay() {
  const map = {};
  for (const s of S.sessions) map[s.d] = (map[s.d] || 0) + s.m;
  return map;
}
// Streak allows one "day off" per week, so a single missed day doesn't break it.
function streak() {
  const map = minutesByDay();
  const d = new Date();
  if (!map[dkey(d)]) d.setDate(d.getDate() - 1);
  let n = 0, lastSkip = -99, i = 0;
  while (i < 3650) {
    const k = dkey(d);
    if (map[k]) n++;
    else {
      const prev = new Date(d); prev.setDate(prev.getDate() - 1);
      if (i - lastSkip >= 7 && map[dkey(prev)] && n > 0) lastSkip = i;
      else break;
    }
    d.setDate(d.getDate() - 1); i++;
  }
  return n;
}

/* ---------- Helpers ---------- */

const isPrem = () => S.premium;
const lock = free => (free || isPrem()) ? '' : '<span class="lock">🔒</span>';
const vib = p => { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch {} };

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

let enVoice = null;
function pickVoice() {
  const v = speechSynthesis.getVoices();
  enVoice = v.find(x => /^en-(US|GB)/i.test(x.lang) && /samantha|karen|daniel|serena|female|natural|google/i.test(x.name))
    || v.find(x => /^en/i.test(x.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = rate; u.pitch = 0.95;
  if (enVoice) u.voice = enVoice;
  speechSynthesis.speak(u);
}
function hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {}
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'Good morning ☀️';
  if (h >= 10 && h < 17) return 'Hello 🌤️';
  if (h >= 17 && h < 23) return 'Good evening 🌙';
  return 'Good night 🌌';
}

/* =========================================================
   Sound engine (Web Audio – sounds are generated in the app)
   ========================================================= */

const Audio = {
  ctx: null, master: null, active: {}, volume: 0.7, endAt: 0, timerId: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  noise(kind, seconds = 8) {
    const ctx = this.ctx, len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;    b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;    b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      // Soft edges so the loop doesn't click
      const f = Math.min(2000, len / 4);
      for (let i = 0; i < f; i++) { const g = i / f; d[i] *= g; d[len - 1 - i] *= g; }
    }
    return buf;
  },

  src(buf) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.start();
    return s;
  },

  build(id) {
    const ctx = this.ctx, out = ctx.createGain(), nodes = [], timers = [];
    out.gain.value = 0;
    out.connect(this.master);
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.8);

    if (id === 'white') {
      const s = this.src(this.noise('white'));
      const g = ctx.createGain(); g.gain.value = 0.35;
      s.connect(g).connect(out); nodes.push(s);
    }
    if (id === 'rain') {
      const s = this.src(this.noise('pink'));
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.9;
      s.connect(hp).connect(lp).connect(g).connect(out);
      const s2 = this.src(this.noise('brown'));
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      s2.connect(g2).connect(out);
      nodes.push(s, s2);
      // Small drops
      const drop = () => {
        const t = ctx.currentTime, o = ctx.createOscillator(), e = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1800 + Math.random() * 2600, t);
        o.frequency.exponentialRampToValueAtTime(600, t + 0.05);
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.025, t + 0.004);
        e.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        o.connect(e).connect(out); o.start(t); o.stop(t + 0.08);
        timers.push(setTimeout(drop, 40 + Math.random() * 180));
      };
      drop();
    }
    if (id === 'waves') {
      const s = this.src(this.noise('brown', 10));
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.085;
      const depth = ctx.createGain(); depth.gain.value = 0.45;
      lfo.connect(depth).connect(g.gain);
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.085;
      const fd = ctx.createGain(); fd.gain.value = 450;
      lfo2.connect(fd).connect(lp.frequency);
      lfo.start(); lfo2.start();
      const p = this.src(this.noise('pink'));
      const pg = ctx.createGain(); pg.gain.value = 0.12;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
      const lfo3 = ctx.createOscillator(); lfo3.frequency.value = 0.085;
      const d3 = ctx.createGain(); d3.gain.value = 0.12;
      lfo3.connect(d3).connect(pg.gain); lfo3.start();
      s.connect(lp).connect(g).connect(out);
      p.connect(hp).connect(pg).connect(out);
      nodes.push(s, lfo, lfo2, p, lfo3);
    }
    if (id === 'forest') {
      const s = this.src(this.noise('pink', 10));
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.value = 0.35;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
      const dep = ctx.createGain(); dep.gain.value = 0.18;
      lfo.connect(dep).connect(g.gain); lfo.start();
      s.connect(lp).connect(g).connect(out);
      nodes.push(s, lfo);
      const bird = () => {
        const n = 2 + Math.floor(Math.random() * 4);
        const base = 2200 + Math.random() * 2200;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(out); }
        for (let i = 0; i < n; i++) {
          const t = ctx.currentTime + i * (0.14 + Math.random() * 0.08);
          const o = ctx.createOscillator(), e = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(base, t);
          o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.05);
          o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.11);
          e.gain.setValueAtTime(0.0001, t);
          e.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
          e.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          o.connect(e).connect(pan || out); o.start(t); o.stop(t + 0.14);
        }
        timers.push(setTimeout(bird, 2500 + Math.random() * 6000));
      };
      timers.push(setTimeout(bird, 1500));
    }
    return { out, nodes, timers };
  },

  start(id) {
    this.init();
    if (this.active[id]) return;
    if (!isPrem()) for (const k of Object.keys(this.active)) this.stop(k);
    else if (Object.keys(this.active).length >= 2) this.stop(Object.keys(this.active)[0]);
    this.active[id] = this.build(id);
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    renderPlayer();
  },

  stop(id, fade = 0.6) {
    const a = this.active[id];
    if (!a) return;
    delete this.active[id];
    a.timers.forEach(clearTimeout);
    a.out.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
    setTimeout(() => { a.nodes.forEach(n => { try { n.stop(); } catch {} }); a.out.disconnect(); }, fade * 1000 + 200);
    if (!Object.keys(this.active).length) this.clearTimer();
    renderPlayer();
  },

  stopAll(fade) { Object.keys(this.active).forEach(k => this.stop(k, fade)); },

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  },

  setTimer(min) {
    this.clearTimer();
    if (!min) { renderPlayer(); return; }
    this.endAt = Date.now() + min * 60000;
    this.timerId = setInterval(() => {
      const left = this.endAt - Date.now();
      if (left <= 20000 && left > 0 && this.master) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 4);
      }
      if (left <= 0) { this.stopAll(0.5); this.clearTimer(); }
      updatePlayerTime();
    }, 1000);
    renderPlayer();
  },

  clearTimer() { clearInterval(this.timerId); this.timerId = null; this.endAt = 0; }
};

function renderPlayer() {
  const el = $('#player'), ids = Object.keys(Audio.active);
  $('#app').classList.toggle('has-player', ids.length > 0);
  if (!ids.length) { el.hidden = true; refreshSoundCards(); return; }
  el.hidden = false;
  const mins = Audio.endAt ? Math.round((Audio.endAt - Date.now()) / 60000) : 0;
  const sel = !Audio.endAt ? 0 : [15, 30, 60].reduce((a, b) => Math.abs(b - mins) < Math.abs(a - mins) ? b : a);
  el.innerHTML = `
    <div class="top">
      <div style="font-size:22px">${ids.map(i => SOUNDS[i].emo).join(' ')}</div>
      <b>${ids.map(i => SOUNDS[i].name).join(' + ')}</b>
      <span id="ptime"></span>
      <button class="iconbtn" id="pstop" aria-label="Stop">■</button>
    </div>
    <input type="range" min="0" max="1" step="0.01" value="${Audio.volume}" id="pvol" aria-label="Volume">
    <div class="chips">
      ${[[15, '15 min'], [30, '30 min'], [60, '60 min'], [0, '∞']].map(([m, l]) =>
        `<button class="chip ${sel === m ? 'on' : ''}" data-t="${m}">${l}</button>`).join('')}
    </div>`;
  $('#pstop').onclick = () => Audio.stopAll();
  $('#pvol').oninput = e => Audio.setVolume(+e.target.value);
  $$('.chip', el).forEach(c => c.onclick = () => Audio.setTimer(+c.dataset.t));
  updatePlayerTime();
  refreshSoundCards();
}
function updatePlayerTime() {
  const t = $('#ptime');
  if (!t) return;
  if (!Audio.endAt) { t.textContent = ''; return; }
  const s = Math.max(0, Math.round((Audio.endAt - Date.now()) / 1000));
  t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function refreshSoundCards() {
  $$('.snd').forEach(c => c.classList.toggle('on', !!Audio.active[c.dataset.s]));
}

/* =========================================================
   Tabs
   ========================================================= */

let tab = 'home';
function go(t) {
  tab = t;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const v = $('#view');
  v.innerHTML = VIEWS[t]();
  v.firstElementChild?.classList.add('fade-in');
  v.scrollTop = 0;
  BIND[t]?.();
}
$$('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab));

const VIEWS = {
  home() {
    const st = streak();
    const exRows = Object.entries(EX).map(([id, e]) => `
      <button class="row" data-ex="${id}">
        <div class="ic">${e.emo}</div>
        <div class="tx"><b>${e.name}</b><span>${e.p.filter(Boolean).join('-')} · ${e.min} min</span></div>
        ${lock(e.free)}
      </button>`).join('');
    const customRows = S.custom.map(c => `
      <button class="row" data-custom="${c.id}">
        <div class="ic">✨</div>
        <div class="tx"><b>${esc(c.name)}</b><span>${c.p.filter(Boolean).join('-')} · ${c.min} min</span></div>
      </button>`).join('');
    return `<div>
      <h2>${greeting()}</h2>
      <div class="streak-pill">🔥 ${st ? `${st}-day streak` : 'Start your first day today'}</div>
      ${installCard()}
      <button class="hero" id="quick">
        <div><small>One tap and you’re started</small><b>Quick calm · 2 min</b></div>
        <div class="play">▶</div>
      </button>

      <h3>How are you feeling right now?</h3>
      <div class="hscroll">
        ${Object.entries(SITUATIONS).map(([id, s]) => `
          <button class="sit" data-sit="${id}">${lock(false)}
            <div class="emo">${s.emo}</div><div class="t">${s.name}</div>
          </button>`).join('')}
      </div>

      <h3>Exercises</h3>
      <div class="list">
        ${exRows}
        <button class="row" data-scan="1">
          <div class="ic">🧘</div>
          <div class="tx"><b>Body scan</b><span>Guided audio · 5 or 10 min</span></div>
          ${lock(false)}
        </button>
      </div>

      <h3>My exercises</h3>
      <div class="list">
        ${customRows}
        <button class="row" id="newcustom">
          <div class="ic">＋</div>
          <div class="tx"><b>Create your own exercise</b><span>Choose your own pace and length</span></div>
          ${lock(false)}
        </button>
      </div>
    </div>`;
  },

  sounds() {
    return `<div>
      <h2>Sounds</h2>
      <p class="sub">Let a sound play in the background – with a timer, so it turns itself off.</p>
      <div class="grid">
        ${Object.entries(SOUNDS).map(([id, s]) => `
          <button class="snd ${Audio.active[id] ? 'on' : ''}" data-s="${id}">${lock(s.free)}
            <div class="emo">${s.emo}</div><b>${s.name}</b>
          </button>`).join('')}
      </div>
      <p class="sub" style="margin-top:16px;font-size:13px">${isPrem() ? 'Premium: tap two sounds to mix them.' : 'With Premium you can mix two sounds, e.g. rain and forest.'}</p>
    </div>`;
  },

  progress() {
    const total = S.sessions.reduce((a, s) => a + s.m, 0);
    const moods = S.sessions.filter(s => s.mood);
    const avg = moods.length ? moods.reduce((a, s) => a + s.mood, 0) / moods.length : 0;
    return `<div>
      <h2>Progress</h2>
      <p class="sub">Small breaks count. It’s not about being perfect.</p>
      <div class="stats">
        <div class="stat"><b>🔥 ${streak()}</b><span>day streak</span></div>
        <div class="stat"><b>${Math.round(total)}</b><span>total minutes</span></div>
        <div class="stat"><b>${S.sessions.length}</b><span>sessions</span></div>
      </div>
      <h3>Calendar</h3>
      <div class="cal" id="cal"></div>
      ${moods.length ? `<div class="note">${['', '😣', '😕', '😐', '🙂', '😌'][Math.round(avg)]} After your exercises you feel <b>${avg >= 4 ? 'good' : avg >= 3 ? 'okay' : 'a little better'}</b> on average (${moods.length} ${moods.length === 1 ? 'answer' : 'answers'}).</div>` : ''}
      <div class="note">💜 One missed day a week won’t break your streak. Life happens.</div>
      ${S.sessions.length ? '' : '<div class="note">You haven’t done any exercises yet. Try <b>Quick calm</b> on the home screen – it only takes 2 minutes.</div>'}
    </div>`;
  },

  profile() {
    const r = S.reminder;
    return `<div>
      <h2>Profile</h2>
      ${isPrem()
        ? `<div class="prem-banner"><div><b>✨ Premium is active</b><br><small>Demo – no payment</small></div></div>`
        : `<button class="prem-banner" id="goprem"><div><b>✨ Try Relaxed Premium</b><br><small>All exercises, sounds and body scan</small></div><div class="play" style="width:44px;height:44px">›</div></button>`}

      <h3>Daily reminder</h3>
      <div class="set">
        <div class="it"><div>Reminder</div><button class="switch ${r.on ? 'on' : ''}" id="remOn" aria-label="Reminder"></button></div>
        <div class="it"><div>Time</div><input type="time" id="remTime" value="${r.time}"></div>
        <button class="it" id="remText"><div>Message<br><span>${esc(r.text)}</span></div><span>›</span></button>
      </div>
      <p class="sub" style="font-size:12.5px;margin-top:8px">The reminder arrives as a notification while the app is open or running in the background.</p>

      <h3>Settings</h3>
      <div class="set">
        <div class="it"><div>Vibration<br><span>Feel when to breathe in and out</span></div><button class="switch ${S.vib ? 'on' : ''}" data-k="vib"></button></div>
        <div class="it"><div>Voice in exercises<br><span>Says "in", "hold" and "out"</span></div><button class="switch ${S.cues ? 'on' : ''}" data-k="cues"></button></div>
        <div class="it"><div>Voice in body scan</div><button class="switch ${S.voice ? 'on' : ''}" data-k="voice"></button></div>
        <div class="it"><div>Dark mode<br><span>Nice at bedtime</span></div><button class="switch ${S.dark ? 'on' : ''}" data-k="dark"></button></div>
        ${isPrem() ? `<div class="it"><div>Premium (demo)</div><button class="switch on" data-k="premium"></button></div>` : ''}
      </div>

      <h3>App</h3>
      <div class="set">
        <button class="it" id="install"><div>Add to Home Screen</div><span>›</span></button>
        <button class="it" id="reset"><div>Delete my data</div><span>›</span></button>
      </div>
      <p class="sub center" style="font-size:12px;margin-top:22px">Relaxed · version 1.0<br>Your data is only stored on your phone.</p>
    </div>`;
  }
};

const BIND = {
  home() {
    $('#quick').onclick = () => runBreath({ ...EX.hurtig, id: 'hurtig', min: 2 });
    $$('[data-ex]').forEach(b => b.onclick = () => {
      const e = EX[b.dataset.ex];
      e.free || isPrem() ? showDetail(b.dataset.ex) : paywall();
    });
    $$('[data-sit]').forEach(b => b.onclick = () => isPrem() ? showSituation(b.dataset.sit) : paywall());
    $('[data-scan]').onclick = () => isPrem() ? showScanDetail() : paywall();
    $$('[data-custom]').forEach(b => b.onclick = () => showDetail(null, S.custom.find(c => c.id === b.dataset.custom)));
    $('#newcustom').onclick = () => isPrem() ? showCustomEditor() : paywall();
    bindInstall();
  },
  sounds() {
    $$('.snd').forEach(b => b.onclick = () => {
      const id = b.dataset.s;
      if (!SOUNDS[id].free && !isPrem()) return paywall();
      Audio.active[id] ? Audio.stop(id) : Audio.start(id);
    });
  },
  progress() { renderCal(new Date()); },
  profile() {
    $('#goprem') && ($('#goprem').onclick = paywall);
    $$('.switch[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      S[k] = !S[k]; save();
      if (k === 'dark') applyTheme();
      if (k === 'premium') { go('profile'); return; }
      b.classList.toggle('on', S[k]);
      if (k === 'vib' && S.vib) vib(60);
    });
    $('#remOn').onclick = async e => {
      const on = !S.reminder.on;
      if (on && 'Notification' in window && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') toast('Turn on notifications for Relaxed in your phone settings.');
      }
      S.reminder.on = on; save();
      e.target.classList.toggle('on', on);
      if (on) toast(`We’ll remind you at ${S.reminder.time} 💜`);
    };
    $('#remTime').onchange = e => { S.reminder.time = e.target.value; S.reminder.last = ''; save(); };
    $('#remText').onclick = () => {
      const opts = REMINDER_TEXTS;
      const i = opts.indexOf(S.reminder.text);
      S.reminder.text = opts[(i + 1) % opts.length]; save(); go('profile');
    };
    $('#install').onclick = showInstallHelp;
    $('#reset').onclick = () => {
      if (confirm('Do you want to delete all your progress and settings?')) {
        localStorage.removeItem('rolig'); S = load(); applyTheme(); go('home'); toast('Your data has been deleted.');
      }
    };
  }
};

let calMonth = new Date();
function renderCal(d) {
  calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const map = minutesByDay(), y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(x => `<div class="dn">${x}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div></div>';
  for (let i = 1; i <= days; i++) {
    const k = dkey(new Date(y, m, i)), v = map[k] || 0;
    const l = v >= 10 ? 'l3' : v >= 5 ? 'l2' : v > 0 ? 'l1' : '';
    cells += `<div class="day ${l} ${k === today() ? 'today' : ''}" title="${v ? Math.round(v) + ' min' : ''}">${i}</div>`;
  }
  $('#cal').innerHTML = `
    <div class="cal-head">
      <button class="iconbtn" id="cprev">‹</button>
      <b>${calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b>
      <button class="iconbtn" id="cnext">›</button>
    </div>
    <div class="cal-grid">${cells}</div>`;
  $('#cprev').onclick = () => renderCal(new Date(y, m - 1, 1));
  $('#cnext').onclick = () => renderCal(new Date(y, m + 1, 1));
}

/* =========================================================
   Overlay screens
   ========================================================= */

let cleanup = null;
function openOverlay(html) {
  if (cleanup) { const c = cleanup; cleanup = null; c(); }
  const o = $('#overlay');
  o.innerHTML = html; o.hidden = false; o.scrollTop = 0; o.style.padding = '';
  o.style.animation = 'none'; o.offsetHeight; o.style.animation = '';
  return o;
}
function closeOverlay() {
  if (cleanup) { const c = cleanup; cleanup = null; c(); }
  $('#overlay').hidden = true;
  $('#overlay').innerHTML = '';
  go(tab);
}
const closeBtn = (label = '') => `<div class="ov-top"><span class="sub">${label}</span><button class="close" data-close aria-label="Close">✕</button></div>`;
function bindClose(o) { $$('[data-close]', o).forEach(b => b.onclick = closeOverlay); }

/* ---------- Exercise detail ---------- */

function showDetail(id, custom) {
  const e = custom || EX[id];
  const lens = [...new Set([1, 3, 5, e.min])].sort((a, b) => a - b);
  let len = e.min, sound = null;
  const names = ['In', 'Hold', 'Out', 'Hold'];
  const o = openOverlay(`
    ${closeBtn()}
    <h2>${custom ? '✨ ' + esc(e.name) : e.emo + ' ' + e.name}</h2>
    <p class="desc">${custom ? 'Your own exercise.' : e.desc}</p>
    <div class="rhythm">${e.p.map((s, i) => s ? `<div><b>${s}</b><span>${names[i]}</span></div>` : '').join('')}</div>

    <div class="lbl">Length</div>
    <div class="seg" id="len">${lens.map(l => `<button data-l="${l}" class="${l === len ? 'on' : ''}">${l} min</button>`).join('')}</div>

    <div class="lbl">Background sound</div>
    <div class="chips" id="bg">
      <button class="chip on" data-s="">None</button>
      ${Object.entries(SOUNDS).map(([k, s]) => `<button class="chip" data-s="${k}">${s.emo} ${s.name}${s.free || isPrem() ? '' : ' 🔒'}</button>`).join('')}
    </div>

    <div class="set" style="margin-top:22px">
      <div class="it"><div>Vibration</div><button class="switch ${S.vib ? 'on' : ''}" data-k="vib"></button></div>
      <div class="it"><div>Voice</div><button class="switch ${S.cues ? 'on' : ''}" data-k="cues"></button></div>
    </div>

    <button class="big-btn" id="start">Start</button>
    ${custom ? '<button class="ghost-btn" id="del">Delete exercise</button>' : ''}
  `);
  bindClose(o);
  $$('#len button', o).forEach(b => b.onclick = () => {
    len = +b.dataset.l; $$('#len button', o).forEach(x => x.classList.toggle('on', x === b));
  });
  $$('#bg .chip', o).forEach(b => b.onclick = () => {
    const s = b.dataset.s;
    if (s && !SOUNDS[s].free && !isPrem()) return paywall();
    sound = s || null; $$('#bg .chip', o).forEach(x => x.classList.toggle('on', x === b));
  });
  $$('.switch[data-k]', o).forEach(b => b.onclick = () => { S[b.dataset.k] = !S[b.dataset.k]; save(); b.classList.toggle('on'); });
  $('#start', o).onclick = () => {
    if (sound) { Audio.start(sound); Audio.setTimer(0); }
    runBreath({ ...e, id: id || 'custom', min: len });
  };
  if (custom) $('#del', o).onclick = () => {
    S.custom = S.custom.filter(c => c.id !== custom.id); save(); closeOverlay(); toast('The exercise has been deleted.');
  };
}

/* ---------- Breathing ---------- */

function runBreath(opts, onDone, stepLabel = '') {
  const [a, b, c, d] = opts.p;
  const phases = [];
  if (a) phases.push({ t: 'Breathe in', s: a, k: 'in', say: 'In' });
  if (b) phases.push({ t: 'Hold your breath', s: b, k: 'hold', say: 'Hold' });
  if (c) phases.push({ t: 'Breathe out slowly', s: c, k: 'out', say: 'Out' });
  if (d) phases.push({ t: 'Hold', s: d, k: 'hold', say: 'Hold' });
  const cycleLen = phases.reduce((x, p) => x + p.s, 0);
  const cycles = Math.max(1, Math.round(opts.min * 60 / cycleLen));
  const totalSec = cycles * cycleLen;
  const R = 146, C = 2 * Math.PI * R;

  const o = openOverlay(`
    <div class="breathe" id="br">
      <div class="step-name">${stepLabel || esc(opts.name)}</div>
      <div class="circle-wrap">
        <svg class="ring" viewBox="0 0 300 300"><circle class="bg" cx="150" cy="150" r="${R}"/>
          <circle class="fg" cx="150" cy="150" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
        <div class="circle" id="circ"></div>
        <div class="paused-lbl" id="plbl" hidden>Paused – tap to continue</div>
      </div>
      <div class="phase" id="ph">Get ready…</div>
      <div class="count" id="ct"></div>
      <div class="b-bottom">
        <button id="bpause" aria-label="Pause">⏸</button>
        <button id="bclose" aria-label="Stop">✕</button>
      </div>
    </div>`);
  o.style.padding = '0';
  const circ = $('#circ', o), ph = $('#ph', o), ct = $('#ct', o), ring = $('.fg', o), br = $('#br', o);

  let pi = 0, cyc = 0, left = 0, elapsed = 0, paused = false, timer = null, dimT = null, started = false;

  const scaleFor = k => k === 'in' ? 1 : k === 'out' ? 0.42 : null;
  function setPhase(fresh) {
    const p = phases[pi];
    if (fresh) left = p.s;
    const target = scaleFor(p.k);
    circ.classList.toggle('in', p.k === 'in' || (p.k === 'hold' && pi > 0 && phases[pi - 1].k === 'in'));
    circ.classList.toggle('hold', p.k === 'hold');
    if (target !== null) {
      circ.style.transitionDuration = left + 's';
      circ.style.transform = `scale(${target})`;
    }
    ph.textContent = p.t;
    ct.textContent = left;
    if (fresh) {
      if (p.k === 'in') vib(rampPattern(p.s, true));
      else if (p.k === 'out') vib(rampPattern(p.s, false));
      else vib(40);
      if (S.cues) speak(p.say, 0.8);
    }
  }
  function tick() {
    if (paused) return;
    elapsed++; left--;
    ring.style.strokeDashoffset = C * (1 - elapsed / totalSec);
    if (left <= 0) {
      pi++;
      if (pi >= phases.length) { pi = 0; cyc++; if (cyc >= cycles) return finish(); }
      setPhase(true);
    } else ct.textContent = left;
  }
  function begin() {
    started = true;
    setPhase(true);
    timer = setInterval(tick, 1000);
    dimT = setTimeout(() => br.classList.add('dim'), 30000);
  }
  function stopAll() {
    clearInterval(timer); clearTimeout(dimT); clearTimeout(startT);
    if (navigator.vibrate) try { navigator.vibrate(0); } catch {}
    hush(); keepAwake(false);
  }
  function finish() {
    stopAll(); cleanup = null;
    logSession(totalSec / 60, opts.id);
    vib([80, 120, 80]);
    onDone ? onDone() : showDone(totalSec, cycles);
  }
  function togglePause() {
    if (!started) return;
    paused = !paused;
    $('#plbl', o).hidden = !paused;
    $('#bpause', o).textContent = paused ? '▶' : '⏸';
    br.classList.remove('dim'); clearTimeout(dimT);
    if (paused) {
      const t = getComputedStyle(circ).transform;
      circ.style.transitionDuration = '0s';
      circ.style.transform = t;
      if (navigator.vibrate) try { navigator.vibrate(0); } catch {}
    } else {
      circ.offsetHeight;
      setPhase(false);
      dimT = setTimeout(() => br.classList.add('dim'), 30000);
    }
  }

  keepAwake(true);
  const startT = setTimeout(begin, 1500);
  cleanup = () => { stopAll(); logSession(elapsed / 60, opts.id); };
  br.onclick = e => { if (!e.target.closest('button')) togglePause(); else br.classList.remove('dim'); };
  $('#bpause', o).onclick = togglePause;
  $('#bclose', o).onclick = closeOverlay;
}

// Soft vibration that grows (in) or fades (out) through the phase.
function rampPattern(sec, up) {
  const pat = [], steps = Math.max(2, Math.round(sec * 2));
  for (let i = 0; i < steps; i++) {
    const f = up ? (i + 1) / steps : 1 - i / steps;
    const on = Math.round(15 + f * 45);
    pat.push(on, Math.max(40, 500 - on));
  }
  return pat;
}

/* ---------- Finish ---------- */

function showDone(totalSec, cycles, title = 'Well done 💜') {
  let mood = null;
  const min = Math.round(totalSec / 60);
  const o = openOverlay(`
    <div class="done-emo">🌸</div>
    <h2 class="center">${title}</h2>
    <p class="sub center">${min} ${min === 1 ? 'minute' : 'minutes'}${cycles ? ` · ${cycles} breaths` : ''}</p>
    <div class="lbl center" style="margin-top:36px">How do you feel now?</div>
    <div class="moods">${['😣', '😕', '😐', '🙂', '😌'].map((m, i) => `<button data-m="${i + 1}">${m}</button>`).join('')}</div>
    <button class="big-btn" id="fin" style="margin-top:40px">Done</button>
  `);
  $$('.moods button', o).forEach(b => b.onclick = () => {
    mood = +b.dataset.m;
    $$('.moods button', o).forEach(x => x.classList.toggle('on', x === b));
    const last = S.sessions[S.sessions.length - 1];
    if (last && last.d === today()) { last.mood = mood; save(); }
  });
  $('#fin', o).onclick = closeOverlay;
}

/* ---------- Situations ---------- */

function showSituation(id) {
  const s = SITUATIONS[id];
  const desc = st => st.type === 'breath' ? [EX[st.ex].name, `${st.min} min`]
    : st.type === 'scan' ? ['Body scan', `${st.min} min${st.sound ? ' · with ' + SOUNDS[st.sound].name.toLowerCase() : ''}`]
    : st.type === 'sound' ? [`${SOUNDS[st.sound].name} sounds`, `Plays for ${st.min} min and fades out`]
    : [st.title, 'A short thought for you'];
  const o = openOverlay(`
    ${closeBtn('Situation')}
    <div style="font-size:46px;margin-top:10px">${s.emo}</div>
    <h2>${s.name}</h2>
    <p class="desc">${s.intro}</p>
    <div class="timeline">
      ${s.steps.map((st, i) => { const [t, sub] = desc(st); return `<div class="tl"><div class="n">${i + 1}</div><div><b>${t}</b><span>${sub}</span></div></div>`; }).join('')}
    </div>
    <button class="big-btn" id="start">Start program</button>
  `);
  bindClose(o);
  $('#start', o).onclick = () => runProgram(s);
}

function runProgram(s) {
  const t0 = Date.now();
  let i = 0;
  const label = () => `${s.name} · step ${i + 1} of ${s.steps.length}`;
  const next = () => {
    if (i >= s.steps.length) {
      const secs = (Date.now() - t0) / 1000;
      return showDone(secs, 0, 'Program complete 💜');
    }
    const st = s.steps[i], lbl = label();
    i++;
    if (st.type === 'breath') runBreath({ ...EX[st.ex], id: st.ex, min: st.min }, next, lbl);
    else if (st.type === 'scan') { if (st.sound) Audio.start(st.sound); runScan(st.min, next, lbl); }
    else if (st.type === 'sound') { Audio.start(st.sound); Audio.setTimer(st.min); next(); }
    else showThought(st, next, lbl);
  };
  next();
}

function showThought(st, onDone, lbl) {
  const o = openOverlay(`
    <div class="breathe">
      <div class="step-name">${lbl}</div>
      <div class="mini-circle"><div class="circle breath-demo"></div></div>
      <h2 class="center">${st.title}</h2>
      <p class="desc center" style="padding:0 18px">${st.text}</p>
      <button class="big-btn" id="nx" style="width:auto;padding:15px 40px">Continue</button>
    </div>`);
  o.style.padding = '0';
  if (S.voice) speak(st.text);
  const t = setTimeout(go2, st.sec * 1000);
  function go2() { clearTimeout(t); hush(); cleanup = null; onDone(); }
  cleanup = () => { clearTimeout(t); hush(); };
  $('#nx', o).onclick = go2;
}

/* ---------- Body scan ---------- */

function showScanDetail() {
  let len = 5, sound = null;
  const o = openOverlay(`
    ${closeBtn()}
    <h2>🧘 Body scan</h2>
    <p class="desc">A calm voice guides you through your body, part by part – from your feet to your head. Get comfortable.</p>
    <div class="lbl">Length</div>
    <div class="seg" id="len"><button data-l="5" class="on">5 min</button><button data-l="10">10 min</button></div>
    <div class="lbl">Background sound</div>
    <div class="chips" id="bg"><button class="chip on" data-s="">None</button>
      ${Object.entries(SOUNDS).map(([k, s]) => `<button class="chip" data-s="${k}">${s.emo} ${s.name}</button>`).join('')}
    </div>
    <div class="set" style="margin-top:22px">
      <div class="it"><div>Voice<br><span>Uses your phone’s built-in voice</span></div><button class="switch ${S.voice ? 'on' : ''}" data-k="voice"></button></div>
    </div>
    <button class="big-btn" id="start">Start</button>
  `);
  bindClose(o);
  $$('#len button', o).forEach(b => b.onclick = () => { len = +b.dataset.l; $$('#len button', o).forEach(x => x.classList.toggle('on', x === b)); });
  $$('#bg .chip', o).forEach(b => b.onclick = () => { sound = b.dataset.s || null; $$('#bg .chip', o).forEach(x => x.classList.toggle('on', x === b)); });
  $$('.switch[data-k]', o).forEach(b => b.onclick = () => { S.voice = !S.voice; save(); b.classList.toggle('on'); });
  $('#start', o).onclick = () => { if (sound) Audio.start(sound); runScan(len); };
}

const BODY_SVG = `
<svg class="body-svg" viewBox="0 0 150 300" aria-hidden="true">
  <circle class="part" data-p="head" cx="75" cy="28" r="22"/>
  <rect class="part" data-p="neck" x="66" y="49" width="18" height="12" rx="5"/>
  <rect class="part" data-p="shoulders" x="30" y="60" width="90" height="16" rx="8"/>
  <rect class="part" data-p="chest" x="42" y="78" width="66" height="46" rx="14"/>
  <rect class="part" data-p="belly" x="45" y="126" width="60" height="40" rx="14"/>
  <rect class="part" data-p="armL" x="16" y="74" width="20" height="78" rx="10"/>
  <rect class="part" data-p="armR" x="114" y="74" width="20" height="78" rx="10"/>
  <circle class="part" data-p="handL" cx="26" cy="164" r="11"/>
  <circle class="part" data-p="handR" cx="124" cy="164" r="11"/>
  <rect class="part" data-p="legs" x="47" y="168" width="25" height="104" rx="12"/>
  <rect class="part" data-p="legs" x="78" y="168" width="25" height="104" rx="12"/>
  <ellipse class="part" data-p="feet" cx="56" cy="284" rx="16" ry="9"/>
  <ellipse class="part" data-p="feet" cx="94" cy="284" rx="16" ry="9"/>
</svg>`;

function runScan(min, onDone, stepLabel = '') {
  const total = min * 60, per = total / SCAN.length;
  const o = openOverlay(`
    <div class="breathe" id="sc">
      <div class="step-name">${stepLabel || `Body scan · ${min} min`}</div>
      ${BODY_SVG}
      <div class="scan-text" id="stx">Get ready…</div>
      <div class="count" id="sct"></div>
      <div class="b-bottom">
        <button id="sback" aria-label="Back 15 seconds">↺</button>
        <button id="spause" aria-label="Pause">⏸</button>
        <button id="sfwd" aria-label="Forward 15 seconds">↻</button>
        <button id="sclose" aria-label="Stop">✕</button>
      </div>
    </div>`);
  o.style.padding = '0';
  let t = 0, paused = false, cur = -1, extraDone = -1;
  const stx = $('#stx', o), sct = $('#sct', o);

  function show(i) {
    cur = i;
    const s = SCAN[i];
    $$('.part', o).forEach(p => p.classList.toggle('on', s.parts.includes('whole') || s.parts.includes(p.dataset.p)));
    stx.style.opacity = 0;
    setTimeout(() => { stx.textContent = s.text; stx.style.opacity = 1; }, 400);
    if (S.voice) speak(s.text);
  }
  function tick() {
    if (paused) return;
    t++;
    const i = Math.min(SCAN.length - 1, Math.floor(t / per));
    if (i !== cur) show(i);
    else if (min >= 10 && extraDone !== i && t - i * per > per * 0.6 && i < SCAN.length - 1) {
      extraDone = i; if (S.voice) speak(SCAN_EXTRA);
    }
    const l = Math.max(0, total - t);
    sct.textContent = `${Math.floor(l / 60)}:${String(Math.floor(l % 60)).padStart(2, '0')}`;
    if (t >= total) finish();
  }
  function stop() { clearInterval(iv); hush(); keepAwake(false); }
  function finish() {
    stop(); cleanup = null; logSession(total / 60, 'scan');
    onDone ? onDone() : showDone(total, 0);
  }
  keepAwake(true);
  show(0);
  const iv = setInterval(tick, 1000);
  cleanup = () => { stop(); logSession(t / 60, 'scan'); };
  $('#spause', o).onclick = () => {
    paused = !paused; $('#spause', o).textContent = paused ? '▶' : '⏸';
    paused ? hush() : S.voice && speak(SCAN[cur].text);
  };
  $('#sback', o).onclick = () => { t = Math.max(0, t - 15); cur = -1; tick(); t--; };
  $('#sfwd', o).onclick = () => { t = Math.min(total - 1, t + 15); };
  $('#sclose', o).onclick = closeOverlay;
}

/* ---------- Custom exercise ---------- */

function showCustomEditor() {
  const v = { p: [4, 2, 6, 0], min: 3, name: '' };
  const lab = ['In', 'Hold', 'Out', 'Hold'];
  const o = openOverlay(`
    ${closeBtn('Premium')}
    <h2>Create your own exercise</h2>
    <p class="sub">The circle shows your rhythm as you adjust.</p>
    <div class="mini-circle" style="margin-top:18px"><div class="circle" id="prev"></div></div>
    ${v.p.map((s, i) => `
      <div class="slider-row"><div><span>${lab[i]}</span><b id="v${i}">${s} sec</b></div>
        <input type="range" min="${i % 2 ? 0 : 1}" max="10" value="${s}" data-i="${i}"></div>`).join('')}
    <div class="slider-row"><div><span>Length</span><b id="vm">${v.min} min</b></div>
      <input type="range" min="1" max="15" value="${v.min}" id="rm"></div>
    <input class="text-in" id="nm" placeholder="Name, e.g. My evening rhythm" maxlength="30">
    <button class="big-btn" id="savec">Save exercise</button>
  `);
  bindClose(o);
  const prev = $('#prev', o);
  let pi = 0, pt = null;
  const loop = () => {
    const s = v.p[pi];
    if (s) {
      const k = pi === 0 ? 1 : pi === 2 ? 0.42 : null;
      if (k !== null) { prev.style.transitionDuration = s + 's'; prev.style.transform = `scale(${k})`; }
      prev.classList.toggle('in', pi <= 1);
    }
    pt = setTimeout(() => { pi = (pi + 1) % 4; loop(); }, s * 1000);
  };
  loop();
  cleanup = () => clearTimeout(pt);
  $$('input[data-i]', o).forEach(r => r.oninput = () => { v.p[r.dataset.i] = +r.value; $('#v' + r.dataset.i, o).textContent = r.value + ' sec'; });
  $('#rm', o).oninput = e => { v.min = +e.target.value; $('#vm', o).textContent = v.min + ' min'; };
  $('#savec', o).onclick = () => {
    const name = $('#nm', o).value.trim() || 'My exercise';
    S.custom.push({ id: 'c' + Date.now(), name, p: [...v.p], min: v.min });
    save(); closeOverlay(); toast('Your exercise is saved on the home screen ✨');
  };
}

/* ---------- Premium ---------- */

function paywall() {
  let plan = 'year';
  const o = openOverlay(`
    ${closeBtn()}
    <div style="font-size:46px;margin-top:6px">✨</div>
    <h2>Find more calm with Relaxed Premium</h2>
    <ul class="prem-list">
      <li><span>🌙</span>All exercises and situation programs</li>
      <li><span>🧘</span>Guided body scan, 5 and 10 min</li>
      <li><span>🌲</span>All sounds – and mix two together</li>
      <li><span>✨</span>Create your own exercises</li>
    </ul>
    <button class="plan on" data-p="year"><div><b>$34.99 / year</b><small>Just $2.92 a month</small></div><span class="badge">Save 40%</span></button>
    <button class="plan" data-p="month"><div><b>$4.99 / month</b><small>Cancel anytime</small></div></button>
    <button class="big-btn" id="buy">Try free for 7 days</button>
    <button class="ghost-btn" data-close>Not now</button>
    <p class="sub center" style="font-size:12px">This is a prototype – you will not be charged.</p>
  `);
  bindClose(o);
  $$('.plan', o).forEach(b => b.onclick = () => { plan = b.dataset.p; $$('.plan', o).forEach(x => x.classList.toggle('on', x === b)); });
  $('#buy', o).onclick = () => {
    S.premium = true; save(); closeOverlay();
    toast('✨ Premium is on (demo)');
  };
}

/* ---------- Welcome ---------- */

function onboarding(step = 0) {
  const goals = ['😴 Sleep better', '😮‍💨 Less stress', '📚 Calm before exams', '☁️ Just a breather'];
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
  let html;
  if (step === 0) html = `
    <div class="onb">
      <div class="mini-circle" style="width:200px;height:200px;margin-bottom:30px"><div class="circle breath-demo" style="width:200px;height:200px"></div></div>
      ${dots}
      <h2 class="center">Welcome to Relaxed</h2>
      <p class="desc center">A few minutes a day to breathe, relax and unwind.</p>
      <button class="big-btn" id="nx">Get started</button>
    </div>`;
  if (step === 1) html = `
    <div class="onb">
      ${dots}
      <h2>What would you like help with?</h2>
      <p class="sub">Choose as many as you like.</p>
      ${goals.map(g => `<button class="opt ${S.goals.includes(g) ? 'on' : ''}">${g}</button>`).join('')}
      <button class="big-btn" id="nx">Continue</button>
    </div>`;
  if (step === 2) html = `
    <div class="onb">
      ${dots}
      <div style="font-size:50px;text-align:center">🔔</div>
      <h2 class="center">Want a reminder?</h2>
      <p class="desc center">A friendly message every day: "Take 2 minutes for yourself".</p>
      <div class="center" style="margin-top:22px"><input type="time" id="ot" value="${S.reminder.time}" style="font-size:22px;padding:10px 16px"></div>
      <button class="big-btn" id="yes">Yes please</button>
      <button class="ghost-btn" id="no">Not now</button>
    </div>`;
  const o = openOverlay(html);
  if (step === 1) $$('.opt', o).forEach(b => b.onclick = () => {
    const g = b.textContent;
    S.goals = S.goals.includes(g) ? S.goals.filter(x => x !== g) : [...S.goals, g];
    b.classList.toggle('on');
  });
  if (step < 2) $('#nx', o).onclick = () => onboarding(step + 1);
  else {
    const done = () => { S.onboarded = true; save(); closeOverlay(); };
    $('#yes', o).onclick = async () => {
      S.reminder.time = $('#ot', o).value; S.reminder.on = true;
      if ('Notification' in window) try { await Notification.requestPermission(); } catch {}
      done();
    };
    $('#no', o).onclick = done;
  }
}

/* =========================================================
   Reminder, install, theme
   ========================================================= */

function checkReminder() {
  const r = S.reminder;
  if (!r.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), [h, m] = r.time.split(':').map(Number);
  const due = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  if (!due || r.last === today()) return;
  if (S.sessions.some(s => s.d === today())) { r.last = today(); save(); return; }
  r.last = today(); save();
  const opts = { body: r.text, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'rolig-daily' };
  navigator.serviceWorker?.ready.then(reg => reg.showNotification('Relaxed', opts)).catch(() => new Notification('Relaxed', opts));
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (tab === 'home') go('home'); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isDesktopFrame = () => matchMedia('(min-width: 760px) and (min-height: 620px)').matches;

function installCard() {
  if (isStandalone() || isDesktopFrame() || localStorage.getItem('rolig-hide-install')) return '';
  return `<div class="row install-tip" style="margin-top:16px">
    <div class="ic">📲</div>
    <div class="tx"><b>Add Relaxed to your Home Screen</b><span>Then it opens like a real app</span></div>
    <button class="chip" id="instbtn">How</button>
    <button class="iconbtn" id="insthide" aria-label="Hide">✕</button>
  </div>`;
}
function bindInstall() {
  $('#instbtn') && ($('#instbtn').onclick = showInstallHelp);
  $('#insthide') && ($('#insthide').onclick = () => { localStorage.setItem('rolig-hide-install', '1'); go('home'); });
}
async function showInstallHelp() {
  if (isStandalone()) return toast('Relaxed is already installed 💜');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; deferredPrompt = null; go(tab); return;
  }
  const o = openOverlay(`
    ${closeBtn()}
    <div style="font-size:46px;margin-top:6px">📲</div>
    <h2>Add to Home Screen</h2>
    ${isIOS() ? `
      <div class="timeline">
        <div class="tl"><div class="n">1</div><div><b>Open the page in Safari</b><span>This only works in Safari on iPhone</span></div></div>
        <div class="tl"><div class="n">2</div><div><b>Tap the Share button ⬆︎</b><span>At the bottom of the screen (or the top on iPad)</span></div></div>
        <div class="tl"><div class="n">3</div><div><b>Choose "Add to Home Screen"</b><span>Scroll down the menu a little if you can’t see it</span></div></div>
        <div class="tl"><div class="n">4</div><div><b>Tap "Add"</b><span>Relaxed is now on your Home Screen</span></div></div>
      </div>` : `
      <div class="timeline">
        <div class="tl"><div class="n">1</div><div><b>Open the page in Chrome</b><span>On your Android phone</span></div></div>
        <div class="tl"><div class="n">2</div><div><b>Tap the menu ⋮</b><span>In the top right corner</span></div></div>
        <div class="tl"><div class="n">3</div><div><b>Choose "Install app" or "Add to Home screen"</b><span>Confirm with "Install"</span></div></div>
      </div>`}
    <button class="big-btn" data-close>Got it</button>
  `);
  bindClose(o);
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', S.dark);
  const c = S.dark ? '#1B1930' : '#F7F5FC';
  $('meta[name=theme-color]').setAttribute('content', c);
}

/* ---------- Start ---------- */

applyTheme();
go('home');
if (!S.onboarded) onboarding();
setInterval(checkReminder, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { checkReminder(); if ($('#overlay').hidden) go(tab); }
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
