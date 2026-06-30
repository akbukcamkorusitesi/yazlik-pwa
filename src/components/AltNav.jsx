import { useLocation, useNavigate } from 'react-router-dom'

const MENÜ = [
  { yol: '/',         ikon: '🏠', etiket: 'Ana Sayfa' },
  { yol: '/rehber',   ikon: '👥', etiket: 'Rehber'    },
  { yol: '/talepler', ikon: '🔧', etiket: 'Talepler'  },
  { yol: '/aidatlar', ikon: '💰', etiket: 'Aidatlar'  },
  { yol: '/profil',   ikon: '👤', etiket: 'Profil'    },
]

export default function AltNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="alt-nav">
      {MENÜ.map(item => (
        <button
          key={item.yol}
          className={`alt-nav-item ${pathname === item.yol ? 'aktif' : ''}`}
          onClick={() => navigate(item.yol)}
        >
          <span className="alt-nav-ikon">{item.ikon}</span>
          {item.etiket}
        </button>
      ))}
    </nav>
  )
}
