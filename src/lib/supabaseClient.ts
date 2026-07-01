import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper to check if credentials have been properly set up in .env.local
export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  Boolean(supabaseAnonKey) && 
  supabaseAnonKey !== 'your-anon-key-here';

// Initialize the Supabase Client. If credentials are missing, we fall back to a mock/placeholder url
// to prevent initial build and development startup crashes.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder-mygoal.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
);
