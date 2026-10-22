import { useEffect, type ReactNode } from 'react'
import type { DataSource } from '../data/DataSource'
import { DataSourceContext } from './context'

/** Makes a data source available to every component below and keeps it connected while mounted. */
export function DataProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  useEffect(() => {
    source.connect()
    return () => source.disconnect()
  }, [source])

  return <DataSourceContext value={source}>{children}</DataSourceContext>
}
