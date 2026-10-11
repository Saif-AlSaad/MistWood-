/* Procedural WebAudio Engine — peaceful, relaxing forest soundscape with authentic birdsongs, mourning doves, owls, night crickets, calming ambient wind, and meditative zen pentatonic pads */

import { rand } from "./types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private cricketGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private masterVolume = 0.85;
  private sfxVolume = 0.85;
  private musicVolume = 0.75;
  private muted = false;

  // Timers for organic non-repetitive wildlife calls
  private chirpTimer = 2.5;
  private chimeTimer = 6.0;
  private chordTimer = 1.0;

  /** Must be initialized from user interaction */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    // Master bus
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.masterVolume;
    this.master.connect(this.ctx.destination);

    // SFX sub-bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);

    // BGM / Ambience sub-bus
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);

    // Shared high-quality noise buffer for wind & water
    const len = this.ctx.sampleRate * 3;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    // Smooth pink/brownish noise distribution for gentle organic breeze
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.05;
      b1 = 0.985 * b1 + white * 0.11;
      b2 = 0.950 * b2 + white * 0.25;
      d[i] = (b0 + b1 + b2 + white * 0.1) * 0.45;
    }

    this.startGentleWind();
    this.startCricketBed();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === "running") {
      void this.ctx.suspend();
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        m ? 0 : this.masterVolume,
        this.ctx.currentTime + 0.25,
      );
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master && !this.muted) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        this.masterVolume,
        this.ctx.currentTime + 0.06,
      );
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.linearRampToValueAtTime(
        this.sfxVolume,
        this.ctx.currentTime + 0.06,
      );
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(
        this.musicVolume,
        this.ctx.currentTime + 0.06,
      );
    }
  }

  /** Modulate gentle forest breeze with running speed without harsh hissing */
  setSpeed(speed: number): void {
    if (!this.ctx || !this.windFilter || !this.windGain) return;
    const ratio = Math.max(0, Math.min(1, (speed - 340) / 480));
    // Soft, deep organic frequencies: 320 Hz up to 580 Hz
    const targetFreq = 320 + ratio * 280;
    const targetGain = 0.038 + ratio * 0.032;
    this.windFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.25);
    this.windGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.25);
  }

  private get t(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /* ------------------------------------------------------------------ */
  /* 1. Gentle Ambient Forest Breeze Bed                                 */
  /* ------------------------------------------------------------------ */

  private startGentleWind(): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest || !this.noiseBuf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.value = 340;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.038;

    src.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(dest);
    src.start();

    // Gentle sub-audible breathing LFOs (pine canopy swaying)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.045; // 22s breathing cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);
    lfo.start();

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.025;
    const lfo2Gain = this.ctx.createGain();
    lfo2Gain.gain.value = 0.015;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(this.windGain.gain);
    lfo2.start();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Relaxing Night Crickets & Katydids Ambience                     */
  /* ------------------------------------------------------------------ */

  private startCricketBed(): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    // Dual high-frequency oscillators creating natural tranquil cricket chirp texture
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 4650;
    osc2.frequency.value = 4820;

    // Fast rhythmic pulse (4.5 Hz cricket chirp rate)
    const pulseLfo = this.ctx.createOscillator();
    pulseLfo.type = "triangle";
    pulseLfo.frequency.value = 4.5;
    const pulseGain = this.ctx.createGain();
    pulseGain.gain.value = 0.5;

    const cricketAmp = this.ctx.createGain();
    cricketAmp.gain.value = 0.5;

    this.cricketGain = this.ctx.createGain();
    this.cricketGain.gain.value = 0.0; // Controlled dynamically by night factor

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 4750;
    bandpass.Q.value = 4.0;

    osc1.connect(cricketAmp);
    osc2.connect(cricketAmp);
    pulseLfo.connect(pulseGain);
    pulseGain.connect(cricketAmp.gain);

    cricketAmp.connect(bandpass);
    bandpass.connect(this.cricketGain);
    this.cricketGain.connect(dest);

    osc1.start();
    osc2.start();
    pulseLfo.start();
  }

  /* ------------------------------------------------------------------ */
  /* 3. Authentic Birds & Animal Calls (Relaxing & Peaceful)            */
  /* ------------------------------------------------------------------ */

  /** Call every frame to seamlessly weave authentic wildlife vocalizations */
  maybeChirp(dt: number, night: number): void {
    if (!this.ctx || this.muted) return;

    // Update tranquil night crickets volume based on night factor
    if (this.cricketGain) {
      const targetCricketGain = Math.max(0, night - 0.12) * 0.024;
      this.cricketGain.gain.setTargetAtTime(targetCricketGain, this.ctx.currentTime, 0.4);
    }

    this.chirpTimer -= dt;
    if (this.chirpTimer > 0) return;

    // Frequent natural intervals (every 2.8s to 5.8s) so the forest feels continuously serenading
    this.chirpTimer = rand(2.8, 5.8);
    const t = this.t + 0.04;

    if (night > 0.45) {
      // ---- Night Fauna ----
      const roll = Math.random();
      if (roll < 0.65) {
        // Great Horned / Tawny Owl: gentle deep resonant hoot
        this.playTawnyOwl(t);
      } else {
        // Night Nightingale / Soft Cricket Flutter
        this.playNightingaleTrill(t);
      }
    } else {
      // ---- Day / Dawn / Midday / Dusk Songbirds ----
      const roll = Math.random();
      if (roll < 0.35) {
        // Song Thrush: melodic musical warble with vibrato
        this.playSongThrush(t);
      } else if (roll < 0.6) {
        // Mourning Dove / Wood Pigeon: warm, hollow soothing coo
        this.playMourningDove(t);
      } else if (roll < 0.82) {
        // Cheerful Wood Warbler / Chickadee: ascending cheerful flute-chirps
        this.playWoodWarbler(t);
      } else {
        // Blackbird: musical cascading descending 3-note trill
        this.playBlackbirdCascade(t);
      }
    }
  }

  /** Melodic Song Thrush Warble with Frequency-Modulated Vibrato */
  private playSongThrush(at: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    const baseFreq = rand(2200, 2700);
    const phrases = [
      { f0: baseFreq, f1: baseFreq * 1.25, dur: 0.12 },
      { f0: baseFreq * 1.25, f1: baseFreq * 0.95, dur: 0.14 },
      { f0: baseFreq * 1.1, f1: baseFreq * 1.35, dur: 0.16 },
    ];

    let noteTime = at;
    for (const p of phrases) {
      this.synthesizeBirdNote(noteTime, p.f0, p.f1, p.dur, 0.038, true);
      noteTime += p.dur + rand(0.04, 0.09);
    }
  }

  /** Soothing Mourning Dove Hollow Cooing (Extremely Relaxing) */
  private playMourningDove(at: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    // Low, warm ocarina-like hollow tone
    const f = rand(360, 420);

    // Phrase: "coo... coo-COO-coo"
    this.synthesizeDoveCoo(at, f, 0.26, 0.035);
    this.synthesizeDoveCoo(at + 0.38, f * 0.95, 0.18, 0.032);
    this.synthesizeDoveCoo(at + 0.62, f * 1.08, 0.34, 0.042);
    this.synthesizeDoveCoo(at + 1.02, f * 0.92, 0.42, 0.03);
  }

  /** Cheerful Wood Warbler High Flute Chirps */
  private playWoodWarbler(at: number): void {
    const base = rand(2600, 3200);
    const count = Math.floor(rand(2, 4));
    for (let i = 0; i < count; i++) {
      const f0 = base + i * 180;
      const f1 = f0 * 1.22;
      this.synthesizeBirdNote(at + i * 0.11, f0, f1, 0.075, 0.028, false);
    }
  }

  /** Blackbird Cascading 3-Note Pentatonic Trill */
  private playBlackbirdCascade(at: number): void {
    const notes = [2093, 1760, 1567]; // C7 -> A6 -> G6
    for (let i = 0; i < notes.length; i++) {
      const f = notes[i] * rand(0.98, 1.02);
      this.synthesizeBirdNote(at + i * 0.14, f, f * 0.92, 0.12, 0.032, true);
    }
  }

  /** Great Horned Forest Owl: Resonant Hollow Dual-Harmonic Hoot */
  private playTawnyOwl(at: number): void {
    const baseF = rand(240, 290);
    // Low, soft, mysterious: "hoo... hooo-hooo"
    this.synthesizeOwlHoot(at, baseF, 0.38, 0.045);
    this.synthesizeOwlHoot(at + 0.55, baseF * 1.12, 0.22, 0.04);
    this.synthesizeOwlHoot(at + 0.82, baseF * 0.95, 0.62, 0.048);
  }

  /** Nightingale Ethereal Night Trill */
  private playNightingaleTrill(at: number): void {
    const base = rand(1800, 2300);
    for (let i = 0; i < 4; i++) {
      this.synthesizeBirdNote(at + i * 0.07, base * (1 + (i % 2) * 0.15), base * 0.9, 0.055, 0.024, false);
    }
  }

  /** Helper: Synthesize single organic bird note with natural vibrato & envelope */
  private synthesizeBirdNote(
    at: number,
    f0: number,
    f1: number,
    dur: number,
    gainVal: number,
    useVibrato: boolean,
  ): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(100, f1), at + dur);

    // Warm vibrato
    if (useVibrato) {
      const vib = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vib.frequency.value = rand(18, 24); // 20 Hz warble
      vibGain.gain.value = 110;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      vib.start(at);
      vib.stop(at + dur + 0.02);
    }

    // Soft lowpass rounding (eliminates harsh digital sibilance)
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(4200, Math.max(f0, f1) * 1.25), at);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainVal, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  /** Helper: Synthesize hollow flute-like dove coo */
  private synthesizeDoveCoo(at: number, freq: number, dur: number, gainVal: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const bandpass = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.linearRampToValueAtTime(freq * 1.04, at + dur * 0.4);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, at + dur);

    // Hollow woodwind ocarina resonance
    bandpass.type = "bandpass";
    bandpass.frequency.value = freq;
    bandpass.Q.value = 3.6;

    // Smooth gentle volume swell
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainVal, at + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(dest);

    osc.start(at);
    osc.stop(at + dur + 0.04);
  }

  /** Helper: Synthesize deep resonant hollow owl hoot */
  private synthesizeOwlHoot(at: number, freq: number, dur: number, gainVal: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lowpass = this.ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(freq, at);
    osc1.frequency.exponentialRampToValueAtTime(freq * 0.88, at + dur);
    // Subtle second harmonic for rich body resonance
    osc2.frequency.setValueAtTime(freq * 2, at);
    osc2.frequency.exponentialRampToValueAtTime(freq * 2 * 0.88, at + dur);

    lowpass.type = "lowpass";
    lowpass.frequency.value = 520;

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.25;
    osc2.connect(subGain);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainVal, at + dur * 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc1.connect(lowpass);
    subGain.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(dest);

    osc1.start(at);
    osc2.start(at);
    osc1.stop(at + dur + 0.04);
    osc2.stop(at + dur + 0.04);
  }

  /* ------------------------------------------------------------------ */
  /* 4. Meditative Zen Pentatonic BGM & Singing Bowl Chimes             */
  /* ------------------------------------------------------------------ */

  /** Meditative generative BGM pad & occasional peaceful crystal chimes */
  updateMusic(dt: number, phase: number): void {
    if (!this.ctx || this.muted) return;

    // 1. Peaceful Crystalline Wind-Chime / Singing Bowl (every 7.5 to 11.5s)
    this.chimeTimer -= dt;
    if (this.chimeTimer <= 0) {
      this.chimeTimer = rand(7.5, 11.5);
      this.playPeacefulChime(phase);
    }

    // 2. Meditative Ambient Warmth Chords
    this.chordTimer -= dt;
    if (this.chordTimer > 0) return;
    this.chordTimer = rand(6.5, 9.5);

    const normPhase = ((phase % 4) + 4) % 4;
    const pIdx = Math.floor(normPhase);

    // Harmonious, soothing pentatonic scales:
    // Dawn: D Major (peaceful, awakening sunlight)
    // Midday: G Major (warm, lush forest glade)
    // Dusk: A Minor / D Dorian (golden hour reflection)
    // Night: D Minor / E Aeolian (starlight tranquility)
    const scales: number[][] = [
      [146.83, 220.0, 293.66, 369.99, 440.0, 587.33], // D Maj
      [196.0, 246.94, 293.66, 392.0, 493.88, 587.33], // G Maj
      [110.0, 164.81, 220.0, 261.63, 329.63, 440.0],  // A Min
      [146.83, 174.61, 220.0, 293.66, 349.23, 440.0], // D Min
    ];

    const scale = scales[pIdx % 4];
    const root = scale[0];
    const n1 = scale[1 + ((Math.random() * 2) | 0)];
    const n2 = scale[3 + ((Math.random() * 2) | 0)];
    const chordNotes = [root, n1, n2];
    if (Math.random() < 0.65) chordNotes.push(scale[scale.length - 1]);

    const startT = this.t + 0.04;
    const chordDur = rand(6.0, 8.2);
    for (let i = 0; i < chordNotes.length; i++) {
      const noteDelay = i * rand(0.08, 0.24);
      this.padTone(chordNotes[i], chordDur - noteDelay, startT + noteDelay, 0.028);
    }
  }

  /** Peaceful Singing Bowl / Bamboo Wind Chime ping with long decaying resonance */
  private playPeacefulChime(phase: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    const normPhase = ((phase % 4) + 4) % 4;
    const pIdx = Math.floor(normPhase);

    // Calming harmonic chime notes (A5, C6, D6, E6, G6)
    const chimePitches = [
      [880.0, 1174.66, 1318.51], // Dawn
      [784.0, 987.77, 1174.66],  // Midday
      [880.0, 1046.5, 1318.51],  // Dusk
      [587.33, 880.0, 1046.5],   // Night
    ];

    const pitchList = chimePitches[pIdx % 4];
    const freq = pitchList[Math.floor(rand(0, pitchList.length))];
    const at = this.t + 0.05;
    const dur = rand(2.2, 3.4);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * 1.8, at);

    // Instant soft acoustic bell strike, followed by serene long exponential decay
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.038, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** Warm dual-detuned velvety ambient meditation pad */
  private padTone(freq: number, dur: number, at: number, gainVal: number): void {
    const dest = this.musicGain || this.master;
    if (!this.ctx || !dest) return;

    // Dual slightly detuned sine waves for lush natural chorus
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(freq * 0.998, at);
    osc2.frequency.setValueAtTime(freq * 1.002, at);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(900, freq * 2.8), at);

    // Meditative slow attack (1.6s) and long peaceful release (3.5s)
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainVal, at + 1.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(at);
    osc2.start(at);
    osc1.stop(at + dur + 0.1);
    osc2.stop(at + dur + 0.1);
  }

  /* ------------------------------------------------------------------ */
  /* 5. Harmonious, Softer Gameplay Sound Effects                       */
  /* ------------------------------------------------------------------ */

  private tone(o: {
    f0: number;
    f1?: number;
    dur: number;
    type?: OscillatorType;
    g?: number;
    at?: number;
  }): void {
    const dest = this.sfxGain || this.master;
    if (!this.ctx || !dest) return;
    const t = o.at ?? this.t;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.g ?? 0.12, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(o: {
    dur: number;
    f0?: number;
    f1?: number;
    type?: BiquadFilterType;
    g?: number;
    at?: number;
    q?: number;
  }): void {
    const dest = this.sfxGain || this.master;
    if (!this.ctx || !dest || !this.noiseBuf) return;
    const t = o.at ?? this.t;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = o.type ?? "bandpass";
    filter.Q.value = o.q ?? 0.8;
    filter.frequency.setValueAtTime(o.f0 ?? 750, t);
    if (o.f1)
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.g ?? 0.16, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t);
    src.stop(t + o.dur + 0.05);
  }

  jump(): void {
    this.noise({ dur: 0.16, f0: 420, f1: 1200, g: 0.13, q: 1.0 });
  }

  dbl(): void {
    this.noise({ dur: 0.14, f0: 750, f1: 1900, g: 0.11, q: 1.1 });
    this.tone({ f0: 580, f1: 880, dur: 0.12, type: "sine", g: 0.055 });
  }

  land(): void {
    this.tone({ f0: 105, f1: 42, dur: 0.13, g: 0.32 });
    this.noise({ dur: 0.08, f0: 280, type: "lowpass", g: 0.13 });
  }

  slide(): void {
    this.noise({ dur: 0.22, f0: 620, f1: 240, type: "bandpass", g: 0.085 });
  }

  collect(): void {
    const t = this.t;
    this.tone({ f0: 1245, dur: 0.28, g: 0.09, at: t });
    this.tone({ f0: 1868, dur: 0.35, g: 0.065, at: t + 0.05 });
  }

  bloom(): void {
    const t = this.t;
    [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) =>
      this.tone({ f0: f, dur: 0.36, g: 0.06, at: t + i * 0.06, type: "triangle" }),
    );
  }

  nearMiss(): void {
    const t = this.t;
    this.tone({ f0: 987.77, dur: 0.16, g: 0.1, at: t, type: "triangle" });
    this.tone({ f0: 1318.51, dur: 0.22, g: 0.075, at: t + 0.05, type: "sine" });
  }

  death(): void {
    this.tone({ f0: 155, f1: 34, dur: 0.6, g: 0.42 });
    this.noise({ dur: 0.4, f0: 480, f1: 65, type: "lowpass", g: 0.2 });
  }

  ui(): void {
    this.tone({ f0: 740, dur: 0.08, g: 0.04, type: "sine" });
  }

  uiHover(): void {
    this.tone({ f0: 880, dur: 0.03, g: 0.018, type: "sine" });
  }

  uiClick(): void {
    this.tone({ f0: 640, f1: 960, dur: 0.06, g: 0.035, type: "triangle" });
  }

  newRecord(): void {
    const t = this.t;
    [587.33, 739.99, 880.0, 1174.66].forEach((f, i) => {
      this.tone({ f0: f, dur: 0.45, g: 0.07, at: t + i * 0.08, type: "triangle" });
    });
  }
}
