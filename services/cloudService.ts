
import { UserData, JournalEntry, Goal } from '../types';
import { supabase } from './supabase';

class CloudService {
  // --- AUTH & LINKING ---
  async signUp(userData: UserData): Promise<UserData> {
    // Real Auth: supabase.auth.signUp(...)
    // For now, we save the profile to a 'profiles' table
    const { data, error } = await supabase
      .from('profiles')
      .upsert(userData);
      
    if (error) console.error("Cloud Error:", error.message);
    return userData;
  }

  // --- JOURNAL (REAL CLOUD STORAGE) ---
  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('partner_code', partnerCode)
      .order('timestamp', { ascending: false });

    if (error) {
        console.warn("DB not ready, using local fallback");
        return [];
    }
    return data || [];
  }

  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    // If entry has an image, in production you'd upload to Supabase Storage:
    // const { data } = await supabase.storage.from('memories').upload(path, file);
    
    const { error } = await supabase
      .from('journal_entries')
      .insert({ ...entry, partner_code: partnerCode });

    if (error) console.error("Save Error:", error.message);
  }

  // --- REAL-TIME PROMPT SYNC ---
  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    await supabase
      .from('prompt_answers')
      .upsert({ 
        partner_code: partnerCode, 
        user_id: userId, 
        answer: answer,
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Real-time Subscription Helper
   * This is the "magic" that makes the app collaborative.
   */
  subscribeToPartner(partnerCode: string, myUserId: string, onUpdate: (answer: string) => void) {
    return supabase
      .channel('public:prompt_answers')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'prompt_answers',
        filter: `partner_code=eq.${partnerCode}`
      }, (payload: any) => {
        if (payload.new.user_id !== myUserId) {
          onUpdate(payload.new.answer);
        }
      })
      .subscribe();
  }
}

export const cloudService = new CloudService();
