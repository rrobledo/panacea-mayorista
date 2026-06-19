import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FileText, BarChart2,
  Settings, LogOut, Menu, X, ChevronDown, Bell, Search,
  Package, ChevronRight, Truck
} from 'lucide-react';
import './layout.css';

const NAV = [
  { label: 'Panel Principal', icon: LayoutDashboard, to: '/' },
  { label: 'Remitos',         icon: Truck,           to: '/remitos' },
  {
    label: 'Entidades', icon: Package, children: [
      { label: 'Productos',  to: '/products'   },
      { label: 'Pedidos',    to: '/orders'     },
      { label: 'Clientes',   to: '/customers'  },
    ]
  },
  { label: 'Gráficos',  icon: BarChart2,     to: '/charts'   },
  { label: 'Reportes',  icon: FileText,      children: [
    { label: 'Grilla de datos',  to: '/reports/grid'      },
    { label: 'Generador',        to: '/reports/builder'   },
    { label: 'Imprimible',       to: '/reports/printable' },
  ]},
  { label: 'Usuarios',      icon: Users,    to: '/users'    },
  { label: 'Configuración', icon: Settings, to: '/settings' },
];

const NavItem = ({ item, collapsed }) => {
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => location.pathname === c.to)
  );

  if (item.children) {
    const active = item.children.some(c => location.pathname === c.to);
    return (
      <div className={`nav-group ${open ? 'open' : ''}`}>
        <button
          className={`nav-link nav-parent ${active ? 'active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <item.icon size={18} className="nav-icon" />
          {!collapsed && <><span className="nav-label">{item.label}</span><ChevronRight size={14} className="nav-arrow" /></>}
        </button>
        {open && !collapsed && (
          <div className="nav-children">
            {item.children.map(c => (
              <Link
                key={c.to}
                to={c.to}
                className={`nav-link nav-child ${location.pathname === c.to ? 'active' : ''}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} className="nav-icon" />
      {!collapsed && <span className="nav-label">{item.label}</span>}
    </Link>
  );
};

export const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [userMenu, setUserMenu]         = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">P</div>
            {!collapsed && <span className="logo-text">Panacea Mayorista</span>}
          </div>
          <button className="btn btn-ghost btn-icon hide-mobile" onClick={() => setCollapsed(c => !c)}>
            <Menu size={16} />
          </button>
          <button className="btn btn-ghost btn-icon show-mobile" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => (
            <NavItem key={i} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link w-full" onClick={handleLogout}>
            <LogOut size={18} className="nav-icon" />
            {!collapsed && <span className="nav-label">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="main-area">
        {/* Header */}
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-icon show-mobile" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="search-box hide-mobile">
              <Search size={15} />
              <input placeholder="Buscar…" className="search-input" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-icon">
              <Bell size={18} />
            </button>
            <div className="user-menu-wrap">
              <button className="user-btn" onClick={() => setUserMenu(o => !o)}>
                <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
                <div className="hide-mobile">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{user?.email}</div>
                </div>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="user-dropdown">
                  <Link to="/settings/profile" className="dropdown-item" onClick={() => setUserMenu(false)}>Perfil</Link>
                  <Link to="/settings"         className="dropdown-item" onClick={() => setUserMenu(false)}>Configuración</Link>
                  <hr className="divider" />
                  <button className="dropdown-item text-danger" onClick={handleLogout}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
