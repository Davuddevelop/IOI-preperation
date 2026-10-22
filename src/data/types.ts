/**
 * Domain model for the MINOTAUR GUARDIAN console.
 *
 * Conventions used everywhere:
 * - Positions are metres. x grows east, y grows south — the same direction as
 *   screen space, so the map can draw world coordinates without flipping.
 * - Headings and bearings are compass degrees: 0 = north (up), 90 = east,
 *   increasing clockwise.
 * - Times shown to the operator are mission-clock epoch milliseconds.
 */

export interface Vec2 {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// ---------------------------------------------------------------- map

export type ObstacleKind = 'rock' | 'tree' | 'rubble'

export interface Obstacle {
  id: string
  kind: ObstacleKind
  pos: Vec2
  radius: number
}

export interface TerrainFeature {
  kind: 'road' | 'stream'
  points: Vec2[]
}

export interface WorldMap {
  width: number
  height: number
  /** Operator position; the robot starts here and link quality is measured from here. */
  base: Vec2
  obstacles: Obstacle[]
  features: TerrainFeature[]
}

// -------------------------------------------------------------- robot

export type RobotMode = 'patrol' | 'manual' | 'hold'
export type LidState = 'closed' | 'opening' | 'open' | 'closing'

export interface RobotState {
  pos: Vec2
  heading: number
  /** m/s, negative while reversing. */
  speed: number
  odometer: number
  mode: RobotMode
  /** Why motion is currently blocked regardless of mode, e.g. a drone launch. */
  interlock: string | null
  battery: number
  /** Link quality to base, 0–100. */
  signal: number
  temperature: number
  /**
   * Distance to the nearest obstacle in each sensor sector, clockwise starting
   * straight ahead. Capped at OBSTACLE_SENSOR.range.
   */
  obstacleDistances: number[]
  /** True while the safety stop is refusing motion towards an obstacle. */
  obstacleStop: boolean
  /** Metal detector response, 0–1. */
  metalSignal: number
  /** Recent metalSignal samples, oldest first, for the trace graph. */
  metalHistory: number[]
  lid: LidState
  /** 0 = closed, 1 = fully open. */
  lidOpen: number
  surveyZoneId: string | null
  /** Path driven so far; drawn as the detector's swept area. */
  trail: Vec2[]
}

// -------------------------------------------------------------- drone

export type DronePhase = 'docked' | 'launching' | 'airborne' | 'returning' | 'landing'

export interface DroneState {
  phase: DronePhase
  pos: Vec2
  altitude: number
  heading: number
  speed: number
  battery: number
  /** Seconds since the current flight began. */
  flightTime: number
  /** Operator-chosen point to circle; null means circle the robot. */
  goal: Vec2 | null
}

// ------------------------------------------------------------ sensors

export interface MetalContact {
  id: string
  label: string
  pos: Vec2
  strength: number
  zoneId: string | null
  time: number
}

export type AirClass = 'unknown' | 'quadcopter' | 'fixed-wing' | 'bird'
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high'

/** An aerial object currently tracked by the robot's radar / vision system. */
export interface AirTarget {
  id: string
  label: string
  pos: Vec2
  altitude: number
  heading: number
  speed: number
  classification: AirClass
  /** Confidence of the vision classifier, 0–1. */
  confidence: number
  threat: ThreatLevel
  /** Ground distance from the robot, m. */
  distance: number
  /** Compass bearing from the robot. */
  bearing: number
  firstSeen: number
}

// ------------------------------------------------------------ mission

export type ZoneStatus = 'pending' | 'surveying' | 'surveyed'

export interface Zone {
  id: string
  name: string
  description: string
  rect: Rect
  /** Fraction of the zone swept by the metal detector, 0–1. */
  coverage: number
  status: ZoneStatus
  contacts: number
}

export type Severity = 'info' | 'warning' | 'critical'
export type EventCategory = 'system' | 'robot' | 'drone' | 'radar' | 'survey'

export interface MissionEvent {
  id: string
  time: number
  severity: Severity
  category: EventCategory
  message: string
  /** Info events are born acknowledged; warnings and criticals wait for the operator. */
  acknowledged: boolean
}

// ----------------------------------------------------------- snapshot

export interface SimulationInfo {
  speed: number
  paused: boolean
}

/** Everything the console knows at one instant. Treat it as immutable. */
export interface WorldSnapshot {
  /** Current mission-clock time, epoch ms. */
  clock: number
  missionStart: number
  map: WorldMap
  robot: RobotState
  drone: DroneState
  zones: Zone[]
  contacts: MetalContact[]
  airTargets: AirTarget[]
  /** Newest first. */
  events: MissionEvent[]
  /** Present only when the data comes from the simulator. */
  sim: SimulationInfo | null
}
