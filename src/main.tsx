import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Simulator } from './data/simulator/Simulator'
import { DataProvider } from './state/DataProvider'
import './styles/tokens.css'
import './styles/global.css'

// The one place that decides where data comes from. To drive the real robot,
// swap this for a source that implements the same DataSource interface.
const source = new Simulator({ seed: 7 })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider source={source}>
      <App />
    </DataProvider>
  </StrictMode>,
)
