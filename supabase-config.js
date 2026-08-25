// ============================================
// CONFIGURACIÓN SUPABASE - SeriesMazinger
// La anon key es pública y va protegida por RLS.
// ============================================
const SUPABASE_URL = 'https://pncfkbxtkatkbrmrexdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuY2ZrYnh0a2F0a2JybXJleGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MzI4NDIsImV4cCI6MjEwMzIwODg0Mn0.SvnDoOfAXiCAu1Phd1SncE7f9FUgJlShAnqYC4w57sU';

window._sb = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
