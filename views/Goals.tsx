
import React, { useState, useEffect } from 'react';
import type { Goal, UserData } from '../types';
import { cloudService } from '../services/cloudService';

const GoalItem: React.FC<{ goal: Goal, onUpdate: (goal: Goal) => void }> = ({ goal, onUpdate }) => {
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseInt(e.target.value);
    onUpdate({ ...goal, progress: newProgress, lastUpdated: Date.now() });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-lg animate-fade-in-up">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wide ${goal.type === 'Couple' ? 'bg-teal-100/50 text-teal-800' : 'bg-rose-100/50 text-rose-800'}`}>
            {goal.type}
          </span>
          <p className="font-bold text-slate-800 mt-2 text-lg leading-tight">{goal.title}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-slate-800/80">{goal.progress}%</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Progress</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden">
          <div className="bg-slate-800 h-full rounded-full transition-all duration-500 shadow-sm" style={{ width: `${goal.progress}%` }}></div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={goal.progress}
          onChange={handleProgressChange}
          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-slate-800"
        />
      </div>
    </div>
  );
};

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'Individual' | 'Couple'>('Couple');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('bonds_user_data');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUserData(user);
      loadGoals(user.partnerCode || 'default');
    }
  }, []);

  const loadGoals = async (code: string) => {
    setIsLoading(true);
    const data = await cloudService.getGoals(code);
    setGoals(data);
    setIsLoading(false);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !userData) return;

    const goal: Goal = {
      id: Date.now().toString(),
      title: newTitle,
      type: newType,
      progress: 0,
      lastUpdated: Date.now(),
    };

    await cloudService.saveGoal(userData.partnerCode || 'default', goal);
    setGoals([goal, ...goals]);
    setNewTitle('');
    setShowAdd(false);
  };

  const updateGoal = async (updated: Goal) => {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
    if (userData) {
      await cloudService.saveGoal(userData.partnerCode || 'default', updated);
    }
  };

  return (
    <div className="p-2 md:p-4 pb-24">
      <header className="mb-8 mt-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-light text-white tracking-tight">Our Goals</h1>
          <p className="text-white/70 mt-1">Growing together, step by step.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            showAdd ? 'bg-rose-500 text-white rotate-45' : 'bg-white text-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </header>

      {showAdd && (
        <div className="mb-8 glass-panel rounded-3xl p-6 shadow-xl animate-fade-in-up border-white">
          <h3 className="text-slate-800 font-bold mb-4">Set a new intention</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <input 
              type="text" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Weekly date night, Save for travel..."
              className="w-full bg-white/40 border border-white/60 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all text-slate-800 placeholder-slate-400 font-medium"
            />
            <div className="flex gap-2 p-1 bg-white/20 rounded-xl">
               <button 
                type="button" 
                onClick={() => setNewType('Couple')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'Couple' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/60'}`}
               >
                 Couple
               </button>
               <button 
                type="button" 
                onClick={() => setNewType('Individual')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newType === 'Individual' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/60'}`}
               >
                 Personal
               </button>
            </div>
            <button 
              type="submit"
              disabled={!newTitle.trim()}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg"
            >
              Add Goal
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
             <div key={i} className="glass-panel rounded-2xl h-32 animate-pulse opacity-50" />
          ))}
        </div>
      ) : goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} onUpdate={updateGoal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-6 glass-panel rounded-3xl border-dashed border-2 border-white/30">
           <div className="text-5xl mb-4">🎯</div>
           <h3 className="text-xl font-light text-white mb-2">Eyes on the horizon.</h3>
           <p className="text-white/50 text-sm">Create a shared goal to start tracking your progress together.</p>
        </div>
      )}
    </div>
  );
};

export default Goals;
