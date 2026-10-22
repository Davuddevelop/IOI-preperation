import type { RobotMode, Vec2, WorldSnapshot } from './types'

/**
 * Everything the operator can ask for. Commands are plain serialisable objects
 * so the same values can later travel over a WebSocket to the real robot.
 */
export type Command =
  | { type: 'robot/drive'; throttle: number; turn: number }
  | { type: 'robot/setMode'; mode: RobotMode }
  | { type: 'robot/surveyZone'; zoneId: string }
  | { type: 'robot/setLid'; open: boolean }
  | { type: 'drone/launch' }
  | { type: 'drone/return' }
  | { type: 'drone/goTo'; target: Vec2 | null }
  | { type: 'events/acknowledge'; id: string | 'all' }
  // Simulation controls. A real-robot source ignores these.
  | { type: 'sim/setSpeed'; speed: number }
  | { type: 'sim/setPaused'; paused: boolean }
  | { type: 'sim/reset' }

/**
 * The only thing the UI depends on. Today the Simulator implements it; a
 * RealRobotSource talking to the robot's onboard computer can replace it
 * without touching any screen.
 *
 * The shape matches React's useSyncExternalStore: getSnapshot must return the
 * same object until something changes, and subscribe returns an unsubscribe.
 */
export interface DataSource {
  getSnapshot(): WorldSnapshot
  subscribe(listener: () => void): () => void
  send(command: Command): void
  connect(): void
  disconnect(): void
}
