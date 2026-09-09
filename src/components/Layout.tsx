import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '總覽', end: true },
  { to: '/purchase', label: '購置' },
  { to: '/fixed', label: '固定' },
  { to: '/charges', label: '充電' },
  { to: '/backup', label: '備份' },
]

export function Layout() {
  return (
    <div className="shell">
      <div className="cable" aria-hidden="true" />
      <header className="topbar">
        <p className="eyebrow">行程電腦</p>
        <h1 className="brand">豆灰仔</h1>
      </header>
      <nav className="nav" aria-label="主要">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
