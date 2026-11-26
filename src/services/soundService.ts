import type { SoundMode } from '../game/settingsLogic';

const AMBIENT_MELODY_NOTES = [
  261.63, // C4
  329.63, // E4
  392.0, // G4
  440.0, // A4
  392.0, // G4
  329.63, // E4
  293.66, // D4
  349.23, // F4
  440.0, // A4
  523.25, // C5
  440.0, // A4
  392.0, // G4
];

class SoundService {
  private ctx: AudioContext | null = null;
  private soundMode: SoundMode = 'on';
  private bgMusicEnabled = true;
  private victoryFanfareEnabled = true;
  private hapticsEnabled = true;

  private musicTimerId: number | null = null;
  private musicStep = 0;
  private lastFeedbackAt = 0;

  public setSoundMode(mode: SoundMode): void {
    this.soundMode = mode;
    if (mode !== 'on') {
      this.stopBackgroundLoop();
    } else if (this.bgMusicEnabled && this.ctx && this.ctx.state === 'running') {
      this.startBackgroundLoop();
    }
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

  public setBgMusicEnabled(val: boolean): void {
    this.bgMusicEnabled = val;
    if (!val || this.soundMode !== 'on') {
      this.stopBackgroundLoop();
    } else if (this.ctx && this.ctx.state === 'running') {
      this.startBackgroundLoop();
    }
  }

  public isBgMusicEnabled(): boolean {
    return this.bgMusicEnabled;
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
      this.ctx
        .resume()
        .then(() => {
          if (this.soundMode === 'on' && this.bgMusicEnabled) {
            this.startBackgroundLoop();
          }
        })
        .catch(() => {});
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

  private scheduleMusicBeat = (): void => {
    if (this.soundMode !== 'on' || !this.bgMusicEnabled) {
      this.stopBackgroundLoop();
      return;
    }
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    const note = AMBIENT_MELODY_NOTES[this.musicStep % AMBIENT_MELODY_NOTES.length];
    const bass = note * 0.5;
    this.playTone(note, 0.52, 'sine', 0.018, 0);
    if (this.musicStep % 3 === 0) {
      this.playTone(bass, 0.95, 'triangle', 0.014, 0.02);
    }
    this.musicStep = (this.musicStep + 1) % AMBIENT_MELODY_NOTES.length;
  };

  public startBackgroundLoop(): void {
    if (typeof window === 'undefined') return;
    if (this.soundMode !== 'on' || !this.bgMusicEnabled) return;
    if (this.musicTimerId !== null) return;

    const ctx = this.getContext();
    if (!ctx) return;

    // Schedule gentle continuous loop repeating every 680ms
    this.scheduleMusicBeat();
    this.musicTimerId = window.setInterval(this.scheduleMusicBeat, 680);
  }

  public stopBackgroundLoop(): void {
    if (typeof window === 'undefined') return;
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
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
      if (this.bgMusicEnabled) {
        this.startBackgroundLoop();
      }
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
      if (this.bgMusicEnabled) this.startBackgroundLoop();
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
   * Attaches global pointer/visibility delegation so tapping any interactive icon/button
   * produces sound ('on'), vibration ('mute'), or total silence ('off'), and music pauses when backgrounded.
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

    const handleVisibility = () => {
      if (document.hidden) {
        this.stopBackgroundLoop();
      } else if (this.soundMode === 'on' && this.bgMusicEnabled && this.ctx?.state === 'running') {
        this.startBackgroundLoop();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
      this.stopBackgroundLoop();
    };
  }
}

export const soundService = new SoundService();

