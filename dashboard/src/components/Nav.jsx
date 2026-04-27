import { NavLink, Link } from 'react-router-dom'

const ITEMS = [
  { to: '/',            label: 'Home',        end: true },
  { to: '/findings',    label: 'Findings' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/explore',     label: 'Explore' },
]

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border h-14 flex items-center justify-between px-8">
      <Link to="/" className="flex items-baseline gap-3 no-underline">
        <span
          className="text-lg text-ink"
          style={{ fontFamily: '"DM Serif Display", serif', letterSpacing: '-0.3px' }}
        >
          Congress on <em>Twitter</em>
        </span>
        <span className="text-[11px] mono text-ink-faint uppercase tracking-wide">
          118th Congress
        </span>
      </Link>

      <div className="flex gap-1">
        {ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium no-underline transition-all ${
                isActive
                  ? 'text-gold bg-[var(--gold-dim)]'
                  : 'text-ink-muted hover:text-ink'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
