/**
 * Physical characteristics of MINOTAUR GUARDIAN and its sensors.
 *
 * The simulator and the UI both read these, so once you measure the real
 * robot, updating the numbers here keeps the console and the hardware in
 * agreement.
 */

export const ROBOT = {
  /** Footprint radius used for collisions, m. */
  radius: 0.4,
  maxSpeed: 1.2,
  maxReverse: 0.5,
  patrolSpeed: 0.9,
  /** m/s². */
  acceleration: 1.5,
  /** Degrees per second at full stick. */
  turnRate: 75,
  /** Safety stop distance from the robot's centre to an obstacle's surface, m. */
  stopDistance: 1.0,
} as const

export const OBSTACLE_SENSOR = {
  sectors: 12,
  range: 6,
} as const

export const METAL_DETECTOR = {
  /** Distance of the detector coil ahead of the robot's centre, m. */
  offset: 0.6,
  /** Width of the signal falloff, m. */
  sigma: 1.5,
  /** Signal at which a contact is registered. */
  threshold: 0.45,
} as const

export const SURVEY = {
  /** Width swept by the detector in one pass; survey lanes are spaced to match. */
  swath: 2.5,
} as const

export const BAY = {
  /** Seconds for the lid to fully open or close. */
  lidTime: 2,
} as const

export const DRONE = {
  cruiseAltitude: 25,
  climbRate: 3,
  descentRate: 2,
  maxSpeed: 9,
  orbitRadius: 14,
  orbitSpeed: 4,
  /** Furthest the drone may fly from the robot, m. */
  maxRange: 60,
  /** Battery % at which it returns on its own. */
  returnBattery: 25,
  /** Battery % required to launch. */
  launchBattery: 30,
  /** Camera field of view, degrees. */
  fov: 70,
} as const

export const RADAR = {
  range: 70,
  highThreatRange: 35,
} as const

export const CAMERA = {
  fov: 62,
  /** Lens height above ground, m. */
  height: 0.55,
} as const
