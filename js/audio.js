// 《樗蒲宫棋》音效 — Web Audio API

const Audio = (() => {
  let ctx = null;
  let sfxGain = null;
  let ambGain = null;
  let guqinNodes = [];

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.8;
      sfxGain.connect(ctx.destination);
      ambGain = ctx.createGain();
      ambGain.gain.value = 0.2;
      ambGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio 不可用');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, vol, type) {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  function noise(dur, vol, freq) {
    if (!ctx) return;
    resume();
    const t = ctx.currentTime;
    const bs = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bs, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bs);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxGain);
    src.start(t);
  }

  function uiClick() { tone(1100, 0.06, 0.15); }

  function chupuRoll() {
    noise(0.12, 0.35, 600);
    setTimeout(() => noise(0.08, 0.25, 400), 80);
  }

  function chupuLand() {
    noise(0.06, 0.4, 500);
    tone(180, 0.15, 0.2, 'triangle');
  }

  function moveStep() {
    tone(440, 0.05, 0.12, 'triangle');
  }

  function scorePoint() {
    [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.2, 0.2), i * 80));
  }

  function royalCai() {
    tone(220, 0.5, 0.35, 'sine');
    setTimeout(() => tone(330, 0.4, 0.3, 'sine'), 200);
  }

  function obstaclePlace() { tone(160, 0.25, 0.25, 'square'); }

  function blocked() { tone(120, 0.3, 0.3, 'sawtooth'); }

  function victory() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, 0.25), i * 120));
  }

  function timeoutBeep() { tone(880, 0.1, 0.15); }

  function startGuqin() {
    if (!ctx || guqinNodes.length) return;
    resume();
    const notes = [220, 247, 262, 294, 330, 349];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.02 + (i % 2) * 0.01;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.01;
      const lg = ctx.createGain();
      lg.gain.value = 0.015;
      lfo.connect(lg);
      lg.connect(g.gain);
      osc.connect(g);
      g.connect(ambGain);
      osc.start();
      lfo.start();
      guqinNodes.push(osc, lfo);
    });
  }

  function stopGuqin() {
    guqinNodes.forEach(n => { try { n.stop(); } catch (e) {} });
    guqinNodes = [];
  }

  function setSfxVolume(v) {
    if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v));
  }

  function setAmbVolume(v) {
    if (ambGain) ambGain.gain.value = Math.max(0, Math.min(0.4, v * 0.35));
  }

  return {
    init, resume, uiClick, chupuRoll, chupuLand, moveStep,
    scorePoint, royalCai, obstaclePlace, blocked, victory,
    timeoutBeep, startGuqin, stopGuqin, setSfxVolume, setAmbVolume,
  };
})();
