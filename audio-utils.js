// Audio utility system for game sounds
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.masterVolume = 0.5;
        this.enabled = true;
        this.initializeAudioContext();
    }

    initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Unlock audio context on first user interaction
    unlockAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Generate tone using Web Audio API
    generateTone(frequency, duration, type = 'sine', volume = 1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        const currentTime = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
    }

    // Generate noise burst
    generateNoise(duration, volume = 1) {
        if (!this.enabled || !this.audioContext) return;

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);

        source.start();
    }

    // Play predefined sounds
    playPaddleHit() {
        this.generateTone(800, 0.1, 'square', 0.3);
    }

    playWallBounce() {
        this.generateTone(400, 0.15, 'triangle', 0.4);
    }

    playScore() {
        this.generateTone(600, 0.3, 'sine', 0.5);
        setTimeout(() => this.generateTone(800, 0.3, 'sine', 0.5), 150);
    }

    playShoot() {
        this.generateTone(1200, 0.08, 'sawtooth', 0.2);
    }

    playExplosion() {
        this.generateNoise(0.3, 0.4);
        this.generateTone(100, 0.2, 'square', 0.3);
    }

    playPowerUp() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.generateTone(400 + i * 200, 0.1, 'sine', 0.3);
            }, i * 50);
        }
    }

    playJump() {
        this.generateTone(300, 0.2, 'sine', 0.4);
        setTimeout(() => this.generateTone(500, 0.15, 'sine', 0.3), 100);
    }

    playGameOver() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.generateTone(400 - i * 100, 0.4, 'triangle', 0.4);
            }, i * 200);
        }
    }

    playHit() {
        this.generateTone(600, 0.2, 'square', 0.4);
    }

    playPitch() {
        this.generateTone(200, 0.3, 'sine', 0.3);
        setTimeout(() => this.generateTone(300, 0.2, 'sine', 0.2), 200);
    }

    playStrike() {
        this.generateTone(150, 0.4, 'square', 0.4);
    }

    playCollectible() {
        this.generateTone(800, 0.1, 'sine', 0.3);
        setTimeout(() => this.generateTone(1000, 0.1, 'sine', 0.3), 100);
    }

    playEnemyHit() {
        this.generateTone(200, 0.1, 'square', 0.3);
    }

    playPlayerDamage() {
        this.generateTone(100, 0.3, 'sawtooth', 0.4);
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Create global audio manager instance
window.audioManager = new AudioManager();

// Unlock audio on first interaction
document.addEventListener('click', () => window.audioManager.unlockAudio(), { once: true });
document.addEventListener('keydown', () => window.audioManager.unlockAudio(), { once: true });
document.addEventListener('touchstart', () => window.audioManager.unlockAudio(), { once: true });