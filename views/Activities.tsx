
import React, { useState, useEffect } from 'react';
import { generateActivities } from '../services/geminiService';
import type { Activity, UserData } from '../types';
import { GamepadIcon, LightbulbIcon, PuzzleIcon, RunningIcon, SparklesIcon } from '../components/Icons';

interface ActivitiesProps {
  userData: UserData | null;
}

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const [completed, setCompleted] = useState(false);

  // Map vague categories to icons if missing
  const getIcon = () => {
    if (activity.icon) return activity.icon;
    const lowerCat = activity.category.toLowerCase();
    if (lowerCat.includes('game') || lowerCat.includes('fun')) return <GamepadIcon />;
    if (lowerCat.includes('run') || lowerCat.includes('active')) return <RunningIcon />;
    if (lowerCat.includes('quiz') || lowerCat.includes('question')) return <PuzzleIcon />;
    return <LightbulbIcon />;
  };

  return (
    <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 shadow-lg border border-white/50 relative overflow-hidden ${completed ? 'opacity-60 bg-teal-50/50' : 'hover:bg-white/90'}`}>
       
       {completed && (
           <div className="absolute top-4 right-4 text-teal-600 animate-fade-in">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
               </svg>
           </div>
       )}

      <div className="flex items-start space-x-5">
        <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-white/50 transition-colors ${completed ? 'bg-teal-100' : 'bg-rose-50'}`}>
          {getIcon()}
        </div>
        <div className="flex-grow">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-md shadow-sm border border-slate-200">
                {activity.category}
            </span>
            {activity.duration && (
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-white/60 px-2 py-1 rounded-md border border-white/50">
                    ⏱ {activity.duration}
                </span>
            )}
            {activity.difficulty && (
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-white/60 px-2 py-1 rounded-md border border-white/50">
                    {activity.difficulty}
                </span>
            )}
          </div>
          <h3 className={`text-xl font-bold transition-colors ${completed ? 'text-teal-800' : 'text-slate-900'}`}>{activity.title}</h3>
          <p className="text-slate-700 text-sm mt-2 leading-relaxed font-medium">{activity.description}</p>
        </div>
      </div>
      
      {!completed && (
          <button 
            onClick={() => setCompleted(true)}
            className="w-full mt-5 py-3 rounded-xl bg-white/50 hover:bg-white/80 text-slate-700 text-sm font-bold border border-white/60 transition-colors shadow-sm"
          >
            Mark as Done
          </button>
      )}
    </div>
  );
};

const Activities: React.FC<ActivitiesProps> = ({ userData }) => {
  const [activeVibe, setActiveVibe] = useState('Recommended');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const vibes = ['Recommended', 'Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  const loadActivities = async (vibe: string, reset = false) => {
      setLoading(true);
      if (reset) {
          setActivities([]);
          setPage(0);
      }
      
      const newActivities = await generateActivities(vibe);
      
      setActivities(prev => reset ? newActivities : [...prev, ...newActivities]);
      setLoading(false);
      if (!reset) setPage(p => p + 1);
  };

  useEffect(() => {
    loadActivities(activeVibe, true);
  }, [activeVibe]);

  return (
    <div className="p-2 md:p-4 min-h-screen">
       <header className="mb-6 mt-4 relative">
         <div className="relative z-10">
            <h1 className="text-4xl font-light text-white tracking-tight drop-shadow-md">Activities</h1>
            <p className="text-white/90 mt-1 font-medium drop-shadow-sm">Spark joy and connection.</p>
        </div>
      </header>

      {/* Vibe Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {vibes.map(vibe => (
              <button
                key={vibe}
                onClick={() => setActiveVibe(vibe)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
                    activeVibe === vibe 
                    ? 'bg-white text-rose-900 shadow-md scale-105' 
                    : 'bg-white/20 text-white hover:bg-white/30 border border-white/20 backdrop-blur-sm'
                }`}
              >
                  {vibe}
              </button>
          ))}
      </div>

      <div className="space-y-4 pb-20">
        {activities.map((activity, index) => (
          <ActivityCard key={`${activity.title}-${index}`} activity={activity} />
        ))}
        
        {loading && (
            <div className="space-y-4 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="glass-panel rounded-2xl p-6 h-40 opacity-70">
                         <div className="flex space-x-4">
                             <div className="w-12 h-12 bg-slate-300/30 rounded-2xl"></div>
                             <div className="flex-1 space-y-3">
                                 <div className="h-4 bg-slate-300/30 rounded w-1/4"></div>
                                 <div className="h-6 bg-slate-300/30 rounded w-3/4"></div>
                                 <div className="h-4 bg-slate-300/30 rounded w-full"></div>
                                 <div className="h-4 bg-slate-300/30 rounded w-5/6"></div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        )}

        {!loading && (
             <button 
                onClick={() => loadActivities(activeVibe)}
                className="w-full py-4 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-2 group shadow-lg"
             >
                <SparklesIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Load More Ideas</span>
             </button>
        )}
      </div>
    </div>
  );
};

export default Activities;
