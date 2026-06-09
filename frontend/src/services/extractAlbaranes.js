import { ANTHROPIC_API_KEY } from '../config/api.js';

const ALBARAN_PROMPT =
  'Analiza este albarán de entrega de Trimo y extrae TODAS las líneas de producto. ' +
  'Para cada línea devuelve: codigo (string), descripcion (string), m2 (número decimal), ' +
  'unidades (número entero), paquete (string). ' +
  'Solo incluye líneas con código que empiece por 8103 (paneles). ' +
  'Si un campo no aparece usa null. ' +
  'Responde SOLO con JSON válido sin markdown: { "lineas": [...] }';

const FACTURA_PROMPT =
  'Analiza esta factura de Trimo y extrae TODAS las líneas. ' +
  'Separa en dos grupos: ' +
  'paneles (código empieza por 8103): { codigo, descripcion, m2 (decimal), precio_um (decimal), importe (decimal) } ' +
  'bending (código 90000530): extrae CADA línea de bending como objeto separado con ' +
  '{ codigo, descripcion, metros (decimal, metros lineales del servicio), ' +
  'precio_m (decimal, precio €/metro lineal), importe (decimal), ' +
  'relacionado_con: array de códigos 8103xxxx de paneles corner presentes en la misma factura ' +
  '(regla: bending L-shaped → paneles con "corner long" en descripción; ' +
  'bending combined → paneles con "corner trans" en descripción; ' +
  'si hay dudas incluir todos los 8103xxxx cuya descripción contenga "corner") } ' +
  'Responde SOLO con JSON válido sin markdown: { "paneles": [...], "bending": [...] }';

async function callClaude(base64, prompt) {
  if (!ANTHROPIC_API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY no configurada');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

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

export const extractAlbaran      = (base64) => callClaude(base64, ALBARAN_PROMPT);
export const extractFacturaTrimo = (base64) => callClaude(base64, FACTURA_PROMPT);
