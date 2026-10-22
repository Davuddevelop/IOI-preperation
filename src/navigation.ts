import type { IconName } from './components/Icon'
import type { Route } from './router'

export const NAV_ITEMS: { route: Route; label: string; icon: IconName }[] = [
  { route: 'overview', label: 'Overview', icon: 'overview' },
  { route: 'robot', label: 'Robot', icon: 'robot' },
  { route: 'drone', label: 'Drone', icon: 'drone' },
  { route: 'radar', label: 'Radar', icon: 'radar' },
  { route: 'territories', label: 'Territories', icon: 'territories' },
]

export const ROUTE_TITLES: Record<Route, string> = {
  overview: 'Mission overview',
  robot: 'Ground robot',
  drone: 'Scout drone',
  radar: 'Air surveillance',
  territories: 'Territories & log',
}
