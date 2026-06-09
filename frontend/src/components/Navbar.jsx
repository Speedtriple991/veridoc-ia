import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-brand-700 font-bold text-lg tracking-tight">
          Veridoc IA
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/invoices" className="text-sm text-gray-600 hover:text-brand-600">
            Facturas
          </Link>
          <Link to="/invoices/upload" className="text-sm text-gray-600 hover:text-brand-600">
            Subir PDF
          </Link>
          <span className="text-xs text-gray-400">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
