import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || url.includes('placeholder')) {
  console.warn('[supabase] SUPABASE_URL no configurada — las rutas de BD no funcionarán');
}

const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder'
);

export default supabase;
