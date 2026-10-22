import { add, distance, length, normalize, scale, sub, vectorHeading } from '../geometry'
import { BAY, DRONE } from '../specs'
import type { Vec2 } from '../types'
import type { SimContext, SimState } from './state'

/** Drives the bay lid towards its target position. */
function stepLid(state: SimState, dt: number) {
  const robot = state.robot
  const rate = dt / BAY.lidTime
  if (state.lidTarget === 'open') {
    robot.lidOpen = Math.min(1, robot.lidOpen + rate)
    robot.lid = robot.lidOpen >= 1 ? 'open' : 'opening'
  } else {
    robot.lidOpen = Math.max(0, robot.lidOpen - rate)
    robot.lid = robot.lidOpen <= 0 ? 'closed' : 'closing'
  }
}

/** Steers the drone's horizontal velocity towards a point, easing off as it arrives. */
function flyTowards(state: SimState, target: Vec2, dt: number) {
  const drone = state.drone
  const offset = sub(target, drone.pos)
  const desired = scale(normalize(offset), Math.min(DRONE.maxSpeed, length(offset) * 0.8))
  const blend = Math.min(1, dt * 2)
  state.droneVelocity = add(state.droneVelocity, scale(sub(desired, state.droneVelocity), blend))
  drone.pos = add(drone.pos, scale(state.droneVelocity, dt))
  drone.speed = length(state.droneVelocity)
  if (drone.speed > 0.5) drone.heading = vectorHeading(state.droneVelocity)
}

/** Keeps a point within the drone's radio range of the robot. */
export function clampToRange(robotPos: Vec2, p: Vec2): Vec2 {
  const offset = sub(p, robotPos)
  const d = length(offset)
  return d <= DRONE.maxRange ? p : add(robotPos, scale(offset, DRONE.maxRange / d))
}

export function stepDrone(ctx: SimContext, dt: number) {
  const { state } = ctx
  const { drone, robot } = state
  stepLid(state, dt)

  if (drone.phase !== 'docked') {
    drone.flightTime += dt
    drone.battery = Math.max(0, drone.battery - 0.18 * dt)
  }

  switch (drone.phase) {
    case 'docked':
      drone.pos = { ...robot.pos }
      drone.heading = robot.heading
      drone.altitude = 0
      drone.speed = 0
      drone.battery = Math.min(100, drone.battery + 0.5 * dt)
      break

    case 'launching':
      drone.pos = { ...robot.pos }
      state.lidTarget = 'open'
      if (robot.lidOpen < 1) break
      drone.altitude += DRONE.climbRate * dt
      if (drone.altitude >= DRONE.cruiseAltitude) {
        drone.altitude = DRONE.cruiseAltitude
        drone.phase = 'airborne'
        state.lidTarget = 'closed'
        ctx.emit('info', 'drone', 'Scout drone airborne — closing bay')
      }
      break

    case 'airborne': {
      const center = drone.goal ?? robot.pos
      const radius = drone.goal ? 8 : DRONE.orbitRadius
      state.orbitAngle += (DRONE.orbitSpeed / radius) * dt
      const orbitPoint = add(center, { x: Math.cos(state.orbitAngle) * radius, y: Math.sin(state.orbitAngle) * radius })
      flyTowards(state, clampToRange(robot.pos, orbitPoint), dt)
      if (drone.battery <= DRONE.returnBattery) {
        drone.phase = 'returning'
        drone.goal = null
        ctx.emit('warning', 'drone', `Drone battery ${Math.round(drone.battery)}% — returning to robot`)
      }
      break
    }

    case 'returning':
      flyTowards(state, robot.pos, dt)
      if (distance(drone.pos, robot.pos) < 1.5) {
        drone.phase = 'landing'
        state.lidTarget = 'open'
        ctx.emit('info', 'drone', 'Drone over robot — opening bay for landing')
      }
      break

    case 'landing':
      flyTowards(state, robot.pos, dt)
      if (robot.lidOpen < 1) break
      drone.altitude = Math.max(0, drone.altitude - DRONE.descentRate * dt)
      if (drone.altitude === 0) {
        drone.phase = 'docked'
        drone.goal = null
        state.droneVelocity = { x: 0, y: 0 }
        state.lidTarget = 'closed'
        ctx.emit('info', 'drone', `Drone docked after ${Math.round(drone.flightTime)} s — charging`)
      }
      break
  }
}
