/**
 * 100% Offline Procedural Web Audio API Background Music Generator
 *
 * Synthesizes an "Only Murders in the Building"-inspired cozy-mystery parlor
 * piano & chamber pizzicato waltz loop using 100% browser Web Audio API:
 * 1) Warm upright felt-piano arpeggios & witty minor-key lead motifs
 *    over a signature chromatic descending bassline (Am -> E7/G# -> C/G -> D7/F# -> Fmaj7 -> Dm6 -> Am/E -> E7)
 * 2) Plucked upright pizzicato bass/cello pulse in 6/8 parlor waltz feel
 * 3) Delicate chamber celesta accents on phrase turnarounds
 *
 * Requires zero external MP3/audio assets or network requests.
 * Starts/resumes on the player's first interaction and automatically pauses
 * when backgrounded or when a rewarded ad is playing.
 */

export interface ParlorBarSpec {
  readonly chordName: string;
  readonly bassRoot: number;
  readonly bassFifth: number;
  readonly chordNotes: readonly [number, number, number];
  /** 6-step eighth-note melody motif for 6/8 parlor waltz (null = rest) */
  readonly melodySteps: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  /** Optional celesta bell accent pitch on step 4 */
  readonly celestaAccent?: number;
}

/**
 * 8-bar cozy-mystery parlor piano progression in A minor (6/8 time),
 * featuring the signature descending chromatic bassline (A -> G# -> G -> F# -> F -> D -> E).
 */
export const OMITB_PARLOR_PIANO_BARS: readonly ParlorBarSpec[] = [
  // Bar 1: Am (witty opening theme)
  {
    chordName: 'Am',
    bassRoot: 110.0, // A2
    bassFifth: 164.81, // E3
    chordNotes: [220.0, 261.63, 329.63], // A3, C4, E4
    melodySteps: [659.25, null, 523.25, 493.88, 523.25, 659.25], // E5 - C5 B4 C5 E5
    celestaAccent: 880.0, // A5
  },
  // Bar 2: E7/G# (chromatic bass descent to G#)
  {
    chordName: 'E7/G#',
    bassRoot: 103.83, // G#2
    bassFifth: 164.81, // E3
    chordNotes: [207.65, 293.66, 329.63], // G#3, D4, E4
    melodySteps: [659.25, null, 587.33, 493.88, 587.33, 415.3], // E5 - D5 B4 D5 G#4
  },
  // Bar 3: C/G (warm parlor lift, bass descends to G)
  {
    chordName: 'C/G',
    bassRoot: 98.0, // G2
    bassFifth: 130.81, // C3
    chordNotes: [196.0, 261.63, 329.63], // G3, C4, E4
    melodySteps: [783.99, null, 659.25, 523.25, 659.25, 783.99], // G5 - E5 C5 E5 G5
    celestaAccent: 1046.5, // C6
  },
  // Bar 4: D7/F# (inquisitive quirk, bass descends to F#)
  {
    chordName: 'D7/F#',
    bassRoot: 92.5, // F#2
    bassFifth: 146.83, // D3
    chordNotes: [185.0, 261.63, 293.66], // F#3, C4, D4
    melodySteps: [587.33, null, 523.25, 440.0, 523.25, 739.99], // D5 - C5 A4 C5 F#5
  },
  // Bar 5: Fmaj7 (cozy reflection, bass lands on F)
  {
    chordName: 'Fmaj7',
    bassRoot: 87.31, // F2
    bassFifth: 130.81, // C3
    chordNotes: [220.0, 261.63, 329.63], // A3, C4, E4
    melodySteps: [698.46, null, 659.25, 523.25, 440.0, 523.25], // F5 - E5 C5 A4 C5
    celestaAccent: 880.0, // A5
  },
  // Bar 6: Dm6 (playful mystery turn)
  {
    chordName: 'Dm6',
    bassRoot: 146.83, // D3
    bassFifth: 220.0, // A3
    chordNotes: [174.61, 246.94, 293.66], // F3, B3, D4
    melodySteps: [698.46, null, 587.33, 493.88, 587.33, 698.46], // F5 - D5 B4 D5 F5
  },
  // Bar 7: Am/E (clever cadence preparation)
  {
    chordName: 'Am/E',
    bassRoot: 82.41, // E2
    bassFifth: 164.81, // E3
    chordNotes: [220.0, 261.63, 329.63], // A3, C4, E4
    melodySteps: [659.25, null, 523.25, 440.0, 329.63, 440.0], // E5 - C5 A4 E4 A4
  },
  // Bar 8: E7 (wry Upper West Side turnaround back to Am)
  {
    chordName: 'E7',
    bassRoot: 82.41, // E2
    bassFifth: 123.47, // B2
    chordNotes: [207.65, 246.94, 293.66], // G#3, B3, D4
    melodySteps: [493.88, null, 587.33, 659.25, 830.61, 659.25], // B4 - D5 E5 G#5 E5
    celestaAccent: 987.77, // B5
  },
];

