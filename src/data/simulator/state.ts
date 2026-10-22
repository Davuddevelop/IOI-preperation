import type {
  AirClass,
  DroneState,
  EventCategory,
  MetalContact,
  MissionEvent,
  RobotState,
  Severity,
  ThreatLevel,
  Vec2,
  Zone,
} from '../types'
import type { Random } from './random'
import type { CoverageGrid } from './survey'
import type { HiddenObject, World } from './world'

/** An aircraft in the simulated sky, tracked or not. Only tracked ones reach the UI. */
export interface Intruder {
  id: string
  label: string
  truth: Exclude<AirClass, 'unknown'>
  pos: Vec2
  altitude: number
  heading: number
  speed: number
  behavior: 'inbound' | 'loiter' | 'outbound' | 'transit' | 'wander'
  behaviorTimer: number
  loiterRadius: number
  age: number
  tracked: boolean
  trackTime: number
  firstSeen: number
  confidence: number
  classification: AirClass
  threat: ThreatLevel
  /** Confidence at which the classifier commits; varies per target. */
  classifyAt: number
  announcedClass: boolean
  announcedHigh: boolean
}

/**
 * The simulator's private working state. Objects in `robot` and `drone` are
 * mutated during a step; arrays that the UI reads directly (zones, contacts,
 * events) are replaced whenever they change, never mutated, so React can tell
 * they changed by reference.
 */
export interface SimState {
  elapsed: number
  robot: RobotState
  drone: DroneState
  droneVelocity: Vec2
  orbitAngle: number
  lidTarget: 'open' | 'closed'
  zones: Zone[]
  zonesDirty: boolean
  contacts: MetalContact[]
  events: MissionEvent[]
  intruders: Intruder[]
  nextIntruderAt: number
  intruderCount: number
  eventCount: number
  drive: { throttle: number; turn: number }
  route: { points: Vec2[]; index: number; best: number; stall: number }
  hidden: HiddenObject[]
  coverage: CoverageGrid
  zoneCells: Record<string, { total: number; covered: number }>
  metalSampleTimer: number
  /** The buried object the detector is currently climbing towards the peak of. */
  metalCandidate: { object: HiddenObject; peak: number } | null
  /** One-shot event latches, e.g. "robot battery 30%". */
  latches: Set<string>
  /** Elapsed time until which a throttled event stays quiet. */
  cooldowns: Map<string, number>
}

/** What each subsystem gets to work with. */
export interface SimContext {
  readonly state: SimState
  readonly world: World
  readonly rng: Random
  clock(): number
  emit(severity: Severity, category: EventCategory, message: string): void
  /** Emits at most once per `seconds` for the same key. */
  emitThrottled(key: string, seconds: number, severity: Severity, category: EventCategory, message: string): void
}
