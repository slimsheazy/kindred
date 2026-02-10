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

  // --- QUIZ ANSWERS ---

  async saveQuizAnswer(partnerCode: string, userId: string, quizId: string, answers: any): Promise<void> {
    const key = `bonds_quiz_${partnerCode}_${quizId}`;
    const allAnswers = this.getLocal<any>(key);
    const updated = [...allAnswers.filter((a: any) => a.userId !== userId), { userId, answers, timestamp: Date.now() }];
    this.saveLocal(key, updated);

    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('quiz_answers').upsert({
          partner_code: partnerCode,
          user_id: userId,
          quiz_id: quizId,
          answers: answers
        });
      } catch (err) {
        console.error("Failed to sync quiz answer to cloud");
      }
    }
  }

  async getQuizAnswers(partnerCode: string, quizId: string): Promise<any[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data, error } = await supabase
          .from('quiz_answers')
          .select('**')
          .eq('partner_code', partnerCode)
          .eq('quiz_id', quizId);
        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase quiz fetch failed.");
      }
    }
    return this.getLocal<any>(`bonds_quiz_${partnerCode}_${quizId}`);
  }

  // --- BOND SCORES ---

  async getBondScores(partnerCode: string): Promise<BondScore[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data, error } = await supabase
          .from('bond_scores')
          .select('**')
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
          .select('**')
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
          .select('**')
          .eq('partner_code', partnerCode);
        if (!error && data) return data;
      } catch (err) {
        console.warn("Supabase goals fetch failed.");
      }
    }
    return this.getLocal<Goal>(`bonds_goals_${partnerCode}`);
  }

  async saveGoal(partnerCode: string, goal: Goal): Promise<void> {
    const goals = this.getLocal<Goal>(`bonds_goals_${partnerCode}`);
    this.saveLocal(`bonds_goals_${partnerCode}`, [...goals, goal]);

    if (!this.useLocalStorageOnly) {
      try {
        await supabase.from('goals').insert({ ...goal, partner_code: partnerCode });
      } catch (err) {
        console.error("Failed to sync goal to cloud");
      }
    }
  }
}

const cloudService = new CloudService();
export { cloudService };
