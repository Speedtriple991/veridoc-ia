import { useState, useEffect } from 'react';
import { Link, useNavigate as useNav } from 'react-router-dom';
import {
  IconHome2,
  IconReceipt2,
  IconCloudUpload,
  IconSettings,
  IconLogout,
  IconSearch,
  IconFileSpreadsheet,
  IconFileCode,
  IconTrash,
  IconFileCheck,
} from '@tabler/icons-react';
import api from '../api/axios.js';
import { getTenant, getSession, clearSession } from '../config/tenants.js';
import { supabase } from '../lib/supabase.js';
import { TenantLogo } from './Login.jsx';
import UploadModal from '../components/UploadModal.jsx';
import { exportXmlAlbaIbs }                        from '../services/exporters/xmlAlbaIbs.js';
import { exportExcelMyGestion, exportExcelGenerico } from '../services/exporters/excelMyGestion.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function fmtAmount(v, cur = 'EUR') {
  if (v == null) return '—';
  return new Intl.NumberFormat('es', {
    style: 'currency', currency: cur, maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

const PALETTE = ['#4CAF8A', '#6C8EF5', '#E8A030', '#E57373', '#9C8EF5', '#50B8C6'];
const avatarColor = (name = '') => PALETTE[(name.charCodeAt(0) ?? 0) % PALETTE.length];


// ─── status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending_review: { label: 'Pendiente',  badgeBg: '#FFF8EC', badgeText: '#92530A', border: '#F5D99A' },
  approved:       { label: 'Validada',   badgeBg: '#F0FAF6', badgeText: '#1B7A5A', border: '#A8E6CF' },
  rejected:       { label: 'Incidencia', badgeBg: '#FFF1F1', badgeText: '#C62828', border: '#FFCDD2' },
};

// ─── export format config ─────────────────────────────────────────────────────

const EXPORT_BTNS = {
  xmlAlbaIbs:     { Icon: IconFileCode,        label: 'XML AlbaIBS'     },
  excelMyGestion: { Icon: IconFileSpreadsheet, label: 'Excel myGESTIÓN' },
  excel:          { Icon: IconFileSpreadsheet, label: 'Excel genérico'   },
};

// ─── nav items ────────────────────────────────────────────────────────────────

const NAV_TOP = [
  { Icon: IconHome2,    label: 'Dashboard', to: '/'         },
  { Icon: IconReceipt2, label: 'Facturas',  to: '/invoices' },
];
const NAV_BOT = [
  { Icon: IconCloudUpload, label: 'Subir',   to: '/invoices/upload' },
  { Icon: IconSettings,    label: 'Ajustes', to: '/settings'        },
];

// ─── shared inline styles ─────────────────────────────────────────────────────

const T = { syne: 'Syne, sans-serif', dm: '"DM Sans", sans-serif' };

// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNav();
  const session  = getSession();
  const tenant   = getTenant();                                       // dentro del componente → siempre fresco
  const STORAGE_KEY = `veridoc_invoices_${session?.tenant ?? 'gonzalezlara'}`;

  const [invoices, setInvoices]   = useState([]);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [activeNav, setActiveNav] = useState('/');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(stored)) setInvoices(stored);
  }, []);

  const addInvoices = (newInvoices) => {
    setInvoices((prev) => {
      const merged = [...newInvoices, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
    setModalOpen(false);
  };

  const handleExport = (fmt) => {
    const f = fmt ?? tenant.exportFormats?.[0];
    const validated = invoices.filter((i) => i.status === 'approved');
    if (validated.length === 0) { alert('No hay facturas validadas para exportar.'); return; }
    if (f === 'xmlAlbaIbs')     exportXmlAlbaIbs(invoices);
    else if (f === 'excelMyGestion') exportExcelMyGestion(invoices);
    else if (f === 'excel')     exportExcelGenerico(invoices);
  };

  const deleteInvoice = (id) => {
    if (!window.confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
    setInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const pending   = invoices.filter((i) => i.status === 'pending_review');
  const incidents = invoices.filter((i) => i.status === 'rejected');
  const approved  = invoices.filter((i) => i.status === 'approved');
  const totalBase = invoices.reduce((s, i) => {
    const val     = i.extracted_data?.total_amount ?? 0;
    const isAbono = i.extracted_data?.es_abono === true;
    return s + (isAbono && val > 0 ? -val : val);
  }, 0);

  const filtered = invoices
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return i.supplier_name?.toLowerCase().includes(q) || i.original_filename?.toLowerCase().includes(q);
    });

  const firstName     = session?.email?.split('@')[0] ?? 'usuario';
  const avatarInitials = (session?.email ?? 'MA').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F4F4F8' }}>

      {/* ══ BARRA DE IDENTIDAD DEL CLIENTE — full width, encima de todo ══════ */}
      <div style={{
        height: 46, flexShrink: 0, backgroundColor: '#1E3A2F',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '0 24px',
      }}>
        {tenant.logo ? (
          <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: 6,
            padding: '4px 10px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', height: 34,
          }}>
            <img
              src={tenant.logo}
              alt={tenant.nombre}
              style={{ height: 28, maxWidth: 110, objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
            />
          </div>
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: T.syne,
          }}>
            {tenant.iniciales}
          </div>
        )}
        <span style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 13, color: '#fff' }}>
          {tenant.nombre}
        </span>
      </div>

      {/* ══ FILA PRINCIPAL: sidebar + contenido ══════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside style={{
        width: 180, minWidth: 180, flexShrink: 0, backgroundColor: '#1E3A2F',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 14, paddingBottom: 14, gap: 0,
      }}>
        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
          {[
            ...NAV_TOP,
            ...(session?.tenant === 'solvinco'
              ? [{ Icon: IconFileCheck, label: 'Albaranes', to: '/albaranes' }]
              : []),
            ...NAV_BOT,
          ].map(({ Icon, label, to }) => {
            const active = activeNav === to;
            return (
              <Link
                key={to}
                to={to}
                title={label}
                onClick={() => setActiveNav(to)}
                style={{
                  width: '100%', height: 36,
                  display: 'flex', alignItems: 'center', gap: 9,
                  borderRadius: 8, textDecoration: 'none', padding: '0 10px', boxSizing: 'border-box',
                  color: active ? '#4CAF8A' : 'rgba(255,255,255,0.45)',
                  backgroundColor: active ? 'rgba(76,175,138,0.15)' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                  fontFamily: T.dm, fontWeight: active ? 500 : 400, fontSize: 12,
                }}
              >
                <Icon size={16} stroke={1.6} style={{ flexShrink: 0 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout + avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button
            title="Cerrar sesión"
            onClick={async () => { await supabase.auth.signOut(); clearSession(); navigate('/login'); }}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#E57373'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <IconLogout size={16} stroke={1.6} />
          </button>

          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            backgroundColor: '#4CAF8A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.syne, fontWeight: 700, fontSize: 9.5, color: '#fff',
            cursor: 'default', userSelect: 'none',
          }}>
            {avatarInitials}
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <header style={{
          height: 50, flexShrink: 0,
          backgroundColor: '#fff', borderBottom: '1px solid #E8E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <div>
            <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13.5, color: '#1E3A2F', margin: 0, lineHeight: 1 }}>
              {getGreeting()}, {firstName}
            </p>
            <p style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 10.5, color: '#9CA3AF', margin: '2px 0 0', lineHeight: 1 }}>
              {tenant.nombre} · Mayo 2026
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExport()}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                color: '#6B7280', backgroundColor: '#fff',
                border: '1px solid #E8E8F0', borderRadius: 8,
                padding: '6px 12px', cursor: 'pointer',
              }}
            >
              Exportar validadas ({approved.length})
            </button>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                color: '#fff', backgroundColor: '#1E3A2F',
                border: 'none', borderRadius: 8,
                padding: '6px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <IconCloudUpload size={14} stroke={1.8} />
              Subir facturas
            </button>
          </div>
        </header>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Alert cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <AlertCard count={pending.length}   label="Pendientes"  sub="Requieren revisión"    color="#E8A030" bg="#FFF8EC" border="#F5D99A" />
            <AlertCard count={incidents.length} label="Incidencias" sub="Datos no extraíbles"   color="#E57373" bg="#FFF1F1" border="#FFCDD2" />
            <AlertCard count={approved.length}  label="Validadas"   sub="Listas para exportar"  color="#3DB88A" bg="#F0FAF6" border="#A8E6CF" />
          </div>

          {/* Tabs + search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 2, backgroundColor: '#E8E8F0', padding: 4, borderRadius: 10 }}>
              {[
                { key: 'all',            label: 'Todas',       n: invoices.length   },
                { key: 'pending_review', label: 'Pendientes',  n: pending.length    },
                { key: 'rejected',       label: 'Incidencias', n: incidents.length  },
                { key: 'approved',       label: 'Validadas',   n: approved.length   },
              ].map(({ key, label, n }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    fontFamily: T.dm, fontWeight: filter === key ? 500 : 400, fontSize: 12,
                    color: filter === key ? '#1E3A2F' : '#9CA3AF',
                    backgroundColor: filter === key ? '#fff' : 'transparent',
                    border: 'none', borderRadius: 7,
                    padding: '5px 11px', cursor: 'pointer',
                    boxShadow: filter === key ? '0 1px 2px rgba(0,0,0,0.07)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}&nbsp;<span style={{ opacity: 0.45, fontSize: 11 }}>{n}</span>
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <IconSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Buscar proveedor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  fontFamily: T.dm, fontSize: 12, color: '#374151',
                  backgroundColor: '#fff', border: '1px solid #E8E8F0',
                  borderRadius: 8, padding: '6px 12px 6px 28px',
                  outline: 'none', width: 200,
                }}
              />
            </div>
          </div>

          {/* Invoice list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {invoices.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F0FAF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconReceipt2 size={32} stroke={1.2} color="#4CAF8A" />
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: '#1E3A2F', margin: 0 }}>
                    No hay facturas aún
                  </p>
                  <p style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                    Sube tus primeras facturas para comenzar a extraer datos automáticamente
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    fontFamily: T.dm, fontWeight: 500, fontSize: 13,
                    color: '#fff', backgroundColor: '#1E3A2F',
                    border: 'none', borderRadius: 10,
                    padding: '10px 22px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginTop: 4,
                  }}
                >
                  <IconCloudUpload size={16} stroke={1.8} />
                  Subir tus primeras facturas
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <p style={{ fontFamily: T.dm, fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '32px 0', margin: 0 }}>
                Sin resultados para este filtro.
              </p>
            ) : (
              filtered.map((inv) => <InvoiceRow key={inv.id} invoice={inv} onDelete={deleteInvoice} />)
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid #E8E8F0',
          }}>
            <p style={{ fontFamily: T.dm, fontWeight: 300, fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              {invoices.length} facturas · Mayo 2026 · {fmtAmount(totalBase)} base imponible
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {(tenant.exportFormats ?? []).map((fmt) => {
                const cfg = EXPORT_BTNS[fmt];
                if (!cfg) return null;
                return <ExportBtn key={fmt} Icon={cfg.Icon} label={cfg.label} onClick={() => handleExport(fmt)} />;
              })}
            </div>
          </div>

        </main>
      </div>

      </div>{/* fin fila principal sidebar+contenido */}

      {modalOpen && (
        <UploadModal
          onClose={() => setModalOpen(false)}
          onSuccess={addInvoices}
        />
      )}
    </div>
  );
}

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({ count, label, sub, color, bg, border }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'default',
        transform: hov ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'transform 0.18s ease',
      }}
    >
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, color, margin: '0 0 5px', lineHeight: 1 }}>
        {count}
      </p>
      <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 11, color, margin: '0 0 2px' }}>
        {label}
      </p>
      <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 10, color, opacity: 0.65, margin: 0 }}>
        {sub}
      </p>
    </div>
  );
}

