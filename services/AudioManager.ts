export class AudioManager {
    private audioCtx: AudioContext | null = null;
    
    // Engine Nodes
    private osc1: OscillatorNode | null = null;
    private osc2: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private masterGain: GainNode | null = null;

    // Tire Squeal Nodes
    private squealOsc: OscillatorNode | null = null;
    private squealGain: GainNode | null = null;

    private isInitialized: boolean = false;
    private isRunning: boolean = false;

    constructor() {
        // Lazy initialization
    }

    public init() {
        if (this.isInitialized) return;
        
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioCtx = new AudioContextClass();
            this.isInitialized = true;
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    public start() {
        if (!this.isInitialized || !this.audioCtx) this.init();
        if (!this.audioCtx) return;
        if (this.isRunning) return;

        // --- ENGINE SOUND ---
        this.osc1 = this.audioCtx.createOscillator();
        this.osc2 = this.audioCtx.createOscillator();
        this.gainNode = this.audioCtx.createGain();
        this.masterGain = this.audioCtx.createGain();

        this.osc1.type = 'sawtooth';
        this.osc1.frequency.value = 50;
        this.osc2.type = 'square';
        this.osc2.frequency.value = 100;

        this.osc1.connect(this.gainNode);
        this.osc2.connect(this.gainNode);
        this.gainNode.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);

        this.osc1.start();
        this.osc2.start();
        this.masterGain.gain.value = 0.1;

        // --- TIRE SQUEAL ---
        this.squealOsc = this.audioCtx.createOscillator();
        this.squealGain = this.audioCtx.createGain();
        
        // High pitch screech
        this.squealOsc.type = 'triangle'; 
        this.squealOsc.frequency.value = 800; 
        
        this.squealOsc.connect(this.squealGain);
        this.squealGain.connect(this.audioCtx.destination);
        
        this.squealOsc.start();
        this.squealGain.gain.value = 0; // Start silent

        this.isRunning = true;
    }

    public stop() {
        if (!this.isRunning) return;
        if (this.osc1) this.osc1.stop();
        if (this.osc2) this.osc2.stop();
        if (this.squealOsc) this.squealOsc.stop();
        this.isRunning = false;
    }

    public update(rpm: number, load: number, tireSlip: number = 0, speed: number = 0) {
        if (!this.isRunning || !this.audioCtx || !this.osc1 || !this.osc2 || !this.gainNode || !this.squealOsc || !this.squealGain) return;

        // Resume context
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // --- ENGINE UPDATE ---
        if (rpm < 50) {
             // Engine stalled or off
             this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
        } else {
             const baseFreq = 40 + (rpm / 20); 
             this.osc1.frequency.setTargetAtTime(baseFreq, this.audioCtx.currentTime, 0.1);
             this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, this.audioCtx.currentTime, 0.1);

             const volume = 0.05 + (rpm / 7000) * 0.1 + (load * 0.1);
             this.gainNode.gain.setTargetAtTime(volume, this.audioCtx.currentTime, 0.1);
        }

        // --- SQUEAL UPDATE ---
        // Play sound if slip > threshold and car is moving
        const slipThreshold = 0.2;
        if (tireSlip > slipThreshold && Math.abs(speed) > 5) {
            // Modulate pitch slightly for realism
            const wobble = Math.sin(this.audioCtx.currentTime * 20) * 50;
            this.squealOsc.frequency.setTargetAtTime(800 + wobble + (speed * 2), this.audioCtx.currentTime, 0.1);
            
            // Volume based on how much slip
            const squealVol = Math.min(0.3, (tireSlip - slipThreshold) * 0.5);
            this.squealGain.gain.setTargetAtTime(squealVol, this.audioCtx.currentTime, 0.05);
        } else {
            this.squealGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
        }
    }
}