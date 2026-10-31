'use strict';

/* =========================================================
   Relaxed – vejrtrækning og afspænding
   ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Data ---------- */

const EX = {
  '478':    { name: '4-7-8 vejrtrækning', emo: '🌙', p: [4, 7, 8, 0], min: 3, free: true,
              desc: 'Den lange udånding sænker pulsen. God før søvn, eller når tankerne kører.' },
  boks:     { name: 'Boksvejrtrækning', emo: '◻️', p: [4, 4, 4, 4], min: 4, free: true,
              desc: 'Fire lige lange trin. Giver ro og fokus, fx før en eksamen.' },
  hurtig:   { name: 'Hurtig ro', emo: '🍃', p: [4, 0, 6, 0], min: 2, free: true,
              desc: 'To minutter med lidt længere udånding. Til når du skal falde ned hurtigt.' },
  balance:  { name: 'Afbalanceret 5-5', emo: '🌊', p: [5, 0, 5, 0], min: 5,
              desc: 'Rolig, jævn rytme med ca. seks vejrtrækninger i minuttet.' },
  lang:     { name: 'Lang udånding', emo: '🕊️', p: [4, 2, 8, 0], min: 5,
              desc: 'Ind, et kort ophold og så en lang, langsom udånding.' }
};

const SOUNDS = {
  rain:   { name: 'Regn',      emo: '🌧️', free: true },
  waves:  { name: 'Bølger',    emo: '🌊', free: true },
  forest: { name: 'Skov',      emo: '🌲' },
  white:  { name: 'Hvid støj', emo: '⚪' }
};

const SITUATIONS = {
  eksamen: {
    name: 'Før eksamen', emo: '📚',
    intro: 'Vi får pulsen ned og samler fokus, så du kan gå ind med et klart hoved.',
    steps: [
      { type: 'breath', ex: 'boks', min: 4 },
      { type: 'text', title: 'Én ting ad gangen', text: 'Du har forberedt dig. Læs spørgsmålet roligt, og tag ét skridt ad gangen.', sec: 20 }
    ]
  },
  sove: {
    name: 'Kan ikke sove', emo: '🌙',
    intro: 'Vi starter med at sænke pulsen og slutter med lyd, du kan falde i søvn til.',
    steps: [
      { type: 'breath', ex: '478', min: 3 },
      { type: 'scan', min: 5 },
      { type: 'sound', sound: 'rain', min: 30 }
    ]
  },
  fremlaeg: {
    name: 'Nervøs før fremlæggelse', emo: '🎤',
    intro: 'To minutter med lange udåndinger. Det fortæller kroppen, at der ikke er fare.',
    steps: [
      { type: 'breath', ex: 'hurtig', min: 2 },
      { type: 'text', title: 'Du er klar', text: 'Sænk skuldrene. Det er helt normalt at være lidt nervøs – det betyder, at du gerne vil det her.', sec: 15 }
    ]
  },
  haard: {
    name: 'Efter en hård dag', emo: '🌧️',
    intro: 'Læg dig godt til rette. Vi slipper dagen med en kropsscanning og lyden af bølger.',
    steps: [
      { type: 'scan', min: 10, sound: 'waves' }
    ]
  }
};

const SCAN = [
  { parts: ['whole'], text: 'Find en behagelig stilling. Luk øjnene, hvis du har lyst, og mærk, at underlaget bærer dig.' },
  { parts: ['feet'], text: 'Flyt opmærksomheden ned til dine fødder. Mærk tæerne, hælene og fodsålerne. Lad dem blive tunge.' },
  { parts: ['legs'], text: 'Lad roen sprede sig op gennem læggene, knæene og lårene. Der er ingenting, de skal gøre lige nu.' },
  { parts: ['belly'], text: 'Mærk maven. Lad den hæve sig, når du trækker vejret ind, og synke, når du puster ud.' },
  { parts: ['chest'], text: 'Mærk brystet og ryggen. Med hver udånding bliver du en lille smule mere afslappet.' },
  { parts: ['armL', 'armR', 'handL', 'handR'], text: 'Lad armene ligge tungt. Mærk hænderne og fingrene, og lad dem slippe helt.' },
  { parts: ['shoulders', 'neck'], text: 'Lad skuldrene synke ned, væk fra ørerne. Slip spændingen i nakken.' },
  { parts: ['head'], text: 'Slap af i ansigtet. Kæben, kinderne, rundt om øjnene og panden. Alt er blødt.' },
  { parts: ['whole'], text: 'Mærk nu hele kroppen på én gang. Tung, varm og rolig.' },
  { parts: ['whole'], text: 'Bliv her så længe, du har lyst. Når du er klar, så bevæg langsomt fingre og tæer.' }
];
const SCAN_EXTRA = 'Bliv her lidt endnu. Træk vejret helt roligt.';

