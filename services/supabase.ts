
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we are using actual credentials or placeholders
export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder-project.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
