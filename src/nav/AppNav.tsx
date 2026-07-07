import { Link, useMatch, useResolvedPath } from 'react-router-dom'

interface NavItemProps {
  to: string
  label: string
  end?: boolean
}

function NavItem({ to, label, end = false }: NavItemProps) {
  const resolved = useResolvedPath(to)
  const match = useMatch({ path: resolved.pathname, end })
  const isActive = match !== null

  return (
    <li>
      <Link
        to={to}
        aria-current={isActive ? 'page' : undefined}
        className={`nav-link${isActive ? ' nav-link--active' : ''}`}
      >
        {label}
      </Link>
    </li>
  )
}

const NAV_SECTIONS: NavItemProps[] = [
  { to: '/', label: 'Today', end: true },
  { to: '/all-leads', label: 'All Leads' },
  { to: '/map', label: 'Map' },
  { to: '/history', label: 'History' },
  { to: '/my-list', label: 'My List' },
  { to: '/nurture', label: 'Nurture' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function AppNav() {
  return (
    <nav className="app-nav" aria-label="Main navigation">
      <ul className="nav-list" role="list">
        {NAV_SECTIONS.map(({ to, label, end }) => (
          <NavItem key={to} to={to} label={label} end={end} />
        ))}
      </ul>
    </nav>
  )
}