// ─── InvoiceRow ───────────────────────────────────────────────────────────────

function InvoiceRow({ invoice: inv, onDelete }) {
  const navigate  = useNav();
  const [hov, setHov]         = useState(false);
  const [trashHov, setTrashHov] = useState(false);
  const s        = STATUS_CFG[inv.status] ?? STATUS_CFG.pending_review;
  const isAbono  = inv.extracted_data?.es_abono === true;
  const isNew    = inv.isNew;
  const initials = getInitials(inv.supplier_name);
  const bgColor  = avatarColor(inv.supplier_name);
  const rawAmt   = inv.extracted_data?.total_amount;
  const displayAmt = (isAbono && rawAmt != null && rawAmt > 0) ? -rawAmt : rawAmt;
  const amount   = fmtAmount(displayAmt, inv.extracted_data?.currency);

  return (
    <div
      onClick={() => navigate(`/review/${inv.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        backgroundColor: isNew ? '#F0F4FF' : '#fff',
        border: `0.5px solid ${isNew ? '#C3D0F8' : '#E8E8F0'}`,
        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
        transform: hov ? 'translateY(-1px) scaleY(1.01)' : 'translateY(0) scaleY(1)',
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
        backgroundColor: bgColor, color: '#fff',
        fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 12.5, color: '#1E3A2F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {inv.supplier_name}
        </p>
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 10.5, color: '#9CA3AF', margin: '1px 0 0' }}>
          {inv.extracted_data?.invoice_number ?? inv.original_filename} · {fmtDate(inv.created_at)}
        </p>
      </div>

      {/* Amount */}
      <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 12.5, color: isAbono ? '#E57373' : '#1E3A2F', flexShrink: 0, margin: 0 }}>
        {amount}
      </p>

      {/* Abono badge */}
      {isAbono && (
        <span style={{
          fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: 10,
          color: '#92530A', backgroundColor: '#FFF8EC',
          border: '1px solid #F5D99A',
          borderRadius: 6, padding: '2px 7px', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          Abono
        </span>
      )}

      {/* Status badge */}
      <span style={{
        fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 10.5,
        color: s.badgeText, backgroundColor: s.badgeBg,
        border: `1px solid ${s.border}`,
        borderRadius: 6, padding: '2px 7px', flexShrink: 0,
      }}>
        {s.label}
      </span>

      {/* Delete button — visible solo en hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(inv.id); }}
        onMouseEnter={(e) => { e.stopPropagation(); setTrashHov(true); }}
        onMouseLeave={() => setTrashHov(false)}
        title="Eliminar factura"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          border: 'none', cursor: 'pointer',
          backgroundColor: trashHov ? '#FFF1F1' : 'transparent',
          color: trashHov ? '#E57373' : '#D1D5DB',
          opacity: hov ? 1 : 0,
          transition: 'opacity 0.15s, background 0.15s, color 0.15s',
        }}
      >
        <IconTrash size={14} stroke={1.8} />
      </button>
    </div>
  );
}

// ─── ExportBtn ────────────────────────────────────────────────────────────────

function ExportBtn({ Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: '"DM Sans", sans-serif', fontWeight: 500, fontSize: 11,
        color: '#374151', backgroundColor: '#fff',
        border: '1px solid #E8E8F0', borderRadius: 7,
        padding: '5px 10px', cursor: 'pointer',
      }}
    >
      <Icon size={13} stroke={1.6} />
      {label}
    </button>
  );
}
