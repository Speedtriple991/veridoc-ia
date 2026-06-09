import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowLeft, IconFileUpload, IconFileEuro,
  IconShoppingCart, IconCheck, IconAlertTriangle, IconX, IconTrash,
} from '@tabler/icons-react';
import { getTenant } from '../config/tenants.js';
import { extractAlbaran, extractFacturaTrimo } from '../services/extractAlbaranes.js';
import { exportMyGestion } from '../services/exportMyGestion.js';

const T = { syne: 'Syne, sans-serif', dm: '"DM Sans", sans-serif' };
const STORAGE_KEY = 'solvinco_albaranes';

// ─── localStorage ──────────────────────────────────────────────────────────────

function loadCuadres() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function saveCuadres(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlobUrl(b64) {
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
}

function fmtNum(v, dec = 1) {
  if (v == null) return '—';
  return Number(v).toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtEur(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(v);
}
function stripExt(name) {
  return (name ?? '').replace(/\.[^/.]+$/, '');
}
function fmtFecha(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}
function getCornerType(desc) {
  if (!desc) return null;
  const low = desc.toLowerCase();
  if (low.includes('l-shaped'))                           return 'corner longitudinal';
  if (low.includes('combined'))                           return 'corners transversales';
  if (low.includes('u-corner') || low.includes('u corner')) return 'U-corner';
  return null;
}

function buildReconciliation(albaran, factura) {
  const albLineas  = albaran?.extracted?.lineas   ?? [];
  const facPaneles = factura?.extracted?.paneles  ?? [];
  const facBending = factura?.extracted?.bending  ?? [];

  const codes = [...new Set([
    ...albLineas.map((l) => l.codigo).filter(Boolean),
    ...facPaneles.map((l) => l.codigo).filter(Boolean),
  ])];

  const rows = codes.map((codigo) => {
    const alb   = albLineas.find((l)  => l.codigo === codigo) ?? null;
    const fac   = facPaneles.find((l) => l.codigo === codigo) ?? null;
    const albM2 = alb?.m2 ?? 0;
    const facM2 = fac?.m2 ?? 0;
    const diff  = albM2 - facM2;
    const ok    = alb && fac && Math.abs(diff) < 0.1;
    return { codigo, alb, fac, diff, ok };
  });

  const verdictOk = rows.length > 0 && rows.every((r) => r.ok);
  return { rows, bending: facBending, verdictOk };
}

// ─── badge config por estado ──────────────────────────────────────────────────

const STATUS_CFG = {
  validado:         { label: 'Validado',         bg: '#F0FAF6', text: '#1B7A5A', border: '#A8E6CF' },
  incidencia:       { label: 'Incidencia',        bg: '#FFF1F1', text: '#C62828', border: '#FFCDD2' },
  pendiente_pedido: { label: 'Pendiente pedido',  bg: '#FFF8EC', text: '#92530A', border: '#F5D99A' },
  exportado:        { label: 'Exportado',         bg: '#F9FAFB', text: '#6B7280', border: '#E8E8F0' },
};

// ═════════════════════════════════════════════════════════════════════════════
export default function AlbaranesPage() {
  const navigate = useNavigate();
  const tenant   = getTenant();

  const [docs,         setDocs]         = useState({ albaran: null, factura: null, pedido: null });
  const [loadingDoc,   setLoadingDoc]   = useState({ albaran: false, factura: false, pedido: false });
  const [pdfPanel,     setPdfPanel]     = useState(null);
  const [errors,       setErrors]       = useState({});
  // ref para cleanup de blobUrls en unmount sin closures stale
  const docsRef = useRef({ albaran: null, factura: null, pedido: null });
  const [savedCuadres, setSavedCuadres] = useState(() => loadCuadres());
  const [saved,        setSaved]        = useState(false); // feedback visual

  useEffect(() => () => {
    Object.values(docsRef.current).forEach((d) => d?.blobUrl && URL.revokeObjectURL(d.blobUrl));
  }, []);

  const anyLoaded     = docs.albaran || docs.factura || docs.pedido;
  const bothLoaded    = docs.albaran && docs.factura;
  const pedidoPending = docs.albaran && docs.factura && !docs.pedido;
  const recon         = bothLoaded ? buildReconciliation(docs.albaran, docs.factura) : null;

  const handleFile = async (type, file) => {
    setErrors((prev) => ({ ...prev, [type]: null }));
    setSaved(false);
    setLoadingDoc((prev) => ({ ...prev, [type]: true }));
    try {
      const base64 = await readFileAsBase64(file);
      let extracted;
      if      (type === 'albaran') extracted = await extractAlbaran(base64);
      else if (type === 'factura') extracted = await extractFacturaTrimo(base64);
      else                         extracted = { raw: true };

      const blobUrl = base64ToBlobUrl(base64);
      setDocs((prev) => {
        if (prev[type]?.blobUrl) URL.revokeObjectURL(prev[type].blobUrl);
        const next = { ...prev, [type]: { name: file.name, base64, blobUrl, extracted } };
        docsRef.current = next;
        return next;
      });
    } catch (err) {
      setErrors((prev) => ({ ...prev, [type]: err.message }));
    } finally {
      setLoadingDoc((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleOpenPanel = (type) => {
    if (!docs[type]?.blobUrl) return;
    setPdfPanel((prev) => (prev === type ? null : type));
  };

  // ── Guardar cuadre ──────────────────────────────────────────────────────────
  const handleGuardar = () => {
    if (!bothLoaded || !recon) return;
    const estado = recon.verdictOk ? 'validado' : 'incidencia';
    const totalFac = recon.rows.reduce((s, r) => s + (r.fac?.importe ?? 0), 0)
                   + (recon.bending.reduce((s, b) => s + (b.importe ?? 0), 0));
    const cuadre = {
      id:             `cuadre-${Date.now()}`,
      fecha:          new Date().toISOString(),
      albaran_nombre: docs.albaran.name,
      factura_nombre: docs.factura.name,
      pedido_nombre:  docs.pedido?.name ?? null,
      lineas_albaran: docs.albaran.extracted?.lineas   ?? [],
      lineas_factura: docs.factura.extracted?.paneles  ?? [],
      bending:        docs.factura.extracted?.bending  ?? [],
      rows:           recon.rows,
      estado,
      total_factura:  totalFac,
    };
    const updated = [cuadre, ...savedCuadres];
    saveCuadres(updated);
    setSavedCuadres(updated);
    // Reset a estado vacío
    Object.values(docs).forEach((d) => d?.blobUrl && URL.revokeObjectURL(d.blobUrl));
    const emptyDocs = { albaran: null, factura: null, pedido: null };
    docsRef.current = emptyDocs;
    setDocs(emptyDocs);
    setErrors({});
    setPdfPanel(null);
    // Toast
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Recuperar cuadre guardado ───────────────────────────────────────────────
  const handleRecuperar = (cuadre) => {
    Object.values(docs).forEach((d) => d?.blobUrl && URL.revokeObjectURL(d.blobUrl));
    setPdfPanel(null);
    setSaved(false);
    const recovered = {
      albaran: {
        name:      cuadre.albaran_nombre,
        base64:    null,
        blobUrl:   null,
        extracted: { lineas: cuadre.lineas_albaran },
      },
      factura: {
        name:      cuadre.factura_nombre,
        base64:    null,
        blobUrl:   null,
        extracted: { paneles: cuadre.lineas_factura, bending: cuadre.bending },
      },
      pedido: cuadre.pedido_nombre
        ? { name: cuadre.pedido_nombre, base64: null, blobUrl: null, extracted: { raw: true } }
        : null,
    };
    docsRef.current = recovered;
    setDocs(recovered);
  };

  // ── Exportar desde cuadre guardado ─────────────────────────────────────────
  const handleExportarCuadre = (cuadre) => {
    const rows = cuadre.rows.map((r) => ({
      status: 'approved',
      supplier_name: 'Trimo',
      extracted_data: {
        invoice_number: r.codigo,
        invoice_date:   null,
        base_imponible: r.fac?.importe ?? null,
        importe_iva:    null,
        total_amount:   r.fac?.importe ?? null,
        forma_pago:     null,
        vencimiento:    null,
      },
    }));
    exportMyGestion(rows);
    const updated = savedCuadres.map((c) =>
      c.id === cuadre.id ? { ...c, estado: 'exportado' } : c
    );
    saveCuadres(updated);
    setSavedCuadres(updated);
  };

  const handleBorrarCuadre = (id) => {
    if (!window.confirm('¿Eliminar este cuadre? Esta acción no se puede deshacer.')) return;
    const updated = savedCuadres.filter((c) => c.id !== id);
    saveCuadres(updated);
    setSavedCuadres(updated);
  };

  // ── Exportar sesión activa ──────────────────────────────────────────────────
  const handleExport = () => {
    if (!bothLoaded || !recon) return;
    const rows = recon.rows.map((r) => ({
      status: 'approved',
      supplier_name: 'Trimo',
      extracted_data: {
        invoice_number: r.codigo,
        invoice_date:   null,
        base_imponible: r.fac?.importe ?? null,
        importe_iva:    null,
        total_amount:   r.fac?.importe ?? null,
        forma_pago:     null,
        vencimiento:    null,
      },
    }));
    exportMyGestion(rows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F4F4F8' }}>

      {/* ── BARRA IDENTIDAD ──────────────────────────────────────────────── */}
      <div style={{
        height: 46, flexShrink: 0, backgroundColor: '#1E3A2F',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)', fontFamily: T.dm, fontSize: 12, padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
        >
          <IconArrowLeft size={14} stroke={1.8} /> Dashboard
        </button>
        <span style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        {tenant.logo ? (
          <div style={{
            background: 'rgba(255,255,255,0.92)', borderRadius: 6,
            padding: '3px 9px', display: 'flex', alignItems: 'center', height: 30,
          }}>
            <img src={tenant.logo} alt={tenant.nombre} style={{ height: 22, maxWidth: 90, objectFit: 'contain' }} />
          </div>
        ) : (
          <span style={{ fontFamily: T.dm, fontSize: 13, color: '#fff' }}>{tenant.nombre}</span>
        )}
      </div>

      {/* ── TOPBAR ───────────────────────────────────────────────────────── */}
      <header style={{
        height: 54, flexShrink: 0,
        backgroundColor: '#fff', borderBottom: '1px solid #E8E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div>
          <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 14, color: '#1E3A2F', margin: 0, lineHeight: 1 }}>
            Módulo albaranes · Trimo
          </p>
          <p style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 11, color: '#9CA3AF', margin: '3px 0 0', lineHeight: 1 }}>
            Reconciliación albarán · factura · pedido
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botón guardar — solo cuando hay reconciliación activa */}
          {bothLoaded && recon && (
            <button
              onClick={handleGuardar}
              style={{
                fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                color: saved ? '#1B7A5A' : '#1E3A2F',
                backgroundColor: saved ? '#F0FAF6' : '#fff',
                border: `1px solid ${saved ? '#A8E6CF' : '#E8E8F0'}`,
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✓ Guardado' : 'Guardar cuadre'}
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={!bothLoaded}
            style={{
              fontFamily: T.dm, fontWeight: 500, fontSize: 12,
              color: bothLoaded ? '#fff' : '#9CA3AF',
              backgroundColor: bothLoaded ? '#1E3A2F' : '#F4F4F8',
              border: `1px solid ${bothLoaded ? '#1E3A2F' : '#E8E8F0'}`,
              borderRadius: 8, padding: '7px 16px',
              cursor: bothLoaded ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Exportar a myGESTIÓN
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {!anyLoaded ? (

            /* ══ ESTADO VACÍO ══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* Dropzones */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 760 }}>
                  <DropzoneCard type="albaran" icon={IconFileUpload}   title="Albarán"  subtitle="PDF de entrega Trimo"    doc={docs.albaran} loading={loadingDoc.albaran} error={errors.albaran} onFile={handleFile} onOpen={handleOpenPanel} />
                  <DropzoneCard type="factura" icon={IconFileEuro}     title="Factura"  subtitle="PDF de factura Trimo"    doc={docs.factura} loading={loadingDoc.factura} error={errors.factura} onFile={handleFile} onOpen={handleOpenPanel} />
                  <DropzoneCard type="pedido"  icon={IconShoppingCart} title="Pedido"   subtitle="PDF o export myGESTIÓN" doc={docs.pedido}  loading={loadingDoc.pedido}  error={errors.pedido}  onFile={handleFile} onOpen={handleOpenPanel} isPending={false} />
                </div>
                <p style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 13, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
                  Sube los tres documentos para iniciar la reconciliación
                </p>
              </div>

              {/* Cuadres guardados */}
              {savedCuadres.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8F0' }} />
                    <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 11.5, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap' }}>
                      Cuadres anteriores
                    </p>
                    <div style={{ flex: 1, height: 1, backgroundColor: '#E8E8F0' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {savedCuadres.map((c) => (
                      <CuadreCard
                        key={c.id}
                        cuadre={c}
                        onVer={handleRecuperar}
                        onExportar={handleExportarCuadre}
                        onBorrar={handleBorrarCuadre}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : (

            /* ══ ESTADO CON DOCUMENTOS ══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Dropzones compactas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <DropzoneCard type="albaran" icon={IconFileUpload}   title="Albarán"  subtitle="PDF de entrega Trimo"    doc={docs.albaran} loading={loadingDoc.albaran} error={errors.albaran} onFile={handleFile} onOpen={handleOpenPanel} />
                <DropzoneCard type="factura" icon={IconFileEuro}     title="Factura"  subtitle="PDF de factura Trimo"    doc={docs.factura} loading={loadingDoc.factura} error={errors.factura} onFile={handleFile} onOpen={handleOpenPanel} />
                <DropzoneCard type="pedido"  icon={IconShoppingCart} title="Pedido"   subtitle="PDF o export myGESTIÓN" doc={docs.pedido}  loading={loadingDoc.pedido}  error={errors.pedido}  onFile={handleFile} onOpen={handleOpenPanel} isPending={pedidoPending} />
              </div>

              {/* Barra de veredicto */}
              {recon && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  backgroundColor: recon.verdictOk ? '#F0FAF6' : '#FFF8EC',
                  border: `1px solid ${recon.verdictOk ? '#A8E6CF' : '#F5D99A'}`,
                  borderRadius: 10, padding: '11px 16px',
                }}>
                  {recon.verdictOk
                    ? <IconCheck size={18} stroke={2} color="#3DB88A" />
                    : <IconAlertTriangle size={18} stroke={1.8} color="#E8A030" />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 12.5, color: recon.verdictOk ? '#1B7A5A' : '#92530A', margin: 0 }}>
                      {recon.verdictOk ? 'Cuadre completo · listo para exportar' : 'Diferencias encontradas · revisar antes de exportar'}
                    </p>
                    <p style={{ fontFamily: T.dm, fontSize: 11, color: recon.verdictOk ? '#3DB88A' : '#E8A030', margin: '2px 0 0' }}>
                      {recon.rows.length} códigos reconciliados · {recon.bending.length > 0 ? `${recon.bending.length} línea(s) bending separadas` : 'sin bending'}
                    </p>
                  </div>
                </div>
              )}

              {/* Grid de reconciliación */}
              {recon && <ReconciliationGrid recon={recon} />}

            </div>
          )}
        </div>

        {/* ── PANEL PDF LATERAL ── */}
        {pdfPanel && docs[pdfPanel]?.blobUrl && (
          <div style={{
            width: '45%', flexShrink: 0,
            borderLeft: '1px solid #E8E8F0',
            display: 'flex', flexDirection: 'column', backgroundColor: '#fff',
          }}>
            <div style={{
              height: 40, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 14px', borderBottom: '1px solid #E8E8F0',
            }}>
              <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {docs[pdfPanel]?.name}
              </p>
              <button
                onClick={() => setPdfPanel(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 4 }}
              >
                <IconX size={16} stroke={1.8} />
              </button>
            </div>
            <iframe src={docs[pdfPanel].blobUrl} title="PDF" style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        )}

      </div>

      {/* ── TOAST ── */}
      {saved && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#1E3A2F', color: '#fff',
          fontFamily: T.dm, fontWeight: 500, fontSize: 13,
          borderRadius: 10, padding: '11px 22px',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          <IconCheck size={15} stroke={2.5} color="#4CAF8A" />
          Cuadre guardado correctamente
        </div>
      )}
    </div>
  );
}

// ─── CuadreCard ───────────────────────────────────────────────────────────────

function CuadreCard({ cuadre, onVer, onExportar, onBorrar }) {
  const [trashHov, setTrashHov] = useState(false);
  const s = STATUS_CFG[cuadre.estado] ?? STATUS_CFG.pendiente_pedido;
  const canExport = cuadre.estado === 'validado' || cuadre.estado === 'pendiente_pedido';

  return (
    <div style={{
      backgroundColor: '#fff', border: '1px solid #E8E8F0',
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <p style={{
            fontFamily: T.dm, fontWeight: 500, fontSize: 12.5, color: '#1E3A2F',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stripExt(cuadre.albaran_nombre)} / {stripExt(cuadre.factura_nombre)}
          </p>
          <span style={{
            fontFamily: T.dm, fontWeight: 500, fontSize: 10.5,
            color: s.text, backgroundColor: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 5, padding: '2px 8px', flexShrink: 0,
          }}>
            {s.label}
          </span>
        </div>
        <p style={{ fontFamily: T.dm, fontSize: 11, color: '#9CA3AF', margin: 0 }}>
          {fmtFecha(cuadre.fecha)} · {fmtEur(cuadre.total_factura)} · {cuadre.rows.length} líneas
        </p>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onVer(cuadre)}
          style={{
            fontFamily: T.dm, fontWeight: 500, fontSize: 11.5,
            color: '#1E3A2F', backgroundColor: '#fff',
            border: '1px solid #E8E8F0', borderRadius: 7,
            padding: '5px 12px', cursor: 'pointer',
          }}
        >
          Ver
        </button>

        {canExport && (
          <button
            onClick={() => onExportar(cuadre)}
            style={{
              fontFamily: T.dm, fontWeight: 500, fontSize: 11.5,
              color: '#fff', backgroundColor: '#1E3A2F',
              border: '1px solid #1E3A2F', borderRadius: 7,
              padding: '5px 12px', cursor: 'pointer',
            }}
          >
            Exportar
          </button>
        )}

        <button
          onClick={() => onBorrar(cuadre.id)}
          onMouseEnter={() => setTrashHov(true)}
          onMouseLeave={() => setTrashHov(false)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: 'none', cursor: 'pointer',
            backgroundColor: trashHov ? '#FFF1F1' : 'transparent',
            color: trashHov ? '#E57373' : '#D1D5DB',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <IconTrash size={14} stroke={1.8} />
        </button>
      </div>
    </div>
  );
}

// ─── DropzoneCard ─────────────────────────────────────────────────────────────

function DropzoneCard({ type, icon: Icon, title, subtitle, doc, loading, error, onFile, onOpen, isPending }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(type, file);
  };

  if (isPending) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          backgroundColor: '#FFF8EC', border: '1px solid #F5D99A',
          borderRadius: 12, padding: '16px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(type, f); }} />
        <IconShoppingCart size={22} stroke={1.6} color="#E8A030" />
        <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 11.5, color: '#92530A', margin: 0, textAlign: 'center' }}>Pedido</p>
        <span style={{ fontFamily: T.dm, fontSize: 10.5, fontWeight: 500, color: '#92530A', backgroundColor: '#FEF0C2', border: '1px solid #F5D99A', borderRadius: 5, padding: '2px 8px' }}>
          Pendiente · Cuadre parcial activo
        </span>
      </div>
    );
  }

  if (doc && !loading) {
    const lineas  = doc.extracted?.lineas?.length ?? doc.extracted?.paneles?.length ?? null;
    const totalM2 = doc.extracted?.lineas?.reduce((s, l) => s + (l.m2 ?? 0), 0)
                 ?? doc.extracted?.paneles?.reduce((s, l) => s + (l.m2 ?? 0), 0)
                 ?? null;
    const hasBase64 = !!doc.base64;

    return (
      <div
        onClick={() => onOpen(type)}
        style={{
          backgroundColor: '#F0FAF6', border: '1px solid #A8E6CF',
          borderRadius: 12, padding: '14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          cursor: hasBase64 ? 'pointer' : 'default',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => { if (hasBase64) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <IconCheck size={18} stroke={2} color="#3DB88A" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#1B7A5A', margin: 0 }}>{title}</p>
          <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#3DB88A', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.name}
          </p>
          {lineas != null && (
            <p style={{ fontFamily: T.dm, fontSize: 10, color: '#3DB88A', opacity: 0.75, margin: '1px 0 0' }}>
              {lineas} líneas{totalM2 != null ? ` · ${fmtNum(totalM2)} m²` : ''}
            </p>
          )}
          {!hasBase64 && (
            <p style={{ fontFamily: T.dm, fontSize: 10, color: '#9CA3AF', margin: '2px 0 0' }}>Recuperado · sin PDF</p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#fff', border: '1px dashed #E8E8F0', borderRadius: 12, padding: '28px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E8E8F0', borderTopColor: '#4CAF8A', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontFamily: T.dm, fontSize: 11.5, color: '#9CA3AF', margin: 0 }}>Extrayendo datos…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        backgroundColor: dragging ? '#F0FAF6' : '#fff',
        border: `1.5px dashed ${error ? '#E57373' : dragging ? '#4CAF8A' : '#D1D5DB'}`,
        borderRadius: 12, padding: '28px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', textAlign: 'center',
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(type, f); e.target.value = ''; }} />
      <Icon size={28} stroke={1.4} color={error ? '#E57373' : '#9CA3AF'} />
      <p style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 12.5, color: error ? '#C62828' : '#374151', margin: 0 }}>{title}</p>
      <p style={{ fontFamily: T.dm, fontSize: 11, color: '#9CA3AF', margin: 0 }}>{error ? error : subtitle}</p>
    </div>
  );
}

// ─── ReconciliationGrid ───────────────────────────────────────────────────────

function ReconciliationGrid({ recon }) {
  const { rows, bending } = recon;

  const colHeader = (label, color, bg, border) => (
    <div style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 11, color, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '3px 9px', display: 'inline-flex', marginBottom: 10 }}>
      {label}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #E8E8F0', padding: '12px 14px 0' }}>
        <div>{colHeader('Albarán', '#1A56DB', '#EEF2FF', '#C7D7FD')}</div>
        <div>{colHeader('Factura', '#1B7A5A', '#F0FAF6', '#A8E6CF')}</div>
        <div>{colHeader('Cuadre',  '#374151', '#F9FAFB', '#E8E8F0')}</div>
      </div>

      {rows.map((row, i) => (
        <div key={row.codigo} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 14px', borderBottom: i < rows.length - 1 || bending.length > 0 ? '1px solid #F4F4F8' : 'none', alignItems: 'start' }}>
          <div>
            {row.alb ? (
              <>
                <p style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 12, color: '#1E3A2F', margin: 0 }}>{row.alb.codigo}</p>
                {row.alb.descripcion && (
                  <p style={{ fontFamily: T.dm, fontSize: 10, color: '#9CA3AF', margin: '2px 0 0', lineHeight: 1.35 }}>{row.alb.descripcion}</p>
                )}
                <p style={{ fontFamily: T.dm, fontSize: 11, color: '#6B7280', margin: '3px 0 0' }}>{fmtNum(row.alb.m2)} m²</p>
                {row.alb.unidades != null && <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#9CA3AF', margin: '1px 0 0' }}>{row.alb.unidades} ud</p>}
              </>
            ) : <p style={{ fontFamily: T.dm, fontSize: 11, color: '#D1D5DB', margin: 0 }}>—</p>}
          </div>
          <div>
            {row.fac ? (
              <>
                <p style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 12, color: '#1E3A2F', margin: 0 }}>{row.fac.codigo}</p>
                {row.fac.descripcion && (
                  <p style={{ fontFamily: T.dm, fontSize: 10, color: '#9CA3AF', margin: '2px 0 0', lineHeight: 1.35 }}>{row.fac.descripcion}</p>
                )}
                <p style={{ fontFamily: T.dm, fontSize: 11, color: '#6B7280', margin: '3px 0 0' }}>{fmtNum(row.fac.m2)} m²</p>
                {row.fac.precio_um != null && <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#9CA3AF', margin: '1px 0 0' }}>{fmtEur(row.fac.precio_um)}/m²</p>}
                {row.fac.importe != null && <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#6B7280', margin: '1px 0 0', fontWeight: 500 }}>{fmtEur(row.fac.importe)}</p>}
              </>
            ) : <p style={{ fontFamily: T.dm, fontSize: 11, color: '#D1D5DB', margin: 0 }}>—</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {row.ok ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.dm, fontWeight: 600, fontSize: 11, color: '#1B7A5A', backgroundColor: '#F0FAF6', border: '1px solid #A8E6CF', borderRadius: 5, padding: '2px 8px', width: 'fit-content' }}>
                <IconCheck size={11} stroke={2.5} /> OK
              </span>
            ) : (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.dm, fontWeight: 600, fontSize: 11, color: '#92530A', backgroundColor: '#FFF8EC', border: '1px solid #F5D99A', borderRadius: 5, padding: '2px 8px', width: 'fit-content' }}>
                  <IconAlertTriangle size={11} stroke={2} /> {row.diff > 0 ? '+' : ''}{fmtNum(row.diff)} m²
                </span>
                <p style={{ fontFamily: T.dm, fontSize: 10, color: '#9CA3AF', margin: 0 }}>alb {fmtNum(row.alb?.m2 ?? 0)} / fac {fmtNum(row.fac?.m2 ?? 0)}</p>
              </>
            )}
          </div>
        </div>
      ))}

      {bending.length > 0 && (
        <div style={{ borderTop: '2px solid #FEF0C2', backgroundColor: '#FFFDF5', padding: '14px 14px 16px' }}>

          {/* ── cabecera ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 10.5, color: '#92530A', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Bending Costs — Coste de fabricación
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: T.dm, fontWeight: 600, fontSize: 10.5,
              color: '#1B7A5A', backgroundColor: '#F0FAF6', border: '1px solid #A8E6CF',
              borderRadius: 5, padding: '2px 9px',
            }}>
              <IconCheck size={11} stroke={2.5} /> Validado · manufactura
            </span>
          </div>
          <div style={{ height: 1, backgroundColor: '#F5D99A', marginBottom: 12 }} />

          {/* ── líneas bending ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {bending.map((b, i) => {
              const relCodes = b.relacionado_con ?? [];
              const totalM2  = relCodes.reduce(
                (sum, code) => sum + (rows.find((r) => r.codigo === code)?.fac?.m2 ?? 0), 0
              );
              const ctype  = getCornerType(b.descripcion);
              const parts  = [ctype, totalM2 > 0 ? `${fmtNum(totalM2)} M²${relCodes.length > 1 ? ' total' : ''}` : null].filter(Boolean);
              const relText = relCodes.length > 0
                ? relCodes.join(', ') + (parts.length > 0 ? ` (${parts.join(' · ')})` : '')
                : null;

              return (
                <div key={i}>
                  <p style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 11.5, color: '#1E3A2F', margin: 0 }}>
                    Tipo: {b.descripcion ?? b.codigo}
                  </p>
                  {(b.metros != null || b.precio_m != null) && (
                    <p style={{ fontFamily: T.dm, fontSize: 11, color: '#6B7280', margin: '3px 0 0' }}>
                      {b.metros  != null && `Metros: ${fmtNum(b.metros, 3)} M`}
                      {b.metros  != null && b.precio_m != null && ' · '}
                      {b.precio_m != null && `Precio: ${fmtEur(b.precio_m)}/M`}
                    </p>
                  )}
                  {b.importe != null && (
                    <p style={{ fontFamily: T.dm, fontSize: 11, color: '#92530A', fontWeight: 500, margin: '2px 0 0' }}>
                      Importe: {fmtEur(b.importe)}
                    </p>
                  )}
                  {relText && (
                    <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#9CA3AF', margin: '3px 0 0', lineHeight: 1.5 }}>
                      Relacionado con: {relText}
                    </p>
                  )}
                  {i < bending.length - 1 && (
                    <div style={{ height: 1, backgroundColor: '#FEF0C2', margin: '10px 0' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── nota + total ── */}
          <div style={{ marginTop: 14, borderTop: '1px solid #F5D99A', paddingTop: 10 }}>
            <p style={{ fontFamily: T.dm, fontSize: 10.5, color: '#9CA3AF', margin: '0 0 7px', lineHeight: 1.5 }}>
              ℹ️ Los bending costs son servicios de fabricación de Trimo por el doblado de paneles corner.
              No aparecen en el albarán porque no son unidades físicas entregadas — es correcto y no es una incidencia.
            </p>
            <p style={{ fontFamily: T.dm, fontWeight: 600, fontSize: 12, color: '#1E3A2F', margin: 0 }}>
              Total bending: {fmtEur(bending.reduce((s, b) => s + (b.importe ?? 0), 0))}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
