function download(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDec(v) {
  if (v == null) return '';
  return Number(v).toFixed(2).replace('.', ',');
}

function calcPctIva(d) {
  if (!d) return '0';
  if (d.porcentaje_iva != null && d.porcentaje_iva !== 0) return String(d.porcentaje_iva);
  const base = Number(d.base_imponible ?? 0);
  const iva  = Number(d.importe_iva ?? 0);
  return base > 0 ? String(Math.round((iva / base) * 100)) : '0';
}

function signedNum(d, v) {
  if (v == null) return null;
  const n = Number(v);
  return (d.es_abono === true && n > 0) ? -n : n;
}

const cell = (v) => String(v ?? '').replace(/;/g, ',');

const COLS = [
  ['Proveedor',      (inv) => inv.supplier_name ?? inv.extracted_data?.razon_social],
  ['Fecha Factura',  (inv) => inv.extracted_data?.fecha_factura],
  ['Su Factura',     (inv) => inv.extracted_data?.numero_factura],
  ['Base Imponible', (inv) => fmtDec(signedNum(inv.extracted_data ?? {}, inv.extracted_data?.base_imponible))],
  ['% IVA',          (inv) => calcPctIva(inv.extracted_data)],
  ['Cuota IVA',      (inv) => fmtDec(signedNum(inv.extracted_data ?? {}, inv.extracted_data?.importe_iva))],
  ['Total Factura',  (inv) => fmtDec(signedNum(inv.extracted_data ?? {}, inv.extracted_data?.total_factura ?? inv.extracted_data?.total_amount))],
  ['Forma Pago',     (inv) => inv.extracted_data?.forma_pago],
  ['Vencimiento',    (inv) => inv.extracted_data?.vencimiento],
];

function buildCsv(invoices) {
  const approved = invoices.filter((i) => i.status === 'approved');
  const header   = COLS.map(([label]) => label).join(';');
  const rows     = approved.map((inv) => COLS.map(([, fn]) => cell(fn(inv))).join(';'));
  return [header, ...rows].join('\r\n');
}

export function exportExcelMyGestion(invoices) {
  download(buildCsv(invoices), 'facturas-mygestión.csv');
}

export function exportExcelGenerico(invoices) {
  download(buildCsv(invoices), 'facturas-export.csv');
}
