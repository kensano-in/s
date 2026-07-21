export class CallSounds {
  private static audioCtx: AudioContext | null = null;
  private static dialingInterval: ReturnType<typeof setInterval> | null = null;
  private static ringingInterval: ReturnType<typeof setInterval> | null = null;
  private static prewarmInstalled = false;

  /**
   * Pre-warm the AudioContext on first user gesture (click / touch / key).
   * Call this once at app boot so the context is ready when calls arrive.
   */
  static prewarm() {
    if (typeof window === 'undefined' || this.prewarmInstalled) return;
    this.prewarmInstalled = true;

    const warmUp = () => {
      try {
        if (!this.audioCtx) {
          this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
          void this.audioCtx.resume();
        }
      } catch { /* ignore */ }
    };

    window.addEventListener('click', warmUp, { once: true, passive: true });
    window.addEventListener('touchend', warmUp, { once: true, passive: true });
    window.addEventListener('keydown', warmUp, { once: true, passive: true });
  }

  private static async getContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Dialing tone: US style (440Hz + 480Hz) 2s on, 4s off
  static async startDialing() {
    this.stopDialing();
    this.stopRinging();
    const ctx = await this.getContext();
    if (!ctx) return;

    const playTone = () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.9);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 2.0);
      osc2.stop(ctx.currentTime + 2.0);
    };

    playTone();
    this.dialingInterval = setInterval(playTone, 4000);
  }

  static stopDialing() {
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = null;
    }
  }

  // Ringing: Melodic loop
  static async startRinging() {
    this.stopRinging();
    this.stopDialing();
    const ctx = await this.getContext();
    if (!ctx) return;

    const playChime = () => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.6);
      });
    };

    playChime();
    this.ringingInterval = setInterval(playChime, 3000);
  }

  static stopRinging() {
    if (this.ringingInterval) {
      clearInterval(this.ringingInterval);
      this.ringingInterval = null;
    }
  }

  // Connect: Rising beep
  static async playConnect() {
    this.stopDialing();
    this.stopRinging();
    const ctx = await this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 880.00]; // E5 to A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.25);
    });
  }

  // Disconnect: Falling beep
  static async playDisconnect() {
    this.stopDialing();
    this.stopRinging();
    const ctx = await this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 440.00]; // D5 to A4
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }
}
