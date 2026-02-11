
import React, { useState, useEffect, useRef } from 'react';
import { Goal, MicroStep } from '../types';
import { cloudService } from '../services/cloudService';
import { generateGoalMicroSteps, getGoalEncouragement } from '../services/geminiService';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const encouragementTimeoutRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const user = JSON.parse(saved);
      setUserData(user);
      cloudService.getGoals(user.partnerCode || 'default').then(setGoals);
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !userData || isAdding) return;
    
    setIsAdding(true);
    const goal: Goal = { 
        id: Date.now().toString(), 
        title: newTitle, 
        type: 'Couple', 
        progress: 0, 
        lastUpdated: Date.now(),
        encouragement: "Generating your shared horizon..."
    };
    
    // Optimistic UI
    setGoals(prev => [goal, ...prev]);
    setNewTitle('');

    // AI Enrichment
    try {
        const [steps, enc] = await Promise.all([
            generateGoalMicroSteps(goal.title),
            getGoalEncouragement(goal.title, 0)
        ]);
        const enrichedGoal = { ...goal, microSteps: steps, encouragement: enc };
        await cloudService.saveGoal(userData.partnerCode || 'default', enrichedGoal);
        setGoals(prev => prev.map(g => g.id === goal.id ? enrichedGoal : g));
    } catch (err) {
        console.error("Goal enrichment failed", err);
    } finally {
        setIsAdding(false);
    }
  };

  const updateProgress = async (goal: Goal, newProgress: number) => {
    const updated = { ...goal, progress: newProgress, lastUpdated: Date.now() };
    setGoals(prev => prev.map(item => item.id === goal.id ? updated : item));
    
    // Save locally
    await cloudService.saveGoal(userData?.partnerCode || 'default', updated);

    // Debounce AI encouragement
    if (encouragementTimeoutRef.current[goal.id]) clearTimeout(encouragementTimeoutRef.current[goal.id]);
    encouragementTimeoutRef.current[goal.id] = setTimeout(async () => {
        const enc = await getGoalEncouragement(goal.title, newProgress);
        const latestGoal = { ...updated, encouragement: enc };
        setGoals(prev => prev.map(item => item.id === goal.id ? latestGoal : item));
        await cloudService.saveGoal(userData?.partnerCode || 'default', latestGoal);
    }, 2000);
  };

  const toggleMicroStep = async (goal: Goal, stepId: string) => {
    const updatedSteps = (goal.microSteps || []).map(s => 
        s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const newProgress = Math.round((completedCount / updatedSteps.length) * 100);
    
    const updatedGoal = { ...goal, microSteps: updatedSteps, progress: newProgress };
    setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g));
    await cloudService.saveGoal(userData?.partnerCode || 'default', updatedGoal);
  };

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
      <header className="mb-16">
          <h1 className="text-6xl font-light mb-2 text-[#262626]">Intent.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">Architectural Shared Horizons</p>
      </header>

      <form onSubmit={handleAdd} className="mb-24 flex gap-4">
        <input 
            type="text" 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)} 
            placeholder="Blueprint a new intention..." 
            disabled={isAdding}
            className="flex-grow bg-transparent border-b border-[#262626]/20 focus:border-[#262626] outline-none text-xl p-4 transition-all text-[#262626] placeholder-[#262626]/40 font-light italic" 
        />
        <button 
            type="submit" 
            disabled={isAdding || !newTitle.trim()}
            className="px-8 border border-[#262626] text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#262626] hover:text-white transition-all text-[#262626] h-14 heading-font disabled:opacity-30"
        >
            {isAdding ? 'Scribing...' : 'Blueprint'}
        </button>
      </form>

      <div className="space-y-24">
        {goals.map(g => (
          <div key={g.id} className="animate-fade-in-up group">
            <div className="flex justify-between items-start mb-6">
              <div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-1 block heading-font">Project Horizon</span>
                  <h3 className="text-4xl font-light text-[#262626] leading-tight group-hover:pl-2 transition-all duration-500">{g.title}</h3>
              </div>
              <span className="text-[12px] font-bold tracking-[0.2em] text-[#262626]/80 heading-font">{g.progress}%</span>
            </div>

            {/* Architectural Progress Visual */}
            <div className="w-full h-1.5 bg-[#262626]/5 relative mb-8 overflow-hidden rounded-full">
                <div 
                    className="absolute left-0 top-0 h-full bg-[#00FF41] transition-all duration-[2000ms] ease-out" 
                    style={{width: `${g.progress}%`}}
                >
                    <div className="w-full h-full animate-pulse opacity-50 bg-white" />
                </div>
            </div>

            {/* Micro-steps Specs */}
            {g.microSteps && g.microSteps.length > 0 && (
                <div className="mb-10 space-y-3 pl-2 border-l border-[#262626]/5">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/30 mb-2 block heading-font">Technical Specifications</span>
                    {g.microSteps.map(step => (
                        <button 
                            key={step.id}
                            onClick={() => toggleMicroStep(g, step.id)}
                            className="w-full flex items-center gap-4 text-left group/step"
                        >
                            <div className={`w-3 h-3 rounded-sm border border-[#262626]/20 transition-all ${step.completed ? 'bg-[#00FF41] border-[#00FF41]' : 'group-hover/step:border-[#262626]/40'}`} />
                            <span className={`text-xs font-mono tracking-tight transition-all ${step.completed ? 'text-[#262626]/30 line-through' : 'text-[#262626]/70'}`}>
                                {step.text}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* AI Encouragement */}
            {g.encouragement && (
                <div className="bg-white/5 p-6 rounded-[2rem] border border-[#262626]/5 animate-fade-in">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 mb-2 block heading-font">Kindred Oracle Insight</span>
                    <p className="text-sm italic font-light text-[#262626]/80 leading-relaxed">"{g.encouragement}"</p>
                </div>
            )}

            {/* Slider for manual adjustment */}
            <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <input 
                    type="range" 
                    value={g.progress} 
                    min="0" 
                    max="100" 
                    onChange={(e) => updateProgress(g, parseInt(e.target.value))} 
                    className="w-full h-1 bg-transparent cursor-pointer appearance-none [&::-webkit-slider-runnable-track]:bg-[#262626]/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#262626]" 
                />
            </div>
          </div>
        ))}
        {goals.length === 0 && !isAdding && (
            <div className="text-center py-20 opacity-30">
                <p className="text-xl italic font-light">No horizons defined yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Goals;
