import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL
  ?? 'https://bfyqjcfidnktvovnxiz.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeXFqY2ZsZG5rdHZvdnZueGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjMzMjgsImV4cCI6MjA5NjUzOTMyOH0.rsqOknGAHTUiQa3PE0mNWd3Iyzpdro0Kpxk5a34sa3Q';

export const supabase = createClient(url, key);
