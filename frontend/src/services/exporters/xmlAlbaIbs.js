function signed(d, v) {
  const n = +(v ?? 0);
  return (d.es_abono === true && n > 0) ? -n : n;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function download(content, filename) {
  const blob = new Blob([content], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function exportXmlAlbaIbs(invoices) {
  const rows = invoices
    .filter((i) => i.status === 'approved')
    .map((inv) => {
      const d = inv.extracted_data ?? {};
      return [
        '  <FACTURA>',
        `    <RazonSocial>${esc(inv.supplier_name ?? d.razon_social)}</RazonSocial>`,
        `    <FechaFactura>${esc(d.fecha_factura)}</FechaFactura>`,
        `    <NumeroFactura>${esc(d.numero_factura)}</NumeroFactura>`,
        `    <BaseImponible>${signed(d, d.base_imponible).toFixed(2)}</BaseImponible>`,
        `    <ImporteIVA>${signed(d, d.importe_iva).toFixed(2)}</ImporteIVA>`,
        `    <TotalFactura>${signed(d, d.total_factura ?? d.total_amount).toFixed(2)}</TotalFactura>`,
        `    <FormaPago>${esc(d.forma_pago)}</FormaPago>`,
        `    <Vencimiento>${esc(d.vencimiento)}</Vencimiento>`,
        '  </FACTURA>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<FACTURAS>\n${rows}\n</FACTURAS>`;
  download(xml, 'facturas-albaibs.xml');
}
