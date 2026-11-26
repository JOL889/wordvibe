/**
 * 100% Offline Procedural Web Audio API Background Music Generator
 *
 * Synthesizes a warm, relaxing puzzle-game instrumental loop with:
 * 1) Soft low-pass filtered synth pads (warm Cmaj9 -> Am9 -> Fmaj9 -> G6/9 chords)
 * 2) Gentle marimba/kalimba-style plucked melody notes with subtle echo
 * 3) Subtle warm bass notes anchoring each bar
 *
 * Requires zero external MP3/audio assets or network requests.
 * Starts/resumes on the player's first interaction and automatically pauses
 * when backgrounded or when a rewarded ad is playing.
 */

const BAR_CHORDS: ReadonlyArray<{
  bass: number;
  pad: readonly [number, number, number];
  melodyPool: readonly number[];
}> = [
  // Bar 1: Cmaj9 (warm & open)
  {
    bass: 130.81, // C3
    pad: [261.63, 329.63, 392.0], // C4, E4, G4
    melodyPool: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33],
  },
  // Bar 2: Am9 (reflective & calm)
  {
    bass: 110.0, // A2
    pad: [220.0, 261.63, 329.63], // A3, C4, E4
    melodyPool: [493.88, 523.25, 659.25, 587.33, 523.25, 440.0],
  },
  // Bar 3: Fmaj9 (lifted warmth)
  {
    bass: 87.31, // F2
    pad: [220.0, 261.63, 349.23], // A3, C4, F4
    melodyPool: [440.0, 523.25, 659.25, 698.46, 659.25, 523.25],
  },
  // Bar 4: G6/9 (gentle turnaround)
  {
    bass: 98.0, // G2
    pad: [246.94, 293.66, 392.0], // B3, D4, G4
    melodyPool: [493.88, 587.33, 659.25, 783.99, 587.33, 493.88],
  },
];

// Gentle rhythmic step mask across an 8-eighth-note bar (keeps space to breathe)
const MELODY_STEP_PATTERN = [1, 0, 1, 1, 0, 1, 0, 1] as const;

class ProceduralMusicPlayer {
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
      filter.frequency.setValueAtTime(1650, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      const delay = ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.36, ctx.currentTime);

      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.22, ctx.currentTime);

      const delayWet = ctx.createGain();
      delayWet.gain.setValueAtTime(0.24, ctx.currentTime);

      // Dry path: filter -> master -> destination
      filter.connect(master);
      // Warm ambient echo path: filter -> delay -> delayWet -> master
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(delayWet);
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

  private shouldPlayNow(): boolean {
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
    this.masterGain.gain.linearRampToValueAtTime(0.78, now + 0.55);

    if (this.stepTimerId === null) {
      this.scheduleStep();
      // 460ms eighth-note groove (~65 BPM calm puzzle tempo)
      this.stepTimerId = window.setInterval(this.scheduleStep, 460);
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
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      } catch {
        // Ignore ramp errors on uninitialized context
      }
    }
  }

  private playPadVoice(freq: number, durationSec: number, gainPeak: number): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const padFilter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.003, now); // subtle warm chorus detune

    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(780, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.85);
    gain.gain.setValueAtTime(gainPeak * 0.85, now + Math.max(0.9, durationSec - 0.9));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc1.connect(padFilter);
    osc2.connect(padFilter);
    padFilter.connect(gain);
    gain.connect(this.busFilter);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec + 0.05);
    osc2.stop(now + durationSec + 0.05);
  }

  private playBassVoice(freq: number, durationSec: number): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.busFilter);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  private playKalimbaNote(freq: number): void {
    if (!this.ctx || !this.busFilter) return;
    const now = this.ctx.currentTime;

    // Fundamental warm tine
    const osc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.036, now + 0.012);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    // Subtle wooden percussive click harmonic (kalimba / marimba pluck)
    const overtone = this.ctx.createOscillator();
    const overGain = this.ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 4, now);

    overGain.gain.setValueAtTime(0.0001, now);
    overGain.gain.linearRampToValueAtTime(0.011, now + 0.005);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(bodyGain);
    overtone.connect(overGain);
    bodyGain.connect(this.busFilter);
    overGain.connect(this.busFilter);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 0.78);
    overtone.stop(now + 0.1);
  }

  private scheduleStep = (): void => {
    if (!this.shouldPlayNow()) {
      this.pauseLoopSmoothly();
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;

    const totalStepsPerBar = 8;
    const barIdx = Math.floor(this.stepIndex / totalStepsPerBar) % BAR_CHORDS.length;
    const stepInBar = this.stepIndex % totalStepsPerBar;
    const bar = BAR_CHORDS[barIdx];

    // On downbeat of each bar, sustain warm pad chord + bass root
    if (stepInBar === 0) {
      const barDurationSec = 3.55;
      bar.pad.forEach((padFreq, idx) => {
        this.playPadVoice(padFreq, barDurationSec, idx === 0 ? 0.022 : 0.016);
      });
      this.playBassVoice(bar.bass, 2.2);
    } else if (stepInBar === 4) {
      // Gentle fifth bass anchor mid-bar
      this.playBassVoice(bar.bass * 1.5, 1.5);
    }

    // Kalimba/marimba melody phrase
    if (MELODY_STEP_PATTERN[stepInBar] === 1) {
      const phraseVariation = Math.floor(this.stepIndex / (totalStepsPerBar * BAR_CHORDS.length));
      const poolIdx = (stepInBar + phraseVariation) % bar.melodyPool.length;
      const note = bar.melodyPool[poolIdx];
      this.playKalimbaNote(note);
    }

    this.stepIndex = (this.stepIndex + 1) % (totalStepsPerBar * BAR_CHORDS.length * 4);
  };

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.updatePlaybackState();
  }

  public isEnabled(): boolean {
    return this.enabled;
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
