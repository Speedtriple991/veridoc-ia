import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

export default function InvoiceUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setLoading(true);

    const form = new FormData();
    form.append('pdf', file);

    try {
      const { data } = await api.post('/invoices/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.invoice);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el PDF');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const d = result.extracted_data;
    return (
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Datos extraidos</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {[
            ['Proveedor', d.supplier_name],
            ['RUC / NIT', d.supplier_tax_id],
            ['N° Factura', d.invoice_number],
            ['Fecha', d.invoice_date],
            ['Vencimiento', d.due_date],
            ['Subtotal', d.subtotal != null ? `${d.currency} ${d.subtotal}` : null],
            ['Impuesto', d.tax_amount != null ? `${d.currency} ${d.tax_amount}` : null],
            ['Total', d.total_amount != null ? `${d.currency} ${d.total_amount}` : null],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-800 font-medium">{value ?? '—'}</span>
            </div>
          ))}
        </div>

        {d.line_items?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Lineas de detalle</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Descripcion</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">P. Unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {d.line_items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.unit_price}</td>
                      <td className="px-3 py-2 text-right">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Ver todas las facturas
          </button>
          <button
            onClick={() => { setFile(null); setResult(null); inputRef.current.value = ''; }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Subir otra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Subir factura PDF</h2>
      <p className="text-sm text-gray-500 mb-6">
        Claude extraera automaticamente los datos del documento.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div
          onClick={() => inputRef.current.click()}
          className="border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-lg p-8 text-center cursor-pointer transition"
        >
          <p className="text-sm text-gray-500">
            {file ? file.name : 'Haz clic para seleccionar un archivo PDF'}
          </p>
          {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
        >
          {loading ? 'Procesando con IA...' : 'Extraer datos'}
        </button>
      </form>
    </div>
  );
}
