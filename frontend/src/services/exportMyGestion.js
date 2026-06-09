function download(content, filename, type) {
  const blob = new Blob(['﻿' + content], { type }); // BOM for UTF-8 Excel recognition
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

const COLS = [
  ['Proveedor',      (inv) => inv.supplier_name],
  ['Nº Factura',     (inv) => inv.extracted_data?.invoice_number],
  ['Fecha',          (inv) => inv.extracted_data?.invoice_date],
  ['Base Imponible', (inv) => (+(inv.extracted_data?.base_imponible ?? 0)).toFixed(2).replace('.', ',')],
  ['IVA',            (inv) => (+(inv.extracted_data?.importe_iva ?? 0)).toFixed(2).replace('.', ',')],
  ['Total',          (inv) => (+(inv.extracted_data?.total_amount ?? 0)).toFixed(2).replace('.', ',')],
  ['Forma Pago',     (inv) => inv.extracted_data?.forma_pago],
  ['Vencimiento',    (inv) => inv.extracted_data?.vencimiento],
];

const cell = (v) => String(v ?? '').replace(/;/g, ',');

export function exportMyGestion(invoices) {
  const approved = invoices.filter((i) => i.status === 'approved');
  const header   = COLS.map(([label]) => label).join(';');
  const rows     = approved.map((inv) => COLS.map(([, fn]) => cell(fn(inv))).join(';'));
  const csv      = [header, ...rows].join('\r\n');
  download(csv, 'facturas-mygestión.csv', 'text/csv;charset=utf-8');
}
