function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function exportIbs21(invoices) {
  const rows = invoices
    .filter((i) => i.status === 'approved')
    .map((inv) => {
      const d = inv.extracted_data ?? {};
      return [
        '  <FACTURA>',
        `    <PROVEEDOR>${esc(inv.supplier_name)}</PROVEEDOR>`,
        `    <NUMERO>${esc(d.invoice_number)}</NUMERO>`,
        `    <FECHA>${esc(d.invoice_date)}</FECHA>`,
        `    <BASE_IMPONIBLE>${(+(d.base_imponible ?? 0)).toFixed(2)}</BASE_IMPONIBLE>`,
        `    <IMPORTE_IVA>${(+(d.importe_iva ?? 0)).toFixed(2)}</IMPORTE_IVA>`,
        `    <TOTAL>${(+(d.total_amount ?? 0)).toFixed(2)}</TOTAL>`,
        `    <FORMA_PAGO>${esc(d.forma_pago)}</FORMA_PAGO>`,
        `    <VENCIMIENTO>${esc(d.vencimiento)}</VENCIMIENTO>`,
        '  </FACTURA>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<FACTURAS>\n${rows}\n</FACTURAS>`;
  download(xml, 'facturas-ibs21.xml', 'application/xml');
}
