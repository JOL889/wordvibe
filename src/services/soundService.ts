import type { SoundMode } from '../game/settingsLogic';

class SoundService {
  private ctx: AudioContext | null = null;
  private soundMode: SoundMode = 'on';
  private victoryFanfareEnabled = true;
  private hapticsEnabled = true;

  private lastFeedbackAt = 0;

  public setSoundMode(mode: SoundMode): void {
    this.soundMode = mode;
  }

  public getSoundMode(): SoundMode {
    return this.soundMode;
  }

  public setEnabled(val: boolean): void {
    this.setSoundMode(val ? 'on' : 'off');
  }

  public isEnabled(): boolean {
    return this.soundMode === 'on';
  }

  public setVictoryFanfareEnabled(val: boolean): void {
    this.victoryFanfareEnabled = val;
  }

  public setHapticsEnabled(val: boolean): void {
    this.hapticsEnabled = val;
  }

  private getContext(): AudioContext | null {
    if (this.soundMode !== 'on' || typeof window === 'undefined') return null;
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
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  private markFeedback(): void {
    this.lastFeedbackAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  private shouldThrottleGlobalTap(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now - this.lastFeedbackAt < 65;
  }

  public playUiTap(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(540, 0.04, 'sine', 0.036);
      if (this.hapticsEnabled) {
        this.triggerHaptic(10);
      }
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(14);
    }
    // soundMode === 'off' -> silent & no vibration
  }

  public playKeyTap(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(460, 0.045, 'triangle', 0.04);
      if (this.hapticsEnabled) this.triggerHaptic(8);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(12);
    }
  }

  public playTapPop(): void {
    this.playUiTap();
  }

  public playBackspace(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(310, 0.05, 'triangle', 0.035);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(10);
    }
  }

  public playInvalidShake(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(170, 0.09, 'sawtooth', 0.04, 0);
      this.playTone(150, 0.11, 'sawtooth', 0.04, 0.09);
      if (this.hapticsEnabled) this.triggerHaptic([20, 25, 20]);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic([22, 25, 22]);
    }
  }

  public playTileFlip(stepIndex: number, isCorrect: boolean): void {
    if (this.soundMode !== 'on') return;
    const base = isCorrect ? 523.25 : 360;
    const freq = base + stepIndex * 28;
    this.playTone(freq, 0.075, 'sine', 0.045, stepIndex * 0.085);
  }

  public playHintChime(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(587.33, 0.12, 'sine', 0.05, 0);
      this.playTone(880, 0.18, 'sine', 0.055, 0.09);
      if (this.hapticsEnabled) this.triggerHaptic(14);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(16);
    }
  }

  public playFiftyFiftyWhoosh(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(620, 0.09, 'triangle', 0.045, 0);
      this.playTone(440, 0.12, 'sine', 0.045, 0.07);
      if (this.hapticsEnabled) this.triggerHaptic(12);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(14);
    }
  }

  public playWinFanfare(): void {
    if (this.soundMode === 'on') {
      if (!this.victoryFanfareEnabled) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        this.playTone(freq, 0.22, 'triangle', 0.055, i * 0.095);
      });
      if (this.hapticsEnabled) this.triggerHaptic([16, 30, 22]);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic([16, 30, 22]);
    }
  }

  public playLossTone(): void {
    if (this.soundMode === 'on') {
      this.playTone(311.13, 0.18, 'sine', 0.045, 0);
      this.playTone(261.63, 0.28, 'sine', 0.045, 0.16);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(24);
    }
  }

  public playTriviaCorrect(streakAfter: number): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      const step = Math.min(streakAfter, 6) * 24;
      this.playTone(523.25 + step, 0.11, 'sine', 0.055, 0);
      this.playTone(659.25 + step, 0.16, 'triangle', 0.055, 0.08);
      if (this.hapticsEnabled) this.triggerHaptic(18);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic(18);
    }
  }

  public playTriviaWrong(): void {
    this.markFeedback();
    if (this.soundMode === 'on') {
      this.playTone(220, 0.12, 'sawtooth', 0.035, 0);
      this.playTone(175, 0.18, 'sawtooth', 0.035, 0.11);
      if (this.hapticsEnabled) this.triggerHaptic([24, 30, 24]);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic([24, 30, 24]);
    }
  }

  public playAchievementChime(): void {
    if (this.soundMode === 'on') {
      if (!this.victoryFanfareEnabled) return;
      const notes = [587.33, 739.99, 880, 1174.66];
      notes.forEach((freq, i) => {
        this.playTone(freq, 0.18, 'sine', 0.05, i * 0.075);
      });
      if (this.hapticsEnabled) this.triggerHaptic([15, 25, 30]);
    } else if (this.soundMode === 'mute') {
      this.triggerHaptic([15, 25, 30]);
    }
  }

  public triggerHaptic(pattern: number | number[] = 15): void {
    if (this.soundMode === 'off') return;
    if (this.soundMode === 'on' && !this.hapticsEnabled) return;
    if (typeof navigator === 'undefined') return;
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptic feedback is optional across desktop browsers
    }
  }

  /**
   * Attaches global pointer delegation so tapping any interactive icon/button
   * produces SFX ('on'), vibration ('mute'), or total silence ('off').
   */
  public attachGlobalTapFeedback(): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return () => {};
    }

    const handlePointerDown = (ev: PointerEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, [role="button"], select, summary, label[for], [data-tap-sound]'
      ) as HTMLElement | null;
      if (!interactive) return;
      if ((interactive as HTMLButtonElement).disabled) return;
      if (this.shouldThrottleGlobalTap()) return;

      this.playUiTap();
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }
}

export const soundService = new SoundService();

