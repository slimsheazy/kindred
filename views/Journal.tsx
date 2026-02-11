
import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry } from '../types';
import { cloudService } from '../services/cloudService';
import { analyzeInteractionForScores, generateJournalEchoes, tagJournalEntry } from '../services/geminiService';

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newText, setNewText] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [echoSynthesis, setEchoSynthesis] = useState<{ synthesis: string, themes: string[] } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMode, setIsAddingMode] = useState(false);

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
    setIsAddingMode(false);
    
    // Refresh synthesis every few entries
    if (updatedEntries.length % 3 === 0) {
        triggerSynthesis(updatedEntries);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const lowerQuery = searchQuery.toLowerCase();
    return entries.filter(e => 
      e.text.toLowerCase().includes(lowerQuery) || 
      e.author.toLowerCase().includes(lowerQuery) ||
      (e.themeTags && (e.themeTags as string[]).some(t => t.toLowerCase().includes(lowerQuery)))
    );
  }, [entries, searchQuery]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // Check for "On This Day" matches
  const temporalResonance = useMemo(() => {
      if (entries.length < 2) return null;
      const today = new Date();
      return entries.find(e => {
          const entryDate = new Date(e.timestamp);
          return entryDate.getDate() === today.getDate() && 
                 entryDate.getMonth() === today.getMonth() && 
                 entryDate.getFullYear() !== today.getFullYear();
      });
  }, [entries]);

  return (
    <div className="px-6 py-12 max-w-xl mx-auto min-h-screen pb-40">
      <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-light mb-2 text-[#262626]">Archive.</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">The Shared Anthology</p>
          </div>
          <button 
            onClick={() => setIsAddingMode(!isAddingMode)}
            className={`w-12 h-12 rounded-full border border-black/10 flex items-center justify-center text-2xl transition-all ${isAddingMode ? 'bg-black text-white rotate-45' : 'bg-white hover:bg-black hover:text-white'}`}
          >
            +
          </button>
      </header>

      {/* New Entry Form - Collapsible */}
      <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isAddingMode ? 'max-h-[500px] mb-24 opacity-100' : 'max-h-0 opacity-0 mb-0'}`}>
        <form onSubmit={handleAdd} className="bg-white/40 p-10 rounded-[3rem] border border-black/5">
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
      </div>

      {/* Search & Insight Toggle */}
      <div className="mb-16 space-y-8">
        <div className="relative group">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the anthology..."
            className="w-full bg-transparent border-b border-black/10 py-4 outline-none text-sm font-light italic placeholder-black/20 focus:border-black transition-all"
          />
          <span className="absolute right-4 top-4 text-[10px] text-black/20 uppercase font-bold heading-font group-focus-within:text-black transition-colors">Search</span>
        </div>

        {/* Temporal Resonance / AI Synthesis Card */}
        {(echoSynthesis || temporalResonance) && !searchQuery && (
            <div className="p-10 bg-white border border-[#262626]/5 rounded-[3rem] shadow-sm animate-fade-in relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF41]/5 blur-3xl rounded-full group-hover:bg-[#00FF41]/10 transition-all duration-[3000ms]" />
                
                <div className="relative z-10">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-4 block heading-font">
                      {temporalResonance ? 'Temporal Resonance' : 'Shared Insight'}
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
      </div>

      {/* Timeline List */}
      <div className="relative pl-12 border-l border-black/5 ml-4">
        <div className="absolute top-0 left-[-2px] bottom-0 w-[4px] bg-gradient-to-b from-black/5 via-black/10 to-transparent rounded-full" />
        
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="text-center py-24 opacity-20 ml-[-3rem]">
              <p className="text-2xl font-light italic">No echoes found.</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-4">The past is waiting to be written.</p>
          </div>
        ) : (
          /* Fix: Cast Object.entries to provide explicit typing for monthEntries to prevent inference issues */
          (Object.entries(groupedEntries) as [string, JournalEntry[]][]).map(([monthYear, monthEntries]) => (
            <div key={monthYear} className="mb-24 relative">
              {/* Month Indicator */}
              <div className="absolute left-[-52px] top-1">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/30 mb-12 heading-font translate-y-[-2px] bg-[#FDFCF0] inline-block pr-4">
                {monthYear}
              </h2>

              <div className="space-y-20">
                {monthEntries.map((e) => (
                  <div key={e.id} className="animate-fade-in group relative">
                    {/* Entry Connector dot */}
                    <div className="absolute left-[-50px] top-2 w-3 h-[1px] bg-black/10 group-hover:bg-black transition-all" />
                    
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold uppercase tracking-widest heading-font mb-1 ${e.authorId === userData?.id ? 'text-[#00FF41]' : 'text-[#FF007F]'}`}>
                              {e.authorId === userData?.id ? 'You' : e.author}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#262626]/20 heading-font">
                              {new Date(e.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        {e.themeTags && (
                            <div className="flex gap-2">
                                {/* Fix: Explicitly cast e.themeTags to string[] on line 229 to resolve "unknown" type error */}
                                {(e.themeTags as string[]).map(tag => (
                                    <span key={tag} className="text-[7px] font-bold uppercase text-black/40 tracking-widest border border-black/5 px-2 py-1 rounded-full bg-black/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <p className="text-3xl leading-relaxed text-[#262626] font-light group-hover:pl-4 transition-all duration-700 ease-out">
                          {e.text}
                        </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Journal;
