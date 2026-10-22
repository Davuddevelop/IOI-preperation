import { createContext } from 'react'
import type { DataSource } from '../data/DataSource'

export const DataSourceContext = createContext<DataSource | null>(null)
