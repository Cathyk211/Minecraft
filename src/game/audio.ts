class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.5;
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sound: number, music: number) {
    this.soundVolume = Math.max(0, Math.min(1, sound));
    this.musicVolume = Math.max(0, Math.min(1, music));
  }

  public playBlockBreak(type: string = 'dirt') {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noise = this.createNoiseBuffer();

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    if (type === 'stone' || type === 'ore') {
      filter.type = 'highpass';
      filter.frequency.value = 800;
    } else if (type === 'wood') {
      filter.type = 'bandpass';
      filter.frequency.value = 400;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 600;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.15);
  }

  public playBlockPlace() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(0.4 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPlayerHurt() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.5 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playPlayerDeath() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    gain.gain.setValueAtTime(0.7 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  public playJump() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);

    gain.gain.setValueAtTime(0.2 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playExplosion() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const noise = this.createNoiseBuffer(1.0);
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 1.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 1.0);
  }

  public playTNTFuse() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3000, now);

    gain.gain.setValueAtTime(0.15 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playEat() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(200 + Math.random() * 150, t);

      gain.gain.setValueAtTime(0.15 * this.soundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  public playPickup() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(900, now + 0.05);

    gain.gain.setValueAtTime(0.2 * this.soundVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playLevelUp() {
    this.init();
    if (!this.ctx || this.soundVolume <= 0) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3 * this.soundVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // Calm C418 ambient music synthesizer chords generator
  public startAmbientMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.playAmbientChordLoop();
  }

  private playAmbientChordLoop = () => {
    if (!this.isMusicPlaying) return;
    this.init();

    if (this.ctx && this.musicVolume > 0) {
      // Gentle calm C major / F major / G major pentatonic ambient chords
      const chordProgressions = [
        [261.63, 329.63, 392.0, 523.25], // C major
        [220.00, 261.63, 329.63, 440.00], // A minor
        [174.61, 220.00, 261.63, 349.23], // F major
        [196.00, 246.94, 293.66, 392.00]  // G major
      ];

      const chord = chordProgressions[Math.floor(Math.random() * chordProgressions.length)];
      const now = this.ctx.currentTime;

      chord.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);

        gain.gain.setValueAtTime(0.01, now + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.05 * this.musicVolume, now + i * 0.2 + 2.0);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 7.0);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 7.5);
      });
    }

    // Schedule next chord progression in 15-25 seconds
    const delay = 15000 + Math.random() * 10000;
    this.musicTimer = window.setTimeout(this.playAmbientChordLoop, delay);
  };

  public stopAmbientMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private createNoiseBuffer(duration: number = 0.2): AudioBuffer {
    const size = (this.ctx ? this.ctx.sampleRate : 44100) * duration;
    const buffer = this.ctx!.createBuffer(1, size, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export const soundEngine = new SoundEngine();