export const OMITB_STEPS_PER_BAR = 6;
export const OMITB_STEP_INTERVAL_MS = 270; // ~111 eighth-note BPM cozy 6/8 waltz sway

export interface ScheduledParlorEvent {
  kind: 'bass' | 'piano_chord' | 'piano_melody' | 'celesta';
  freq: number;
  durationSec: number;
  velocity: number;
}

/**
 * Pure helper returning the musical voices triggered on a given 6/8 sequencer step.
 */
export function getParlorStepEvents(stepIndex: number): ScheduledParlorEvent[] {
  const totalCycleSteps = OMITB_PARLOR_PIANO_BARS.length * OMITB_STEPS_PER_BAR;
  const normalizedStep = ((Math.floor(stepIndex) % totalCycleSteps) + totalCycleSteps) % totalCycleSteps;
  const barIdx = Math.floor(normalizedStep / OMITB_STEPS_PER_BAR);
  const stepInBar = normalizedStep % OMITB_STEPS_PER_BAR;
  const phrasePass = Math.floor(stepIndex / totalCycleSteps) % 2;
  const bar = OMITB_PARLOR_PIANO_BARS[barIdx];
  const events: ScheduledParlorEvent[] = [];

  // Beat 1 & Beat 4: Upright pizzicato bass ("oom-pah-pah, oom-pah-pah")
  if (stepInBar === 0) {
    events.push({
      kind: 'bass',
      freq: bar.bassRoot,
      durationSec: 0.42,
      velocity: 0.72,
    });
  } else if (stepInBar === 3) {
    events.push({
      kind: 'bass',
      freq: bar.bassFifth,
      durationSec: 0.34,
      velocity: 0.56,
    });
  }

  // Left-hand parlor piano chord pulses on beats 2, 3, 5, 6
  if (stepInBar === 1 || stepInBar === 4) {
    events.push(
      { kind: 'piano_chord', freq: bar.chordNotes[0], durationSec: 0.32, velocity: 0.32 },
      { kind: 'piano_chord', freq: bar.chordNotes[1], durationSec: 0.32, velocity: 0.3 }
    );
  } else if (stepInBar === 2 || stepInBar === 5) {
    events.push(
      { kind: 'piano_chord', freq: bar.chordNotes[1], durationSec: 0.28, velocity: 0.26 },
      { kind: 'piano_chord', freq: bar.chordNotes[2], durationSec: 0.28, velocity: 0.28 }
    );
  }

  // Right-hand whimsical upright felt-piano melody
  const melodyFreq = bar.melodySteps[stepInBar];
  if (melodyFreq !== null) {
    const isDownbeat = stepInBar === 0 || stepInBar === 3;
    // Alternate octave gently on second phrase pass for bar 0 & 4 turnaround sparkle
    const octaveMultiplier = phrasePass === 1 && stepInBar === 5 && barIdx % 2 === 1 ? 0.5 : 1;
    events.push({
      kind: 'piano_melody',
      freq: melodyFreq * octaveMultiplier,
      durationSec: isDownbeat ? 0.65 : 0.44,
      velocity: isDownbeat ? 0.76 : 0.6,
    });
  }

  // Delicate celesta sparkle on alternating phrases
  if (stepInBar === 4 && bar.celestaAccent && (phrasePass === 1 || barIdx === 0 || barIdx === 7)) {
    events.push({
      kind: 'celesta',
      freq: bar.celestaAccent,
      durationSec: 0.55,
      velocity: 0.35,
    });
  }

  return events;
}

