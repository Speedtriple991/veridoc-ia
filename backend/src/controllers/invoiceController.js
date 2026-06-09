import Anthropic from '@anthropic-ai/sdk';
import supabase from '../lib/supabase.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from invoice PDFs.
Extract the following fields and return ONLY valid JSON (no markdown, no explanation):

{
  "supplier_name": "",
  "supplier_tax_id": "",
  "invoice_number": "",
  "invoice_date": "",        // ISO 8601
  "due_date": "",            // ISO 8601 or null
  "subtotal": 0,
  "tax_amount": 0,
  "total_amount": 0,
  "currency": "USD",
  "line_items": [
    { "description": "", "quantity": 0, "unit_price": 0, "total": 0 }
  ]
}

If a field is not found, use null. Numeric fields must be numbers, not strings.`;

export async function extractInvoice(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    const base64Pdf = req.file.buffer.toString('base64');

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const rawText = message.content[0].text.trim();
    let extracted;
    try {
      extracted = JSON.parse(rawText);
    } catch {
      return res.status(422).json({ error: 'Claude returned non-JSON response', raw: rawText });
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: req.user.tenantId,
        uploaded_by: req.user.id,
        original_filename: req.file.originalname,
        extracted_data: extracted,
        status: 'pending_review',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ invoice: data });
  } catch (err) {
    next(err);
  }
}

export async function listInvoices(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, original_filename, status, created_at, extracted_data->supplier_name, extracted_data->total_amount, extracted_data->currency')
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenantId) // row-level isolation
      .single();

    if (error || !data) return res.status(404).json({ error: 'Invoice not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}
