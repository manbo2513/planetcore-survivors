const STORAGE_KEY = "planetcore-survivors-muted";
const MUSIC_STORAGE_KEY = "planetcore-survivors-music-muted";

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.ambient = null;
    this.muted = false;
    this.musicMuted = false;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicIntensity = "normal";
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === "1";
      this.musicMuted = localStorage.getItem(MUSIC_STORAGE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.52;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicMuted ? 0 : 0.1;
    this.musicGain.connect(this.master);

    const length = Math.floor(this.ctx.sampleRate * 1.2);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.52, now, 0.03);
    }
  }

  toggle() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMusicMuted(muted) {
    this.musicMuted = Boolean(muted);
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, this.musicMuted ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(
        this.musicMuted ? 0 : this.musicIntensity === "boss" ? 0.15 : 0.1,
        now,
        0.08,
      );
    }
  }

  toggleMusic() {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  tone({ freq, freqEnd = freq, duration = 0.12, type = "sine", volume = 0.1, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  noise({ duration = 0.16, volume = 0.12, cutoff = 1400, delay = 0, q = 0.8 }) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const start = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.32), start + duration);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  shoot() {
    this.tone({ freq: 620, freqEnd: 260, duration: 0.055, type: "square", volume: 0.035 });
  }

  hit() {
    this.noise({ duration: 0.045, volume: 0.035, cutoff: 2400 });
  }

  pickup(pitch = 0) {
    this.tone({
      freq: 920 + pitch * 45,
      freqEnd: 1320 + pitch * 40,
      duration: 0.075,
      type: "sine",
      volume: 0.035,
    });
  }

  hurt() {
    this.tone({ freq: 150, freqEnd: 58, duration: 0.28, type: "sawtooth", volume: 0.16 });
    this.noise({ duration: 0.2, volume: 0.12, cutoff: 900 });
  }

  explode(size = 1) {
    this.noise({ duration: 0.18 + size * 0.1, volume: 0.11 * Math.min(2, size), cutoff: 900 });
    this.tone({
      freq: 90,
      freqEnd: 34,
      duration: 0.24 + size * 0.08,
      type: "sine",
      volume: 0.1 * Math.min(1.6, size),
    });
  }

  levelup() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone({
        freq,
        duration: 0.24,
        type: "triangle",
        volume: 0.075,
        delay: i * 0.075,
      });
    });
  }

  bossWarn() {
    this.tone({ freq: 92, freqEnd: 48, duration: 1.1, type: "sawtooth", volume: 0.1 });
    this.tone({ freq: 138, freqEnd: 69, duration: 1.1, type: "sine", volume: 0.07 });
    this.noise({ duration: 0.9, volume: 0.045, cutoff: 320 });
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      this.tone({
        freq,
        duration: 0.55,
        type: "triangle",
        volume: 0.06,
        delay: i * 0.12,
      });
    });
    this.noise({ duration: 1.4, volume: 0.04, cutoff: 3000, delay: 0.2 });
  }

  gameover() {
    this.tone({ freq: 220, freqEnd: 55, duration: 1.25, type: "sawtooth", volume: 0.09 });
    this.noise({ duration: 1.1, volume: 0.05, cutoff: 520 });
  }

  ui() {
    this.tone({ freq: 700, freqEnd: 980, duration: 0.08, type: "sine", volume: 0.045 });
  }

  gravityOn() {
    this.tone({ freq: 150, freqEnd: 320, duration: 0.32, type: "sine", volume: 0.055 });
    this.tone({ freq: 74, freqEnd: 96, duration: 0.4, type: "triangle", volume: 0.035 });
  }

  gravityBurst() {
    this.noise({ duration: 0.34, volume: 0.1, cutoff: 1600 });
    this.tone({ freq: 120, freqEnd: 38, duration: 0.38, type: "sine", volume: 0.1 });
    this.tone({ freq: 520, freqEnd: 180, duration: 0.2, type: "triangle", volume: 0.05 });
  }

  event() {
    this.tone({ freq: 260, freqEnd: 780, duration: 0.45, type: "triangle", volume: 0.06 });
    this.tone({ freq: 390, freqEnd: 1170, duration: 0.5, type: "sine", volume: 0.035, delay: 0.08 });
  }

  perfectRelease() {
    this.tone({ freq: 660, freqEnd: 1320, duration: 0.22, type: "sine", volume: 0.07 });
    this.tone({ freq: 990, freqEnd: 1980, duration: 0.2, type: "triangle", volume: 0.04, delay: 0.03 });
  }

  laserCharge() {
    this.tone({ freq: 180, freqEnd: 760, duration: 0.78, type: "sawtooth", volume: 0.035 });
    this.tone({ freq: 90, freqEnd: 180, duration: 0.8, type: "sine", volume: 0.02 });
  }

  laserFire() {
    this.noise({ duration: 0.24, volume: 0.09, cutoff: 2400 });
    this.tone({ freq: 1400, freqEnd: 190, duration: 0.24, type: "sawtooth", volume: 0.09 });
    this.tone({ freq: 420, freqEnd: 80, duration: 0.3, type: "triangle", volume: 0.06 });
  }

  laserSalvo() {
    this.noise({ duration: 0.34, volume: 0.11, cutoff: 3000 });
    this.tone({ freq: 1600, freqEnd: 220, duration: 0.32, type: "sawtooth", volume: 0.1 });
    this.tone({ freq: 800, freqEnd: 160, duration: 0.36, type: "triangle", volume: 0.07 });
    this.tone({ freq: 1200, freqEnd: 260, duration: 0.24, type: "sine", volume: 0.04, delay: 0.06 });
  }

  laserBurstShot(index = 0) {
    this.tone({
      freq: 1350 + index * 90,
      freqEnd: 280 + index * 40,
      duration: 0.12,
      type: "sawtooth",
      volume: 0.055,
    });
    this.noise({ duration: 0.07, volume: 0.035, cutoff: 2600 });
  }

  musicTone({ freq, duration, type = "sine", volume = 0.03, delay = 0 }) {
    if (!this.ctx || this.musicMuted || !this.musicGain) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  musicTick() {
    if (!this.ctx || this.musicMuted) return;
    const boss = this.musicIntensity === "boss";
    const step = this.musicStep;
    const roots = [55, 65.41, 49, 58.27];
    const root = roots[Math.floor(step / 8) % roots.length];
    const minor = step % 16 >= 8;

    if (step % 8 === 0) {
      this.musicTone({ freq: root, duration: 3.1, type: "triangle", volume: 0.035 });
      this.musicTone({ freq: root * 1.5, duration: 3.1, type: "sine", volume: 0.018 });
      this.musicTone({
        freq: root * (minor ? 1.2 : 1.26),
        duration: 3.1,
        type: "sine",
        volume: 0.014,
      });
    }
    if (step % 4 === 0) {
      this.musicTone({
        freq: root * 0.5,
        duration: 0.7,
        type: "sine",
        volume: boss ? 0.065 : 0.045,
      });
    }

    const arp = [2, 3, 4, 5, 4, 3, 2, 4];
    if (step % (boss ? 1 : 2) === 0) {
      const index = Math.floor(step / (boss ? 1 : 2)) % arp.length;
      this.musicTone({
        freq: root * arp[index],
        duration: boss ? 0.28 : 0.45,
        type: "triangle",
        volume: boss ? 0.026 : 0.018,
      });
    }
    if (boss && step % 2 === 1) {
      this.musicTone({ freq: root * 0.75, duration: 0.16, type: "sawtooth", volume: 0.02 });
    }
    this.musicStep = (step + 1) % 32;
  }

  startMusic() {
    this.init();
    if (this.musicTimer) return;
    this.musicStep = 0;
    this.setMusicIntensity("normal");
    this.musicTick();
    this.musicTimer = window.setInterval(() => this.musicTick(), 420);
  }

  stopMusic(fade = 0.8) {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    }
  }

  setMusicIntensity(intensity) {
    this.musicIntensity = intensity;
    if (this.musicGain && this.ctx) {
      const target = this.musicMuted ? 0 : intensity === "boss" ? 0.15 : 0.1;
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    }
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const now = this.ctx.currentTime;
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, now);
    bus.gain.exponentialRampToValueAtTime(0.05, now + 2.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    filter.Q.value = 3;

    const oscA = this.ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = 55;
    const oscB = this.ctx.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = 82.4;
    oscB.detune.value = -7;

    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.09;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(bus.gain);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(bus);
    bus.connect(this.master);

    oscA.start(now);
    oscB.start(now);
    lfo.start(now);
    this.ambient = { bus, oscA, oscB, lfo };
  }

  stopAmbient(fade = 0.8) {
    if (!this.ambient || !this.ctx) return;
    const { bus, oscA, oscB, lfo } = this.ambient;
    const now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    try {
      oscA.stop(now + fade + 0.05);
      oscB.stop(now + fade + 0.05);
      lfo.stop(now + fade + 0.05);
    } catch {
      /* already stopped */
    }
    this.ambient = null;
  }
}
