
import React, { useState, useEffect } from 'react';
import type { JournalEntry } from '../types';
import { cloudService } from '../services/cloudService';

const Journal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newText, setNewText] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getJournalEntries(user.partnerCode || 'default').then(setEntries);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !userData) return;
    const entry: JournalEntry = { id: Date.now().toString(), authorId: userData.id, author: userData.userName, authorImage: '', date: 'Today', timestamp: Date.now(), text: newText };
    await cloudService.saveJournalEntry(userData.partnerCode || 'default', entry);
    setEntries([entry, ...entries]);
    setNewText('');
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
      <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#262626]">Echoes.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">A Shared Anthology</p>
      </header>

      <form onSubmit={handleAdd} className="mb-24">
        <textarea 
          value={newText} 
          onChange={(e) => setNewText(e.target.value)} 
          placeholder="Etch a memory..." 
          className="w-full bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-2xl font-light italic p-4 resize-none transition-all h-32 text-[#262626] placeholder-[#262626]/40"
        />
        <button type="submit" className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest text-[#262626] border border-[#262626] py-4 rounded-full hover:bg-[#262626] hover:text-white transition-all">Archive Memory</button>
      </form>

      <div className="space-y-20">
        {entries.map(e => (
          <div key={e.id} className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/80 heading-font">{e.author}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40 heading-font">{e.date}</span>
             </div>
             <p className="text-2xl leading-relaxed text-[#262626] font-light">{e.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Journal;
