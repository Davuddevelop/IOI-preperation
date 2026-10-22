import { use, useSyncExternalStore } from 'react'
import type { DataSource } from '../data/DataSource'
import type { WorldSnapshot } from '../data/types'
import { DataSourceContext } from './context'

export function useDataSource(): DataSource {
  const source = use(DataSourceContext)
  if (!source) throw new Error('useDataSource must be used inside <DataProvider>')
  return source
}

/**
 * Reads one slice of the world and re-renders only when that slice changes.
 *
 * The selector must return something that already exists in the snapshot
 * (`s => s.robot`, `s => s.robot.battery`), never a freshly built object or
 * array (`s => s.events.filter(...)`): React compares results by identity, and
 * a new array every call looks like a change every call. Derive inside the
 * component with useMemo instead.
 */
export function useWorld<T>(selector: (snapshot: WorldSnapshot) => T): T {
  const source = useDataSource()
  return useSyncExternalStore(source.subscribe, () => selector(source.getSnapshot()))
}

export function useSend() {
  return useDataSource().send
}
