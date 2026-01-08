
import React, { useState, useEffect } from 'react';
import type { Goal } from '../types';
import { cloudService } from '../services/cloudService';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bonds_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getGoals(user.partnerCode || 'default').then(setGoals);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !userData) return;
    const goal: Goal = { id: Date.now().toString(), title: newTitle, type: 'Couple', progress: 0, lastUpdated: Date.now() };
    await cloudService.saveGoal(userData.partnerCode || 'default', goal);
    setGoals([goal, ...goals]);
    setNewTitle('');
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
      <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#262626]">Intent.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">Future Shared Horizons</p>
      </header>

      <form onSubmit={handleAdd} className="mb-24 flex gap-4">
        <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Name an intention..." className="flex-grow bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-xl p-4 transition-all text-[#262626] placeholder-[#262626]/40" />
        <button type="submit" className="px-8 border border-[#262626] text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#262626] hover:text-white transition-all text-[#262626]">Add</button>
      </form>

      <div className="space-y-16">
        {goals.map(g => (
          <div key={g.id} className="animate-fade-in-up">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-3xl font-light text-[#262626]">{g.title}</h3>
              <span className="text-[10px] font-bold tracking-widest text-[#262626]/60 heading-font">{g.progress}%</span>
            </div>
            <div className="w-full h-[1px] bg-[#262626]/20 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-[#00FF41] transition-all duration-700" style={{width: `${g.progress}%`}}></div>
            </div>
            <input type="range" value={g.progress} onChange={(e) => {
              const updated = {...g, progress: parseInt(e.target.value)};
              setGoals(prev => prev.map(item => item.id === g.id ? updated : item));
              cloudService.saveGoal(userData?.partnerCode || 'default', updated);
            }} className="w-full mt-6 opacity-0 hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Goals;
