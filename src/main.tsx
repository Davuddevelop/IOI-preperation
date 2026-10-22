import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Simulator } from './data/simulator/Simulator'
import { DataProvider } from './state/DataProvider'
// Fonts ship inside the app (no Google Fonts request), so the console works offline.
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
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
