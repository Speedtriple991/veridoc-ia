import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabase] URL:', url ?? 'UNDEFINED');
console.log('[supabase] KEY:', key ? key.slice(0, 20) + '…' : 'UNDEFINED');

export const supabase = createClient(url, key);
