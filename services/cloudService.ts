
import { UserData, JournalEntry, Goal, BondScore, Lesson, ChatMessage, Activity } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

class CloudService {
  private useLocalStorageOnly = !isSupabaseConfigured;

  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Profile & Linking ---

  async signUp(userData: UserData): Promise<UserData> {
    if (this.useLocalStorageOnly) return userData;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userData.id,
        user_name: userData.userName,
        partner_name: userData.partnerName,
        partner_code: userData.partnerCode,
        focus_areas: userData.focusAreas,
        updated_at: new Date()
      });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase signup failed", err);
    }
    return userData;
  }

  async linkPartner(myId: string, partnerCode: string): Promise<void> {
    if (this.useLocalStorageOnly) {
      const saved = localStorage.getItem('kindred_user_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.partnerCode = partnerCode;
        localStorage.setItem('kindred_user_data', JSON.stringify(parsed));
      }
      return;
    }
    
    await supabase.from('profiles').update({ partner_code: partnerCode }).eq('id', myId);
  }

  // --- Bond Scores ---

  async getBondScores(partnerCode: string): Promise<BondScore[]> {
    if (this.useLocalStorageOnly) {
        const scores = this.getLocal<BondScore>(`kindred_scores_${partnerCode}`);
        if (scores.length === 0) {
            const initial: BondScore[] = [
                { category: 'Communication', score: 3.5, timestamp: Date.now() },
                { category: 'Intimacy', score: 3.5, timestamp: Date.now() },
                { category: 'Trust', score: 3.5, timestamp: Date.now() },
                { category: 'Conflict', score: 3.5, timestamp: Date.now() },
                { category: 'Shared Vision', score: 3.5, timestamp: Date.now() },
            ];
            this.saveLocal(`kindred_scores_${partnerCode}`, initial);
            return initial;
        }
        return scores;
    }

    const { data, error } = await supabase
      .from('bond_scores')
      .select('*')
      .eq('partner_code', partnerCode);
    
    if (error || !data || data.length === 0) return this.getLocal<BondScore>(`kindred_scores_${partnerCode}`);
    return data.map(d => ({ category: d.category, score: d.score, timestamp: new Date(d.updated_at).getTime() }));
  }

  async updateBondScore(partnerCode: string, category: string, delta: number): Promise<void> {
    const scores = await this.getBondScores(partnerCode);
    const updated = scores.map(s => {
      if (s.category === category) {
        return { ...s, score: Math.min(10, Math.max(1, s.score + delta)), timestamp: Date.now() };
      }
      return s;
    });
    this.saveLocal(`kindred_scores_${partnerCode}`, updated);

    if (!this.useLocalStorageOnly) {
      await supabase.from('bond_scores').upsert({
        partner_code: partnerCode,
        category,
        score: updated.find(u => u.category === category)?.score || 3.5,
        updated_at: new Date()
      }, { onConflict: 'partner_code,category' });
    }
  }

  async batchUpdateScores(partnerCode: string, updates: { category: string, delta: number }[]): Promise<void> {
    for (const update of updates) {
      await this.updateBondScore(partnerCode, update.category, update.delta);
    }
  }

  // --- Journal ---

  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    if (this.useLocalStorageOnly) return this.getLocal<JournalEntry>(`kindred_journal_${partnerCode}`);

    const { data, error } = await supabase
      .from('journal')
      .select('*')
      .eq('partner_code', partnerCode)
      .order('created_at', { ascending: false });

    if (error || !data) return this.getLocal<JournalEntry>(`kindred_journal_${partnerCode}`);
    return data.map(d => ({
        id: d.id,
        authorId: d.author_id,
        author: d.author_name,
        authorImage: '',
        date: new Date(d.created_at).toLocaleDateString(),
        timestamp: new Date(d.created_at).getTime(),
        text: d.text,
        theme_tags: d.theme_tags
    }));
  }

  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    const localKey = `kindred_journal_${partnerCode}`;
    const entries = this.getLocal<JournalEntry>(localKey);
    this.saveLocal(localKey, [entry, ...entries]);

    if (!this.useLocalStorageOnly) {
      await supabase.from('journal').insert({
        id: entry.id,
        partner_code: partnerCode,
        author_id: entry.authorId,
        author_name: entry.author,
        text: entry.text,
        theme_tags: entry.themeTags,
        created_at: new Date(entry.timestamp)
      });
    }
  }

  // --- Goals ---

  async getGoals(partnerCode: string): Promise<Goal[]> {
    if (this.useLocalStorageOnly) return this.getLocal<Goal>(`kindred_goals_${partnerCode}`);

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('partner_code', partnerCode);

    if (error || !data) return this.getLocal<Goal>(`kindred_goals_${partnerCode}`);
    return data.map(d => ({
        id: d.id,
        title: d.title,
        type: 'Couple',
        progress: d.progress,
        lastUpdated: new Date(d.updated_at).getTime(),
        microSteps: d.micro_steps,
        encouragement: d.encouragement
    }));
  }

  async saveGoal(partnerCode: string, goal: Goal): Promise<void> {
    const localKey = `kindred_goals_${partnerCode}`;
    const goals = this.getLocal<Goal>(localKey);
    const filtered = goals.filter(g => g.id !== goal.id);
    this.saveLocal(localKey, [goal, ...filtered]);

    if (!this.useLocalStorageOnly) {
      await supabase.from('goals').upsert({
        id: goal.id,
        partner_code: partnerCode,
        title: goal.title,
        progress: goal.progress,
        micro_steps: goal.microSteps,
        encouragement: goal.encouragement,
        updated_at: new Date(goal.lastUpdated)
      });
    }
  }

  // --- Quiz Persistence ---

  // Fix: Added missing saveQuizAnswer method
  async saveQuizAnswer(partnerCode: string, userId: string, topic: string, answers: Record<string, string>): Promise<void> {
    const key = `kindred_quiz_${partnerCode}_${topic}`;
    const existing = this.getLocal<any>(key);
    const filtered = existing.filter((a: any) => a.userId !== userId);
    const newRecord = { userId, answers, timestamp: Date.now() };
    this.saveLocal(key, [...filtered, newRecord]);
    
    // In a real Supabase scenario, we would upsert into a 'quiz_answers' table
  }

  // Fix: Added missing getQuizAnswers method
  async getQuizAnswers(partnerCode: string, topic: string): Promise<any[]> {
    return this.getLocal<any>(`kindred_quiz_${partnerCode}_${topic}`);
  }

  // --- Realtime Subscriptions ---

  subscribeToPartnerSpace(partnerCode: string, onUpdate: () => void) {
    if (this.useLocalStorageOnly) return () => {};

    const journalSub = supabase.channel('journal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .subscribe();

    const scoreSub = supabase.channel('score-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bond_scores', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .subscribe();

    const goalsSub = supabase.channel('goals-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(journalSub);
      supabase.removeChannel(scoreSub);
      supabase.removeChannel(goalsSub);
    };
  }

  // --- Misc ---

  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    localStorage.setItem(`kindred_prompt_ans_${partnerCode}_${userId}`, answer);
  }

  async markLessonComplete(lessonId: string): Promise<void> {
    const completed = JSON.parse(localStorage.getItem('kindred_completed_lessons') || '[]');
    if (!completed.includes(lessonId)) {
      completed.push(lessonId);
      localStorage.setItem('kindred_completed_lessons', JSON.stringify(completed));
    }
  }

  getCompletedLessons(): string[] {
    return JSON.parse(localStorage.getItem('kindred_completed_lessons') || '[]');
  }

  async getChatHistory(partnerCode: string): Promise<ChatMessage[]> {
    return this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`);
  }

  async saveChatMessage(partnerCode: string, message: ChatMessage): Promise<void> {
    const history = this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`);
    const updated = [...history, message].slice(-50);
    this.saveLocal(`kindred_chat_${partnerCode}`, updated);
  }

  async clearChatHistory(partnerCode: string): Promise<void> {
    localStorage.removeItem(`kindred_chat_${partnerCode}`);
  }

  async setActiveActivity(activity: Activity | null): Promise<void> {
    if (activity) {
      localStorage.setItem('kindred_active_activity', JSON.stringify(activity));
    } else {
      localStorage.removeItem('kindred_active_activity');
    }
  }

  getActiveActivity(): Activity | null {
    const saved = localStorage.getItem('kindred_active_activity');
    return saved ? JSON.parse(saved) : null;
  }
}

export const cloudService = new CloudService();
