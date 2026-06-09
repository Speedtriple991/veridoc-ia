import { useState, useRef } from 'react';
import { IconX, IconUpload, IconCheck, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import { extractInvoice } from '../services/extractInvoice.js';

const T = { dm: '"DM Sans", sans-serif', syne: 'Syne, sans-serif' };

const STATUS_STYLE = {
  pending:    { bg: '#F3F4F6', color: '#6B7280', label: 'Pendiente'   },
  processing: { bg: '#EFF6FF', color: '#3B82F6', label: 'Procesando…' },
  extracted:  { bg: '#F0FAF6', color: '#1B7A5A', label: 'Extraído'    },
  error:      { bg: '#FFF1F1', color: '#C62828', label: 'Error'       },
};

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildInvoice(data, filename, pdfBase64) {
  return {
    id:                `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    supplier_name:     data.razon_social   ?? filename,
    original_filename: filename,
    status:            'pending_review',
    isNew:             true,
    pdf_base64:        pdfBase64 ?? null,
    extracted_data: {
      total_amount:   data.total_factura,
      currency:       'EUR',
      invoice_number: data.numero_factura,
      invoice_date:   data.fecha_factura,
      base_imponible: data.base_imponible,
      importe_iva:    data.importe_iva,
      forma_pago:     data.forma_pago,
      vencimiento:    data.vencimiento,
    },
    created_at: new Date().toISOString(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
export default function UploadModal({ onClose, onSuccess }) {
  const [files, setFiles]         = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef();

  const addFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf');
    if (!pdfs.length) return;
    setFiles((prev) => [
      ...prev,
      ...pdfs
        .filter((f) => !prev.some((p) => p.file.name === f.name && p.file.size === f.size))
        .map((f) => ({ id: `${f.name}-${f.size}`, file: f, status: 'pending' })),
    ]);
  };

  const setFileStatus = (id, patch) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const processAll = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (!pending.length) return;
    setProcessing(true);

    const extracted = [];
    for (const item of pending) {
      setFileStatus(item.id, { status: 'processing' });
      try {
        const b64  = await readAsBase64(item.file);
        const data = await extractInvoice(b64);
        setFileStatus(item.id, { status: 'extracted', data });
        extracted.push(buildInvoice(data, item.file.name, b64));
      } catch (err) {
        setFileStatus(item.id, { status: 'error', error: err.message });
      }
    }

    setProcessing(false);
    if (extracted.length) onSuccess(extracted);
  };

  const pendingCount    = files.filter((f) => f.status === 'pending').length;
  const allDone         = files.length > 0 && files.every((f) => f.status !== 'pending' && f.status !== 'processing');
  const extractedCount  = files.filter((f) => f.status === 'extracted').length;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !processing) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid #E8E8F0' }}>
          <p style={{ fontFamily: T.syne, fontWeight: 700, fontSize: 15, color: '#1E3A2F', margin: 0 }}>
            Subir facturas
          </p>
          <button
            onClick={onClose}
            disabled={processing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <IconX size={18} stroke={1.8} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Drop zone */}
          <div
            onClick={() => !processing && inputRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e)  => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e)     => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            style={{
              border: `2px dashed ${isDragging ? '#4CAF8A' : '#E8E8F0'}`,
              borderRadius: 12,
              padding: '28px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: processing ? 'default' : 'pointer',
              background: isDragging ? 'rgba(76,175,138,0.04)' : '#FAFAFA',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0FAF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconUpload size={20} stroke={1.6} color="#4CAF8A" />
            </div>
            <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 13, color: '#374151', margin: 0 }}>
              Arrastra PDFs aquí
            </p>
            <p style={{ fontFamily: T.dm, fontWeight: 400, fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              o haz clic para seleccionar archivos
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((item) => {
                const s   = STATUS_STYLE[item.status];
                const amt = item.data?.total_factura;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#FAFAFA', border: '1px solid #E8E8F0',
                      borderRadius: 10, padding: '9px 12px',
                    }}
                  >
                    {/* Status icon */}
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.status === 'processing' && <IconLoader2 size={14} color={s.color} style={{ animation: 'spin 0.8s linear infinite' }} />}
                      {item.status === 'extracted'  && <IconCheck size={14} color={s.color} stroke={2} />}
                      {item.status === 'error'      && <IconAlertTriangle size={14} color={s.color} stroke={2} />}
                      {item.status === 'pending'    && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'block' }} />}
                    </div>

                    {/* Name + supplier */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#1E3A2F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.data?.razon_social ?? item.file.name}
                      </p>
                      {item.status === 'error' && (
                        <p style={{ fontFamily: T.dm, fontSize: 10, color: '#C62828', margin: '1px 0 0' }}>{item.error}</p>
                      )}
                      {item.data?.numero_factura && (
                        <p style={{ fontFamily: T.dm, fontSize: 10, color: '#9CA3AF', margin: '1px 0 0' }}>{item.data.numero_factura}</p>
                      )}
                    </div>

                    {/* Amount */}
                    {amt != null && (
                      <p style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#1E3A2F', flexShrink: 0, margin: 0 }}>
                        {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(amt)}
                      </p>
                    )}

                    {/* Badge */}
                    <span style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 10, color: s.color, background: s.bg, borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E8E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontFamily: T.dm, fontSize: 11, color: '#9CA3AF', margin: 0 }}>
            {files.length === 0
              ? 'Sin archivos seleccionados'
              : allDone
                ? `${extractedCount} de ${files.length} extraídas correctamente`
                : `${files.length} archivo${files.length > 1 ? 's' : ''} · ${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={processing}
              style={{ fontFamily: T.dm, fontWeight: 500, fontSize: 12, color: '#374151', background: '#fff', border: '1px solid #E8E8F0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
            >
              {allDone ? 'Cerrar' : 'Cancelar'}
            </button>

            {!allDone && (
              <button
                onClick={processAll}
                disabled={processing || pendingCount === 0}
                style={{
                  fontFamily: T.dm, fontWeight: 500, fontSize: 12,
                  color: '#fff', backgroundColor: '#1E3A2F',
                  border: 'none', borderRadius: 8,
                  padding: '7px 14px', cursor: pendingCount === 0 ? 'default' : 'pointer',
                  opacity: pendingCount === 0 ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {processing && <IconLoader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {processing ? 'Procesando…' : `Procesar todo (${pendingCount})`}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
