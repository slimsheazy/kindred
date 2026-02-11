
import React, { useState, useEffect, useMemo } from 'react';
import type { JournalEntry } from '../types';
import { cloudService } from '../services/cloudService';
import { analyzeInteractionForScores, generateJournalEchoes, tagJournalEntry } from '../services/geminiService';

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newText, setNewText] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [echoSynthesis, setEchoSynthesis] = useState<{ synthesis: string, themes: string[] } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getJournalEntries(user.partnerCode || 'default').then(data => {
          setEntries(data);
          if (data.length >= 3) {
            triggerSynthesis(data);
          }
      });
    }
  }, []);

  const triggerSynthesis = async (history: JournalEntry[]) => {
    setIsSynthesizing(true);
    const echoes = await generateJournalEchoes(history.slice(0, 10));
    setEchoSynthesis(echoes);
    setIsSynthesizing(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !userData || isArchiving) return;
    
    setIsArchiving(true);
    
    // Tag the entry first via AI
    const tags = await tagJournalEntry(newText);
    
    const entry: JournalEntry = { 
        id: Date.now().toString(), 
        authorId: userData.id, 
        author: userData.userName, 
        authorImage: '', 
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
        timestamp: Date.now(), 
        text: newText,
        themeTags: tags
    };
    
    const updatedEntries = [entry, ...entries];
    setEntries(updatedEntries);
    
    // Cloud save
    await cloudService.saveJournalEntry(userData.partnerCode || 'default', entry);
    
    // AI Analysis for score updates
    try {
      const updates = await analyzeInteractionForScores(newText);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(userData.partnerCode || 'default', updates);
      }
    } catch (err) {
      console.warn("Analysis failed", err);
    }
    
    setNewText('');
    setIsArchiving(false);
    
    // Refresh synthesis every few entries
    if (updatedEntries.length % 3 === 0) {
        triggerSynthesis(updatedEntries);
    }
  };

  // Check for "On This Day" matches (just checking month/day for demo)
  const temporalResonance = useMemo(() => {
      if (entries.length < 2) return null;
      const today = new Date();
      // Look for entries on same day/month from different years (or just different timestamps for mockup)
      return entries.find(e => {
          const entryDate = new Date(e.timestamp);
          return entryDate.getDate() === today.getDate() && 
                 entryDate.getMonth() === today.getMonth() && 
                 entryDate.getFullYear() !== today.getFullYear();
      });
  }, [entries]);

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
      <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#262626]">Echoes.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">The Shared Anthology</p>
      </header>

      {/* Temporal Resonance / AI Synthesis Card */}
      {(echoSynthesis || temporalResonance) && (
          <div className="mb-24 p-10 bg-white/40 border border-[#262626]/5 rounded-[3rem] shadow-sm animate-fade-in relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41]/5 blur-3xl rounded-full group-hover:bg-[#00FF41]/10 transition-all duration-[3000ms]" />
              
              <div className="relative z-10">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-4 block heading-font">
                    {temporalResonance ? 'Temporal Resonance' : 'Kindred Synthesis'}
                </span>
                
                {temporalResonance ? (
                    <div className="mb-6">
                        <h4 className="text-xl font-light italic text-[#262626]/60 mb-2">"On this day, {new Date(temporalResonance.timestamp).getFullYear()}..."</h4>
                        <p className="text-2xl font-light text-[#262626] leading-relaxed">"{temporalResonance.text.slice(0, 100)}..."</p>
                    </div>
                ) : (
                    <p className="text-xl font-light leading-relaxed text-[#262626] mb-8 italic">
                        {isSynthesizing ? "Synthesizing your shared history..." : `"${echoSynthesis?.synthesis}"`}
                    </p>
                )}

                {echoSynthesis?.themes && echoSynthesis.themes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-6 border-t border-[#262626]/5">
                        {echoSynthesis.themes.map(t => (
                            <span key={t} className="text-[7px] font-bold uppercase tracking-widest px-3 py-1 bg-[#262626]/5 text-[#262626]/60 rounded-full heading-font">
                                #{t}
                            </span>
                        ))}
                    </div>
                )}
              </div>
          </div>
      )}

      <form onSubmit={handleAdd} className="mb-32">
        <textarea 
          value={newText} 
          onChange={(e) => setNewText(e.target.value)} 
          placeholder="Etch a memory for your future self..." 
          disabled={isArchiving}
          className="w-full bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-2xl font-light italic p-4 resize-none transition-all h-32 text-[#262626] placeholder-[#262626]/40"
        />
        <div className="flex justify-between items-center mt-6">
            <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/20 heading-font">
                Press Archive to commit to the anthology
            </span>
            <button 
                type="submit" 
                disabled={isArchiving || !newText.trim()}
                className="px-12 py-4 text-[10px] font-bold uppercase tracking-widest text-white bg-[#262626] rounded-full hover:opacity-90 transition-all disabled:opacity-30 heading-font"
            >
                {isArchiving ? 'Archiving...' : 'Archive Memory'}
            </button>
        </div>
      </form>

      <div className="space-y-32">
        {entries.map((e, idx) => (
          <div key={e.id} className="animate-fade-in group">
             <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/80 heading-font mb-1">{e.author}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#262626]/20 heading-font">{e.date}</span>
                </div>
                {e.themeTags && (
                    <div className="flex gap-2">
                        {e.themeTags.map(tag => (
                            <span key={tag} className="text-[7px] font-bold uppercase text-[#00FF41]/60 tracking-widest border border-[#00FF41]/10 px-2 py-0.5 rounded-sm bg-[#00FF41]/5">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
             </div>
             <div className="relative pl-8 border-l border-[#262626]/5">
                <p className="text-3xl leading-relaxed text-[#262626] font-light group-hover:pl-4 transition-all duration-700 ease-out">{e.text}</p>
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#262626]/10 transition-all duration-700 group-hover:bg-[#00FF41]/40" />
             </div>
          </div>
        ))}
        
        {entries.length === 0 && !isArchiving && (
            <div className="text-center py-24 opacity-20">
                <p className="text-2xl font-light italic">Your anthology is a blank canvas.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Start by etching your first echo.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Journal;
