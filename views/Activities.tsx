
import React, { useState, useEffect, useMemo } from 'react';
import { generateActivities, tagJournalEntry } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import type { Activity, JournalEntry } from '../types';

const ActivitiesView: React.FC = () => {
  const [activeVibe, setActiveVibe] = useState('Deep');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [engagedActivity, setEngagedActivity] = useState<Activity | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const vibes = ['Playful', 'Romantic', 'Deep', 'Adventurous', 'Relaxing'];

  useEffect(() => {
    const savedUser = localStorage.getItem('kindred_user_data');
    if (savedUser) setUserData(JSON.parse(savedUser));

    const active = cloudService.getActiveActivity();
    if (active) setEngagedActivity(active);

    setLoading(true);
    generateActivities(activeVibe).then(data => { 
        setActivities(data); 
        setLoading(false); 
    });
  }, [activeVibe]);

  const handleEngage = (activity: Activity) => {
    const startedActivity = { ...activity, startTime: Date.now() };
    cloudService.setActiveActivity(startedActivity);
    setEngagedActivity(startedActivity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEngage = () => {
    if (window.confirm("Abandon this intent?")) {
        cloudService.setActiveActivity(null);
        setEngagedActivity(null);
        setReflectionText('');
    }
  };

  const finalizeActivity = async () => {
    if (!engagedActivity || !userData || isFinalizing) return;
    setIsFinalizing(true);

    try {
        // 1. Tag and create Journal Entry
        const tags = await tagJournalEntry(reflectionText || engagedActivity.title);
        const entry: JournalEntry = {
            id: `act-journal-${Date.now()}`,
            authorId: userData.id,
            author: userData.userName,
            authorImage: '',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timestamp: Date.now(),
            text: `[Activity: ${engagedActivity.title}] ${reflectionText || "We shared this moment together."}`,
            themeTags: [...tags, engagedActivity.category]
        };
        await cloudService.saveJournalEntry(userData.partnerCode || 'default', entry);

        // 2. Update Bond Score
        const categoryMap: Record<string, string> = {
            'Deep': 'Intimacy',
            'Playful': 'Communication',
            'Adventurous': 'Shared Vision',
            'Romantic': 'Intimacy',
            'Relaxing': 'Trust'
        };
        const targetCategory = categoryMap[engagedActivity.category] || 'Communication';
        await cloudService.updateBondScore(userData.partnerCode || 'default', targetCategory, 0.4);

        // 3. Cleanup
        await cloudService.setActiveActivity(null);
        setEngagedActivity(null);
        setReflectionText('');
        alert("Memory archived and bond strengthened.");
    } catch (err) {
        console.error("Finalization failed", err);
    } finally {
        setIsFinalizing(false);
    }
  };

  const elapsedTime = useMemo(() => {
      if (!engagedActivity?.startTime) return null;
      const mins = Math.floor((Date.now() - engagedActivity.startTime) / 60000);
      return mins > 0 ? `${mins}m elapsed` : 'Just started';
  }, [engagedActivity]);

  if (engagedActivity) {
      return (
          <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
              <header className="mb-16">
                    <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#00FF41] mb-2 block heading-font">Live Intent Session</span>
                    <h1 className="text-5xl font-light mb-4 text-[#262626] leading-tight">{engagedActivity.title}</h1>
                    <div className="flex gap-4 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/40 heading-font">{engagedActivity.duration} Target</span>
                        <div className="w-1 h-1 bg-[#262626]/20 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00FF41] heading-font animate-pulse">{elapsedTime}</span>
                    </div>
              </header>

              <div className="bg-white/40 border border-[#262626]/5 rounded-[3rem] p-10 mb-16 shadow-sm">
                  <p className="text-2xl font-light text-[#262626] leading-relaxed italic mb-8">
                      "{engagedActivity.description}"
                  </p>
                  <div className="flex flex-col gap-8">
                      <div className="space-y-4">
                          <label className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/40 heading-font">Seal the Memory (Reflection)</label>
                          <textarea 
                            value={reflectionText}
                            onChange={(e) => setReflectionText(e.target.value)}
                            placeholder="What did you discover in this shared space?..."
                            className="w-full bg-transparent border-b border-[#262626]/10 focus:border-[#262626] outline-none text-xl font-light italic p-4 h-32 resize-none transition-all"
                          />
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <button 
                            onClick={finalizeActivity}
                            disabled={isFinalizing}
                            className="w-full py-6 bg-[#262626] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:opacity-90 transition-all heading-font shadow-xl"
                        >
                            {isFinalizing ? 'Archiving...' : 'Internalize Memory'}
                        </button>
                        <button 
                            onClick={cancelEngage}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#262626]/30 hover:text-[#262626] transition-all py-2"
                        >
                            Dissolve Intent
                        </button>
                      </div>
                  </div>
              </div>

              <div className="text-center opacity-30">
                  <p className="text-xs italic font-light">Completing this activity will automatically update your shared bond scores and anthology.</p>
              </div>
          </div>
      );
  }

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
          <div key={i} className="animate-fade-in-up group" style={{animationDelay: `${i*0.1}s`}}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-3xl font-light max-w-[80%] text-[#262626] group-hover:pl-2 transition-all duration-500">{a.title}</h3>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/60 pt-2">{a.duration}</span>
            </div>
            <p className="text-[#262626]/80 text-lg leading-relaxed mb-6 font-light">{a.description}</p>
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => handleEngage(a)} 
                    className="text-[10px] font-bold uppercase tracking-widest border border-[#262626] px-8 py-3 rounded-full hover:bg-[#262626] hover:text-white transition-all heading-font"
                >
                    Initiate Session
                </button>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#262626]/20">{a.difficulty} Difficulty</span>
            </div>
          </div>
        ))}
        {loading && (
            <div className="space-y-12">
                {[1,2,3].map(n => (
                    <div key={n} className="animate-pulse space-y-4">
                        <div className="h-8 bg-[#262626]/5 rounded-full w-3/4"></div>
                        <div className="h-4 bg-[#262626]/5 rounded-full w-full"></div>
                        <div className="h-4 bg-[#262626]/5 rounded-full w-1/2"></div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesView;
