import { ANTHROPIC_API_KEY } from '../config/api.js';

const PROMPT =
  'Extrae estos campos de la factura y responde SOLO con JSON válido sin markdown: ' +
  'razon_social, fecha_factura, numero_factura, base_imponible (número decimal), ' +
  'porcentaje_iva (número entero — 21, 10 o 4 — búscalo explícitamente en la factura; ' +
  'si no aparece calcula Math.round(importe_iva / base_imponible * 100)), ' +
  'importe_iva (número decimal), ' +
  'total_factura (número decimal), forma_pago, ' +
  'vencimiento (DD/MM/YYYY), ' +
  'es_abono (boolean — true si la factura es una nota de abono, factura rectificativa o contiene ' +
  'importes negativos; busca palabras clave como ABONO, RECTIFICATIVA, NOTA DE CRÉDITO o números ' +
  'con signo negativo; false en caso contrario). ' +
  'Si un campo no aparece usa null.';

export async function extractInvoice(pdfBase64) {
  console.log('[extractInvoice] KEY presente:', !!ANTHROPIC_API_KEY, '| inicio:', ANTHROPIC_API_KEY.slice(0, 12));
  if (!ANTHROPIC_API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY no configurada');

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (networkErr) {
    console.error('[extractInvoice] Failed to fetch:', networkErr);
    throw new Error(`Error de red: ${networkErr.message} — verifica que api.anthropic.com no esté bloqueado por firewall o proxy`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }

  const payload = await res.json();
  const text    = payload.content?.[0]?.text?.trim() ?? '';

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Respuesta no es JSON válido');
  }
}
