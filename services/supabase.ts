
import { createClient } from '@supabase/supabase-js';

/**
 * BABY STEPS:
 * 1. Go to supabase.com and create a project.
 * 2. Get your project URL and Anon Key from Project Settings -> API.
 * 3. Add them to your Vercel Environment Variables.
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
