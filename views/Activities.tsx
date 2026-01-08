
import React, { useState, useEffect } from 'react';
import { generateActivities } from '../services/geminiService';
import type { Activity } from '../types';

const Activities: React.FC = () => {
  const [activeVibe, setActiveVibe] = useState('Deep');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const vibes = ['Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  useEffect(() => {
    setLoading(true);
    generateActivities(activeVibe).then(data => { setActivities(data); setLoading(false); });
  }, [activeVibe]);

  return (
    <div className="px-6 py-12 max-w-xl mx-auto">
       <header className="mb-16">
            <h1 className="text-6xl font-light mb-2 text-[#262626]">Actions.</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#262626]/70 heading-font">Intentional Shared Time</p>
      </header>

      <div className="flex gap-8 overflow-x-auto no-scrollbar mb-16 pb-4 border-b border-[#262626]/10">
          {vibes.map(vibe => (
              <button key={vibe} onClick={() => setActiveVibe(vibe)} className={`text-[10px] font-bold uppercase tracking-widest heading-font transition-all ${activeVibe === vibe ? 'text-[#262626]' : 'text-[#262626]/40'}`}>
                  {vibe}
              </button>
          ))}
      </div>

      <div className="space-y-16">
        {activities.map((a, i) => (
          <div key={i} className="animate-fade-in-up" style={{animationDelay: `${i*0.1}s`}}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-3xl font-light max-w-[80%] text-[#262626]">{a.title}</h3>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/60 pt-2">{a.duration}</span>
            </div>
            <p className="text-[#262626]/80 text-lg leading-relaxed mb-6 font-light">{a.description}</p>
            <button className="text-[10px] font-bold uppercase tracking-widest text-[#262626] border-b border-[#262626] pb-1 hover:opacity-50 transition-all heading-font">Engage</button>
          </div>
        ))}
        {loading && <div className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/50 animate-pulse">Summoning Ideas...</div>}
      </div>
    </div>
  );
};

export default Activities;
