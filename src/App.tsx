import { useEffect, useRef, type ComponentType } from 'react'
import styles from './App.module.css'
import { NavBar } from './components/shell/NavBar'
import { AirspaceStrip } from './components/shell/AirspaceStrip'
import { TopBar } from './components/shell/TopBar'
import { ROUTE_TITLES } from './navigation'
import { useRoute, type Route } from './router'
import { DroneScreen } from './screens/DroneScreen'
import { OverviewScreen } from './screens/OverviewScreen'
import { RadarScreen } from './screens/RadarScreen'
import { RobotScreen } from './screens/RobotScreen'
import { TerritoriesScreen } from './screens/TerritoriesScreen'

const SCREENS: Record<Route, ComponentType> = {
  overview: OverviewScreen,
  robot: RobotScreen,
  drone: DroneScreen,
  radar: RadarScreen,
  territories: TerritoriesScreen,
}

export default function App() {
  const route = useRoute()
  const mainRef = useRef<HTMLElement>(null)
  const Screen = SCREENS[route]

  useEffect(() => {
    document.title = `${ROUTE_TITLES[route]} · MINOTAUR GUARDIAN`
    mainRef.current?.scrollTo(0, 0)
  }, [route])

  return (
    <div className={styles.shell}>
      <TopBar route={route} />
      <NavBar current={route} />
      <main ref={mainRef} className={styles.main}>
        <AirspaceStrip route={route} />
        <Screen />
      </main>
    </div>
  )
}
