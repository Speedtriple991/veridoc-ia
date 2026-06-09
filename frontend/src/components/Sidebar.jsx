import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Upload,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',        icon: FileText,         label: 'Facturas'  },
  { to: '/invoices/upload', icon: Upload,           label: 'Subir PDF' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (to) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <aside
      className={`
        flex flex-col h-screen flex-shrink-0
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-60'}
      `}
      style={{ backgroundColor: '#1E3A2F' }}
    >
      {/* Brand */}
      <div className={`flex items-center h-16 border-b border-white/10 flex-shrink-0 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
        {collapsed ? (
          <span className="font-syne font-bold text-vd-blue text-xl">V</span>
        ) : (
          <>
            <span className="font-syne font-bold text-white text-xl">Verido</span>
            <span className="font-syne font-bold text-vd-blue text-xl">c</span>
            <span className="font-syne font-bold text-white/40 text-sm ml-1 mt-0.5">IA</span>
          </>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
                ${active
                  ? 'bg-vd-blue/20 text-vd-blue'
                  : 'text-white/50 hover:text-white hover:bg-white/5'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-inter font-medium text-sm">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-0.5 flex-shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Salir' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/40 hover:text-vd-red hover:bg-white/5 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={18} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && <span className="font-inter font-medium text-sm">Salir</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir' : 'Contraer'}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-xl
            text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          {collapsed
            ? <ChevronRight size={15} strokeWidth={1.8} />
            : (
              <>
                <ChevronLeft size={15} strokeWidth={1.8} className="flex-shrink-0" />
                <span className="font-inter text-xs">Contraer</span>
              </>
            )}
        </button>
      </div>
    </aside>
  );
}