export class ProceduralMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private busFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private enabled = true;
  private pausedForAd = false;
  private pausedForBackground = false;
  private userInteracted = false;

  private stepTimerId: number | null = null;
  private stepIndex = 0;

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, ctx.currentTime);
      filter.Q.setValueAtTime(0.65, ctx.currentTime);

      // Cozy apartment parlor early-reflection reverb tail
      const delay = ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.24, ctx.currentTime);

      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.16, ctx.currentTime);

      const wetFilter = ctx.createBiquadFilter();
      wetFilter.type = 'lowpass';
      wetFilter.frequency.setValueAtTime(1400, ctx.currentTime);

      const delayWet = ctx.createGain();
      delayWet.gain.setValueAtTime(0.18, ctx.currentTime);

      // Dry path
      filter.connect(master);
      // Warm parlor room reflection path
      filter.connect(delay);
      delay.connect(wetFilter);
      wetFilter.connect(feedback);
      feedback.connect(delay);
      wetFilter.connect(delayWet);
      delayWet.connect(master);

      master.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = master;
      this.busFilter = filter;
      this.delayNode = delay;
      this.delayFeedback = feedback;
    }
    return this.ctx;
  }

  public shouldPlayNow(): boolean {
    if (!this.enabled || this.pausedForAd || this.pausedForBackground || !this.userInteracted) {
      return false;
    }
    if (typeof document !== 'undefined' && document.hidden) {
      return false;
    }
    return true;
  }

  private updatePlaybackState(): void {
    if (typeof window === 'undefined') return;
    if (!this.shouldPlayNow()) {
      this.pauseLoopSmoothly();
      return;
    }

    const ctx = this.ensureGraph();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (this.shouldPlayNow()) {
            this.beginScheduler();
          }
        })
        .catch(() => {});
    } else if (ctx.state === 'running') {
      this.beginScheduler();
    }
  }

  private beginScheduler(): void {
    if (!this.ctx || !this.masterGain || !this.shouldPlayNow()) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.linearRampToValueAtTime(0.76, now + 0.4);

    if (this.stepTimerId === null) {
      this.scheduleStep();
      this.stepTimerId = window.setInterval(this.scheduleStep, OMITB_STEP_INTERVAL_MS);
    }
  }

  private pauseLoopSmoothly(): void {
    if (typeof window !== 'undefined' && this.stepTimerId !== null) {
      window.clearInterval(this.stepTimerId);
      this.stepTimerId = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      try {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.18);
      } catch {
        // Ignore ramp errors on uninitialized context
      }
    }
  }

  /**
   * Warm upright felt-piano synthesis:
   * - Fundamental triangle/sine blend for woody sustain
   * - Stretched 2nd & 3rd piano harmonics for realistic string shimmer
   * - Dynamic lowpass filter envelope simulating felt hammer strike -> warm decay
   */
  private playFeltPianoVoice(
    freq: number,
    durationSec: number,
    velocity: number,
    isMelody: boolean
  ): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    const oscFundamental = this.ctx.createOscillator();
    const oscSecond = this.ctx.createOscillator();
    const oscThird = this.ctx.createOscillator();

    oscFundamental.type = 'triangle';
    oscFundamental.frequency.setValueAtTime(freq, now);

    // Slight piano string inharmonicity (1.0012 stretch on 2nd harmonic)
    oscSecond.type = 'sine';
    oscSecond.frequency.setValueAtTime(freq * 2.0012, now);

    oscThird.type = 'sine';
    oscThird.frequency.setValueAtTime(freq * 3.003, now);

    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    const g3 = this.ctx.createGain();

    const baseAmp = (isMelody ? 0.052 : 0.026) * velocity;
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.linearRampToValueAtTime(baseAmp, now + 0.009);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.linearRampToValueAtTime(baseAmp * 0.42, now + 0.006);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.65);

    g3.gain.setValueAtTime(0.0001, now);
    g3.gain.linearRampToValueAtTime(baseAmp * 0.18, now + 0.004);
    g3.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.18, durationSec * 0.35));

    // Per-note felt hammer tone filter
    const noteFilter = this.ctx.createBiquadFilter();
    noteFilter.type = 'lowpass';
    const brightPeak = isMelody ? Math.min(3400, freq * 4.5) : Math.min(1850, freq * 3.6);
    noteFilter.frequency.setValueAtTime(brightPeak, now);
    noteFilter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.4), now + durationSec * 0.7);
    noteFilter.Q.setValueAtTime(0.8, now);

    oscFundamental.connect(g1);
    oscSecond.connect(g2);
    oscThird.connect(g3);
    g1.connect(noteFilter);
    g2.connect(noteFilter);
    g3.connect(noteFilter);
    noteFilter.connect(this.busFilter);

    oscFundamental.start(now);
    oscSecond.start(now);
    oscThird.start(now);

    const stopAt = now + durationSec + 0.06;
    oscFundamental.stop(stopAt);
    oscSecond.stop(stopAt);
    oscThird.stop(stopAt);
  }

  /**
   * Plucked upright pizzicato bass/cello voice characteristic of cozy-mystery parlor cues.
   */
  private playPizzicatoBass(freq: number, durationSec: number, velocity: number): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    const oscBody = this.ctx.createOscillator();
    const oscPluck = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    oscBody.type = 'triangle';
    oscBody.frequency.setValueAtTime(freq, now);

    oscPluck.type = 'sawtooth';
    oscPluck.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(860, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + 0.14);
    filter.Q.setValueAtTime(1.4, now);

    const peak = 0.072 * velocity;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscBody.connect(filter);
    oscPluck.connect(filter);
    filter.connect(gain);
    gain.connect(this.busFilter);

    oscBody.start(now);
    oscPluck.start(now);
    oscBody.stop(now + durationSec + 0.04);
    oscPluck.stop(now + durationSec + 0.04);
  }

  /**
   * Delicate chamber celesta bell accent on phrase peaks.
   */
  private playChamberCelesta(freq: number, durationSec: number, velocity: number): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const overGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2, now);

    const peak = 0.016 * velocity;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    overGain.gain.setValueAtTime(0.0001, now);
    overGain.gain.linearRampToValueAtTime(peak * 0.35, now + 0.004);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.4);

    osc.connect(gain);
    overtone.connect(overGain);
    gain.connect(this.busFilter);
    overGain.connect(this.busFilter);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + durationSec + 0.04);
    overtone.stop(now + durationSec + 0.04);
  }

  private scheduleStep = (): void => {
    if (!this.shouldPlayNow()) {
      this.pauseLoopSmoothly();
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;

    const events = getParlorStepEvents(this.stepIndex);
    for (const ev of events) {
      if (ev.kind === 'bass') {
        this.playPizzicatoBass(ev.freq, ev.durationSec, ev.velocity);
      } else if (ev.kind === 'piano_chord') {
        this.playFeltPianoVoice(ev.freq, ev.durationSec, ev.velocity, false);
      } else if (ev.kind === 'piano_melody') {
        this.playFeltPianoVoice(ev.freq, ev.durationSec, ev.velocity, true);
      } else if (ev.kind === 'celesta') {
        this.playChamberCelesta(ev.freq, ev.durationSec, ev.velocity);
      }
    }

    const totalCycleSteps = OMITB_PARLOR_PIANO_BARS.length * OMITB_STEPS_PER_BAR * 2;
    this.stepIndex = (this.stepIndex + 1) % totalCycleSteps;
  };

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.updatePlaybackState();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isPausedForAd(): boolean {
    return this.pausedForAd;
  }

  public isPausedForBackground(): boolean {
    return this.pausedForBackground;
  }

  public hasUserInteracted(): boolean {
    return this.userInteracted;
  }

  public setPausedForAd(paused: boolean): void {
    this.pausedForAd = paused;
    this.updatePlaybackState();
  }

  public setPausedForBackground(paused: boolean): void {
    this.pausedForBackground = paused;
    this.updatePlaybackState();
  }

  public isCurrentlyPlaying(): boolean {
    return this.shouldPlayNow() && this.stepTimerId !== null && this.ctx?.state === 'running';
  }

  public unlockOnUserInteraction(): void {
    this.userInteracted = true;
    this.updatePlaybackState();
  }

  /**
   * Attaches global first-interaction + visibility lifecycle listeners so
   * procedural background music starts on the player's first interaction
   * and pauses cleanly when the app goes into the background.
   */
  public attachLifecycleListeners(): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {};
    }

    const handleFirstInteraction = () => {
      this.unlockOnUserInteraction();
    };

    const handleVisibility = () => {
      this.setPausedForBackground(document.hidden);
    };

    const handlePageHide = () => {
      this.setPausedForBackground(true);
    };

    const handlePageShow = () => {
      this.setPausedForBackground(document.hidden);
    };

    document.addEventListener('pointerdown', handleFirstInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', handleFirstInteraction, { capture: true, passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('pointerdown', handleFirstInteraction, { capture: true });
      document.removeEventListener('keydown', handleFirstInteraction, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      this.pauseLoopSmoothly();
    };
  }
}

export const musicPlayer = new ProceduralMusicPlayer();
