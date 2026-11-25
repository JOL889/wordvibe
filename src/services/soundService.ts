class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private victoryFanfareEnabled = true;
  private hapticsEnabled = true;

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVictoryFanfareEnabled(val: boolean): void {
    this.victoryFanfareEnabled = val;
  }

  public setHapticsEnabled(val: boolean): void {
    this.hapticsEnabled = val;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.06,
    delaySec = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public playKeyTap(): void {
    this.playTone(460, 0.045, 'triangle', 0.04);
    this.triggerHaptic(8);
  }

  public playTapPop(): void {
    this.playTone(540, 0.04, 'sine', 0.032);
    this.triggerHaptic(10);
  }

  public playBackspace(): void {
    this.playTone(310, 0.05, 'triangle', 0.035);
  }

  public playInvalidShake(): void {
    this.playTone(170, 0.09, 'sawtooth', 0.04, 0);
    this.playTone(150, 0.11, 'sawtooth', 0.04, 0.09);
    this.triggerHaptic([20, 25, 20]);
  }

  public playTileFlip(stepIndex: number, isCorrect: boolean): void {
    const base = isCorrect ? 523.25 : 360;
    const freq = base + stepIndex * 28;
    this.playTone(freq, 0.075, 'sine', 0.045, stepIndex * 0.085);
  }

  public playHintChime(): void {
    this.playTone(587.33, 0.12, 'sine', 0.05, 0);
    this.playTone(880, 0.18, 'sine', 0.055, 0.09);
    this.triggerHaptic(14);
  }

  public playFiftyFiftyWhoosh(): void {
    this.playTone(620, 0.09, 'triangle', 0.045, 0);
    this.playTone(440, 0.12, 'sine', 0.045, 0.07);
    this.triggerHaptic(12);
  }

  public playWinFanfare(): void {
    if (!this.victoryFanfareEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.22, 'triangle', 0.055, i * 0.095);
    });
    this.triggerHaptic([16, 30, 22]);
  }

  public playLossTone(): void {
    this.playTone(311.13, 0.18, 'sine', 0.045, 0);
    this.playTone(261.63, 0.28, 'sine', 0.045, 0.16);
  }

  public playTriviaCorrect(streakAfter: number): void {
    const step = Math.min(streakAfter, 6) * 24;
    this.playTone(523.25 + step, 0.11, 'sine', 0.055, 0);
    this.playTone(659.25 + step, 0.16, 'triangle', 0.055, 0.08);
    this.triggerHaptic(18);
  }

  public playTriviaWrong(): void {
    this.playTone(220, 0.12, 'sawtooth', 0.035, 0);
    this.playTone(175, 0.18, 'sawtooth', 0.035, 0.11);
    this.triggerHaptic([24, 30, 24]);
  }

  public playAchievementChime(): void {
    if (!this.victoryFanfareEnabled) return;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, i) => {
      this.playTone(freq, 0.18, 'sine', 0.05, i * 0.075);
    });
    this.triggerHaptic([15, 25, 30]);
  }

  public triggerHaptic(pattern: number | number[] = 15): void {
    if (!this.hapticsEnabled || typeof navigator === 'undefined') return;
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptic feedback is optional across desktop browsers
    }
  }
}

export const soundService = new SoundService();

