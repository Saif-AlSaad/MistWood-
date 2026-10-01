/* Procedural WebAudio engine — wind, birdsong, owls, and all SFX synthesized live */

import { rand } from "./types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private muted = false;
  private chirpTimer = 5;

  /** must be called from a user gesture at least once */
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
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    // shared noise buffer
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.startWind();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(
        m ? 0 : 0.9,
        this.ctx.currentTime + 0.2,
      );
    }
  }

  private get t(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(o: {
    f0: number;
    f1?: number;
    dur: number;
    type?: OscillatorType;
    g?: number;
    at?: number;
  }): void {
    if (!this.ctx || !this.master) return;
    const t = o.at ?? this.t;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.g ?? 0.15, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(gain);
    gain.connect(this.master);
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
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = o.at ?? this.t;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = o.type ?? "bandpass";
    filter.Q.value = o.q ?? 0.8;
    filter.frequency.setValueAtTime(o.f0 ?? 800, t);
    if (o.f1)
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.g ?? 0.2, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + o.dur + 0.05);
  }

  private startWind(): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.Q.value = 0.45;
    this.windFilter.frequency.value = 420;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.05;
    src.connect(this.windFilter);
    this.windFilter.connect(windGain);
    windGain.connect(this.master);
    src.start();

    // slow gusts
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);
    lfo.start();

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.045;
    const lfo2Gain = this.ctx.createGain();
    lfo2Gain.gain.value = 0.022;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(windGain.gain);
    lfo2.start();
  }

  /** ambient wildlife — call every frame */
  maybeChirp(dt: number, night: number): void {
    if (!this.ctx || this.muted) return;
    this.chirpTimer -= dt;
    if (this.chirpTimer > 0) return;
    this.chirpTimer = rand(5, 12);
    const t = this.t + 0.05;
    if (night > 0.5) {
      // owl — two soft low hoots
      this.tone({ f0: 349, f1: 300, dur: 0.34, g: 0.05, at: t });
      this.tone({ f0: 311, f1: 262, dur: 0.55, g: 0.045, at: t + 0.45 });
    } else {
      // bird — quick descending chirps
      const base = rand(1900, 2700);
      const n = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) {
        this.tone({
          f0: base * rand(0.95, 1.1),
          f1: base * rand(0.7, 0.85),
          dur: 0.09,
          g: 0.028,
          at: t + i * rand(0.11, 0.16),
        });
      }
    }
  }

  private chordTimer = 1.2;

  /** generative pentatonic ambient chord ambiance */
  updateMusic(dt: number, phase: number): void {
    if (!this.ctx || this.muted) return;
    this.chordTimer -= dt;
    if (this.chordTimer > 0) return;
    this.chordTimer = rand(6.5, 9.5);

    const normPhase = ((phase % 4) + 4) % 4;
    const pIdx = Math.floor(normPhase);

    // Pentatonic scales for Dawn, Midday, Dusk, Night
    const scales: number[][] = [
      [146.83, 220.0, 293.66, 369.99, 440.0, 587.33], // Dawn (D maj)
      [196.0, 246.94, 293.66, 392.0, 493.88, 587.33], // Midday (G maj)
      [110.0, 164.81, 220.0, 261.63, 329.63, 440.0],  // Dusk (A min)
      [146.83, 174.61, 220.0, 293.66, 349.23, 440.0], // Night (D min)
    ];

    const scale = scales[pIdx % 4];
    const root = scale[0];
    const n1 = scale[1 + ((Math.random() * 2) | 0)];
    const n2 = scale[3 + ((Math.random() * 2) | 0)];
    const chordNotes = [root, n1, n2];
    if (Math.random() < 0.6) chordNotes.push(scale[scale.length - 1]);

    const startT = this.t + 0.05;
    const chordDur = rand(5.5, 7.5);
    for (let i = 0; i < chordNotes.length; i++) {
      const noteDelay = i * rand(0.08, 0.22);
      this.padTone(chordNotes[i], chordDur - noteDelay, startT + noteDelay, 0.032);
    }
  }

  private padTone(freq: number, dur: number, at: number, gainVal: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(1600, freq * 3.4), at);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainVal, at + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(at);
    osc.stop(at + dur + 0.1);
  }

  jump(): void {
    this.noise({ dur: 0.17, f0: 480, f1: 1500, g: 0.16, q: 1.2 });
  }

  dbl(): void {
    this.noise({ dur: 0.15, f0: 900, f1: 2400, g: 0.13, q: 1.4 });
    this.tone({ f0: 620, f1: 980, dur: 0.13, type: "triangle", g: 0.07 });
  }

  land(): void {
    this.tone({ f0: 115, f1: 46, dur: 0.14, g: 0.42 });
    this.noise({ dur: 0.09, f0: 320, type: "lowpass", g: 0.16 });
  }

  slide(): void {
    this.noise({ dur: 0.22, f0: 700, f1: 260, type: "bandpass", g: 0.1 });
  }

  collect(): void {
    const t = this.t;
    this.tone({ f0: 1245, dur: 0.3, g: 0.11, at: t });
    this.tone({ f0: 1868, dur: 0.38, g: 0.08, at: t + 0.06 });
  }

  bloom(): void {
    const t = this.t;
    [523, 784, 1047, 1568].forEach((f, i) =>
      this.tone({ f0: f, dur: 0.34, g: 0.07, at: t + i * 0.07, type: "triangle" }),
    );
  }

  nearMiss(): void {
    const t = this.t;
    this.tone({ f0: 987, dur: 0.16, g: 0.12, at: t, type: "triangle" });
    this.tone({ f0: 1318, dur: 0.22, g: 0.09, at: t + 0.05, type: "sine" });
  }

  death(): void {
    this.tone({ f0: 165, f1: 36, dur: 0.65, g: 0.55 });
    this.noise({ dur: 0.45, f0: 520, f1: 70, type: "lowpass", g: 0.26 });
  }

  ui(): void {
    this.tone({ f0: 740, dur: 0.09, g: 0.05, type: "triangle" });
  }
}
