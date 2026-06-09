import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconFileOff,
} from '@tabler/icons-react';
import { getSession, getTenant } from '../config/tenants.js';

const T = { syne: 'Syne, sans-serif', dm: '"DM Sans", sans-serif' };

// ─── helpers ──────────────────────────────────────────────────────────────────

function base64ToBlobUrl(b64) {
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
}

function dot(value) {
  const has = value !== null && value !== undefined && String(value).trim() !== '';
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      backgroundColor: has ? '#4CAF8A' : '#E57373',
    }} />
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 10.5, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function Field({ label, value, onChange, type = 'text', prefix, danger }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 11, color: danger ? '#E57373' : '#6B7280' }}>
          {label}
        </label>
        {dot(value)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {prefix && (
          <span style={{
            fontFamily: T.dm, fontSize: 12,
            color: danger ? '#E57373' : '#9CA3AF',
            backgroundColor: danger ? '#FFF1F1' : '#F9FAFB',
            border: `1px solid ${danger ? '#FFCDD2' : '#E8E8F0'}`, borderRight: 'none',
            borderRadius: '7px 0 0 7px', padding: '6px 8px', flexShrink: 0,
          }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            fontFamily: T.dm, fontWeight: 400, fontSize: 12.5,
            color: danger ? '#E57373' : '#1E3A2F',
            backgroundColor: danger ? '#FFF8F8' : '#fff',
            border: `1px solid ${danger ? '#FFCDD2' : '#E8E8F0'}`,
            borderRadius: prefix ? '0 7px 7px 0' : 7,
            padding: '6px 10px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = danger ? '#E57373' : '#4CAF8A'; }}
          onBlur={(e)  => { e.target.style.borderColor = danger ? '#FFCDD2' : '#E8E8F0'; }}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function InvoiceReview() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const session    = getSession();
  const tenant     = getTenant();
  const STORAGE_KEY = `veridoc_invoices_${session?.tenant ?? 'gonzalezlara'}`;

  const [invoice, setInvoice]   = useState(null);
  const [allInvoices, setAll]   = useState([]);
  const [fields, setFields]     = useState(null);
  const [pdfUrl, setPdfUrl]     = useState(null);
  const blobRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    setAll(stored);
    const inv = stored.find((i) => i.id === id);
    if (!inv) { navigate('/dashboard'); return; }
    setInvoice(inv);
    const invAbono = inv.extracted_data?.es_abono === true;
    const absAmt   = (v) => (invAbono && v != null) ? Math.abs(v) : (v ?? '');
    setFields({
      razon_social:   inv.supplier_name ?? '',
      numero_factura: inv.extracted_data?.invoice_number ?? '',
      fecha_factura:  inv.extracted_data?.invoice_date   ?? '',
      base_imponible: absAmt(inv.extracted_data?.base_imponible),
      porcentaje_iva: (() => {
        const raw  = inv.extracted_data?.porcentaje_iva;
        if (raw != null && raw !== 0) return raw;
        const base = Math.abs(Number(inv.extracted_data?.base_imponible ?? 0));
        const iva  = Math.abs(Number(inv.extracted_data?.importe_iva ?? 0));
        return base > 0 ? Math.round((iva / base) * 100) : '';
      })(),
      importe_iva:    absAmt(inv.extracted_data?.importe_iva),
      total_factura:  absAmt(inv.extracted_data?.total_amount),
      forma_pago:     inv.extracted_data?.forma_pago     ?? '',
      vencimiento:    inv.extracted_data?.vencimiento    ?? '',
    });

    if (inv.pdf_base64) {
      const url = base64ToBlobUrl(inv.pdf_base64);
      blobRef.current = url;
      setPdfUrl(url);
    }

    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, [id]);

  const set = (key) => (val) => setFields((prev) => ({ ...prev, [key]: val }));

  const saveAndNavigate = (nextStatus) => {
    const isAbono    = invoice.extracted_data?.es_abono === true;
    const negIfAbono = (v) => (v != null && isAbono && v > 0) ? -v : v;
    const updated = allInvoices.map((inv) => {
      if (inv.id !== id) return inv;
      return {
        ...inv,
        supplier_name: fields.razon_social,
        status:        nextStatus,
        isNew:         false,
        extracted_data: {
          ...inv.extracted_data,
          invoice_number: fields.numero_factura,
          invoice_date:   fields.fecha_factura,
          base_imponible: negIfAbono(fields.base_imponible !== '' ? parseFloat(fields.base_imponible) : null),
          porcentaje_iva: fields.porcentaje_iva !== '' ? parseInt(fields.porcentaje_iva, 10) : null,
          importe_iva:    negIfAbono(fields.importe_iva    !== '' ? parseFloat(fields.importe_iva)    : null),
          total_amount:   negIfAbono(fields.total_factura  !== '' ? parseFloat(fields.total_factura)  : null),
          forma_pago:     fields.forma_pago,
          vencimiento:    fields.vencimiento,
        },
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const currentIdx = updated.findIndex((i) => i.id === id);
    const next = updated.find((i, idx) => idx > currentIdx && i.status === 'pending_review');
    if (next) navigate(`/review/${next.id}`);
    else navigate('/dashboard');
  };

  const handleValidate = () => saveAndNavigate('approved');
  const handleSkip     = () => {
    const currentIdx = allInvoices.findIndex((i) => i.id === id);
    const next = allInvoices.find((i, idx) => idx > currentIdx && i.status === 'pending_review');
    if (next) navigate(`/review/${next.id}`);
    else navigate('/dashboard');
  };

  // prev/next for header nav (all invoices, not just pending)
  const currentIdx = allInvoices.findIndex((i) => i.id === id);
  const prevInv    = allInvoices[currentIdx - 1];
  const nextInv    = allInvoices[currentIdx + 1];

  if (!invoice || !fields) return null;

  const isAbono = invoice.extracted_data?.es_abono === true;

  const STATUS_CFG = {
    pending_review: { label: 'Pendiente revisión', bg: '#FFF8EC', color: '#92530A', border: '#F5D99A' },
    approved:       { label: 'Validada',            bg: '#F0FAF6', color: '#1B7A5A', border: '#A8E6CF' },
    rejected:       { label: 'Incidencia',          bg: '#FFF1F1', color: '#C62828', border: '#FFCDD2' },
  };
  const sc = STATUS_CFG[invoice.status] ?? STATUS_CFG.pending_review;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F4F4F8', overflow: 'hidden' }}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 50, flexShrink: 0,
        backgroundColor: '#fff', borderBottom: '1px solid #E8E8F0',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <IconArrowLeft size={15} stroke={1.8} />
          <span style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12 }}>Volver</span>
        </button>

        <div style={{ width: 1, height: 18, background: '#E8E8F0' }} />

        <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12.5, color: '#1E3A2F', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {invoice.original_filename}
        </p>

        <span style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 10.5, color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
          {sc.label}
        </span>

        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => prevInv && navigate(`/review/${prevInv.id}`)}
            disabled={!prevInv}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E8F0', background: '#fff', cursor: prevInv ? 'pointer' : 'default', opacity: prevInv ? 1 : 0.35 }}
          >
            <IconChevronLeft size={14} stroke={1.8} color="#6B7280" />
          </button>
          <button
            onClick={() => nextInv && navigate(`/review/${nextInv.id}`)}
            disabled={!nextInv}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E8F0', background: '#fff', cursor: nextInv ? 'pointer' : 'default', opacity: nextInv ? 1 : 0.35 }}
          >
            <IconChevronRight size={14} stroke={1.8} color="#6B7280" />
          </button>
          <span style={{ fontFamily: T.dm, fontSize: 11, color: '#9CA3AF', alignSelf: 'center', paddingLeft: 4 }}>
            {currentIdx + 1} / {allInvoices.length}
          </span>
        </div>
      </header>

      {/* ── BODY: split panels ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — PDF viewer (45%) */}
        <div style={{
          width: '45%', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #E8E8F0',
          backgroundColor: '#2B2B2B',
        }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Factura PDF"
              style={{ flex: 1, border: 'none', width: '100%' }}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconFileOff size={22} color="rgba(255,255,255,0.3)" stroke={1.4} />
              </div>
              <p style={{ fontFamily: T.dm, fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, textAlign: 'center', maxWidth: 200 }}>
                PDF no disponible para esta factura
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — fields (55%) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Right header */}
          <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #E8E8F0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 13.5, color: '#1E3A2F', margin: 0 }}>
              Datos extraídos por IA
            </p>
            <span style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 10.5, color: '#1B7A5A', backgroundColor: '#F0FAF6', border: '1px solid #A8E6CF', borderRadius: 20, padding: '3px 10px' }}>
              ✓ Confianza alta
            </span>
          </div>

          {/* Fields scroll area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, backgroundColor: '#F4F4F8' }}>

            {/* Abono banner */}
            {isAbono && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                backgroundColor: '#FFF8EC', border: '1px solid #F5D99A',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                <div>
                  <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 11, color: '#92530A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Factura de abono
                  </p>
                  <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#B07030', margin: '3px 0 0', lineHeight: 1.5 }}>
                    Nota de crédito o factura rectificativa. Los importes se guardarán con signo negativo.
                  </p>
                </div>
              </div>
            )}

            {/* Identificación */}
            <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E8E8F0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel>Identificación</SectionLabel>
              <Field label="Razón social"    value={fields.razon_social}   onChange={set('razon_social')} />
              <Field label="Nº de factura"   value={fields.numero_factura} onChange={set('numero_factura')} />
              <Field label="Fecha factura"   value={fields.fecha_factura}  onChange={set('fecha_factura')} />
            </div>

            {/* Importes */}
            <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E8E8F0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel>Importes</SectionLabel>
              <Field label="Base imponible" value={fields.base_imponible} onChange={set('base_imponible')} type="number" prefix="€" danger={isAbono} />
              {tenant.erp === 'mygestion' && (
                <Field label="% IVA" value={fields.porcentaje_iva} onChange={set('porcentaje_iva')} type="number" prefix="%" />
              )}
              <Field label="Importe IVA"    value={fields.importe_iva}    onChange={set('importe_iva')}    type="number" prefix="€" danger={isAbono} />
              <Field label="Total factura"  value={fields.total_factura}  onChange={set('total_factura')}  type="number" prefix="€" danger={isAbono} />
            </div>

            {/* Pago */}
            <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E8E8F0', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionLabel>Pago</SectionLabel>
              <Field label="Forma de pago" value={fields.forma_pago}  onChange={set('forma_pago')} />
              <Field label="Vencimiento"   value={fields.vencimiento} onChange={set('vencimiento')} />
            </div>

          </div>

          {/* Footer actions */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #E8E8F0', backgroundColor: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          }}>
            <button
              onClick={handleSkip}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                color: '#374151', backgroundColor: '#fff',
                border: '1px solid #E8E8F0', borderRadius: 8,
                padding: '8px 16px', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
            >
              Omitir
            </button>
            <button
              onClick={handleValidate}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                color: '#fff', backgroundColor: '#1E3A2F',
                border: 'none', borderRadius: 8,
                padding: '8px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#162e24'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E3A2F'; }}
            >
              <IconCheck size={14} stroke={2.2} />
              Validar y siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
