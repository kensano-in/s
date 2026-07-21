'use client';

export type SoundCategory =
  | 'silent'
  | 'default'
  | 'minimal'
  | 'soft'
  | 'glass'
  | 'digital'
  | 'modern'
  | 'premium'
  | 'bell'
  | 'nature'
  | 'sci-fi'
  | 'gaming'
  | 'retro'
  | 'crystal'
  | 'mechanical'
  | 'cosmic'
  | 'chime'
  | 'glass-ping'
  | 'synth-rise'
  | 'echo-bell';

let currentAudioContext: AudioContext | null = null;
let currentSourceNodes: any[] = [];

export function stopAllSounds() {
  currentSourceNodes.forEach(node => {
    try {
      node.stop();
    } catch (_) {}
  });
  currentSourceNodes = [];
}

export function playSound(category: SoundCategory) {
  stopAllSounds();

  if (category === 'silent') return;

  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!currentAudioContext || currentAudioContext.state === 'closed') {
      currentAudioContext = new AudioContextClass();
    }
    const ctx = currentAudioContext;

    const play = () => {
      const startTime = ctx.currentTime + 0.02;
      const nodesToClean: any[] = [];

      const createGain = (duration: number, startVal = 0.1, endVal = 0.001) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(startVal, startTime);
        gainNode.gain.exponentialRampToValueAtTime(endVal, startTime + duration);
        gainNode.connect(ctx.destination);
        return gainNode;
      };

      switch (category) {
        case 'default': {
          // Double chime chord with delay and echoes
          const notes = [
            { time: 0, freqs: [880, 1100], gainVal: 0.18 },
            { time: 0.18, freqs: [1320, 1650], gainVal: 0.14 }
          ];
          notes.forEach(note => {
            note.freqs.forEach((f, idx) => {
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              const t = startTime + note.time;
              
              gainNode.gain.setValueAtTime(0, t);
              gainNode.gain.linearRampToValueAtTime(note.gainVal / (idx + 1), t + 0.05);
              gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
              gainNode.connect(ctx.destination);
              
              osc.type = 'sine';
              osc.frequency.setValueAtTime(f, t);
              osc.connect(gainNode);
              osc.start(t);
              osc.stop(t + 2.1);
              nodesToClean.push(osc);
            });
          });
          break;
        }
        case 'minimal': {
          // Pure high chime with sub-body and long decay
          const freqs = [1000, 500];
          const gains = [0.22, 0.08];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = createGain(2.2, gains[i]);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, startTime);
            osc.connect(gain);
            osc.start(startTime);
            osc.stop(startTime + 2.3);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'soft': {
          // Major 7th Chord with slow attack and 2.5s tail
          const chord = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
          chord.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.08, startTime + 0.15); // slow attack
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.4);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, startTime);
            osc.connect(gain);
            osc.start(startTime);
            osc.stop(startTime + 2.5);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'glass': {
          // Resonant Crystal Bowls with 2.4s decay
          const freqs = [1200, 1600, 2000];
          const gains = [0.15, 0.10, 0.05];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gainNode = createGain(2.4, gains[i]);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, startTime);
            // Slight detune for chorus/organic vibration
            osc.detune.setValueAtTime(i * 4, startTime);
            osc.connect(gainNode);
            osc.start(startTime);
            osc.stop(startTime + 2.5);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'digital': {
          // Premium Tech Arpeggio (C6 -> E6 -> G6 -> C7)
          const notes = [1046.50, 1318.51, 1567.98, 2093.00];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const st = startTime + idx * 0.08;
            
            gainNode.gain.setValueAtTime(0, st);
            gainNode.gain.linearRampToValueAtTime(0.12, st + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, st + 2.0);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, st);
            osc.connect(gainNode);
            osc.start(st);
            osc.stop(st + 2.2);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'modern': {
          // Uplifting Sweep with delay loop
          const osc = ctx.createOscillator();
          const delay = ctx.createDelay();
          const feedback = ctx.createGain();
          const gainNode = createGain(2.5, 0.18);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, startTime);
          osc.frequency.exponentialRampToValueAtTime(1200, startTime + 0.25);

          delay.delayTime.setValueAtTime(0.2, startTime);
          feedback.gain.setValueAtTime(0.5, startTime);

          osc.connect(gainNode);
          gainNode.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 2.5);
          nodesToClean.push(osc);
          break;
        }
        case 'premium': {
          // Royal Symphony Chords (C5, G5, C6, E6) layered arpeggio
          const chord = [523.25, 783.99, 1046.50, 1318.51];
          chord.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const st = startTime + i * 0.1;
            gainNode.gain.setValueAtTime(0, st);
            gainNode.gain.linearRampToValueAtTime(0.12, st + 0.08);
            gainNode.gain.exponentialRampToValueAtTime(0.001, st + 2.5);
            gainNode.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, st);
            osc.connect(gainNode);
            osc.start(st);
            osc.stop(st + 2.8);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'bell': {
          // FM Cathedral Bell with 3.0s decay
          const carrier = ctx.createOscillator();
          const modulator = ctx.createOscillator();
          const modGain = ctx.createGain();
          const carrierGain = createGain(3.0, 0.18);

          carrier.type = 'sine';
          carrier.frequency.value = 550; // A4

          modulator.type = 'sine';
          modulator.frequency.value = 550 * 1.618; // Golden ratio sideband
          modGain.gain.setValueAtTime(1000, startTime);
          modGain.gain.exponentialRampToValueAtTime(1, startTime + 2.5);

          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(carrierGain);

          modulator.start(startTime);
          carrier.start(startTime);
          modulator.stop(startTime + 3.0);
          carrier.stop(startTime + 3.0);
          nodesToClean.push(carrier, modulator);
          break;
        }
        case 'nature': {
          // Woodland birds chirping + low wood resonance
          const chirps = [0, 0.15, 0.3];
          chirps.forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const st = startTime + delay;
            
            gain.gain.setValueAtTime(0, st);
            gain.gain.linearRampToValueAtTime(0.08, st + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2400, st);
            osc.frequency.exponentialRampToValueAtTime(1800, st + 0.15);
            osc.connect(gain);
            osc.start(st);
            osc.stop(st + 0.15);
            nodesToClean.push(osc);
          });

          // Soft resonance body
          const bodyOsc = ctx.createOscillator();
          const bodyGain = createGain(2.5, 0.12);
          bodyOsc.type = 'triangle';
          bodyOsc.frequency.setValueAtTime(220, startTime);
          bodyOsc.connect(bodyGain);
          bodyOsc.start(startTime);
          bodyOsc.stop(startTime + 2.5);
          nodesToClean.push(bodyOsc);
          break;
        }
        case 'sci-fi': {
          // Pulsing Space Transmission
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const gainNode = createGain(2.6, 0.16);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, startTime);
          osc.frequency.exponentialRampToValueAtTime(150, startTime + 2.5);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, startTime);
          filter.Q.value = 12;

          lfo.frequency.value = 6; // LFO pulse speed
          lfoGain.gain.setValueAtTime(400, startTime);

          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          
          osc.connect(filter);
          filter.connect(gainNode);

          lfo.start(startTime);
          osc.start(startTime);
          lfo.stop(startTime + 2.6);
          osc.stop(startTime + 2.6);

          nodesToClean.push(osc, lfo);
          break;
        }
        case 'gaming': {
          // Retro Level-Up Fanfare
          const notes = [
            { freq: 523.25, duration: 0.1 },  // C5
            { freq: 659.25, duration: 0.1 },  // E5
            { freq: 783.99, duration: 0.1 },  // G5
            { freq: 1046.50, duration: 2.0 }  // C6 (holds)
          ];
          
          let currentStart = startTime;
          notes.forEach((n, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            gain.gain.setValueAtTime(0, currentStart);
            gain.gain.linearRampToValueAtTime(0.12, currentStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, currentStart + n.duration);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(n.freq, currentStart);
            osc.connect(gain);
            osc.start(currentStart);
            osc.stop(currentStart + n.duration + 0.1);
            nodesToClean.push(osc);
            
            if (idx < notes.length - 1) {
              currentStart += 0.08;
            }
          });
          break;
        }
        case 'retro': {
          // Vintage Detuned Lead
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = createGain(2.2, 0.14);

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(440, startTime);
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(442, startTime); // slightly detuned for chorus

          osc1.connect(gainNode);
          osc2.connect(gainNode);

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + 2.2);
          osc2.stop(startTime + 2.2);
          nodesToClean.push(osc1, osc2);
          break;
        }
        case 'crystal': {
          // Shimmering Crystal Sparkles
          const chord = [1500, 1800, 2200, 2700, 3300];
          chord.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const st = startTime + i * 0.08;
            const gainNode = ctx.createGain();
            
            gainNode.gain.setValueAtTime(0, st);
            gainNode.gain.linearRampToValueAtTime(0.08, st + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, st + 2.2);
            gainNode.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, st);
            osc.connect(gainNode);
            osc.start(st);
            osc.stop(st + 2.4);
            nodesToClean.push(osc);
          });
          break;
        }
        case 'mechanical': {
          // Relays clicks followed by warm harmonic transformer hum
          const oscRes = ctx.createOscillator();
          const bodyGain = createGain(2.2, 0.18);
          oscRes.type = 'triangle';
          oscRes.frequency.setValueAtTime(110, startTime); // warm low hum
          oscRes.connect(bodyGain);
          oscRes.start(startTime);
          oscRes.stop(startTime + 2.2);
          nodesToClean.push(oscRes);

          // Click noises
          for (let i = 0; i < 3; i++) {
            const st = startTime + i * 0.06;
            const click = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickGain.gain.setValueAtTime(0.12, st);
            clickGain.gain.exponentialRampToValueAtTime(0.001, st + 0.02);
            clickGain.connect(ctx.destination);
            click.type = 'square';
            click.frequency.setValueAtTime(3000, st);
            click.connect(clickGain);
            click.start(st);
            click.stop(st + 0.03);
            nodesToClean.push(click);
          }
          break;
        }
        case 'cosmic': {
          // Deep Starfield filter sweep
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          const gainNode = createGain(3.0, 0.20);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(250, startTime);
          osc.frequency.exponentialRampToValueAtTime(900, startTime + 2.8);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(300, startTime);
          filter.Q.value = 14;

          lfo.frequency.value = 4; // slow sweeping LFO
          lfoGain.gain.setValueAtTime(350, startTime);

          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          
          osc.connect(filter);
          filter.connect(gainNode);

          lfo.start(startTime);
          osc.start(startTime);
          lfo.stop(startTime + 3.0);
          osc.stop(startTime + 3.0);

          nodesToClean.push(osc, lfo);
          break;
        }
        case 'chime': {
          // Double chime chord with delay and echoes
          const notes = [
            { time: 0, freqs: [1500, 1850], gainVal: 0.18 },
            { time: 0.15, freqs: [2200, 2600], gainVal: 0.12 }
          ];
          notes.forEach(note => {
            note.freqs.forEach((f, idx) => {
              const osc = ctx.createOscillator();
              const gainNode = ctx.createGain();
              const t = startTime + note.time;
              
              gainNode.gain.setValueAtTime(0, t);
              gainNode.gain.linearRampToValueAtTime(note.gainVal / (idx + 1), t + 0.04);
              gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
              gainNode.connect(ctx.destination);
              
              osc.type = 'sine';
              osc.frequency.setValueAtTime(f, t);
              osc.connect(gainNode);
              osc.start(t);
              osc.stop(t + 2.8);
              nodesToClean.push(osc);
            });
          });
          break;
        }
        case 'glass-ping': {
          // Extremely pure ping with 2.5s decay
          const osc = ctx.createOscillator();
          const gain = createGain(2.5, 0.25); // Loud
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2200, startTime);
          osc.connect(gain);
          osc.start(startTime);
          osc.stop(startTime + 2.6);
          nodesToClean.push(osc);
          break;
        }
        case 'synth-rise': {
          // Futuristic Rise + chime landing
          const osc = ctx.createOscillator();
          const delay = ctx.createDelay();
          const feedback = ctx.createGain();
          const gainNode = createGain(3.0, 0.16);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, startTime);
          osc.frequency.exponentialRampToValueAtTime(1600, startTime + 0.8);

          delay.delayTime.setValueAtTime(0.24, startTime);
          feedback.gain.setValueAtTime(0.4, startTime);

          osc.connect(gainNode);
          gainNode.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 3.0);
          nodesToClean.push(osc);
          
          // High chime landing at the top of the rise
          const landing = ctx.createOscillator();
          const landingGain = ctx.createGain();
          const lt = startTime + 0.7;
          
          landingGain.gain.setValueAtTime(0, lt);
          landingGain.gain.linearRampToValueAtTime(0.18, lt + 0.05);
          landingGain.gain.exponentialRampToValueAtTime(0.001, lt + 2.2);
          landingGain.connect(ctx.destination);
          
          landing.type = 'sine';
          landing.frequency.setValueAtTime(2000, lt);
          landing.connect(landingGain);
          landing.start(lt);
          landing.stop(lt + 2.3);
          nodesToClean.push(landing);
          break;
        }
        case 'echo-bell': {
          // Ambient echo bell with delay loop repeating 5 times
          const osc = ctx.createOscillator();
          const delay = ctx.createDelay();
          const feedback = ctx.createGain();
          const gain = createGain(3.0, 0.22); // Loud
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, startTime);
          
          delay.delayTime.setValueAtTime(0.25, startTime);
          feedback.gain.setValueAtTime(0.65, startTime); // Rich feedback
          
          osc.connect(gain);
          gain.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(ctx.destination);
          
          osc.start(startTime);
          osc.stop(startTime + 2.8);
          nodesToClean.push(osc);
          break;
        }
      }

      currentSourceNodes = nodesToClean;
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch (err) {
    console.error('playSound error:', err);
  }
}
