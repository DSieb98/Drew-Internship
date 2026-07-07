import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { LiveRegionProvider } from './components/LiveRegion'
import { StoreProvider } from './store/StoreContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LiveRegionProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </LiveRegionProvider>
    </HashRouter>
  </StrictMode>
)
