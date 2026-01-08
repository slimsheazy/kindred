
import { UserData, JournalEntry, Goal, BondScore } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

class CloudService {
  private useLocalStorageOnly = !isSupabaseConfigured;

  // --- HELPERS ---
  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- AUTH & LINKING ---
  async signUp(userData: UserData): Promise<UserData> {
    if (this.useLocalStorageOnly) return userData;

    try {
      const { error } = await supabase.from('profiles').upsert(userData);
      if (error) throw error;
    } catch (err) {
      console.warn("Supabase connection failed, using local mode.");
      this.useLocalStorageOnly = true;
    }
    return userData;
  }

  // --- SCORES (BOND MAP) ---
  async getBondScores(partnerCode: string): Promise<BondScore[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data, error } = await supabase
          .from('bond_scores')
          .select('*')
          .eq('partner_code', partnerCode)
          .order('timestamp', { ascending: true });

        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase bond_scores fetch failed, falling back to local.");
      }
    }
    return this.getLocal<BondScore>(`bonds_scores_${partnerCode}`);
  }

  async saveBondScore(partnerCode: string, score: BondScore): Promise<void> {
    const scores = this.getLocal<BondScore>(`bonds_scores_${partnerCode}`);
    this.saveLocal(`bonds_scores_${partnerCode}`, [...scores, score]);

    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('bond_scores').upsert({ ...score, partner_code: partnerCode });
      } catch (err) {
        console.error("Failed to sync score to cloud");
      }
    }
  }

  // --- JOURNAL ---
  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('partner_code', partnerCode)
          .order('timestamp', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase journal fetch failed.");
      }
    }
    return this.getLocal<JournalEntry>(`bonds_journal_${partnerCode}`);
  }

  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    const entries = this.getLocal<JournalEntry>(`bonds_journal_${partnerCode}`);
    this.saveLocal(`bonds_journal_${partnerCode}`, [entry, ...entries]);

    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('journal_entries').insert({ ...entry, partner_code: partnerCode });
      } catch (err) {
        console.error("Failed to sync journal entry to cloud");
      }
    }
  }

  // --- GOALS ---
  async getGoals(partnerCode: string): Promise<Goal[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('partner_code', partnerCode)
          .order('lastUpdated', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase goals fetch failed.");
      }
    }
    return this.getLocal<Goal>(`bonds_goals_${partnerCode}`);
  }

  async saveGoal(partnerCode: string, goal: Goal): Promise<void> {
    const goals = this.getLocal<Goal>(`bonds_goals_${partnerCode}`);
    const filtered = goals.filter(g => g.id !== goal.id);
    this.saveLocal(`bonds_goals_${partnerCode}`, [goal, ...filtered]);

    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('goals').upsert({ ...goal, partner_code: partnerCode });
      } catch (err) {
        console.error("Failed to sync goal to cloud");
      }
    }
  }

  // --- REAL-TIME PROMPT SYNC ---
  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('prompt_answers').upsert({ 
          partner_code: partnerCode, 
          user_id: userId, 
          answer: answer,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Could not sync answer to cloud.");
      }
    }
  }

  subscribeToPartner(partnerCode: string, myUserId: string, onUpdate: (answer: string) => void) {
    if (this.useLocalStorageOnly) {
      return { unsubscribe: () => {} };
    }

    try {
      const channel = supabase
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
      
      return channel;
    } catch (err) {
      return { unsubscribe: () => {} };
    }
  }
}

export const cloudService = new CloudService();
