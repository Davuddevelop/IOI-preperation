# MINOTAUR GUARDIAN — Operator Console

**Technology where it is dangerous for people.**

The operator console for MINOTAUR GUARDIAN, team Batzilla's reconnaissance robot. The robot surveys dangerous ground with obstacle sensors, a metal detector and a camera. A scout drone launches through a lid in its top, and a vision system watches the sky for other drones.

The console runs in any modern browser, on phones, tablets and computers.

> **This is a demonstration build.** The app does not talk to a robot. Positions, sensor readings, drone flights and aerial threats come from a built-in simulator, and the console says so (the **SIM** badge in the top bar). Aerial drone detection is marked *Experimental* because it is a development direction of the project, not a finished feature.

## Screens

| Screen | What it shows |
| --- | --- |
| **Overview** | Tactical map, system status, live camera feed, open alerts |
| **Robot** | Front camera, joystick / keyboard driving, obstacle sensors, metal detector, telemetry, drone-bay lid |
| **Drone** | Aerial camera, launch / return, tap-the-map tasking, animated bay diagram |
| **Radar** | Radar scope, vision-classified targets with confidence, threat levels |
| **Territories** | Survey sectors with coverage, send-robot-to-sector, full mission log |

The airspace strip at the top of every screen always shows the state of the sky.

## Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # also reachable from a phone or tablet on the same Wi-Fi
```

| Command | Does |
| --- | --- |
| `npm run dev` | Development server with instant reload |
| `npm run build` | Type-check and build static files into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run the unit tests (simulator and geometry) |
| `npm run lint` | Lint with oxlint |

`dist/` is plain static files with no backend and no internet access needed at runtime, so any static host works. On a tablet, "Add to Home Screen" opens it full-screen like an app.

The **SIM** badge in the top bar has speed (×1 to ×8), pause and restart: useful when presenting.

## How it is built

React 19 + TypeScript + Vite. No UI library, no state library, no router library: each of those is a few dozen lines here, written to be read.

### The one architectural rule

```
 Screens ──read──▶ useWorld(selector) ──▶ DataSource ◀── Simulator        (today)
    │                                         ▲
    └──────────send(command)──────────────────┘     ◀── RealRobotSource  (later)
```

The UI only knows the `DataSource` interface (`src/data/DataSource.ts`): get the latest snapshot, subscribe to changes, send a command. Today the `Simulator` implements it. To drive the real robot, write a class with the same four methods, for example one that talks WebSocket to the robot's onboard computer, and change one line in `src/main.tsx`. No screen changes.

Commands are plain objects (`{ type: 'robot/drive', throttle, turn }`), so they can be sent over the network as JSON as they are.

### Where things live

```
src/
  data/                 the domain: no React in here
    types.ts            every shape the UI reads (start here)
    DataSource.ts       the interface + the Command type
    specs.ts            robot / sensor numbers; update from real measurements
    geometry.ts         vectors, compass bearings, ray casting
    simulator/          the fake robot: world, robot, drone, air traffic
  state/                connects the data source to React (useWorld, useSend)
  hooks/                canvas animation loop, joystick + keyboard drive control
  components/           UI pieces, grouped by screen (map, feeds, robot, drone, radar…)
  screens/              one file per screen; screens.module.css holds all layouts
  styles/tokens.css     every colour, size and breakpoint
```

### Ideas worth reading the code for

- **`useSyncExternalStore`** (`state/hooks.ts`): how React subscribes to data that lives outside React. Components select only what they show (`s => Math.round(s.robot.battery)`), so they re-render only when that changes.
- **Canvas outside React** (`hooks/useCanvasLoop.ts`): the camera feeds and radar redraw every frame without re-rendering components.
- **A 3D camera in 200 lines** (`components/feeds/groundView.ts`): project world points through a pinhole lens; dividing by distance creates perspective.
- **One layout, three devices** (`App.module.css`, `screens/screens.module.css`): CSS grid areas rearranged at breakpoints, `display: contents` for column wrappers, container queries for the camera HUD.
- **Safety by design**: a drive watchdog (the robot stops if commands stop arriving), lid interlocks during drone launch, and an airspace strip with a fixed height so alerts never shift buttons under the operator's finger.
- **Deterministic simulation** (`simulator/random.ts`): a seeded random generator makes every run the same, which is why the tests can assert exact behaviour.

### Responsive breakpoints

| Width | Layout |
| --- | --- |
| < 640 px (phones) | Bottom tab bar, one column |
| 640–1099 px (tablets) | Icon rail, panels paired side by side |
| ≥ 1100 px (desktops) | Labelled sidebar, main column + side column |

## Connecting the real robot

1. Decide how the robot's computer will talk to the console: WebSocket is the natural fit.
2. Have the robot send telemetry shaped like `WorldSnapshot` in `src/data/types.ts`, or translate it in the source.
3. Write `src/data/RealRobotSource.ts` implementing `DataSource`; `send()` serialises the `Command` and sends it.
4. Keep the watchdog on the robot side: stop if no drive command arrives for ~400 ms.
5. Update `src/data/specs.ts` with measured sensor ranges and speeds.
6. Swap the source in `src/main.tsx`.
