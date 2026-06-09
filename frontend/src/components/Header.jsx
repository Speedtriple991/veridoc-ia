import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const BADGES = [
  {
    key: 'pending',
    icon: Clock,
    label: 'pendientes',
    color: 'text-vd-amber',
    bg: 'bg-vd-amber/10',
  },
  {
    key: 'incidents',
    icon: AlertTriangle,
    label: 'incidencias',
    color: 'text-vd-red',
    bg: 'bg-vd-red/10',
  },
  {
    key: 'approved',
    icon: CheckCircle,
    label: 'listas',
    color: 'text-vd-green',
    bg: 'bg-vd-green/10',
  },
];

export default function Header() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ pending: 0, incidents: 0, approved: 0 });

  useEffect(() => {
    api.get('/invoices')
      .then(({ data }) => {
        setCounts({
          pending:   data.filter((i) => i.status === 'pending_review').length,
          incidents: data.filter((i) => i.status === 'rejected').length,
          approved:  data.filter((i) => i.status === 'approved').length,
        });
      })
      .catch(() => {});
  }, []);

  const firstName = user?.email?.split('@')[0] ?? 'usuario';

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-vd-white border-b border-vd-border flex-shrink-0">
      {/* Greeting */}
      <div>
        <p className="font-syne font-bold text-vd-sidebar text-lg leading-none">
          {getGreeting()}, {firstName}
        </p>
        <p className="font-inter font-light text-sm text-gray-400 mt-0.5">
          Aquí tienes el resumen de hoy
        </p>
      </div>

      {/* Alert badges */}
      <div className="flex items-center gap-2">
        {BADGES.map(({ key, icon: Icon, label, color, bg }) => (
          <div
            key={key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${bg}`}
          >
            <Icon size={13} strokeWidth={2} className={color} />
            <span className={`font-inter font-medium text-sm ${color}`}>
              {counts[key]}
            </span>
            <span className={`font-inter font-light text-xs ${color} opacity-70 hidden sm:inline`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
