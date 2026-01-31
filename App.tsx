import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene3D from './components/Scene3D.tsx';
import Dashboard from './components/Dashboard.tsx';
import Controls from './components/Controls.tsx';
import Minimap from './components/Minimap.tsx';
import SteeringWheel from './components/SteeringWheel.tsx';
import { CarState, INITIAL_CAR_STATE, Gear } from './types.ts';
import { PhysicsEngine } from './services/physicsEngine.ts';
import { AudioManager } from './services/AudioManager.ts';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<CarState>(INITIAL_CAR_STATE);
  
  const stateRef = useRef<CarState>(INITIAL_CAR_STATE);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Audio Manager Instance
  const audioManagerRef = useRef<AudioManager>(new AudioManager());

  // Gamepad State tracking untuk tombol "sekali tekan" (seperti Ignition/Gear Shift)
  const prevGamepadButtonsRef = useRef<boolean[]>([]);

  const updateState = (newState: Partial<CarState>) => {
    stateRef.current = { ...stateRef.current, ...newState };
    setGameState(stateRef.current);
  };

  const handleIgnition = () => {
      const audio = audioManagerRef.current;
      if (stateRef.current.isEngineOn) {
          updateState({ isEngineOn: false });
          audio.stop();
      } else {
          updateState({ isEngineOn: true, isStalled: false, rpm: 800 });
          audio.start();
      }
  };

  // --- KEYBOARD HANDLERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      
      if (key === 'i') handleIgnition();

      // Sequential Gears (Keyboard)
      if (e.key === 'ArrowUp') shiftGear(1);
      if (e.key === 'ArrowDown') shiftGear(-1);

      // H-Pattern Gears (Keyboard)
      if (key === '1') updateState({ gear: Gear.First });
      if (key === '2') updateState({ gear: Gear.Second });
      if (key === '3') updateState({ gear: Gear.Third });
      if (key === '4') updateState({ gear: Gear.Fourth });
      if (key === '5') updateState({ gear: Gear.Fifth });
      if (key === 'r') updateState({ gear: Gear.Reverse });
      if (key === '0' || key === 'n') updateState({ gear: Gear.Neutral });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const unlockAudio = () => audioManagerRef.current.init();
    window.addEventListener('click', unlockAudio);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Helper Sequential Shift
  const shiftGear = (dir: number) => {
      const current = stateRef.current.gear;
      let next = current + dir;
      // Logic urutan: R (-1) <-> N (0) <-> 1 <-> 2 ... <-> 5
      // Clamp values
      if (next > Gear.Fifth) next = Gear.Fifth;
      if (next < Gear.Reverse) next = Gear.Reverse;
      updateState({ gear: next });
  };

  // --- GAME LOOP ---
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    let { gasPosition, brakePosition, clutchPosition, steeringInput } = stateRef.current;
    
    // --- 1. DETEKSI GAMEPAD ---
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0]; // Ambil controller pertama

    let gpSteer = 0;
    let gpGas = 0;
    let gpBrake = 0;
    let gpClutch = 0;

    if (gp) {
        // --- AXIS MAPPING (Analog Stick & Triggers) ---
        // Left Stick X (Index 0) -> Steering (-1 Left, 1 Right)
        if (Math.abs(gp.axes[0]) > 0.1) { // Deadzone 0.1
            gpSteer = -gp.axes[0];
        }

        // Right Trigger (Button 7 biasanya) -> Gas (0 to 1)
        if (gp.buttons[7]) gpGas = gp.buttons[7].value;

        // Left Trigger (Button 6 biasanya) -> Brake (0 to 1)
        if (gp.buttons[6]) gpBrake = gp.buttons[6].value;

        // Left Bumper (Button 4) -> Clutch (Digital 0/1 biasanya)
        if (gp.buttons[4].pressed) gpClutch = 1;

        // --- BUTTON MAPPING (One-shot actions) ---
        const buttons = gp.buttons.map(b => b.pressed);
        const prevButtons = prevGamepadButtonsRef.current;

        // Start Button (Index 9) -> Ignition
        if (buttons[9] && !prevButtons[9]) handleIgnition();

        // RB (Button 5) -> Shift Up
        if (buttons[5] && !prevButtons[5]) shiftGear(1);

        // X Button (Button 2) -> Shift Down (Alternatif)
        // Atau pakai RB/LB untuk shift
        if (buttons[2] && !prevButtons[2]) shiftGear(-1); // XBox 'X' button usually left face button

        prevGamepadButtonsRef.current = buttons;
    }

    // --- 2. GABUNGKAN INPUT (Keyboard + Gamepad) ---
    // Prioritaskan Gamepad jika ada input, jika tidak fallback ke Keyboard logic

    // GAS
    if (gpGas > 0) {
        gasPosition = gpGas;
    } else {
        // Keyboard Logic
        if (keysPressed.current['w']) gasPosition = Math.min(1, gasPosition + 2 * dt);
        else if (!document.activeElement?.className.includes('range')) gasPosition = Math.max(0, gasPosition - 2 * dt);
    }

    // BRAKE
    if (gpBrake > 0) {
        brakePosition = gpBrake;
    } else {
        // Keyboard Logic
        if (keysPressed.current['s']) brakePosition = Math.min(1, brakePosition + 3 * dt);
        else if (!document.activeElement?.className.includes('range')) brakePosition = Math.max(0, brakePosition - 3 * dt);
    }

    // CLUTCH (Sticky Logic applied to both if digital)
    // Jika gamepad clutch analog (jarang di bumper), pakai nilai langsung. 
    // Jika digital (bumper), pakai logic smoothing.
    const isClutchInput = keysPressed.current['shift'] || gpClutch > 0.5;
    
    if (isClutchInput) {
        clutchPosition = Math.min(1, clutchPosition + 5 * dt);
    } else {
        if (!document.activeElement?.className.includes('range')) {
            const BITE_POINT_START = 0.3;
            const BITE_POINT_END = 0.6;
            let releaseSpeed = 5.0; 
            
            // Sticky logic agar gampang cari bite point di keyboard/digital pad
            if (clutchPosition > BITE_POINT_START && clutchPosition < BITE_POINT_END) {
                releaseSpeed = 0.5; 
            }
            clutchPosition = Math.max(0, clutchPosition - releaseSpeed * dt);
        }
    }

    // STEERING
    if (Math.abs(gpSteer) > 0) {
        // Gamepad Steering (Direct but smoothed slightly for physics)
        // Di physics engine sudah ada logic smoothing kecepatan putar ban, 
        // jadi kita bisa pass raw input atau lerp sedikit.
        // Kita pass raw target, nanti PhysicsEngine.update yang handle turn speed.
        // TAPI state.steeringInput di sini adalah posisi setir virtual.
        steeringInput = gpSteer; 
    } else {
        // Keyboard Steering (Smoothing Logic)
        const isLeft = keysPressed.current['a'] || keysPressed.current['arrowleft'];
        const isRight = keysPressed.current['d'] || keysPressed.current['arrowright'];
        const steerSpeed = (1.0 / 0.5) * dt; // 0.5s lock to lock
        const returnSpeed = (1.0 / 0.5) * dt * Math.max(1, Math.abs(stateRef.current.speed) / 20);

        if (isLeft) {
            if (steeringInput < 1.0) steeringInput += steerSpeed;
        } else if (isRight) {
            if (steeringInput > -1.0) steeringInput -= steerSpeed;
        } else {
            if (steeringInput > 0) {
                steeringInput -= returnSpeed;
                if (steeringInput < 0) steeringInput = 0;
            } else if (steeringInput < 0) {
                steeringInput += returnSpeed;
                if (steeringInput > 0) steeringInput = 0;
            }
        }
    }
    
    // Clamp Inputs
    steeringInput = Math.max(-1, Math.min(1, steeringInput));
    gasPosition = Math.max(0, Math.min(1, gasPosition));
    brakePosition = Math.max(0, Math.min(1, brakePosition));
    clutchPosition = Math.max(0, Math.min(1, clutchPosition));

    stateRef.current = { ...stateRef.current, gasPosition, brakePosition, clutchPosition, steeringInput };

    // Update Physics
    const nextState = PhysicsEngine.update(stateRef.current, dt);
    stateRef.current = nextState;
    setGameState(nextState);

    // Update Audio
    audioManagerRef.current.update(nextState.rpm, nextState.gasPosition, nextState.tireSlip, nextState.speed);

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handlePedalChange = (pedal: 'clutch' | 'brake' | 'gas', value: number) => {
     if (pedal === 'clutch') stateRef.current.clutchPosition = value;
     if (pedal === 'brake') stateRef.current.brakePosition = value;
     if (pedal === 'gas') stateRef.current.gasPosition = value;
  };

  const handleGearChange = (gear: Gear) => {
      updateState({ gear });
  };

  return (
    <div className="w-full h-screen relative overflow-hidden font-sans bg-sky-200">
      <Scene3D gameState={gameState} />
      
      <Minimap state={gameState} />

      <Dashboard state={gameState} />
      
      <SteeringWheel steeringInput={gameState.steeringInput} />
      
      <Controls 
        state={gameState} 
        onPedalChange={handlePedalChange}
        onGearChange={handleGearChange}
        onIgnition={handleIgnition}
      />
    </div>
  );
};

export default App;
