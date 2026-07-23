import { useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import AppNav from './nav/AppNav'
import { useAnnounce } from './hooks/useAnnounce'
import { useHelp } from './hooks/useHelp'
import TodayPage from './pages/TodayPage'
import AllLeadsPage from './pages/AllLeadsPage'
import MapPage from './pages/MapPage'
import HistoryPage from './pages/HistoryPage'
import MyListPage from './pages/MyListPage'
import NurturePage from './pages/NurturePage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Today',
  '/all-leads': 'All Leads',
  '/map': 'Map',
  '/history': 'History',
  '/my-list': 'My List',
  '/nurture': 'Nurture',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

// Announces the page name on every route change and moves focus to <main>
// on subsequent navigations (not on initial load, so Tab still reaches the
// skip link first).
function RouteAnnouncer() {
  const location = useLocation()
  const announce = useAnnounce()
  const isFirstRender = useRef(true)

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] ?? 'SalesForge'
    announce(title)

    if (!isFirstRender.current) {
      document.getElementById('main-content')?.focus()
    }
    isFirstRender.current = false
  }, [location.pathname, announce])

  return null
}

export default function App() {
  const { openGlossary } = useHelp()

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="app-header">
        <h1 className="app-title">SalesForge</h1>
        <button type="button" className="help-header-btn" onClick={openGlossary}>
          Help &amp; glossary
        </button>
      </header>
      <AppNav />
      <RouteAnnouncer />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/all-leads" element={<AllLeadsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/my-list" element={<MyListPage />} />
          <Route path="/nurture" element={<NurturePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </>
  )
}
