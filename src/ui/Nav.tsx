import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Analyzer' },
  { to: '/best-move', label: 'Best move' },
  { to: '/play', label: 'Play vs computer' },
  { to: '/freestyle', label: 'Chess960' },
  { to: '/import', label: 'Import game' },
]

export function Nav() {
  return (
    <nav>
      {LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} end>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
