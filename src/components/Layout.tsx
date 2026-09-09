import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SignIn } from './SignIn'

const links = [
  { to: '/', label: '總覽', end: true },
  { to: '/charges', label: '充電' },
  { to: '/other', label: '其他', match: ['/other', '/fixed', '/backup'] },
  { to: '/purchase', label: '購置' },
]

export function Layout() {
  const { user, ready, signOutUser } = useAuth()
  const location = useLocation()

  return (
    <div className="shell">
      <div className="cable" aria-hidden="true" />
      <header className="topbar">
        <div>
          <p className="eyebrow">行程電腦</p>
          <h1 className="brand">豆灰仔</h1>
        </div>
        {user ? (
          <div className="account">
            {user.photoURL ? <img src={user.photoURL} alt="" className="avatar" /> : null}
            <span className="account-name">{user.displayName || user.email}</span>
            <button type="button" className="btn tiny" onClick={() => void signOutUser()}>
              登出
            </button>
          </div>
        ) : null}
      </header>
      {!ready ? (
        <p className="fine main">讀取帳號…</p>
      ) : !user ? (
        <main className="main">
          <SignIn />
        </main>
      ) : (
        <>
          <nav className="nav" aria-label="主要">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => {
                  const grouped = link.match?.includes(location.pathname) ?? false
                  return isActive || grouped ? 'nav-link is-active' : 'nav-link'
                }}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <main className="main">
            <Outlet />
          </main>
        </>
      )}
    </div>
  )
}
