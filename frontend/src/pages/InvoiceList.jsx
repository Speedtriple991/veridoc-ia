import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

const STATUS_LABEL = {
  pending_review: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const STATUS_COLOR = {
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/invoices')
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400">Cargando facturas...</p>;

  if (invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">No hay facturas aun.</p>
        <Link
          to="/invoices/upload"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Subir primera factura
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800">Facturas</h2>
        <Link
          to="/invoices/upload"
          className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
        >
          + Subir PDF
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Proveedor</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-brand-600 truncate max-w-[160px]">
                  <Link to={`/invoices/${inv.id}`}>{inv.original_filename}</Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{inv.supplier_name ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {inv.total_amount != null ? `${inv.currency ?? ''} ${inv.total_amount}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(inv.created_at).toLocaleDateString('es')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
