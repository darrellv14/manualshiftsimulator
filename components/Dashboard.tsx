import React from 'react';
import { CarState, Gear } from '../types.ts';
import { PHYSICS } from '../constants.ts';

interface DashboardProps {
  state: CarState;
}

// Komponen Reusable untuk Gauge (Speedometer/Tachometer)
const Gauge = ({ 
  value, 
  max, 
  label, 
  unit, 
  dangerStart, 
  accentColor = "#ffffff" 
}: { 
  value: number; 
  max: number; 
  label: string; 
  unit?: string;
  dangerStart?: number;
  accentColor?: string;
}) => {
  // Geometri Gauge (Lingkaran)
  const radius = 90;
  const center = 100;
  
  // Sudut putar (240 derajat total, dari jam 8 sampai jam 4)
  const startAngle = 135; 
  const endAngle = 405; 
  const totalAngle = endAngle - startAngle;

  // Hitung rotasi jarum
  const percentage = Math.min(Math.max(value / max, 0), 1.1); // Clamp sedikit di atas max
  const needleRotation = startAngle + (percentage * totalAngle);

  // Helper untuk membuat Ticks (Garis-garis angka)
  const renderTicks = () => {
    const ticks = [];
    const step = max / 10; // 10 pembagian utama (misal 0, 1, 2... atau 0, 20, 40...)
    
    for (let i = 0; i <= max; i += step/2) {
      const isMajor = i % step === 0;
      const p = i / max;
      const angle = startAngle + (p * totalAngle);
      const angleRad = (angle * Math.PI) / 180;

      // Koordinat garis
      const innerR = isMajor ? radius - 15 : radius - 8;
      const outerR = radius;
      
      const x1 = center + innerR * Math.cos(angleRad);
      const y1 = center + innerR * Math.sin(angleRad);
      const x2 = center + outerR * Math.cos(angleRad);
      const y2 = center + outerR * Math.sin(angleRad);

      // Angka Text
      let textElement = null;
      if (isMajor) {
        const textR = radius - 30;
        const tx = center + textR * Math.cos(angleRad);
        const ty = center + textR * Math.sin(angleRad);
        
        // Logic warna angka (Merah jika di zona bahaya)
        let textColor = "#e2e8f0";
        if (dangerStart && i >= dangerStart) textColor = "#ef4444";

        textElement = (
          <text 
            x={tx} y={ty} 
            fill={textColor} 
            fontSize="12" 
            fontWeight="bold" 
            textAnchor="middle" 
            alignmentBaseline="middle"
            transform={`rotate(90, ${tx}, ${ty})`} // Putar text biar tegak lurus
          >
            {unit === 'x1000' ? i / 1000 : i}
          </text>
        );
      }

      ticks.push(
        <g key={i}>
          <line 
            x1={x1} y1={y1} 
            x2={x2} y2={y2} 
            stroke={dangerStart && i >= dangerStart ? "#ef4444" : "#94a3b8"} 
            strokeWidth={isMajor ? 3 : 1} 
          />
          {textElement}
        </g>
      );
    }
    return ticks;
  };

  return (
    <div className="relative w-64 h-64">
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl">
        {/* Background Circle */}
        <circle cx={center} cy={center} r={radius} fill="rgba(0,0,0,0.6)" stroke="#334155" strokeWidth="2" />
        
        {/* Ticks & Numbers */}
        {renderTicks()}

        {/* Labels */}
        <text x={center} y={center + 45} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
          {label}
        </text>
        {unit && (
          <text x={center} y={center + 58} fill="#64748b" fontSize="8" textAnchor="middle">
            {unit}
          </text>
        )}

        {/* Digital Readout Box */}
        <rect x={center - 30} y={center + 70} width="60" height="20" rx="4" fill="rgba(0,0,0,0.8)" />
        <text x={center} y={center + 84} fill={accentColor} fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {Math.floor(value)}
        </text>

        {/* NEEDLE (Jarum) */}
        <g transform={`rotate(${needleRotation}, ${center}, ${center})`} className="transition-transform duration-75 ease-linear">
           {/* Jarum Merah */}
           <path d={`M ${center - 4} ${center} L ${center} ${center - radius + 10} L ${center + 4} ${center} Z`} fill="#ef4444" />
           {/* Ekor Jarum */}
           <path d={`M ${center - 2} ${center} L ${center} ${center + 20} L ${center + 2} ${center} Z`} fill="#ef4444" />
           {/* Center Pin */}
           <circle cx={center} cy={center} r="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};

// Indikator Gear di Tengah
const GearIndicator = ({ gear, isStalled, isEngineOn }: { gear: Gear, isStalled: boolean, isEngineOn: boolean }) => {
  const getLabel = (g: Gear) => {
    if (g === Gear.Neutral) return 'N';
    if (g === Gear.Reverse) return 'R';
    return g.toString();
  };

  const label = getLabel(gear);
  let color = "text-white";
  if (label === 'N') color = "text-green-400";
  if (label === 'R') color = "text-red-400";

  return (
    <div className="flex flex-col items-center justify-end pb-8">
      {/* Warning Lights Container */}
      <div className="flex gap-2 mb-2">
         {/* Check Engine / Stall Light */}
         <div className={`w-6 h-6 rounded-full border border-red-800 flex items-center justify-center transition-all ${isStalled ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'bg-red-900/20'}`} title="Engine Stall">
            <span className="text-[8px] font-bold text-black">OIL</span>
         </div>
         {/* Battery / Engine Off Light */}
         <div className={`w-6 h-6 rounded-full border border-yellow-800 flex items-center justify-center transition-all ${!isEngineOn ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]' : 'bg-yellow-900/20'}`} title="Ignition Off">
            <span className="text-[8px] font-bold text-black">BAT</span>
         </div>
      </div>

      {/* Gear Number */}
      <div className="w-24 h-24 bg-gradient-to-b from-gray-800 to-gray-950 border-4 border-gray-600 rounded-xl flex items-center justify-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20 grid grid-cols-4 grid-rows-4 gap-1 opacity-20 pointer-events-none">
           {/* Dot matrix effect */}
           {[...Array(16)].map((_,i) => <div key={i} className="bg-white rounded-full"></div>)}
        </div>
        <span className={`text-6xl font-black font-mono z-10 ${color} drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`}>
          {label}
        </span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-4 gap-4 pointer-events-none select-none z-20 bg-gradient-to-t from-black/80 to-transparent pt-32">
      
      {/* TACHOMETER (RPM) */}
      {/* Max RPM 8000, Redline mulai di 6500 */}
      <div className="transform translate-y-4">
        <Gauge 
          value={state.rpm} 
          max={8000} 
          label="RPM" 
          unit="x1000" 
          dangerStart={6500} 
          accentColor="#fbbf24"
        />
      </div>

      {/* CENTER GEAR & INDICATORS */}
      <GearIndicator 
        gear={state.gear} 
        isStalled={state.isStalled} 
        isEngineOn={state.isEngineOn} 
      />

      {/* SPEEDOMETER */}
      {/* Max Speed 240 km/h */}
      <div className="transform translate-y-4">
        <Gauge 
          value={state.speed} 
          max={240} 
          label="SPEED" 
          unit="km/h" 
          accentColor="#38bdf8"
        />
      </div>

    </div>
  );
};

export default Dashboard;