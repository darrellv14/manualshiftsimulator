import { Gear } from "./types.ts";

export const PHYSICS = {
  IDLE_RPM: 800,
  MAX_RPM: 7200,
  REDLINE_RPM: 6500, // Redline starts
  STALL_RPM: 300,

  MASS: 1300, // kg (Standard sport sedan weight)

  // DRIVETRAIN
  WHEEL_RADIUS: 0.3, // meter (standard tire size)
  FINAL_DRIVE: 4.1, // Differential ratio

  // AERODYNAMICS
  // Drag coefficient adjusted so engine force in 5th gear equals air resistance at ~180-190 km/h
  DRAG_COEFF: 0.32,
  AIR_DENSITY: 1.225,
  FRONTAL_AREA: 2.2,

  // BRAKING & STEERING
  BRAKE_TORQUE: 4000,

  // STEERING PHYSICS
  WHEEL_BASE: 2.7, // Distance between axles (meters)
  MAX_STEER_ANGLE: 0.65, // Max wheel angle in radians (~37 degrees)
  STEERING_SPEED: 2.0, // How fast the virtual wheel turns
  // Speed where steering sensitivity drops to ~50%.
  // Higher means you can turn sharper at high speeds (arcade). Lower means realistic stiffness.
  STEER_SENSITIVITY_CURVE: 80.0,

  // TIRE PHYSICS
  GRIP_THRESHOLD: 0.8, // Force threshold before slipping starts

  // GEAR RATIOS (Realistic 5-speed transmission)
  GEAR_RATIOS: {
    [Gear.Reverse]: 4.0, // High torque for easier reversing
    [Gear.Neutral]: 0,
    [Gear.First]: 3.5, // High torque, low speed
    [Gear.Second]: 2.1,
    [Gear.Third]: 1.4,
    [Gear.Fourth]: 1.0,
    [Gear.Fifth]: 0.8, // Overdrive (Top speed gear)
  } as Record<Gear, number>,

  // TORQUE LOOKUP TABLE (Newton Meters)
  // Engine feels weak low down, kicks in at 4000, drops at 7000
  TORQUE_CURVE: [
    { rpm: 0, torque: 0 },
    { rpm: 800, torque: 120 }, // Idle torque
    { rpm: 2000, torque: 180 }, // Power starts building
    { rpm: 4000, torque: 260 }, // Peak torque start
    { rpm: 5500, torque: 250 }, // Peak HP maintained
    { rpm: 7200, torque: 150 }, // Drastic drop at limiter
  ],
};

export const MAP = {
  BLOCK_SIZE: 80,
  ROAD_WIDTH: 18,
  BUILDING_HEIGHT_MIN: 15,
  BUILDING_HEIGHT_MAX: 50,
  RENDER_DISTANCE: 5,
};

export const TRAFFIC_SETTINGS = {
  COUNT: 15,
  SPAWN_RADIUS: 150,
  SPEED_MIN: 20,
  SPEED_MAX: 60,
};

export const COLORS = {
  rpmSafe: "#10b981",
  rpmWarn: "#f59e0b",
  rpmDanger: "#ef4444",
  accent: "#0ea5e9",
  sky: "#7dd3fc",
  ground: "#334155",
  grass: "#4ade80",
  trafficColors: [0xffffff, 0x3b82f6, 0xeab308, 0xef4444, 0x64748b, 0x000000],
};