/* ---------- Lager ---------- */

const DEFAULTS = {
  onboarded: false, goals: [], premium: false, dark: false,
  vib: true, cues: false, voice: true,
  reminder: { on: false, time: '21:00', text: 'Tag 2 minutter til dig selv 💜', last: '' },
  sessions: [], custom: []
};
let S = load();
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
// Streak med én "fridag" pr. uge, så en enkelt glemt dag ikke bryder den.
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

/* ---------- Hjælpere ---------- */

const isPrem = () => S.premium;
const lock = free => (free || isPrem()) ? '' : '<span class="lock">🔒</span>';
const vib = p => { if (S.vib && navigator.vibrate) try { navigator.vibrate(p); } catch {} };

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

let daVoice = null;
function pickVoice() {
  const v = speechSynthesis.getVoices();
  daVoice = v.find(x => /^da/i.test(x.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'da-DK'; u.rate = rate; u.pitch = 0.95;
  if (daVoice) u.voice = daVoice;
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
  if (h >= 5 && h < 10) return 'God morgen ☀️';
  if (h >= 10 && h < 17) return 'Hej 🌤️';
  if (h >= 17 && h < 23) return 'God aften 🌙';
  return 'Godnat 🌌';
}

/* =========================================================
   Lydmotor (Web Audio – lydene genereres direkte i appen)
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
      // Bløde kanter, så loopet ikke klikker
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
      // Små dråber
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
    <input type="range" min="0" max="1" step="0.01" value="${Audio.volume}" id="pvol" aria-label="Lydstyrke">
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
   Faner
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
      <div class="streak-pill">🔥 ${st ? `${st} ${st === 1 ? 'dag' : 'dage'} i træk` : 'Start din første dag i dag'}</div>
      ${installCard()}
      <button class="hero" id="quick">
        <div><small>Ét tryk – så er du i gang</small><b>Hurtig ro · 2 min</b></div>
        <div class="play">▶</div>
      </button>

      <h3>Hvordan har du det lige nu?</h3>
      <div class="hscroll">
        ${Object.entries(SITUATIONS).map(([id, s]) => `
          <button class="sit" data-sit="${id}">${lock(false)}
            <div class="emo">${s.emo}</div><div class="t">${s.name}</div>
          </button>`).join('')}
      </div>

      <h3>Øvelser</h3>
      <div class="list">
        ${exRows}
        <button class="row" data-scan="1">
          <div class="ic">🧘</div>
          <div class="tx"><b>Kropsscanning</b><span>Guidet lyd · 5 eller 10 min</span></div>
          ${lock(false)}
        </button>
      </div>

      <h3>Mine øvelser</h3>
      <div class="list">
        ${customRows}
        <button class="row" id="newcustom">
          <div class="ic">＋</div>
          <div class="tx"><b>Lav din egen øvelse</b><span>Vælg selv tempo og længde</span></div>
          ${lock(false)}
        </button>
      </div>
    </div>`;
  },

  sounds() {
    return `<div>
      <h2>Lyde</h2>
      <p class="sub">Lad en lyd køre i baggrunden – med timer, så den slukker af sig selv.</p>
      <div class="grid">
        ${Object.entries(SOUNDS).map(([id, s]) => `
          <button class="snd ${Audio.active[id] ? 'on' : ''}" data-s="${id}">${lock(s.free)}
            <div class="emo">${s.emo}</div><b>${s.name}</b>
          </button>`).join('')}
      </div>
      <p class="sub" style="margin-top:16px;font-size:13px">${isPrem() ? 'Premium: tryk på to lyde for at blande dem.' : 'Med Premium kan du blande to lyde, fx regn og skov.'}</p>
    </div>`;
  },

  progress() {
    const total = S.sessions.reduce((a, s) => a + s.m, 0);
    const moods = S.sessions.filter(s => s.mood);
    const avg = moods.length ? moods.reduce((a, s) => a + s.mood, 0) / moods.length : 0;
    return `<div>
      <h2>Fremgang</h2>
      <p class="sub">Små pauser tæller. Det handler ikke om at være perfekt.</p>
      <div class="stats">
        <div class="stat"><b>🔥 ${streak()}</b><span>dage i træk</span></div>
        <div class="stat"><b>${Math.round(total)}</b><span>minutter i alt</span></div>
        <div class="stat"><b>${S.sessions.length}</b><span>sessioner</span></div>
      </div>
      <h3>Kalender</h3>
      <div class="cal" id="cal"></div>
      ${moods.length ? `<div class="note">${['', '😣', '😕', '😐', '🙂', '😌'][Math.round(avg)]} Efter dine øvelser har du det i gennemsnit <b>${avg >= 4 ? 'godt' : avg >= 3 ? 'okay' : 'lidt bedre'}</b> (${moods.length} svar).</div>` : ''}
      <div class="note">💜 Én glemt dag om ugen bryder ikke din streak. Livet sker.</div>
      ${S.sessions.length ? '' : '<div class="note">Du har ikke lavet nogen øvelser endnu. Prøv <b>Hurtig ro</b> på forsiden – det tager kun 2 minutter.</div>'}
    </div>`;
  },

  profile() {
    const r = S.reminder;
    return `<div>
      <h2>Profil</h2>
      ${isPrem()
        ? `<div class="prem-banner"><div><b>✨ Premium er aktiv</b><br><small>Demo – ingen betaling</small></div></div>`
        : `<button class="prem-banner" id="goprem"><div><b>✨ Prøv Relaxed Premium</b><br><small>Alle øvelser, lyde og kropsscanning</small></div><div class="play" style="width:44px;height:44px">›</div></button>`}

      <h3>Daglig påmindelse</h3>
      <div class="set">
        <div class="it"><div>Påmindelse</div><button class="switch ${r.on ? 'on' : ''}" id="remOn" aria-label="Påmindelse"></button></div>
        <div class="it"><div>Tidspunkt</div><input type="time" id="remTime" value="${r.time}"></div>
        <button class="it" id="remText"><div>Besked<br><span>${esc(r.text)}</span></div><span>›</span></button>
      </div>
      <p class="sub" style="font-size:12.5px;margin-top:8px">Påmindelsen kommer som en notifikation, mens appen er åben eller ligger i baggrunden.</p>

      <h3>Indstillinger</h3>
      <div class="set">
        <div class="it"><div>Vibration<br><span>Mærk hvornår du skal ånde ind og ud</span></div><button class="switch ${S.vib ? 'on' : ''}" data-k="vib"></button></div>
        <div class="it"><div>Stemme i øvelser<br><span>Siger "ind", "hold" og "ud"</span></div><button class="switch ${S.cues ? 'on' : ''}" data-k="cues"></button></div>
        <div class="it"><div>Stemme i kropsscanning</div><button class="switch ${S.voice ? 'on' : ''}" data-k="voice"></button></div>
        <div class="it"><div>Mørk tilstand<br><span>God ved sengetid</span></div><button class="switch ${S.dark ? 'on' : ''}" data-k="dark"></button></div>
        ${isPrem() ? `<div class="it"><div>Premium (demo)</div><button class="switch on" data-k="premium"></button></div>` : ''}
      </div>

      <h3>App</h3>
      <div class="set">
        <button class="it" id="install"><div>Føj til hjemmeskærm</div><span>›</span></button>
        <button class="it" id="reset"><div>Slet mine data</div><span>›</span></button>
      </div>
      <p class="sub center" style="font-size:12px;margin-top:22px">Relaxed · version 1.0<br>Dine data bliver kun gemt på din telefon.</p>
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
        if (p !== 'granted') toast('Slå notifikationer til for Relaxed i telefonens indstillinger.');
      }
      S.reminder.on = on; save();
      e.target.classList.toggle('on', on);
      if (on) toast(`Vi minder dig om det kl. ${S.reminder.time} 💜`);
    };
    $('#remTime').onchange = e => { S.reminder.time = e.target.value; S.reminder.last = ''; save(); };
    $('#remText').onclick = () => {
      const opts = ['Tag 2 minutter til dig selv 💜', 'Et lille pusterum? 🍃', 'Træk vejret – du fortjener en pause 🌙', 'Hvordan har du det i dag? ☁️'];
      const i = opts.indexOf(S.reminder.text);
      S.reminder.text = opts[(i + 1) % opts.length]; save(); go('profile');
    };
    $('#install').onclick = showInstallHelp;
    $('#reset').onclick = () => {
      if (confirm('Vil du slette al din fremgang og dine indstillinger?')) {
        localStorage.removeItem('rolig'); S = load(); applyTheme(); go('home'); toast('Dine data er slettet.');
      }
    };
  }
};

let calMonth = new Date();
function renderCal(d) {
  calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const map = minutesByDay(), y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let cells = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(x => `<div class="dn">${x}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div></div>';
  for (let i = 1; i <= days; i++) {
    const k = dkey(new Date(y, m, i)), v = map[k] || 0;
    const l = v >= 10 ? 'l3' : v >= 5 ? 'l2' : v > 0 ? 'l1' : '';
    cells += `<div class="day ${l} ${k === today() ? 'today' : ''}" title="${v ? Math.round(v) + ' min' : ''}">${i}</div>`;
  }
  $('#cal').innerHTML = `
    <div class="cal-head">
      <button class="iconbtn" id="cprev">‹</button>
      <b>${calMonth.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}</b>
      <button class="iconbtn" id="cnext">›</button>
    </div>
    <div class="cal-grid">${cells}</div>`;
  $('#cprev').onclick = () => renderCal(new Date(y, m - 1, 1));
  $('#cnext').onclick = () => renderCal(new Date(y, m + 1, 1));
}

/* =========================================================
   Overlay-skærme
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
const closeBtn = (label = '') => `<div class="ov-top"><span class="sub">${label}</span><button class="close" data-close aria-label="Luk">✕</button></div>`;
function bindClose(o) { $$('[data-close]', o).forEach(b => b.onclick = closeOverlay); }

/* ---------- Øvelsesdetalje ---------- */

function showDetail(id, custom) {
  const e = custom || EX[id];
  const lens = [...new Set([1, 3, 5, e.min])].sort((a, b) => a - b);
  let len = e.min, sound = null;
  const names = ['Ind', 'Hold', 'Ud', 'Hold'];
  const o = openOverlay(`
    ${closeBtn()}
    <h2>${custom ? '✨ ' + esc(e.name) : e.emo + ' ' + e.name}</h2>
    <p class="desc">${custom ? 'Din egen øvelse.' : e.desc}</p>
    <div class="rhythm">${e.p.map((s, i) => s ? `<div><b>${s}</b><span>${names[i]}</span></div>` : '').join('')}</div>

    <div class="lbl">Længde</div>
    <div class="seg" id="len">${lens.map(l => `<button data-l="${l}" class="${l === len ? 'on' : ''}">${l} min</button>`).join('')}</div>

    <div class="lbl">Baggrundslyd</div>
    <div class="chips" id="bg">
      <button class="chip on" data-s="">Ingen</button>
      ${Object.entries(SOUNDS).map(([k, s]) => `<button class="chip" data-s="${k}">${s.emo} ${s.name}${s.free || isPrem() ? '' : ' 🔒'}</button>`).join('')}
    </div>

    <div class="set" style="margin-top:22px">
      <div class="it"><div>Vibration</div><button class="switch ${S.vib ? 'on' : ''}" data-k="vib"></button></div>
      <div class="it"><div>Stemme</div><button class="switch ${S.cues ? 'on' : ''}" data-k="cues"></button></div>
    </div>

    <button class="big-btn" id="start">Start</button>
    ${custom ? '<button class="ghost-btn" id="del">Slet øvelse</button>' : ''}
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
    S.custom = S.custom.filter(c => c.id !== custom.id); save(); closeOverlay(); toast('Øvelsen er slettet.');
  };
}

/* ---------- Vejrtrækning ---------- */

function runBreath(opts, onDone, stepLabel = '') {
  const [a, b, c, d] = opts.p;
  const phases = [];
  if (a) phases.push({ t: 'Træk vejret ind', s: a, k: 'in', say: 'Ind' });
  if (b) phases.push({ t: 'Hold vejret', s: b, k: 'hold', say: 'Hold' });
  if (c) phases.push({ t: 'Pust langsomt ud', s: c, k: 'out', say: 'Ud' });
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
        <div class="paused-lbl" id="plbl" hidden>Pause – tryk for at fortsætte</div>
      </div>
      <div class="phase" id="ph">Gør dig klar…</div>
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

// Blød vibration der tiltager (ind) eller aftager (ud) gennem fasen.
function rampPattern(sec, up) {
  const pat = [], steps = Math.max(2, Math.round(sec * 2));
  for (let i = 0; i < steps; i++) {
    const f = up ? (i + 1) / steps : 1 - i / steps;
    const on = Math.round(15 + f * 45);
    pat.push(on, Math.max(40, 500 - on));
  }
  return pat;
}

/* ---------- Afslutning ---------- */

function showDone(totalSec, cycles, title = 'Godt gået 💜') {
  let mood = null;
  const min = Math.round(totalSec / 60);
  const o = openOverlay(`
    <div class="done-emo">🌸</div>
    <h2 class="center">${title}</h2>
    <p class="sub center">${min} ${min === 1 ? 'minut' : 'minutter'}${cycles ? ` · ${cycles} vejrtrækninger` : ''}</p>
    <div class="lbl center" style="margin-top:36px">Hvordan har du det nu?</div>
    <div class="moods">${['😣', '😕', '😐', '🙂', '😌'].map((m, i) => `<button data-m="${i + 1}">${m}</button>`).join('')}</div>
    <button class="big-btn" id="fin" style="margin-top:40px">Færdig</button>
  `);
  $$('.moods button', o).forEach(b => b.onclick = () => {
    mood = +b.dataset.m;
    $$('.moods button', o).forEach(x => x.classList.toggle('on', x === b));
    const last = S.sessions[S.sessions.length - 1];
    if (last && last.d === today()) { last.mood = mood; save(); }
  });
  $('#fin', o).onclick = closeOverlay;
}

/* ---------- Situationer ---------- */

function showSituation(id) {
  const s = SITUATIONS[id];
  const desc = st => st.type === 'breath' ? [EX[st.ex].name, `${st.min} min`]
    : st.type === 'scan' ? ['Kropsscanning', `${st.min} min${st.sound ? ' · med ' + SOUNDS[st.sound].name.toLowerCase() : ''}`]
    : st.type === 'sound' ? [`${SOUNDS[st.sound].name}lyd`, `Kører i ${st.min} min og fader ud`]
    : [st.title, 'Kort tanke til dig'];
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
  const label = () => `${s.name} · trin ${i + 1} af ${s.steps.length}`;
  const next = () => {
    if (i >= s.steps.length) {
      const secs = (Date.now() - t0) / 1000;
      return showDone(secs, 0, 'Programmet er færdigt 💜');
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
      <button class="big-btn" id="nx" style="width:auto;padding:15px 40px">Videre</button>
    </div>`);
  o.style.padding = '0';
  if (S.voice) speak(st.text);
  const t = setTimeout(go2, st.sec * 1000);
  function go2() { clearTimeout(t); hush(); cleanup = null; onDone(); }
  cleanup = () => { clearTimeout(t); hush(); };
  $('#nx', o).onclick = go2;
}

/* ---------- Kropsscanning ---------- */

function showScanDetail() {
  let len = 5, sound = null;
  const o = openOverlay(`
    ${closeBtn()}
    <h2>🧘 Kropsscanning</h2>
    <p class="desc">En rolig stemme guider dig gennem kroppen, del for del – fra fødderne til hovedet. Læg dig godt til rette.</p>
    <div class="lbl">Længde</div>
    <div class="seg" id="len"><button data-l="5" class="on">5 min</button><button data-l="10">10 min</button></div>
    <div class="lbl">Baggrundslyd</div>
    <div class="chips" id="bg"><button class="chip on" data-s="">Ingen</button>
      ${Object.entries(SOUNDS).map(([k, s]) => `<button class="chip" data-s="${k}">${s.emo} ${s.name}</button>`).join('')}
    </div>
    <div class="set" style="margin-top:22px">
      <div class="it"><div>Stemme<br><span>${daVoice ? 'Dansk stemme fundet' : 'Bruger telefonens standardstemme'}</span></div><button class="switch ${S.voice ? 'on' : ''}" data-k="voice"></button></div>
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
      <div class="step-name">${stepLabel || `Kropsscanning · ${min} min`}</div>
      ${BODY_SVG}
      <div class="scan-text" id="stx">Gør dig klar…</div>
      <div class="count" id="sct"></div>
      <div class="b-bottom">
        <button id="sback" aria-label="Tilbage 15 sekunder">↺</button>
        <button id="spause" aria-label="Pause">⏸</button>
        <button id="sfwd" aria-label="Frem 15 sekunder">↻</button>
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

/* ---------- Egen øvelse ---------- */

function showCustomEditor() {
  const v = { p: [4, 2, 6, 0], min: 3, name: '' };
  const lab = ['Ind', 'Hold', 'Ud', 'Hold'];
  const o = openOverlay(`
    ${closeBtn('Premium')}
    <h2>Lav din egen øvelse</h2>
    <p class="sub">Cirklen viser din rytme, mens du justerer.</p>
    <div class="mini-circle" style="margin-top:18px"><div class="circle" id="prev"></div></div>
    ${v.p.map((s, i) => `
      <div class="slider-row"><div><span>${lab[i]}</span><b id="v${i}">${s} sek</b></div>
        <input type="range" min="${i % 2 ? 0 : 1}" max="10" value="${s}" data-i="${i}"></div>`).join('')}
    <div class="slider-row"><div><span>Længde</span><b id="vm">${v.min} min</b></div>
      <input type="range" min="1" max="15" value="${v.min}" id="rm"></div>
    <input class="text-in" id="nm" placeholder="Navn, fx Min aftenrytme" maxlength="30">
    <button class="big-btn" id="savec">Gem øvelse</button>
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
  $$('input[data-i]', o).forEach(r => r.oninput = () => { v.p[r.dataset.i] = +r.value; $('#v' + r.dataset.i, o).textContent = r.value + ' sek'; });
  $('#rm', o).oninput = e => { v.min = +e.target.value; $('#vm', o).textContent = v.min + ' min'; };
  $('#savec', o).onclick = () => {
    const name = $('#nm', o).value.trim() || 'Min øvelse';
    S.custom.push({ id: 'c' + Date.now(), name, p: [...v.p], min: v.min });
    save(); closeOverlay(); toast('Din øvelse er gemt på forsiden ✨');
  };
}

/* ---------- Premium ---------- */

function paywall() {
  let plan = 'year';
  const o = openOverlay(`
    ${closeBtn()}
    <div style="font-size:46px;margin-top:6px">✨</div>
    <h2>Få mere ro med Relaxed Premium</h2>
    <ul class="prem-list">
      <li><span>🌙</span>Alle øvelser og situationsprogrammer</li>
      <li><span>🧘</span>Guidet kropsscanning på 5 og 10 min</li>
      <li><span>🌲</span>Alle lyde – og bland to sammen</li>
      <li><span>✨</span>Lav dine egne øvelser</li>
    </ul>
    <button class="plan on" data-p="year"><div><b>249 kr. / år</b><small>Svarer til ca. 21 kr. om måneden</small></div><span class="badge">Spar 40 %</span></button>
    <button class="plan" data-p="month"><div><b>35 kr. / måned</b><small>Opsig når som helst</small></div></button>
    <button class="big-btn" id="buy">Prøv gratis i 7 dage</button>
    <button class="ghost-btn" data-close>Ikke nu</button>
    <p class="sub center" style="font-size:12px">Dette er en prototype – der bliver ikke trukket penge.</p>
  `);
  bindClose(o);
  $$('.plan', o).forEach(b => b.onclick = () => { plan = b.dataset.p; $$('.plan', o).forEach(x => x.classList.toggle('on', x === b)); });
  $('#buy', o).onclick = () => {
    S.premium = true; save(); closeOverlay();
    toast('✨ Premium er slået til (demo)');
  };
}

/* ---------- Velkomst ---------- */

function onboarding(step = 0) {
  const goals = ['😴 Sove bedre', '😮‍💨 Mindre stress', '📚 Ro før eksamen', '☁️ Bare et pusterum'];
  const dots = `<div class="dots">${[0, 1, 2].map(i => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
  let html;
  if (step === 0) html = `
    <div class="onb">
      <div class="mini-circle" style="width:200px;height:200px;margin-bottom:30px"><div class="circle breath-demo" style="width:200px;height:200px"></div></div>
      ${dots}
      <h2 class="center">Velkommen til Relaxed</h2>
      <p class="desc center">Et par minutter om dagen til at trække vejret, slappe af og falde til ro.</p>
      <button class="big-btn" id="nx">Kom i gang</button>
    </div>`;
  if (step === 1) html = `
    <div class="onb">
      ${dots}
      <h2>Hvad vil du gerne have hjælp til?</h2>
      <p class="sub">Vælg gerne flere.</p>
      ${goals.map(g => `<button class="opt ${S.goals.includes(g) ? 'on' : ''}">${g}</button>`).join('')}
      <button class="big-btn" id="nx">Videre</button>
    </div>`;
  if (step === 2) html = `
    <div class="onb">
      ${dots}
      <div style="font-size:50px;text-align:center">🔔</div>
      <h2 class="center">Skal vi minde dig om det?</h2>
      <p class="desc center">En venlig besked hver dag: "Tag 2 minutter til dig selv".</p>
      <div class="center" style="margin-top:22px"><input type="time" id="ot" value="${S.reminder.time}" style="font-size:22px;padding:10px 16px"></div>
      <button class="big-btn" id="yes">Ja tak</button>
      <button class="ghost-btn" id="no">Ikke nu</button>
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
   Påmindelse, installation, tema
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
    <div class="tx"><b>Læg Relaxed på hjemmeskærmen</b><span>Så åbner den som en rigtig app</span></div>
    <button class="chip" id="instbtn">Sådan</button>
    <button class="iconbtn" id="insthide" aria-label="Skjul">✕</button>
  </div>`;
}
function bindInstall() {
  $('#instbtn') && ($('#instbtn').onclick = showInstallHelp);
  $('#insthide') && ($('#insthide').onclick = () => { localStorage.setItem('rolig-hide-install', '1'); go('home'); });
}
async function showInstallHelp() {
  if (isStandalone()) return toast('Relaxed er allerede installeret 💜');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; deferredPrompt = null; go(tab); return;
  }
  const o = openOverlay(`
    ${closeBtn()}
    <div style="font-size:46px;margin-top:6px">📲</div>
    <h2>Føj til hjemmeskærm</h2>
    ${isIOS() ? `
      <div class="timeline">
        <div class="tl"><div class="n">1</div><div><b>Åbn siden i Safari</b><span>Det virker kun i Safari på iPhone</span></div></div>
        <div class="tl"><div class="n">2</div><div><b>Tryk på Del-knappen ⬆︎</b><span>Nederst på skærmen (eller øverst på iPad)</span></div></div>
        <div class="tl"><div class="n">3</div><div><b>Vælg "Føj til hjemmeskærm"</b><span>Rul lidt ned i menuen, hvis du ikke kan se den</span></div></div>
        <div class="tl"><div class="n">4</div><div><b>Tryk "Tilføj"</b><span>Nu ligger Relaxed på din hjemmeskærm</span></div></div>
      </div>` : `
      <div class="timeline">
        <div class="tl"><div class="n">1</div><div><b>Åbn siden i Chrome</b><span>På din Android-telefon</span></div></div>
        <div class="tl"><div class="n">2</div><div><b>Tryk på menuen ⋮</b><span>Øverst til højre</span></div></div>
        <div class="tl"><div class="n">3</div><div><b>Vælg "Installer app" eller "Føj til startskærm"</b><span>Bekræft med "Installer"</span></div></div>
      </div>`}
    <button class="big-btn" data-close>Forstået</button>
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
